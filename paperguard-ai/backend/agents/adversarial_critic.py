import json
import logging
from typing import Tuple, Any

from models.schemas import EvidenceDetail, Conflict, AuditEntry
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

CRITIC_PROMPT = """You are an Adversarial Scientific Critic.
Analyze the provided supporting and contradicting evidence for potential conflicts, methodological flaws, or scope mismatches.

Supporting Evidence:
{supporting}

Contradicting Evidence:
{contradicting}

Identify conflicts between the evidence. For each conflict, provide:
- nature_of_conflict: A brief label e.g., "METHODOLOGICAL", "POPULATION", "DOSAGE", "DIRECT_CONTRADICTION"
- explanation: A clear explanation of the conflict.
- conditions: Under what conditions does the conflict arise?
- conflicting_evidence_ids: List of evidence IDs involved.

Return a JSON array of conflict objects (empty if no conflicts found).
[
  {{
    "nature_of_conflict": "METHODOLOGICAL",
    "explanation": "Paper A used mice while Paper B used human trials.",
    "conditions": "In vivo studies vs clinical trials",
    "conflicting_evidence_ids": ["ev_1", "ev_2"]
  }}
]
"""

async def run_adversarial_critic(
    supporting: list[EvidenceDetail],
    contradicting: list[EvidenceDetail],
    neutral: list[EvidenceDetail],
    llm: Any = None,
    use_mock: bool = False
) -> Tuple[list[Conflict], AuditEntry]:
    """
    Analyze evidence for contradictions and methodological conflicts.
    """
    conflicts = []

    if use_mock or not llm:
        if contradicting:
            conflicts.append(Conflict(
                nature_of_conflict="DIRECT_CONTRADICTION",
                explanation="Mock heuristic found direct contradicting evidence.",
                conflicting_evidence_ids=[e.evidence_id for e in contradicting[:1]]
            ))
        audit = AuditEntry(
            agent_name="Adversarial Critic",
            stage="Conflict Analysis",
            message=f"Found {len(conflicts)} conflicts using mock heuristic.",
            status="complete"
        )
        return conflicts, audit

    # REAL MODE
    if not supporting and not contradicting:
        return [], AuditEntry(
            agent_name="Adversarial Critic",
            stage="Conflict Analysis",
            message="No evidence to compare.",
            status="complete"
        )

    supporting_text = "\n".join([f"- {e.evidence_id}: {e.text_span} (Context: {e.context})" for e in supporting])
    contradicting_text = "\n".join([f"- {e.evidence_id}: {e.text_span} (Context: {e.context})" for e in contradicting])

    prompt = PromptTemplate(template=CRITIC_PROMPT, input_variables=["supporting", "contradicting"])
    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "supporting": supporting_text or "None",
            "contradicting": contradicting_text or "None"
        })
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        parsed = json.loads(content.strip())
        
        for c_data in parsed:
            conflicts.append(Conflict(
                nature_of_conflict=c_data.get("nature_of_conflict", c_data.get("type", "UNKNOWN")),
                explanation=c_data.get("explanation", c_data.get("description", "Unknown conflict")),
                conflicting_evidence_ids=c_data.get("conflicting_evidence_ids", c_data.get("involved_evidence_ids", []))
            ))
            
    except Exception as e:
        logger.error(f"Adversarial critic failed: {e}")
        raise Exception(f"Adversarial critic failed: {e}")

    audit = AuditEntry(
        agent_name="Adversarial Critic",
        stage="Conflict Analysis",
        message=f"Identified {len(conflicts)} scientific conflicts.",
        status="complete"
    )

    return conflicts, audit
