import json
import logging
import re
from datetime import datetime
from typing import Optional, List

from models.schemas import DetectedClaim, AuditEntry

logger = logging.getLogger(__name__)


def _extract_claim_heuristic(text: str, claim_id: str = None) -> Optional[DetectedClaim]:
    """
    Heuristic-based claim extraction when LLM is unavailable.
    Filters non-checkable content.
    """
    if not claim_id:
        claim_id = f"CLM-{datetime.now().strftime('%H%M%S')}"
        
    # Reject short or non-checkable content
    if len(text.strip()) < 15:
        return None
    if re.search(r'^(figure|table|section|in this paper|we propose)', text, re.IGNORECASE):
        return None

    sentences = re.split(r'(?<=[.!?])\s+', text)
    claim_sentence = ""
    claim_type = "none"

    # Priority 1: Quantitative / Comparative
    for sent in sentences:
        if re.search(r'p\s*[<>=]\s*0\.\d+', sent, re.IGNORECASE) or re.search(r'\d+\.?\d*\s*%', sent):
            claim_sentence = sent.strip()
            claim_type = "quantitative"
            break
        if re.search(r'(better than|outperform|higher than|superior)', sent, re.IGNORECASE):
            claim_sentence = sent.strip()
            claim_type = "comparative"
            break

    # Priority 2: Causal / Performance
    if not claim_sentence:
        for sent in sentences:
            if re.search(r'(improves|reduces|increases|causes)', sent, re.IGNORECASE):
                claim_sentence = sent.strip()
                claim_type = "causal"
                break
            if re.search(r'(robust|limitation)', sent, re.IGNORECASE):
                claim_sentence = sent.strip()
                claim_type = "limitation"
                break

    if not claim_sentence:
        return None

    subject_match = re.search(r'(?:Compound|Drug|Treatment|Therapy|Agent|Model|Network|Approach)\s+[\w-]+', claim_sentence, re.IGNORECASE)
    subject = subject_match.group(0) if subject_match else "Unknown"

    pct_match = re.search(r'(\d+\.?\d*)\s*%', claim_sentence)
    value = f"{pct_match.group(1)}%" if pct_match else None

    return DetectedClaim(
        claim_id=claim_id,
        claim_text=claim_sentence,
        claim_type=claim_type,
        confidence=0.5,
        subject=subject,
        predicate="affects",
        value=value,
        evidence_required=True
    )


async def detect_claims_with_llm(sentences: list[dict], llm) -> List[Optional[DetectedClaim]]:
    """
    Use LangChain to intelligently extract primary scientific claims from a list of sentences.
    Returns a list of DetectedClaim objects or None for non-claims.
    """
    from langchain_core.prompts import PromptTemplate
    
    prompt = PromptTemplate.from_template(
        "You are the Claim Detection Agent. Analyze the following sentences and extract SCIENTIFIC CLAIMS.\n"
        "DETECT (is_claim = true) when the sentence:\n"
        "- Makes a comparative assertion (A outperforms B, higher than)\n"
        "- Reports a quantitative result (76.3% accuracy, p<0.01)\n"
        "- States a causal/technical effect (X improves Y)\n"
        "- Claims performance / SOTA\n"
        "- States a limitation or generalization\n"
        "DO NOT DETECT (is_claim = false) when the sentence:\n"
        "- Is general background\n"
        "- Describes what the paper does ('In this paper we propose')\n"
        "- Is a caption, heading, or obvious personal opinion\n\n"
        "PAY ATTENTION TO STRONG LANGUAGE (always, never, guaranteed) and preserve it in the text.\n\n"
        "SENTENCES:\n{sentences}\n\n"
        "Respond ONLY with a valid JSON array of objects (no markdown):\n"
        "[\n"
        "  {{\n"
        "    \"id\": \"sentence_id\",\n"
        "    \"is_claim\": boolean,\n"
        "    \"claim_text\": \"exact claim sentence\",\n"
        "    \"claim_type\": \"quantitative|comparative|causal|performance|limitation|generalization\",\n"
        "    \"confidence\": 0.95,\n"
        "    \"subject\": \"main subject\",\n"
        "    \"predicate\": \"relationship/action\",\n"
        "    \"metric\": \"accuracy, etc\",\n"
        "    \"value\": \"94%\",\n"
        "    \"comparison_target\": \"CNNs\"\n"
        "  }}\n"
        "]"
    )
    chain = prompt | llm
    
    sentences_json = json.dumps([{"id": s["id"], "text": s["current"]} for s in sentences], indent=2)
    
    try:
        result = await chain.ainvoke({"sentences": sentences_json})
        content = str(result.content).strip()
        
        if content.startswith("```"):
            content = re.sub(r'^```(?:json)?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)

        parsed = json.loads(content)
        claims = []
        
        for item in parsed:
            if not item.get("is_claim"):
                claims.append(None)
                continue
                
            claims.append(DetectedClaim(
                claim_id=item.get("id"),
                claim_text=item.get("claim_text", ""),
                claim_type=item.get("claim_type", "none"),
                confidence=float(item.get("confidence", 0.0)),
                subject=item.get("subject", "Unknown"),
                predicate=item.get("predicate", "affects"),
                metric=item.get("metric"),
                value=item.get("value"),
                comparison_target=item.get("comparison_target"),
                evidence_required=True
            ))
            
        return claims
    except Exception as e:
        logger.warning(f"LangChain claim detection failed, using heuristic: {e}")
        return [_extract_claim_heuristic(s["current"], s["id"]) for s in sentences]


async def run_claim_detection(text: str, llm=None) -> tuple[DetectedClaim, AuditEntry]:
    """
    Legacy entry point for single-text claim detection (used by graph/workflow.py).
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    sentence_dict = [{"id": f"CLM-{datetime.now().strftime('%H%M%S')}", "current": text}]
    
    if llm:
        claims = await detect_claims_with_llm(sentence_dict, llm)
        claim = claims[0] if claims and claims[0] else None
        method = "LangChain-powered extraction"
    else:
        claim = _extract_claim_heuristic(text, sentence_dict[0]["id"])
        method = "Heuristic pattern matching"
        
    if not claim:
        # Fallback if the text was deemed a non-claim but we must return one for the graph
        claim = DetectedClaim(
            claim_id=sentence_dict[0]["id"],
            claim_text=text,
            subject="Unknown",
            predicate="asserts",
            evidence_required=False
        )

    audit = AuditEntry(
        agent_name="Claim Detection Agent",
        timestamp=timestamp,
        description=f"Monitored document text. Parsed content using {method}.",
        details=f"Extracted logical claim: {claim.subject} → {claim.predicate} {claim.value or ''}.",
        status="complete",
    )

    logger.info(f"Claim detected: {claim.claim_text[:100]}...")
    return claim, audit
