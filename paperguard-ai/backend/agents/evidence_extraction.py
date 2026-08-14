import json
import logging
from datetime import datetime
from typing import Tuple, Any

from models.schemas import Paper, ClaimAtom, EvidenceDetail, AuditEntry
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """You are a scientific data extractor.
Given a scientific paper and a specific atomic claim, extract the EXACT text span that acts as evidence for or against the claim.

Atom:
{atom_text}

Paper Title: {title}
Paper Abstract: {abstract}

Identify if the paper provides evidence. If it does, extract:
1. text_span: The exact sentence(s) from the abstract providing the evidence.
2. evidence_type: SUPPORTING, CONTRADICTING, or NEUTRAL.
3. relation: How does it relate to the atom?
4. context: Additional context (e.g. sample size, metrics).

Return a JSON array of evidence objects (empty if no evidence found).
[
  {{
    "text_span": "Transformers achieved 95% accuracy...",
    "evidence_type": "SUPPORTING",
    "relation": "Confirms higher accuracy",
    "context": "n=500 X-ray images"
  }}
]
"""

async def run_evidence_extraction(
    papers: list[Paper],
    atoms: list[ClaimAtom],
    claim_id: str,
    llm: Any = None,
    use_mock: bool = False
) -> Tuple[list[EvidenceDetail], list[EvidenceDetail], list[EvidenceDetail], AuditEntry]:
    """
    Extract exact evidence spans from papers and classify them.
    """
    supporting = []
    contradicting = []
    neutral = []
    
    if use_mock or not llm:
        # Mock mode heuristic
        for i, p in enumerate(papers):
            atom_id = p.matched_atom_id if p.matched_atom_id else (atoms[0].atom_id if atoms else None)
            
            title_lower = p.title.lower()
            abstract_lower = (p.abstract or "").lower()
            
            ev_type = "NEUTRAL"
            if "significant" in abstract_lower or "supports" in title_lower or "demonstrate" in abstract_lower:
                ev_type = "SUPPORTING"
            elif "fail" in abstract_lower or "no effect" in abstract_lower or "contradict" in abstract_lower or "did not" in abstract_lower:
                ev_type = "CONTRADICTING"
                
            ev = EvidenceDetail(
                evidence_id=f"ev_{datetime.now().timestamp()}_{i}",
                paper_id=p.paper_id,
                paper_title=p.title,
                claim_id=claim_id,
                atom_id=atom_id,
                text_span=p.abstract[:150] + "..." if p.abstract else p.title,
                evidence_type=ev_type,
                relation="Derived from mock abstract",
                context=None,
                source_url=p.url,
                location="Abstract"
            )
            if ev_type == "SUPPORTING":
                supporting.append(ev)
            elif ev_type == "CONTRADICTING":
                contradicting.append(ev)
            else:
                neutral.append(ev)
                
        audit = AuditEntry(
            agent_name="Evidence Extractor",
            stage="Evidence Extraction",
            message=f"Extracted mock evidence from {len(papers)} papers.",
            status="complete"
        )
        return supporting, contradicting, neutral, audit

    # REAL MODE
    prompt = PromptTemplate(template=EXTRACTION_PROMPT, input_variables=["atom_text", "title", "abstract"])
    chain = prompt | llm
    
    for i, paper in enumerate(papers):
        # Match paper to its atom
        target_atom = next((a for a in atoms if a.atom_id == paper.matched_atom_id), atoms[0] if atoms else None)
        if not target_atom: continue
        
        try:
            abstract = paper.abstract or "No abstract available"
            response = await chain.ainvoke({
                "atom_text": target_atom.text,
                "title": paper.title,
                "abstract": abstract
            })
            
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            parsed = json.loads(content.strip())
            
            for ev_data in parsed:
                ev = EvidenceDetail(
                    evidence_id=f"ev_{datetime.now().timestamp()}_{i}",
                    paper_id=paper.paper_id,
                    paper_title=paper.title,
                    claim_id=claim_id,
                    atom_id=target_atom.atom_id,
                    text_span=ev_data.get("text_span", "Unknown"),
                    evidence_type=ev_data.get("evidence_type", "NEUTRAL").upper(),
                    relation=ev_data.get("relation"),
                    context=ev_data.get("context"),
                    source_url=paper.url,
                    location="Abstract"
                )
                
                if ev.evidence_type == "SUPPORTING":
                    supporting.append(ev)
                elif ev.evidence_type == "CONTRADICTING":
                    contradicting.append(ev)
                else:
                    neutral.append(ev)
                    
        except Exception as e:
            logger.error(f"Evidence extraction failed for {paper.title}: {e}")
            continue

    audit = AuditEntry(
        agent_name="Evidence Extractor",
        stage="Evidence Extraction",
        message=f"Extracted {len(supporting)} support, {len(contradicting)} contradict, {len(neutral)} neutral.",
        status="complete"
    )

    return supporting, contradicting, neutral, audit
