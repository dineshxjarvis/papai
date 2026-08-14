"""
PaperGuard AI - Semantic Scholar API Client
Searches for academic papers using the Semantic Scholar API.
Falls back to mock data if the API is unavailable or rate-limited.
"""

import logging
import hashlib
from typing import Optional

import httpx

from models.schemas import Paper, DetectedClaim

logger = logging.getLogger(__name__)

SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1"
PAPER_FIELDS = "title,abstract,year,externalIds,authors,citationCount,journal,url"


class SemanticScholarClient:
    """Async client for the Semantic Scholar Academic Graph API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.headers = {}
        if api_key:
            self.headers["x-api-key"] = api_key

    async def search_papers(
        self,
        query: str,
        limit: int = 10,
        year_range: Optional[str] = None,
    ) -> list[Paper]:
        """
        Search for papers matching the query.
        Returns a list of Paper models.
        """
        params = {
            "query": query,
            "limit": limit,
            "fields": PAPER_FIELDS,
        }
        if year_range:
            params["year"] = year_range

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{SEMANTIC_SCHOLAR_BASE}/paper/search",
                    params=params,
                    headers=self.headers,
                )

                if response.status_code == 429:
                    logger.warning("Semantic Scholar rate limit hit, falling back to mock data")
                    return []

                response.raise_for_status()
                data = response.json()

                papers = []
                for item in data.get("data", []):
                    doi = None
                    external_ids = item.get("externalIds", {})
                    if external_ids:
                        doi = external_ids.get("DOI")

                    authors = []
                    for author in item.get("authors", []):
                        if author.get("name"):
                            authors.append(author["name"])

                    journal_name = None
                    journal = item.get("journal")
                    if journal and isinstance(journal, dict):
                        journal_name = journal.get("name")

                    paper = Paper(
                        title=item.get("title", "Unknown Title"),
                        abstract=item.get("abstract"),
                        year=item.get("year"),
                        doi=doi,
                        authors=authors[:5],  # Limit to first 5 authors
                        source=journal_name,
                        citation_count=item.get("citationCount"),
                        url=item.get("url"),
                        stance="inconclusive",  # Will be determined by agents
                    )
                    papers.append(paper)

                logger.info(f"Semantic Scholar returned {len(papers)} papers for query: {query[:80]}")
                return papers

        except httpx.TimeoutException:
            logger.warning(f"Semantic Scholar timeout for query: {query[:80]}")
            return []
        except httpx.HTTPStatusError as e:
            logger.warning(f"Semantic Scholar HTTP error {e.response.status_code}: {e}")
            return []
        except Exception as e:
            logger.error(f"Semantic Scholar unexpected error: {e}")
            return []

    async def search_contradictory(self, subject: str, limit: int = 5) -> list[Paper]:
        """
        Search specifically for contradictory/negative studies.
        Uses adversarial query patterns.
        """
        adversarial_queries = [
            f'"{subject}" AND (fail OR ineffective OR "no effect" OR limitation)',
            f'"{subject}" AND (adverse OR contradict OR negative OR "did not")',
        ]

        all_papers: list[Paper] = []
        seen_titles: set[str] = set()

        for query in adversarial_queries:
            papers = await self.search_papers(query, limit=limit)
            for paper in papers:
                if paper.title.lower() not in seen_titles:
                    seen_titles.add(paper.title.lower())
                    all_papers.append(paper)

        return all_papers[:limit]


# ─── Mock Paper Templates ────────────────────────────────────────────────────

# Large pool of paper templates that get selected based on the claim hash.
# Each template has a title pattern, abstract pattern with stance-signalling
# keywords, and metadata that varies with the hash.

_AUTHOR_POOL = [
    ["E. Rostova", "M. Chen"],
    ["J. Rivera", "A. Nakamura"],
    ["R. Hartmann", "L. Zhou"],
    ["A. Gupta", "S. Patel"],
    ["K. Tanaka", "C. Dubois"],
    ["P. Okonkwo", "B. Müller"],
    ["D. Kim", "F. Rossi"],
    ["N. Sharma", "H. Johansson"],
]

_JOURNAL_POOL = [
    "Nature Neuroscience",
    "The Lancet Neurology",
    "JAMA Neurology",
    "Neuron",
    "Brain Research",
    "Journal of Clinical Investigation",
    "Molecular Psychiatry",
    "Annals of Neurology",
    "Science Translational Medicine",
    "Frontiers in Neuroscience",
]

_TITLE_TEMPLATES = [
    "Efficacy of {subject} in Clinical Trials",
    "Multi-Center Evaluation of {subject}",
    "Limitations and Observations of {subject}",
    "A Pilot Study of {subject} Derivatives",
    "Long-Term Outcomes of {subject} Therapy",
    "Comparative Analysis of {subject} vs Placebo",
    "Neuroprotective Mechanisms of {subject}",
    "Safety Profile and Tolerability of {subject}",
    "Meta-Analysis of {subject} Interventions",
    "Dose-Response Relationship of {subject}",
]

# Abstract templates organized by stance signal
_ABSTRACT_SUPPORTING = [
    "This study demonstrates a significant reduction in disease progression with {subject}. "
    "Treatment groups showed a {pct}% improvement over controls (p < {p_val}). "
    "The compound was effective and beneficial in {model} (n={n}).",

    "A double-blind trial confirms the neuroprotective efficacy of {subject}. "
    "The treatment supports previous findings with a {pct}% positive effect. "
    "Demonstrated improvement in cognitive scores using {model} (n={n}, p < {p_val}).",

    "Our results showed that {subject} is highly effective at reducing biomarker levels. "
    "We observed a {pct}% decrease in pathological markers (p < {p_val}). "
    "This confirms earlier observations in {model} (n={n}).",
]

_ABSTRACT_CONTRADICTING = [
    "Despite promising preclinical data, {subject} showed no effect in our trial. "
    "The treatment failed to produce significant outcomes ({pct}% change, p = {p_val}). "
    "Results were ineffective in {model} (n={n}). No benefit was observed.",

    "{subject} did not reduce disease markers in this study. "
    "Contrary to earlier reports, adverse effects were noted and the compound was not supported. "
    "Negative result in {model} (n={n}, p = {p_val}). {pct}% showed no improvement.",

    "A large-scale trial found {subject} to be ineffective for the primary endpoint. "
    "The treatment provided no significant benefit ({pct}% vs control, p = {p_val}). "
    "Limitations include the {model} (n={n}) and lack of long-term follow-up.",
]

_ABSTRACT_INCONCLUSIVE = [
    "This pilot study of {subject} produced inconclusive results requiring further research. "
    "Preliminary trends were observed ({pct}% change) but did not reach significance (p = {p_val}). "
    "Small sample of {model} (n={n}) limits generalizability.",

    "{subject} showed mixed outcomes in our analysis. "
    "While some endpoints trended positive ({pct}%), the overall findings are inconclusive. "
    "Further research with larger cohorts is needed. {model} (n={n}, p = {p_val}).",

    "The effects of {subject} remain uncertain based on current evidence. "
    "A {pct}% change was observed but confidence intervals were wide (p = {p_val}). "
    "Preliminary data from {model} (n={n}) suggest the need for additional investigation.",
]

_MODEL_POOL = [
    "transgenic murine model",
    "randomized controlled trial",
    "double-blind cohort study",
    "Morris Water Maze assessment",
    "longitudinal cohort",
    "cross-sectional analysis",
    "phase II clinical trial",
    "retrospective chart review",
]


def _hash_claim(claim_text: str) -> list[int]:
    """
    Generate a list of deterministic pseudo-random bytes from the claim text.
    Same text always produces the same bytes; different text produces different bytes.
    """
    digest = hashlib.md5(claim_text.encode("utf-8")).digest()
    return list(digest)  # 16 bytes


def get_mock_papers(claim: DetectedClaim = None) -> list[Paper]:
    """
    Returns realistic mock papers whose content varies meaningfully
    based on the actual claim text.

    Uses MD5 hash of the claim text to deterministically select:
    - Number of papers (3-6)
    - Which title templates to use
    - Which stance each paper gets (supporting/contradicting/inconclusive)
    - Citation counts, years, authors, journals
    - Abstract content with appropriate stance-signalling keywords
    """
    subject = claim.subject if claim else "Compound X-74"
    claim_text = claim.claim_text if claim else ""

    # If claim text is very short or empty, return minimal set
    if len(claim_text.strip()) < 15:
        return [
            Paper(
                title=f"General Review of {subject}",
                abstract=f"A broad review of {subject}. Results were inconclusive and require further research.",
                year=2024,
                doi="10.1038/mock-review",
                authors=["Review Board"],
                source="Mock Reviews",
                citation_count=10,
                stance="inconclusive",
                url="https://doi.org/10.1038/mock-review",
            )
        ]

    h = _hash_claim(claim_text)

    # Number of papers: 4-6 based on hash
    num_papers = 4 + (h[0] % 3)

    claim_lower = claim_text.lower()
    supporting_kws = ["confirm", "significant", "reduces", "effective", "demonstrated", "improved", "highly effective", "statistically significant"]
    contradicting_kws = ["failed", "no significant", "ineffective", "no effect", "contradicts", "did not reduce", "p = 0.8", "p = 0.9", "not significant"]

    is_supporting = any(kw in claim_lower for kw in supporting_kws)
    is_contradicting = any(kw in claim_lower for kw in contradicting_kws)

    if is_supporting and not is_contradicting:
        # Strong supporting language -> Higher confidence (75-90%) + more Supporting papers
        stance_pattern = ["supports", "supports", "supports", "supports", "inconclusive"]
    elif is_contradicting and not is_supporting:
        # Strong contradicting language -> Lower confidence (25-45%) + more Contradicting papers
        stance_pattern = ["contradicts", "contradicts", "contradicts", "contradicts", "inconclusive"]
    else:
        # Mixed or neutral -> Medium confidence (55-70%)
        stance_pattern = ["supports", "supports", "contradicts", "contradicts", "inconclusive"]

    papers = []
    for i in range(num_papers):
        # Select stance for this paper
        stance = stance_pattern[i % len(stance_pattern)]

        # Generate deterministic values from hash bytes
        byte_idx = (i * 3 + 2) % 16
        pct = 15 + (h[byte_idx] % 60)  # 15-74%
        p_val_raw = 1 + (h[(byte_idx + 1) % 16] % 49)  # 0.01 - 0.49
        p_val = f"0.{p_val_raw:02d}"
        n = 20 + (h[(byte_idx + 2) % 16] % 480)  # 20-499
        year = 2020 + (h[(byte_idx + 3) % 16] % 6)  # 2020-2025
        citation_count = 5 + (h[(byte_idx + 4) % 16] * h[(byte_idx + 5) % 16]) % 300

        # Select templates deterministically
        title_idx = (h[(i + 4) % 16] + i) % len(_TITLE_TEMPLATES)
        author_idx = (h[(i + 5) % 16] + i) % len(_AUTHOR_POOL)
        journal_idx = (h[(i + 6) % 16] + i) % len(_JOURNAL_POOL)
        model_idx = (h[(i + 7) % 16] + i) % len(_MODEL_POOL)

        # Select abstract based on stance
        if stance == "supports":
            abs_idx = (h[(i + 8) % 16]) % len(_ABSTRACT_SUPPORTING)
            abstract_template = _ABSTRACT_SUPPORTING[abs_idx]
        elif stance == "contradicts":
            abs_idx = (h[(i + 8) % 16]) % len(_ABSTRACT_CONTRADICTING)
            abstract_template = _ABSTRACT_CONTRADICTING[abs_idx]
        else:
            abs_idx = (h[(i + 8) % 16]) % len(_ABSTRACT_INCONCLUSIVE)
            abstract_template = _ABSTRACT_INCONCLUSIVE[abs_idx]

        title = _TITLE_TEMPLATES[title_idx].format(subject=subject)
        abstract = abstract_template.format(
            subject=subject,
            pct=pct,
            p_val=p_val,
            n=n,
            model=_MODEL_POOL[model_idx],
        )

        papers.append(Paper(
            title=title,
            abstract=abstract,
            year=year,
            doi=f"10.{1000 + h[i % 16]}/mock-{i + 1}",
            authors=_AUTHOR_POOL[author_idx],
            source=_JOURNAL_POOL[journal_idx],
            citation_count=citation_count,
            stance="inconclusive",  # Will be set by adversarial critic heuristics
            url=f"https://doi.org/10.{1000 + h[i % 16]}/mock-{i + 1}",
        ))

    logger.info(
        f"Generated {len(papers)} mock papers for claim: "
        f"{claim_text[:60]}... (hash={hashlib.md5(claim_text.encode()).hexdigest()[:8]})"
    )
    return papers
