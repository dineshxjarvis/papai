import asyncio
import os
from main import detect_claims, DetectRequest, SentenceIn, _init_llm

test_cases = [
    # QUANTITATIVE
    "Our model achieves 95% accuracy.",
    # COMPARATIVE
    "Transformer models outperform CNNs.",
    # CAUSAL
    "Increasing the learning rate improves convergence.",
    # PERFORMANCE
    "The proposed method reduces inference time by 40%.",
    # LIMITATION
    "The method is robust to noisy inputs.",
    # GENERALIZATION
    "The approach performs consistently across multiple datasets.",
    # NON-CLAIM
    "In this paper, we propose a new architecture.",
    # NON-CLAIM
    "The experiment was conducted using Python.",
    # NON-CLAIM
    "Figure 2 shows the proposed architecture.",
    # STRONG CLAIM
    "Transformer models always outperform CNNs.",
    # PARTIAL/COMPLEX CLAIM
    "Transformer models improve accuracy while reducing computational cost across all medical imaging datasets."
]

async def test():
    print("Testing Claim Detection...")
    _init_llm()
    sentences = [SentenceIn(id=f"t{i}", current=case) for i, case in enumerate(test_cases)]
    req = DetectRequest(sentences=sentences)
    
    res = await detect_claims(req)
    
    for i, claim in enumerate(res.results):
        print(f"\n[{i}] {test_cases[i]}")
        if claim:
            print(f"  -> Type: {claim.claim_type} | Conf: {claim.confidence}")
            print(f"  -> Subject: {claim.subject} | Predicate: {claim.predicate} | Value: {claim.value}")
        else:
            print("  -> REJECTED (Non-claim)")

if __name__ == "__main__":
    asyncio.run(test())
