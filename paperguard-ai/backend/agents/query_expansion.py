import json
from datetime import datetime
from typing import Any, Tuple
import logging

from models.schemas import ClaimAtom, ResearchQuery, AuditEntry
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

QUERY_EXPANSION_PROMPT = """You are an expert scientific researcher.
Given an atomic claim, generate exactly TWO queries for a literature search engine (like Semantic Scholar).

1. A SUPPORTING query: Designed to find papers that prove or support this claim.
2. An ADVERSARIAL query: Designed to find papers that contradict, weaken, or show limitations of this claim.

Ensure queries use strong academic keywords and are 3-6 words long.
Do not use boolean operators (AND/OR), just space-separated keywords.

Atom text: {atom_text}
Subject: {subject}
Predicate: {predicate}

Return ONLY a valid JSON array of two objects:
[
  {{ "query": "support query here", "direction": "support" }},
  {{ "query": "adversarial query here", "direction": "adversarial" }}
]
"""

async def run_query_expansion(atoms: list[ClaimAtom], llm: Any = None, use_mock: bool = False) -> Tuple[list[ResearchQuery], AuditEntry]:
    """
    Generate Support and Adversarial queries for each claim atom.
    """
    queries = []

    if use_mock or not llm:
        for atom in atoms:
            base_query = f"{atom.subject} {atom.object_value or atom.predicate}"
            
            queries.append(ResearchQuery(
                query=f"{base_query} performance accuracy",
                direction="support",
                atom_id=atom.atom_id
            ))
            queries.append(ResearchQuery(
                query=f"{base_query} limitations failure",
                direction="adversarial",
                atom_id=atom.atom_id
            ))
        audit = AuditEntry(
            agent_name="Query Expansion",
            stage="Query Generation",
            message=f"Generated {len(queries)} mock queries for {len(atoms)} atoms.",
            status="complete"
        )
        return queries, audit

    prompt = PromptTemplate(template=QUERY_EXPANSION_PROMPT, input_variables=["atom_text", "subject", "predicate"])
    chain = prompt | llm

    for atom in atoms:
        try:
            response = await chain.ainvoke({
                "atom_text": atom.text,
                "subject": atom.subject,
                "predicate": atom.predicate
            })
            
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            parsed = json.loads(content.strip())
            for q in parsed:
                queries.append(ResearchQuery(
                    query=q["query"],
                    direction=q["direction"],
                    atom_id=atom.atom_id
                ))
        except Exception as e:
            logger.error(f"LLM query expansion failed for atom {atom.atom_id}: {e}")
            raise Exception(f"Query expansion failed for atom {atom.atom_id}: {e}")

    audit = AuditEntry(
        agent_name="Query Expansion",
        stage="Query Generation",
        message=f"Generated {len(queries)} queries for {len(atoms)} atoms.",
        status="complete"
    )

    return queries, audit
