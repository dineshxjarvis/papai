import React from "react";
import { verdictLabel } from "../../phase3/mapVerdictToClaim";
import "./VerificationResult.css";

function EvidenceCard({ item, variant }) {
  if (!item) return null;
  const title = item.title || item.paperId || "Paper";
  const span = item.span || item.evidenceSpan;
  const section = item.section;
  const page = item.page;
  const source = item.source || item.evidenceSource;
  const quality = item.quality || item.evidenceQuality;
  const url = item.url;

  return (
    <div className={`evidence-card ${variant}`}>
      <p className="ev-title">{title}</p>
      {(section || page != null || source || quality) && (
        <p className="ev-meta">
          {section || "Body"}
          {page != null ? ` · p.${page}` : ""}
          {source ? ` · ${source}` : ""}
          {quality ? ` · ${quality}` : ""}
        </p>
      )}
      {span ? <p className="ev-span">“{span}”</p> : null}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          Open source
        </a>
      ) : null}
    </div>
  );
}

export default function VerificationResult({ result }) {
  if (!result) return null;

  const support = result.conflictMap?.support || [];
  const partial = result.conflictMap?.partial || [];
  const contradict = result.conflictMap?.contradict || [];
  const coverage = result.evidenceCoverage;

  return (
    <div className="verification-result">
      <h4>Show Me Why</h4>

      <div className={`verdict-banner verdict-${result.verdict}`}>
        <strong>{verdictLabel(result.verdict)}</strong>
        <span>
          Evidence strength: {result.evidenceQuality || "—"} · Verification:{" "}
          {result.verificationConfidence || "—"}
        </span>
      </div>

      {coverage && (
        <p className="coverage-line">
          Coverage: {coverage.matched}/{coverage.total} components
          {coverage.atomRatio != null
            ? ` · atoms ${Math.round(coverage.atomRatio * 100)}%`
            : ""}
        </p>
      )}

      {result.atomicClaims?.length > 0 && (
        <div className="atoms-block">
          <h5>Claim atoms</h5>
          <ul>
            {result.atomicClaims.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <h5>Supporting evidence</h5>
      {support.length === 0 && <p className="muted">None in this run</p>}
      {support.map((s, i) => (
        <EvidenceCard key={s.paperId || s.title || i} item={s} variant="support" />
      ))}

      {partial.length > 0 && (
        <>
          <h5>Partial matches</h5>
          {partial.map((s, i) => (
            <EvidenceCard
              key={s.paperId || s.title || i}
              item={s}
              variant="partial"
            />
          ))}
        </>
      )}

      <h5>Contradictions / limitations</h5>
      {contradict.length === 0 && <p className="muted">None found in this run</p>}
      {contradict.map((s, i) => (
        <EvidenceCard
          key={s.paperId || s.title || i}
          item={s}
          variant="contradict"
        />
      ))}
    </div>
  );
}
