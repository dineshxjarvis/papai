import json
import logging
from typing import Any

from models.schemas import (
    DetectedClaim, ClaimAtom, Coverage, EvidenceDetail, Conflict, AuditEntry,
    ClaimAnalysisResponse, EvidenceStrength, SaferWording
)
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

VERDICT_PROMPT = """You are a Scientific Verdict Generator.
Evaluate the claim based on the provided evidence coverage and conflicts.

Claim: {claim_text}

Coverage Status: {coverage_status}
Scope: {scope}

You need to provide:
1. Evidence Strength (0-100 score and description)
2. Safer Wording (if the original claim is too strong based on the scope)
3. Verdict: "supported", "partially_supported", "contradicted", or "insufficient"

Return a JSON object:
{{
  "evidence_strength": {{
    "score": 80,
    "description": "Multiple independent studies with large sample sizes."
  }},
  "safer_wording": {{
    "original_claim": "Claim text",
    "problem": "Too absolute, ignores dataset limitations.",
    "supported_scope": "Only verified on Dataset X",
    "suggested_wording": "The model achieves high accuracy on Dataset X."
  }},
  "verdict": "partially_supported"
}}
"""

async def run_verdict(
    claim: DetectedClaim,
    atoms: list[ClaimAtom],
    coverage: Coverage,
    scope: str,
    supporting: list[EvidenceDetail],
    contradicting: list[EvidenceDetail],
    neutral: list[EvidenceDetail],
    conflicts: list[Conflict],
    audit_trace: list[AuditEntry],
    llm: Any = None,
    use_mock: bool = False
) -> ClaimAnalysisResponse:
    """
    Produce the final structured verdict and ClaimAnalysisResponse.
    """
    if use_mock or not llm:
        if coverage.overall_status == "FULL":
            verdict = "supported"
        elif coverage.overall_status == "PARTIAL":
            verdict = "partially_supported"
        else:
            verdict = "insufficient"
            
        strength = EvidenceStrength(
            score=75,
            description="Mock evidence strength evaluation."
        )
        
        safer = SaferWording(
            original_claim=claim.claim_text,
            problem="Mock problem identification",
            supported_scope=scope,
            suggested_wording=f"It is suggested that {claim.claim_text.lower()}"
        )
        
    else:
        prompt = PromptTemplate(template=VERDICT_PROMPT, input_variables=["claim_text", "coverage_status", "scope"])
        chain = prompt | llm
        
        try:
            response = await chain.ainvoke({
                "claim_text": claim.claim_text,
                "coverage_status": coverage.overall_status,
                "scope": scope
            })
            
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            parsed = json.loads(content.strip())
            
            strength_data = parsed.get("evidence_strength", {})
            strength = EvidenceStrength(
                score=strength_data.get("score", 50),
                description=strength_data.get("description", "Unknown")
            )
            
            safer_data = parsed.get("safer_wording", {})
            safer = SaferWording(
                original_claim=safer_data.get("original_claim", claim.claim_text),
                problem=safer_data.get("problem", "Unknown problem"),
                supported_scope=safer_data.get("supported_scope", scope),
                suggested_wording=safer_data.get("suggested_wording", claim.claim_text)
            )
            
            verdict = parsed.get("verdict", "insufficient").lower()
            if verdict not in ["supported", "partially_supported", "contradicted", "insufficient"]:
                verdict = "insufficient"
                
        except Exception as e:
            logger.error(f"Verdict generation failed: {e}")
            raise Exception(f"Verdict generation failed: {e}")

    audit_entry = AuditEntry(
        agent_name="Verdict Engine",
        stage="Final Verdict",
        message=f"Produced verdict: {verdict}",
        status="complete"
    )
    audit_trace.append(audit_entry)

    response = ClaimAnalysisResponse(
        claim=claim,
        claim_id=claim.claim_id,
        verdict=verdict,
        coverage=coverage,
        scope=scope,
        evidence_strength=strength,
        claim_atoms=atoms,
        supporting_evidence=supporting,
        contradicting_evidence=contradicting,
        neutral_evidence=neutral,
        conflicts=conflicts,
        safer_wording=safer,
        audit_trace=audit_trace
    )
    
    return response
