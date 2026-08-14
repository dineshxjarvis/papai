import json
import logging
from typing import Any, Tuple

from models.schemas import Paper, ClaimAtom, AuditEntry
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

RANKING_PROMPT = """You are a relevance ranking expert.
Evaluate whether the following research paper is relevant to any of the scientific claim atoms.
Relevance does NOT mean the paper supports the claim. It means the paper discusses the same topic, methodology, or population, making it useful as evidence (either for or against).

Atoms:
{atoms}

Paper Title: {title}
Paper Abstract: {abstract}

For this paper, determine:
1. Is it relevant to any atom?
2. If yes, which atom is it MOST relevant to (return the atom_id)?
3. Assign a relevance_score from 0 to 100.
4. Provide a brief reason for the score.

Return a JSON object:
{{
  "relevant": true/false,
  "matched_atom_id": "atom_1",
  "score": 85,
  "reason": "Discusses CNN vs Transformer performance in medical imaging."
}}
"""

async def run_relevance_ranking(papers: list[Paper], atoms: list[ClaimAtom], llm: Any = None, use_mock: bool = False) -> Tuple[list[Paper], AuditEntry]:
    """
    Rank and filter papers based on relevance to the claim atoms.
    """
    if use_mock or not llm:
        # Heuristic/Mock behavior: assume all retrieved mock papers are highly relevant
        for p in papers:
            p.relevance_score = 90
            p.relevance_reason = "Mock heuristic match"
            p.matched_atom_id = atoms[0].atom_id if atoms else None
        
        audit = AuditEntry(
            agent_name="Relevance Ranker",
            stage="Relevance Ranking",
            message=f"Retained {len(papers)} papers using mock/heuristic logic.",
            status="complete"
        )
        return papers, audit

    ranked_papers = []
    
    atoms_text = "\n".join([f"- {a.atom_id}: {a.text}" for a in atoms])
    prompt = PromptTemplate(template=RANKING_PROMPT, input_variables=["atoms", "title", "abstract"])
    chain = prompt | llm

    for paper in papers:
        try:
            abstract = paper.abstract or "No abstract available."
            response = await chain.ainvoke({
                "atoms": atoms_text,
                "title": paper.title,
                "abstract": abstract
            })
            
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            parsed = json.loads(content.strip())
            
            if parsed.get("relevant", False) and parsed.get("score", 0) > 40:
                paper.relevance_score = parsed.get("score")
                paper.relevance_reason = parsed.get("reason")
                paper.matched_atom_id = parsed.get("matched_atom_id")
                ranked_papers.append(paper)
        except Exception as e:
            logger.error(f"Ranking failed for paper {paper.title}: {e}")
            continue

    ranked_papers.sort(key=lambda p: p.relevance_score or 0, reverse=True)
    
    audit = AuditEntry(
        agent_name="Relevance Ranker",
        stage="Relevance Ranking",
        message=f"Filtered {len(papers)} papers down to {len(ranked_papers)} highly relevant ones.",
        status="complete"
    )

    return ranked_papers, audit
