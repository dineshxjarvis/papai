import React from "react";
import { CheckCircle, Loader2, XCircle, Circle } from "lucide-react";
import "./AgentPanel.css";

const AGENTS_ORDER = [
  "Claim Decomposer",
  "Query Expander",
  "Research Agent",
  "Relevance Ranker",
  "Evidence Extractor",
  "Adversarial Critic",
  "Verification",
  "Verdict Engine",
];

function StatusIcon({ status }) {
  if (status === "completed")
    return <CheckCircle size={14} style={{ color: "#16a34a" }} />;
  if (status === "running")
    return <Loader2 size={14} className="spin-icon" style={{ color: "#2563eb" }} />;
  if (status === "error")
    return <XCircle size={14} style={{ color: "#dc2626" }} />;
  return <Circle size={14} style={{ color: "#a1a1aa" }} />;
}

export default function AgentPanel({ trace = [], activeRun = null, isRunning = false }) {
  const latest = {};
  for (const step of trace) {
    if (step?.agent) latest[step.agent] = step;
  }

  const rows = AGENTS_ORDER.map((name) => {
    const step = latest[name];
    return {
      agent: name,
      status: step?.status || (isRunning ? "pending" : "idle"),
      detail: step?.detail || "",
      timestamp: step?.timestamp || null,
    };
  });

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>Agent Monitor</h3>
        {isRunning && <span className="agent-live-badge">LIVE</span>}
        {activeRun?.verdict && (
          <span className="agent-verdict-badge">
            {String(activeRun.verdict).replace(/_/g, " ")}
          </span>
        )}
      </div>
      <ul className="agent-timeline">
        {rows.map((row) => (
          <li key={row.agent} className={`agent-row status-${row.status}`}>
            <div className="agent-row-top">
              <StatusIcon status={row.status} />
              <span className="agent-name">{row.agent}</span>
              {row.timestamp && (
                <span className="agent-time">
                  {new Date(row.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            {row.detail ? <p className="agent-detail">{row.detail}</p> : null}
          </li>
        ))}
      </ul>
      {!trace.length && !isRunning && (
        <p className="agent-empty">
          Run <strong>Verify Evidence</strong> on a claim to see live agent steps.
        </p>
      )}
    </div>
  );
}
