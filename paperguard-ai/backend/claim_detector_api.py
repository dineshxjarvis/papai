from __future__ import annotations

import json
import os
from typing import Any, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PaperGuard Claim Detection API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are the Claim Detection Agent inside PaperGuard AI, a scientific evidence auditor.

Your job: decide whether a sentence from a research paper is a SCIENTIFIC CLAIM that asserts a finding, comparison, causal effect, or quantitative result.

DETECT (is_claim = true) when the sentence:
- Makes a comparative assertion (A outperforms B, higher than, better than…)
- Reports a quantitative result (76.3% accuracy, F1=0.91, p<0.01…)
- States a causal/technical effect (X improves Y, reduces error, increases throughput…)
- Claims performance / SOTA / significant improvement
- States a limitation of a method with assertive language

DO NOT DETECT (is_claim = false) when the sentence:
- Is a general background statement ("Deep learning is widely used in healthcare")
- Only describes what the paper does ("In this paper we propose…")
- Only states dataset size or implementation details without an asserted finding
- Is a caption, heading, or reference pointer

Return STRICT JSON only (no markdown):
{
  "is_claim": boolean,
  "claim_type": "comparative" | "quantitative" | "causal" | "performance" | "limitation" | "none",
  "confidence": number,
  "claim_span": string,
  "entities": {
    "method": string|null,
    "baseline": string|null,
    "metric": string|null,
    "value": string|null,
    "dataset": string|null
  },
  "polarity": "positive" | "negative" | "neutral",
  "reason": string
}"""

class SentenceIn(BaseModel):
    id: str
    prev: Optional[str] = None
    current: str
    next: Optional[str] = None

class DetectRequest(BaseModel):
    sentences: List[SentenceIn]

class DetectResponse(BaseModel):
    results: List[dict[str, Any]]

def call_openai(sentence_block: str) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    resp = client.chat.completions.create(
        model=os.getenv("CLAIM_MODEL", "gpt-4o-mini"),
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": sentence_block},
        ],
    )
    return json.loads(resp.choices[0].message.content)

@app.post("/api/detect-claims", response_model=DetectResponse)
def detect_claims(body: DetectRequest):
    results = []
    for s in body.sentences:
        block = f"""Previous sentence: {s.prev or "(none)"}
Current sentence: {s.current}
Next sentence: {s.next or "(none)"}
Classify the CURRENT sentence only."""
        try:
            data = call_openai(block)
            data["id"] = s.id
            data.setdefault("claim_span", s.current)
            results.append(data)
        except Exception as e:
            results.append({
                "id": s.id,
                "is_claim": False,
                "claim_type": "none",
                "confidence": 0.0,
                "claim_span": s.current,
                "entities": {"method": None, "baseline": None, "metric": None, "value": None, "dataset": None},
                "polarity": "neutral",
                "reason": f"LLM error: {e}",
            })
    return DetectResponse(results=results)

@app.get("/health")
def health():
    return {"status": "ok"}
