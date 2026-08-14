from __future__ import annotations

import httpx
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PaperGuard PDF Proxy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "PaperGuard PDF Proxy API",
        "endpoints": ["/health", "/api/pdf-proxy?url="],
    }

@app.get("/health")
def health():
    return {"status": "ok"}

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
