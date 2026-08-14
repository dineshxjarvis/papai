import json
from datetime import datetime
from typing import Any, Tuple
import logging

from models.schemas import DetectedClaim, ClaimAtom, AuditEntry
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

DECOMPOSITION_PROMPT = """You are an expert scientific claim analyzer.
You will be given a primary scientific claim.
Your task is to decompose this claim into one or more atomic assertions (ClaimAtoms).

A complex claim like: "Our Transformer model achieves higher accuracy than CNNs while reducing computational cost across all medical imaging datasets."
Should be decomposed into:
1. Transformer model achieves higher accuracy than CNNs.
2. Transformer model reduces computational cost.
3. These results apply across all medical imaging datasets.

Do not over-decompose simple claims. If a claim is already atomic, just return it as a single atom.

For each atom, extract:
- text: The atomic claim text
- subject: What is the claim about
- predicate: The action or relationship (e.g., improves, outperforms)
- object_value: The target or value (e.g., CNNs, 95%)
- metric: The metric being measured (if any)
- scope: Any scope limitation (e.g., "on medical imaging datasets")
- strength_qualifier: Any strong qualifier word used (e.g., always, never, all, every, best, universally) - ONLY if present in the text!

Return ONLY a valid JSON array of objects.
Example output:
[
  {{
    "text": "Transformer model achieves higher accuracy than CNNs.",
    "subject": "Transformer model",
    "predicate": "achieves higher than",
    "object_value": "CNNs",
    "metric": "accuracy",
    "scope": "None",
    "strength_qualifier": "None"
  }}
]

Original Claim:
{claim_text}
"""

async def run_claim_decomposition(claim: DetectedClaim, llm: Any = None, use_mock: bool = False) -> Tuple[list[ClaimAtom], AuditEntry]:
    """
    Decompose a complex claim into atomic assertions.
    """
    start_time = datetime.now()
    atoms = []

    if use_mock or not llm:
        atoms.append(ClaimAtom(
            atom_id=f"{claim.claim_id}_a1",
            text=claim.claim_text,
            subject=claim.subject,
            predicate=claim.predicate,
            object_value=claim.value or claim.comparison_target,
            metric=claim.metric
        ))
        audit = AuditEntry(
            agent_name="Claim Decomposer",
            stage="Decomposition",
            message=f"Mock decomposition into 1 atom.",
            relevant_ids=[a.atom_id for a in atoms],
            status="complete"
        )
        return atoms, audit

    try:
        prompt = PromptTemplate(template=DECOMPOSITION_PROMPT, input_variables=["claim_text"])
        chain = prompt | llm
        
        response = await chain.ainvoke({"claim_text": claim.claim_text})
        
        # Extract JSON block
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        parsed = json.loads(content.strip())
        
        for i, atom_data in enumerate(parsed):
            atom = ClaimAtom(
                atom_id=f"{claim.claim_id}_a{i+1}",
                text=atom_data.get("text", claim.claim_text),
                subject=atom_data.get("subject", claim.subject),
                predicate=atom_data.get("predicate", claim.predicate),
                object_value=atom_data.get("object_value"),
                metric=atom_data.get("metric"),
                scope=atom_data.get("scope"),
                strength_qualifier=atom_data.get("strength_qualifier")
            )
            if str(atom.strength_qualifier).lower() == "none":
                atom.strength_qualifier = None
            atoms.append(atom)
            
    except Exception as e:
        logger.error(f"LLM Decomposition failed: {e}")
        raise Exception(f"Claim decomposition failed: {e}")

    audit = AuditEntry(
        agent_name="Claim Decomposer",
        stage="Decomposition",
        message=f"Decomposed claim into {len(atoms)} atoms.",
        relevant_ids=[a.atom_id for a in atoms],
        status="complete"
    )

    return atoms, audit
