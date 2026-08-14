import React from "react";
import "./Phase4.css";
import { evidenceSupportLabel } from "../../phase4/evidenceLabel.js";

function Step({ title, children, isLast }) {
  return (
    <div className="p4-step">
      <div className="p4-step-rail">
        <div className="p4-step-dot" />
        {!isLast && <div className="p4-step-line" />}
      </div>
      <div className="p4-step-content">
        <h5>{title}</h5>
        {children}
      </div>
    </div>
  );
}

export default function ShowMeWhy({ audit, onClose }) {
  if (!audit) return null;

  const queries = audit.queries || [];
  const papers = audit.papers || [];
  const evidence = audit.evidence || [];
  const entities = Object.entries(audit.entities || {}).filter(([, v]) => v);

  return (
    <div className="p4-drawer-overlay" role="dialog" aria-label="Show Me Why">
      <div className="p4-drawer">
        <div className="p4-drawer-header">
          <span>← Show Me Why</span>
          <button type="button" className="p4-btn ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="p4-drawer-body">
          <div className="p4-stepper">
            <Step title="Claim">
              <p>{audit.claimText || "—"}</p>
            </Step>

            <Step title="Atoms">
              {entities.length === 0 && !(audit.atoms || []).length ? (
                <p className="p4-empty">No atoms extracted.</p>
              ) : (
                <ul>
                  {entities.map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> {String(v)}
                    </li>
                  ))}
                  {(audit.atoms || []).map((a, i) => (
                    <li key={`a${i}`}>{a}</li>
                  ))}
                </ul>
              )}
            </Step>

            <Step title="Queries">
              {queries.length === 0 ? (
                <p className="p4-empty">No queries recorded.</p>
              ) : (
                <ul>
                  {queries.map((q, i) => (
                    <li key={i}>
                      <strong>[{q.channel}]</strong> {q.q}
                    </li>
                  ))}
                </ul>
              )}
            </Step>

            <Step title="Papers">
              {papers.length === 0 ? (
                <p className="p4-empty">No papers retrieved.</p>
              ) : (
                <ul>
                  {papers.slice(0, 10).map((p, i) => (
                    <li key={i}>
                      {p.title}
                      {p.year ? ` (${p.year})` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Step>

            <Step title="Evidence">
              {evidence.length === 0 ? (
                <p className="p4-empty">No evidence spans.</p>
              ) : (
                <ul>
                  {evidence.map((e, i) => {
                    const lab = evidenceSupportLabel(e.supportsClaim);
                    return (
                      <li key={i}>
                        <span className={`p4-support-tag ${lab.key}`}>
                          {lab.text}
                        </span>
                        {e.evidenceSpan
                          ? e.evidenceSpan.slice(0, 180)
                          : "(no span text)"}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Step>

            <Step title="Coverage">
              <p>
                {audit.coverage?.matched ?? "—"}/{audit.coverage?.total ?? "—"}{" "}
                components matched
              </p>
            </Step>

            <Step title="Conflict">
              <p>
                Support: {(audit.conflictMap?.support || []).length}
                {" · "}
                Contradict: {(audit.conflictMap?.contradict || []).length}
              </p>
            </Step>

            <Step title="Verdict" isLast>
              <p>
                <strong>{String(audit.verdict || "").toUpperCase()}</strong>
                {audit.orchestrator ? ` · via ${audit.orchestrator}` : ""}
              </p>
            </Step>
          </div>
        </div>
      </div>
    </div>
  );
}
