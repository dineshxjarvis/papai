from __future__ import annotations

import os
import re
import json
import time
from typing import Any, Dict, List, Optional, TypedDict, Annotated
from operator import add

import httpx
from langgraph.graph import StateGraph, END


class VerifyState(TypedDict, total=False):
    claim_text: str
    claim_id: str
    entities: Dict[str, Any]
    use_mock: bool
    method: Optional[str]
    baseline: Optional[str]
    dataset: Optional[str]
    metric: Optional[str]
    value: Optional[str]
    relationship: Optional[str]
    atomic_claims: List[str]
    specificity: str
    queries: List[Dict[str, str]]
    papers: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]
    conflict_map: Dict[str, Any]
    coverage: Dict[str, Any]
    verdict: str
    evidence_quality: str
    verification_confidence: str
    internal_score: float
    trace: Annotated[List[Dict[str, Any]], add]
    errors: Annotated[List[str], add]
    status: str


def _ts() -> str:
    return time.strftime("%H:%M:%S")


def _trace(agent: str, status: str, detail: str) -> List[Dict[str, Any]]:
    return [{"agent": agent, "status": status, "detail": detail, "timestamp": _ts()}]


def _guess(text: str, pattern: str) -> Optional[str]:
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    return m.group(1) if m.lastindex else m.group(0)


S2_FIELDS = "paperId,title,abstract,year,citationCount,url,openAccessPdf,externalIds,venue"


def search_semantic_scholar(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    key = os.getenv("SEMANTIC_SCHOLAR_API_KEY") or os.getenv("VITE_SEMANTIC_SCHOLAR_API_KEY") or ""
    headers = {"x-api-key": key} if key else {}
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(url, params={"query": query, "limit": limit, "fields": S2_FIELDS}, headers=headers)
            if r.status_code == 429:
                time.sleep(2.0)
                r = client.get(url, params={"query": query, "limit": limit, "fields": S2_FIELDS}, headers=headers)
            if r.status_code != 200:
                return []
            data = r.json().get("data") or []
            out = []
            for p in data:
                arxiv = (p.get("externalIds") or {}).get("ArXiv")
                pdf = (p.get("openAccessPdf") or {}).get("url")
                out.append({
                    "paperId": p.get("paperId"),
                    "title": p.get("title") or "",
                    "abstract": p.get("abstract") or "",
                    "year": p.get("year"),
                    "citationCount": p.get("citationCount") or 0,
                    "url": p.get("url") or f"https://www.semanticscholar.org/paper/{p.get('paperId')}",
                    "pdfUrl": pdf,
                    "venue": p.get("venue"),
                    "source": "s2",
                    "arxivId": arxiv,
                })
            return out
    except Exception:
        return []


def search_arxiv(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(
                "https://export.arxiv.org/api/query",
                params={"search_query": f"all:{query}", "start": 0, "max_results": limit},
            )
            if r.status_code != 200:
                return []
            xml = r.text
        entries = xml.split("<entry>")[1:]
        out = []
        for entry in entries:
            def m(tag: str) -> str:
                mm = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", entry)
                return re.sub(r"\s+", " ", mm.group(1)).strip() if mm else ""

            eid = m("id")
            arxiv_id = eid.replace("http://arxiv.org/abs/", "").replace("https://arxiv.org/abs/", "")
            published = m("published")
            out.append({
                "paperId": f"arxiv:{arxiv_id}",
                "title": m("title"),
                "abstract": m("summary"),
                "year": int(published[:4]) if published and published[:4].isdigit() else None,
                "citationCount": 0,
                "url": eid or f"https://arxiv.org/abs/{arxiv_id}",
                "pdfUrl": f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else None,
                "venue": "arXiv",
                "source": "arxiv",
                "arxivId": arxiv_id,
            })
        return out
    except Exception:
        return []


def mock_papers(claim_text: str, method: str, dataset: str) -> List[Dict[str, Any]]:
    return [
        {
            "paperId": "mock-resnet",
            "title": "Deep Residual Learning for Image Recognition",
            "abstract": (
                f"Compared with VGG-16, residual networks reach higher top-1 accuracy "
                f"under standard evaluation on ImageNet. {method or 'ResNet'} is evaluated "
                f"on {dataset or 'ImageNet'}."
            ),
            "year": 2016,
            "citationCount": 100000,
            "url": "https://arxiv.org/abs/1512.03385",
            "pdfUrl": None,
            "venue": "CVPR",
            "source": "mock",
            "_channel": "support",
        },
        {
            "paperId": "mock-limit",
            "title": "Limitations of Deep CNNs on Small Medical Datasets",
            "abstract": (
                "Performance gains are often not statistically significant on small datasets. "
                "Domain shift and limited samples reduce reliability of reported improvements."
            ),
            "year": 2021,
            "citationCount": 120,
            "url": "https://example.org/limits",
            "pdfUrl": None,
            "venue": "workshop",
            "source": "mock",
            "_channel": "adversarial",
        },
    ]


def dedupe_papers(papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen, out = set(), []
    for p in papers:
        key = (p.get("title") or "").lower().strip() or p.get("paperId")
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def node_decomposer(state: VerifyState) -> Dict[str, Any]:
    text = state.get("claim_text") or ""
    ents = state.get("entities") or {}
    method = ents.get("method") or _guess(text, r"\b(ResNet-?\d+|VGG-?\d+|CNN|BERT|ViT|LSTM)\b")
    baseline = ents.get("baseline") or _guess(text, r"\b(?:than|vs\.?|versus)\s+([A-Za-z0-9\-]+)")
    dataset = ents.get("dataset") or _guess(text, r"\b(ImageNet|CIFAR-?\d+|COCO|SQuAD|MNIST)\b")
    metric = ents.get("metric") or ("accuracy" if re.search(r"accuracy|top-1|f1|auc", text, re.I) else None)
    value = ents.get("value") or _guess(text, r"(\d+\.?\d*\s*%)")
    rel = "higher-than" if re.search(r"higher|outperform|better", text, re.I) else "claims"
    atoms = [a for a in [method, baseline, dataset, metric, value] if a]
    spec = "high" if len(atoms) >= 3 else ("medium" if len(atoms) >= 1 else "low")
    return {
        "method": method,
        "baseline": baseline,
        "dataset": dataset,
        "metric": metric,
        "value": value,
        "relationship": rel,
        "atomic_claims": atoms or [text[:120]],
        "specificity": spec,
        "trace": _trace("Claim Decomposer", "completed", f"specificity={spec}; atoms={len(atoms) or 1}"),
    }


def node_query_expander(state: VerifyState) -> Dict[str, Any]:
    method = state.get("method") or ""
    dataset = state.get("dataset") or ""
    baseline = state.get("baseline") or ""
    metric = state.get("metric") or "accuracy"
    core = " ".join(x for x in [method, dataset, metric] if x).strip() or (state.get("claim_text") or "")[:80]
    queries = [
        {"q": f"{method} {baseline} {dataset}".strip(), "channel": "support"},
        {"q": f"{core} {metric}", "channel": "support"},
        {"q": f"{method} limitations", "channel": "adversarial"},
        {"q": f"{method} not statistically significant", "channel": "adversarial"},
        {"q": f"{method} does not improve", "channel": "adversarial"},
        {"q": f"{method} {dataset} failure OR poor performance", "channel": "adversarial"},
    ]
    queries = [x for x in queries if x["q"].strip()][:6]
    return {
        "queries": queries,
        "trace": _trace("Query Expander", "completed", f"Generated {len(queries)} queries"),
    }


def node_research(state: VerifyState) -> Dict[str, Any]:
    papers: List[Dict[str, Any]] = []
    use_mock = bool(state.get("use_mock"))
    queries = state.get("queries") or []
    if not use_mock:
        for item in queries[:4]:
            q = item.get("q") or ""
            channel = item.get("channel") or "support"
            for p in search_semantic_scholar(q, limit=5):
                papers.append({**p, "_channel": channel})
            time.sleep(0.8)
            for p in search_arxiv(q, limit=2):
                papers.append({**p, "_channel": channel})
    papers = dedupe_papers(papers)
    if use_mock or not papers:
        papers = mock_papers(state.get("claim_text") or "", state.get("method") or "", state.get("dataset") or "")
    return {
        "papers": papers,
        "trace": _trace("Research Agent", "completed", f"{len(papers)} papers after fetch/dedup"),
    }


def node_ranker(state: VerifyState) -> Dict[str, Any]:
    method = (state.get("method") or "").lower()
    dataset = (state.get("dataset") or "").lower()
    papers = list(state.get("papers") or [])

    def score(p: Dict[str, Any]) -> float:
        blob = f"{p.get('title','')} {p.get('abstract','')}".lower()
        s = 0.0
        if method and method in blob:
            s += 0.4
        if dataset and dataset in blob:
            s += 0.25
        s += min(0.2, (p.get("citationCount") or 0) / 500000)
        if p.get("_channel") == "adversarial":
            s += 0.05
        return s

    ranked = sorted(papers, key=score, reverse=True)[:10]
    return {
        "papers": ranked,
        "trace": _trace("Relevance Ranker", "completed", f"Top {len(ranked)} selected"),
    }


def node_evidence(state: VerifyState) -> Dict[str, Any]:
    method = (state.get("method") or "").lower()
    evidence = []
    for p in (state.get("papers") or [])[:8]:
        abs_ = p.get("abstract") or ""
        blob = abs_.lower()
        support, quality = "unknown", "weak"
        if any(w in blob for w in ["not statistically", "limitation", "fails", "does not improve"]):
            support, quality = "no", "moderate"
        elif method and method in blob and any(w in blob for w in ["higher", "outperform", "accuracy", "improve"]):
            support = "yes"
            quality = "strong" if (p.get("citationCount") or 0) > 1000 else "moderate"
        elif abs_:
            support, quality = "yes", "moderate"
        evidence.append({
            "paperId": p.get("paperId"),
            "supportsClaim": support,
            "evidenceQuality": quality,
            "evidenceSource": "abstract",
            "evidenceSpan": abs_[:220] + ("…" if len(abs_) > 220 else ""),
            "section": "Abstract",
            "page": None,
            "experiment": {
                "method": state.get("method"),
                "dataset": state.get("dataset"),
                "metric": state.get("metric"),
                "value": state.get("value"),
                "baseline": state.get("baseline"),
            },
            "limitations": [],
            "confidence": 0.7 if quality != "weak" else 0.4,
            "channel": p.get("_channel") or "support",
            "paper": {"title": p.get("title"), "url": p.get("url"), "year": p.get("year")},
        })
    return {
        "evidence": evidence,
        "trace": _trace("Evidence Extractor", "completed", f"Total evidence: {len(evidence)}"),
    }


def node_adversarial(state: VerifyState) -> Dict[str, Any]:
    contradictions = []
    for e in state.get("evidence") or []:
        span = (e.get("evidenceSpan") or "").lower()
        if e.get("supportsClaim") == "no" or (
            e.get("channel") == "adversarial"
            and any(w in span for w in ["limitation", "not statistically", "fail", "does not"])
        ):
            contradictions.append(e)
    support = [e for e in (state.get("evidence") or []) if e.get("supportsClaim") == "yes"]
    conflict_map = {
        "support": [{
            "title": (e.get("paper") or {}).get("title"),
            "span": e.get("evidenceSpan"),
            "url": (e.get("paper") or {}).get("url"),
            "page": e.get("page"),
            "section": e.get("section"),
        } for e in support],
        "contradict": [{
            "title": (e.get("paper") or {}).get("title"),
            "span": e.get("evidenceSpan"),
            "url": (e.get("paper") or {}).get("url"),
            "page": e.get("page"),
            "section": e.get("section"),
        } for e in contradictions],
    }
    return {
        "contradictions": contradictions,
        "conflict_map": conflict_map,
        "trace": _trace("Adversarial Critic", "completed", f"{len(contradictions)} contradiction signals"),
    }


def node_verification(state: VerifyState) -> Dict[str, Any]:
    atoms = state.get("atomic_claims") or []
    evidence = state.get("evidence") or []
    matched = 0.0
    for atom in atoms:
        a = (atom or "").lower()
        for e in evidence:
            blob = f"{e.get('evidenceSpan','')} {json.dumps(e.get('experiment') or {})}".lower()
            if a and a in blob:
                matched += 1
                break
            for key in ("method", "dataset", "metric"):
                val = (state.get(key) or "").lower()
                if val and val in blob:
                    matched += 0.25
    total = max(len(atoms), 1)
    ratio = min(1.0, matched / total)
    return {
        "coverage": {"matched": matched, "total": total, "ratio": ratio},
        "trace": _trace("Verification", "completed", f"coverage={ratio:.2f}"),
    }


def node_verdict(state: VerifyState) -> Dict[str, Any]:
    evidence = state.get("evidence") or []
    contradictions = state.get("contradictions") or []
    coverage = state.get("coverage") or {"ratio": 0}
    support = [e for e in evidence if e.get("supportsClaim") == "yes"]
    strong = [e for e in support if e.get("evidenceQuality") in ("strong", "moderate")]
    ratio = float(coverage.get("ratio") or 0)
    spec = state.get("specificity") or "low"

    if not evidence:
        verdict, quality, conf, score = "insufficient", "weak", "low", 0.2
    elif contradictions and strong and ratio >= 0.4:
        verdict, quality, conf, score = "partially_supported", "moderate", "medium", 0.55
    elif contradictions and not strong:
        verdict, quality, conf, score = "contradicted", "moderate", "medium", 0.35
    elif strong and ratio >= 0.5 and not contradictions:
        verdict = "supported"
        quality = "strong" if any(e.get("evidenceQuality") == "strong" for e in strong) else "moderate"
        conf, score = "high", 0.8
    elif support and ratio >= 0.3:
        verdict, quality, conf, score = "partially_supported", "moderate", "medium", 0.5
    else:
        verdict, quality, conf, score = "insufficient", "weak", "low", 0.25

    if spec == "low" and verdict == "supported":
        verdict, quality, conf, score = "partially_supported", "weak", "low", 0.45

    return {
        "verdict": verdict,
        "evidence_quality": quality,
        "verification_confidence": conf,
        "internal_score": score,
        "status": "completed",
        "trace": _trace("Verdict Engine", "completed", f"verdict={verdict}"),
    }


def build_verification_graph():
    g = StateGraph(VerifyState)
    g.add_node("decomposer", node_decomposer)
    g.add_node("query_expander", node_query_expander)
    g.add_node("research", node_research)
    g.add_node("ranker", node_ranker)
    g.add_node("evidence", node_evidence)
    g.add_node("adversarial", node_adversarial)
    g.add_node("verification", node_verification)
    g.add_node("verdict", node_verdict)

    g.set_entry_point("decomposer")
    g.add_edge("decomposer", "query_expander")
    g.add_edge("query_expander", "research")
    g.add_edge("research", "ranker")
    g.add_edge("ranker", "evidence")
    g.add_edge("evidence", "adversarial")
    g.add_edge("adversarial", "verification")
    g.add_edge("verification", "verdict")
    g.add_edge("verdict", END)
    return g.compile()


_GRAPH = None


def get_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_verification_graph()
    return _GRAPH


def run_langgraph_verification(
    claim_text: str,
    claim_id: str = "claim",
    entities: Optional[Dict[str, Any]] = None,
    use_mock: bool = False,
) -> Dict[str, Any]:
    graph = get_graph()
    initial: VerifyState = {
        "claim_text": claim_text,
        "claim_id": claim_id,
        "entities": entities or {},
        "use_mock": use_mock,
        "trace": _trace("Orchestrator", "running", "LangGraph StateGraph started"),
        "errors": [],
        "status": "running",
        "papers": [],
        "evidence": [],
        "queries": [],
        "atomic_claims": [],
    }
    final = graph.invoke(initial)
    return {
        "status": final.get("status") or "completed",
        "verdict": final.get("verdict") or "insufficient",
        "evidenceQuality": final.get("evidence_quality") or "weak",
        "verificationConfidence": final.get("verification_confidence") or "low",
        "internalScore": final.get("internal_score") or 0,
        "entities": {
            "method": final.get("method"),
            "baseline": final.get("baseline"),
            "dataset": final.get("dataset"),
            "metric": final.get("metric"),
            "value": final.get("value"),
        },
        "atomicClaims": final.get("atomic_claims") or [],
        "specificity": final.get("specificity") or "low",
        "queries": final.get("queries") or [],
        "papers": final.get("papers") or [],
        "evidence": final.get("evidence") or [],
        "conflictMap": final.get("conflict_map") or {"support": [], "contradict": []},
        "evidenceCoverage": final.get("coverage") or {},
        "trace": final.get("trace") or [],
        "orchestrator": "langgraph",
        "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
