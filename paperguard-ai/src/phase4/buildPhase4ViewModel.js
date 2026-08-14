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
  inconclusive: "INCONCLUSIVE",
};

const VERDICT_TONE = {
  supported: "green",
  partially_supported: "yellow",
  contradicted: "red",
  insufficient: "gray",
  inconclusive: "yellow",
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

/**
 * Normalise the backend verdict string to a consistent lowercase key.
 * Backend may send "Inconclusive", "partially_supported", "SUPPORTED", etc.
 */
function normalizeVerdict(raw) {
  if (!raw) return "insufficient";
  const v = String(raw).toLowerCase().replace(/[^a-z_]/g, "").trim();
  if (v.includes("support") && v.includes("partial")) return "partially_supported";
  if (v.includes("support")) return "supported";
  if (v.includes("contradict")) return "contradicted";
  if (v.includes("inconclusive")) return "inconclusive";
  if (v.includes("insufficient")) return "insufficient";
  return "insufficient";
}

/**
 * Extract supporting + contradicting evidence from either the new backend format
 * (key_papers with stance field) or the old format (supporting_evidence / contradicting_evidence arrays).
 */
function extractEvidence(result) {
  // New backend format: key_papers with stance
  if (Array.isArray(result.key_papers) && result.key_papers.length > 0) {
    const supporting = result.key_papers.filter(
      (p) => p.stance === "supports" || p.stance === "supporting"
    );
    const contradicting = result.key_papers.filter(
      (p) => p.stance === "contradicts" || p.stance === "contradicting"
    );
    return { supporting, contradicting };
  }

  // Old format
  return {
    supporting: result.supporting_evidence || [],
    contradicting: result.contradicting_evidence || [],
  };
}

/**
 * Map a paper object (from either backend format) to a UI evidence card.
 */
function mapPaper(p, isSupport) {
  // New backend format (key_papers)
  const title = p.paper_title || p.title || "Untitled";
  const span = p.text_span || p.relevance_summary || p.abstract?.slice(0, 200) || "";
  const url = p.source_url || p.url || (p.doi ? `https://doi.org/${p.doi}` : null);
  const source = p.source || (url ? guessSource(url) : "publisher");

  return {
    title,
    span,
    quality: isSupport ? "strong" : "weak",
    source: p.source || p.journal || sourceLabel(source),
    year: p.year,
    citations: p.citation_count,
    link: url ? { url, source, label: sourceLabel(source) } : null,
  };
}

export function buildPhase4ViewModel(claim, result) {
  if (!result) return null;

  const verdict = normalizeVerdict(result.verdict);
  const { supporting, contradicting } = extractEvidence(result);

  // Build scope — handle both format shapes
  let scope;
  try {
    scope = buildVerificationScope(result);
  } catch (_) {
    scope = {
      papersAnalyzed: (result.key_papers || []).length,
      supporting: supporting.length,
      contradicting: contradicting.length,
    };
  }

  let coverage, whyNot, strength, alternatives;
  try { coverage = buildClaimCoverage(result, claim); } catch (_) { coverage = { matched: 0, total: 0, rows: [] }; }
  try { whyNot = buildWhyNotFullySupported(result); } catch (_) { whyNot = []; }
  try { strength = buildEvidenceStrength(result); } catch (_) {
    strength = {
      assessmentConfidence: result.confidence_score ? `${Math.round(result.confidence_score)}%` : "—",
      supportingPapers: supporting.length,
    };
  }
  try { alternatives = suggestAlternatives(claim, result); } catch (_) { alternatives = []; }

  // Audit atoms — use claim_atoms or evidence_chain steps
  const atoms = result.claim_atoms ||
    (result.evidence_chain || []).map((step) =>
      typeof step.content === "object"
        ? JSON.stringify(step.content)
        : String(step.content || "")
    );

  return {
    verdict,
    verdictLabel: VERDICT_LABEL[verdict] || String(result.verdict || verdict).toUpperCase(),
    tone: VERDICT_TONE[verdict] || "gray",
    scope,
    coverage,
    whyNot,
    strength,
    alternatives,
    support: supporting.map((e) => mapPaper(e, true)),
    contradict: contradicting.map((e) => mapPaper(e, false)),
    audit: {
      claimText: claim?.text || result.claim?.claim_text || result.detected_claim?.claim_text || "",
      atoms,
      entities: result.claim?.subject
        ? { subject: result.claim.subject }
        : result.detected_claim
        ? { subject: result.detected_claim.subject, outcome: result.detected_claim.outcome }
        : {},
      queries: (result.audit_trace || [])
        .filter((t) => t.agent_name?.toLowerCase().includes("research"))
        .map((t) => ({ channel: "Semantic Scholar", q: t.details || "" })),
      papers: (result.key_papers || []).map((p) => ({
        title: p.title || p.paper_title,
        year: p.year,
        url: p.url,
      })),
      evidence: (result.evidence_details || []).map((e) => ({
        evidenceSpan: e.key_finding || "",
        supportsClaim: supporting.some((s) => s.title === e.paper_title || s.paper_title === e.paper_title),
      })),
      coverage: result.coverage || {},
      conflictMap: {
        support: supporting,
        contradict: contradicting,
      },
      verdict,
      orchestrator: "LangGraph",
    },
  };
}
