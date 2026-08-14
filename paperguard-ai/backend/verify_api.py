from __future__ import annotations

from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from langgraph_pipeline import run_langgraph_verification

load_dotenv()

app = FastAPI(title="PaperGuard LangGraph Verify", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VerifyRequest(BaseModel):
    text: str = Field(..., min_length=5)
    id: str = "claim"
    entities: Optional[Dict[str, Any]] = None
    useMock: bool = False


@app.get("/health")
def health():
    return {"status": "ok", "orchestrator": "langgraph"}


@app.post("/api/verify")
def verify(body: VerifyRequest):
    return run_langgraph_verification(
        claim_text=body.text,
        claim_id=body.id,
        entities=body.entities or {},
        use_mock=body.useMock,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("verify_api:app", host="0.0.0.0", port=8000, reload=True)
