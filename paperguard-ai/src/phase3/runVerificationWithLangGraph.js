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
      const result = await runLangGraphVerification(claim, options);
      for (const step of result.trace || []) {
        onProgress?.({
          agent: step.agent,
          status: step.status,
          detail: step.detail,
          trace: result.trace,
        });
      }
      return result;
    } catch (e) {
      console.warn("[verify] LangGraph failed, JS fallback:", e.message);
    }
  }

  return runVerificationPipeline(claim, options);
}
