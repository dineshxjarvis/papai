"""
PaperGuard AI - FastAPI Backend
Main application with REST endpoints, WebSocket support, and CORS.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

import json
import os
import httpx
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

from config import settings
from models.schemas import ClaimAnalysisRequest, ClaimAnalysisResponse, DetectedClaim
from services.semantic_scholar import SemanticScholarClient
from services.websocket_manager import ws_manager
from graph.workflow import analysis_graph, make_initial_state

# ─── Logging Setup ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-30s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("paperguard")

# ─── LLM Initialization ─────────────────────────────────────────────────────

llm_instance = None


def _init_llm():
    """Initialize the LLM if an API key is available."""
    global llm_instance
    if settings.has_llm_key:
        try:
            from langchain_groq import ChatGroq
            llm_instance = ChatGroq(
                model=settings.GROQ_MODEL,
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.1,
            )
            logger.info(f"✓ LLM initialized: {settings.GROQ_MODEL}")
        except ImportError:
            logger.warning("langchain-groq not installed, running in mock mode")
        except Exception as e:
            logger.warning(f"LLM initialization failed: {e}")
    else:
        logger.info("No GROQ_API_KEY set — running in mock/heuristic mode")


# ─── Semantic Scholar Client ────────────────────────────────────────────────

scholar_client = SemanticScholarClient(api_key=settings.SEMANTIC_SCHOLAR_API_KEY or None)

# ─── FastAPI Lifecycle ──────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    _init_llm()
    mode = "MOCK" if settings.should_use_mock else "LIVE (Groq + Semantic Scholar)"
    logger.info(f"╔══════════════════════════════════════════╗")
    logger.info(f"║   PaperGuard AI Backend — {mode:<14s} ║")
    logger.info(f"╚══════════════════════════════════════════╝")
    yield
    logger.info("PaperGuard AI Backend shutting down")


# ─── App Creation ────────────────────────────────────────────────────────────

app = FastAPI(
    title="PaperGuard AI",
    description="Multi-agent scientific claim verification backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Endpoint ─────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "agents": 5,
        "mode": "mock" if settings.should_use_mock else "live",
        "llm_available": llm_instance is not None,
        "service": "PaperGuard AI",
    }


# ─── Claim Analysis Endpoint ────────────────────────────────────────────────

@app.post("/analyze-claim", response_model=ClaimAnalysisResponse)
async def analyze_claim(request: ClaimAnalysisRequest):
    """
    Analyze a scientific claim using the multi-agent pipeline.
    Runs the full LangGraph workflow.
    """
    if not request.claim.claim_text or len(request.claim.claim_text.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Claim text must be at least 5 characters long.",
        )

    logger.info(f"Starting analysis for structured claim: {request.claim.claim_text[:100]}...")

    use_mock = request.use_mock or settings.should_use_mock

    # Build initial state with canonical DetectedClaim
    initial_state = make_initial_state(
        detected_claim=request.claim,
        llm=llm_instance,
        scholar_client=scholar_client,
        use_mock=use_mock,
    )

    try:
        # Run the LangGraph workflow
        final_state = await analysis_graph.ainvoke(initial_state)

        # Check for errors
        if final_state.get("error"):
            raise HTTPException(
                status_code=500,
                detail=f"Analysis pipeline error: {final_state['error']}",
            )

        # Extract the final response
        response = final_state.get("final_response")
        if not response:
            raise HTTPException(
                status_code=500,
                detail="Analysis completed but no response was generated.",
            )

        logger.info(
            f"Analysis complete: {response.verdict}"
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
        )


# ─── WebSocket Endpoint ─────────────────────────────────────────────────────

@app.websocket("/ws/claim-monitor")
async def websocket_claim_monitor(websocket: WebSocket):
    """
    WebSocket endpoint for real-time agent status updates.
    Clients connect here to receive live progress during analysis.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive by listening for client messages
            data = await websocket.receive_text()
            # Echo acknowledgment
            await websocket.send_json({
                "type": "ack",
                "message": f"Received: {data}",
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        ws_manager.disconnect(websocket)
        logger.warning(f"WebSocket error: {e}")


# ─── Legacy / Frontend Support Endpoints ─────────────────────────────────────

@app.post("/api/verify")
async def verify_legacy(request: ClaimAnalysisRequest):
    # Temporarily override mock setting for this request
    original_mock = settings.USE_MOCK_DATA
    if request.use_mock:
        settings.USE_MOCK_DATA = True
    try:
        return await analyze_claim(request)
    finally:
        settings.USE_MOCK_DATA = original_mock

class SentenceIn(BaseModel):
    id: str
    prev: Optional[str] = None
    current: str
    next: Optional[str] = None

class DetectRequest(BaseModel):
    sentences: List[SentenceIn]

class DetectResponse(BaseModel):
    results: List[Optional[DetectedClaim]]

@app.post("/api/detect-claims", response_model=DetectResponse)
async def detect_claims(body: DetectRequest):
    sentences = [s.model_dump() for s in body.sentences]
    from agents.claim_detection import detect_claims_with_llm, _extract_claim_heuristic
    
    if llm_instance:
        claims = await detect_claims_with_llm(sentences, llm_instance)
    else:
        claims = [_extract_claim_heuristic(s["current"], s["id"]) for s in sentences]
        
    return DetectResponse(results=claims)

@app.get("/api/pdf-proxy")
async def pdf_proxy(url: str = Query(..., description="Target PDF URL to fetch")):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"Target URL returned {res.status_code}")
            content_type = res.headers.get("content-type", "application/pdf")
            return Response(content=res.content, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fetch failed: {str(e)}")


# ─── Run directly ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
