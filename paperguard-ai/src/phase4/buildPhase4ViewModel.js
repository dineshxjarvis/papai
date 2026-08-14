import { buildVerificationScope } from "./buildScope.js";
import { buildClaimCoverage } from "./buildCoverage.js";
import { buildWhyNotFullySupported } from "./buildWhyNotFull.js";
import { buildEvidenceStrength } from "./buildStrength.js";
import { suggestAlternatives } from "./suggestAlternatives.js";

const VERDICT_LABEL = {
  supported: "SUPPORTED",
  partially_supported: "PARTIALLY SUPPORTED",
  contradicted: "CONTRADICTED",
  insufficient: "INSUFFICIENT",
};

const VERDICT_TONE = {
  supported: "green",
  partially_supported: "yellow",
  contradicted: "red",
  insufficient: "gray",
};

function guessSource(url) {
  if (!url) return null;
  if (/arxiv/i.test(url)) return "arxiv";
  if (/semanticscholar/i.test(url)) return "s2";
  return "publisher";
}

function sourceLabel(source) {
  if (source === "arxiv") return "arXiv";
  if (source === "s2") return "Semantic Scholar";
  if (source === "publisher") return "Publisher";
  return "Open Paper";
}

export function buildPhase4ViewModel(claim, result) {
  if (!result) return null;

  const verdict = result.verdict || "insufficient";
  const scope = buildVerificationScope(result);
  const coverage = buildClaimCoverage(result, claim);
  const whyNot = buildWhyNotFullySupported(result);
  const strength = buildEvidenceStrength(result);
  const alternatives = suggestAlternatives(claim, result);

  const support = (result.evidence || []).filter((e) => e.supportsClaim === "yes");
  const contradict = (result.evidence || []).filter(
    (e) => e.supportsClaim === "no" || e.channel === "adversarial"
  );

  const openPaper = (e) => {
    const url = e?.paper?.url || e?.url || null;
    const source = e?.paper?.source || e?.source || guessSource(url);
    return url ? { url, source, label: sourceLabel(source) } : null;
  };

  return {
    verdict,
    verdictLabel: VERDICT_LABEL[verdict] || verdict,
    tone: VERDICT_TONE[verdict] || "gray",
    scope,
    coverage,
    whyNot,
    strength,
    alternatives,
    support: support.map((e) => ({
      title: e.paper?.title || "Untitled",
      span: e.evidenceSpan || "",
      quality: e.evidenceQuality || "weak",
      source: e.evidenceSource || "abstract",
      link: openPaper(e),
    })),
    contradict: contradict.map((e) => ({
      title: e.paper?.title || "Untitled",
      span: e.evidenceSpan || "",
      quality: e.evidenceQuality || "weak",
      source: e.evidenceSource || "abstract",
      link: openPaper(e),
    })),
    audit: {
      claimText: claim?.text || "",
      atoms: result.atomicClaims || [],
      entities: result.entities || claim?.entities || {},
      queries: result.queries || [],
      papers: result.papers || [],
      evidence: result.evidence || [],
      conflictMap: result.conflictMap || { support: [], contradict: [] },
      coverage,
      verdict,
      trace: result.trace || [],
      orchestrator: result.orchestrator || "pipeline",
    },
  };
}
