import React, { useState } from "react";
import "./Phase4.css";

function StrengthBars({ bars, tone }) {
  return (
    <span className="p4-bars">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={i < bars ? `on ${tone}` : ""} />
      ))}
    </span>
  );
}

export default function VerificationResultCard({
  vm,
  stale = false,
  onVerifyCurrent,
  onOpenWhy,
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showWhyNot, setShowWhyNot] = useState(true);

  if (!vm) return null;

  const coverageChips = (vm.coverage?.rows || []).filter(
    (r) => r.status !== "missing" && (r.value || r.status === "matched")
  );

  return (
    <div className="p4-root">
      <div className="p4-scroll">
        {stale && (
          <div className="p4-stale">
            <strong>Claim changed</strong>
            <div>
              This verification was started for an earlier version of this claim.
            </div>
            {onVerifyCurrent && (
              <button
                type="button"
                className="p4-btn"
                style={{ marginTop: 8 }}
                onClick={onVerifyCurrent}
              >
                Verify Current Claim
              </button>
            )}
          </div>
        )}

        <div className={`p4-result-card ${vm.tone}`}>
          <p className="p4-verdict">{vm.verdictLabel}</p>

          <div className="p4-strength-row">
            <span>Evidence strength</span>
            <StrengthBars bars={vm.strength.bars} tone={vm.strength.tone} />
            <strong>{vm.strength.level}</strong>
          </div>

          <div className="p4-meta">
            {vm.strength.supportingPapers} supporting · {vm.strength.limitations}{" "}
            limitation
            {vm.strength.evidenceSpans
              ? ` · ${vm.strength.evidenceSpans} spans`
              : ""}
            <br />
            Assessment confidence: {vm.strength.assessmentConfidence}
          </div>

          <div className="p4-scope">
            <strong>Verification scope</strong>
            <div>
              {vm.scope.papersAnalyzed} papers analyzed · {vm.scope.fullText}{" "}
              full-text · {vm.scope.abstractOnly} abstract-only
            </div>
            <div>
              {vm.scope.supporting} supporting · {vm.scope.contradicting}{" "}
              contradicting · Adversarial search: {vm.scope.adversarialSearch}
            </div>
            {vm.scope.fullText === 0 && (
              <div className="p4-empty" style={{ marginTop: 4 }}>
                No full-text evidence available.
              </div>
            )}
          </div>

          {coverageChips.length > 0 && (
            <div className="p4-coverage">
              {coverageChips.map((r) => (
                <span key={r.key} className={`p4-chip ${r.status}`}>
                  {r.status === "matched" ? "✓" : "?"} {r.label}
                  {r.value ? `: ${r.value}` : ""}
                </span>
              ))}
              <span className="p4-chip">
                Coverage {vm.coverage.matched}/{vm.coverage.total}
              </span>
            </div>
          )}

          {vm.whyNot.show && (
            <div className="p4-why">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <strong>⚠ {vm.whyNot.title}</strong>
                <button
                  type="button"
                  className="p4-btn ghost"
                  style={{ padding: "4px 8px", flexShrink: 0 }}
                  onClick={() => setShowWhyNot((v) => !v)}
                >
                  {showWhyNot ? "Hide" : "Details"}
                </button>
              </div>
              {showWhyNot && (
                <>
                  <div style={{ marginTop: 6 }}>{vm.whyNot.summary}</div>
                  <ul>
                    {vm.whyNot.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="p4-actions">
            <button
              type="button"
              className="p4-btn"
              onClick={() => setShowEvidence((v) => !v)}
            >
              {showEvidence ? "Hide evidence" : "Evidence"}
            </button>
            <button type="button" className="p4-btn ghost" onClick={onOpenWhy}>
              Show Me Why
            </button>
          </div>
        </div>

        {showEvidence && (
          <div>
            <div className="p4-section-title">Supporting</div>
            {vm.support.length === 0 ? (
              <div className="p4-empty">No supporting evidence in this run.</div>
            ) : (
              vm.support.map((e, i) => (
                <div key={i} className="p4-ev-card support">
                  <span className="p4-ev-badge yes">Supporting</span>
                  <p className="p4-ev-title">{e.title}</p>
                  {e.span ? <p className="p4-ev-span">“{e.span}”</p> : null}
                  <div className="p4-meta">
                    {e.source} · {e.quality}
                  </div>
                  {e.link && (
                    <a
                      className="p4-ev-link"
                      href={e.link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.link.label} ↗
                    </a>
                  )}
                </div>
              ))
            )}

            <div className="p4-section-title">Contradicting / Limitations</div>
            {vm.contradict.length === 0 ? (
              <div className="p4-empty">No contradiction found in top results.</div>
            ) : (
              vm.contradict.map((e, i) => (
                <div key={i} className="p4-ev-card contradict">
                  <span className="p4-ev-badge no">Contradicting</span>
                  <p className="p4-ev-title">{e.title}</p>
                  {e.span ? <p className="p4-ev-span">“{e.span}”</p> : null}
                  {e.link && (
                    <a
                      className="p4-ev-link"
                      href={e.link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.link.label} ↗
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {vm.alternatives?.length > 0 && (
          <div>
            <div className="p4-section-title">Safer wording</div>
            {vm.alternatives.map((a) => (
              <div key={a.id} className="p4-alt">
                <div className="label">{a.label}</div>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
