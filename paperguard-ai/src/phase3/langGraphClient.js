function baseUrl() {
  try {
    return (import.meta.env?.VITE_LANGGRAPH_URL || "http://localhost:8000").replace(/\/$/, "");
  } catch {
    return "http://localhost:8000";
  }
}

export function isLangGraphEnabled() {
  try {
    return import.meta.env?.VITE_USE_LANGGRAPH === "true";
  } catch {
    return false;
  }
}

export async function runLangGraphVerification(claim, opts = {}) {
  const wsUrl = baseUrl().replace("http://", "ws://").replace("https://", "wss://") + "/ws/claim-monitor";
  let ws = null;
  
  try {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Claim Monitor]:", data);
        if (opts.onStatusUpdate) {
          opts.onStatusUpdate(data);
        }
      } catch (e) {
        console.log("[Claim Monitor Raw]:", event.data);
      }
    };
    ws.onopen = () => console.log("[Claim Monitor] Connected");
    ws.onerror = (err) => console.error("[Claim Monitor] Error", err);
  } catch (err) {
    console.error("Failed to connect to WebSocket:", err);
  }

  try {
    const res = await fetch(`${baseUrl()}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify({
        claim: {
          claim_id: claim.id || "claim",
          claim_text: claim.text || "",
          claim_type: claim.claimType || "none",
          confidence: (claim.confidence || 0) / 100, // convert percentage back to 0-1
          subject: claim.entities?.method || "Unknown",
          predicate: "affects",
          value: claim.entities?.value || null,
          comparison_target: claim.entities?.baseline || null,
          evidence_required: true,
        },
        document_id: claim.id || "claim",
        use_mock: Boolean(opts.useMock)
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`LangGraph API ${res.status}: ${t.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    if (ws) {
      ws.close();
      console.log("[Claim Monitor] Disconnected");
    }
  }
}
