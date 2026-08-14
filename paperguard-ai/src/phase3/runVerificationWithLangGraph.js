import { runVerificationPipeline } from "./pipeline.js";
import { isLangGraphEnabled, runLangGraphVerification } from "./langGraphClient.js";

export async function runVerification(claim, options = {}) {
  const { onProgress } = options;

  if (isLangGraphEnabled()) {
    onProgress?.({
      agent: "LangGraph Orchestrator",
      status: "running",
      detail: "Starting StateGraph…",
    });
    try {
      // Intercept websocket updates
      const wsOpts = {
        ...options,
        onStatusUpdate: (msg) => {
          onProgress?.({
            agent: msg.agent_name || "LangGraph Agent",
            status: msg.status || "running",
            detail: msg.message || "Working...",
          });
        }
      };
      
      const result = await runLangGraphVerification(claim, wsOpts);
      
      for (const step of result.audit_trace || []) {
        onProgress?.({
          agent: step.agent_name,
          status: step.status,
          detail: step.message,
          trace: result.audit_trace,
        });
      }
      return result;
    } catch (e) {
      console.error("[verify] LangGraph failed:", e.message);
      throw e;
    }
  }

  // If LangGraph is not enabled, throw an error because it is required now
  throw new Error("LangGraph verification is disabled in the environment. Set VITE_USE_LANGGRAPH=true in .env");
}
