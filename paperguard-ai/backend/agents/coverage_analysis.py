import json
import logging
from typing import Tuple, Any

from models.schemas import ClaimAtom, EvidenceDetail, Conflict, Coverage, AuditEntry, AtomCoverage
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

COVERAGE_PROMPT = """You are a Coverage Analysis Expert.
Evaluate how well the evidence covers the claim atoms.

Atoms:
{atoms}

Evidence:
{evidence}

Conflicts:
{conflicts}

Determine:
1. overall_status: "FULL", "PARTIAL", "INSUFFICIENT"
2. gaps: Any missing evidence (e.g., "No evidence for performance on ImageNet").
3. scope: The verified scope (e.g., "Supported only in adult populations").
4. atom_coverage: A list of objects detailing coverage for each atom.

Return a JSON object:
{{
  "overall_status": "PARTIAL",
  "gaps": ["Missing evidence for Atom 2"],
  "scope": "Only verified for X, not Y",
  "atom_coverage": [
    {{
      "atom_id": "a1",
      "status": "SUPPORTED",
      "reason": "Clear evidence in Paper A"
    }}
  ]
}}
"""

async def run_coverage_analysis(
    atoms: list[ClaimAtom],
    supporting: list[EvidenceDetail],
    contradicting: list[EvidenceDetail],
    conflicts: list[Conflict],
    llm: Any = None,
    use_mock: bool = False
) -> Tuple[Coverage, str, AuditEntry]:
    """
    Determine atom-level coverage and overall claim scope.
    """
    if use_mock or not llm:
        if supporting and not contradicting:
            status = "FULL"
        elif supporting and contradicting:
            status = "PARTIAL"
        else:
            status = "INSUFFICIENT"
            
        coverage = Coverage(
            overall_status=status,
            gaps=["Mock gap heuristic"],
            atom_coverage=[AtomCoverage(atom_id=a.atom_id, status="SUPPORTED", reason="Mock reason") for a in atoms]
        )
        scope = "Mock scope verified."
        
        audit = AuditEntry(
            agent_name="Coverage Analysis",
            stage="Coverage",
            message=f"Determined {status} coverage using mock heuristics.",
            status="complete"
        )
        return coverage, scope, audit

    atoms_text = "\n".join([f"- {a.atom_id}: {a.text}" for a in atoms])
    evidence_text = f"Supporting: {len(supporting)}\nContradicting: {len(contradicting)}"
    conflicts_text = "\n".join([c.description for c in conflicts]) if conflicts else "None"

    prompt = PromptTemplate(template=COVERAGE_PROMPT, input_variables=["atoms", "evidence", "conflicts"])
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({
            "atoms": atoms_text,
            "evidence": evidence_text,
            "conflicts": conflicts_text
        })
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        parsed = json.loads(content.strip())
        
        raw_atom_coverage = parsed.get("atom_coverage", [])
        ac_list = []
        for ac in raw_atom_coverage:
            ac_list.append(AtomCoverage(
                atom_id=ac.get("atom_id", "unknown"),
                status=ac.get("status", "INSUFFICIENT"),
                reason=ac.get("reason", "Unknown")
            ))
            
        coverage = Coverage(
            overall_status=parsed.get("overall_status", "INSUFFICIENT"),
            gaps=parsed.get("gaps", []),
            atom_coverage=ac_list
        )
        scope = parsed.get("scope", "Unclear")
        
    except Exception as e:
        logger.error(f"Coverage analysis failed: {e}")
        raise Exception(f"Coverage analysis failed: {e}")

    audit = AuditEntry(
        agent_name="Coverage Analysis",
        stage="Coverage",
        message=f"Determined {coverage.overall_status} coverage.",
        status="complete"
    )

    return coverage, scope, audit
