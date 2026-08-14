const COMPARATIVE =
  /\b(outperform[s]?|better than|higher than|lower than|superior to|worse than|compared to|versus|vs\.?|more accurate|less accurate|exceeds|surpasses)\b/i;

const QUANTITATIVE =
  /\b(\d+(\.\d+)?\s*%|\baccuracy\b|\bf1\b|\bbleu\b|\bau[cro]\b|\bprecision\b|\brecall\b|\bmse\b|\brmse\b|\bp\s*[<≤]\s*0\.\d+|\btop-1\b|\btop-5\b|\bsota\b|state-of-the-art)\b/i;

const CAUSAL =
  /\b(improv(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|decreas(?:e|es|ed|ing)|leads? to|results? in|causes?|enhanc(?:e|es|ed)|degrad(?:e|es|ed)|boosts?|hurts?)\b/i;

const PERFORMANCE =
  /\b(achieves?|reaches?|attains?|obtains?|yields?|reports?|demonstrates?|shows? that|we show|we find|we observe)\b/i;

const LIMITATION =
  /\b(not statistically significant|no significant|fails? to|does not improve|limited by|only works|does not generalize|overfits?)\b/i;

const REJECT_PATTERNS = [
  /^(in this (paper|work|section|study)|we (propose|present|introduce|describe|consider)|this (paper|section|work) (presents|describes|introduces))/i,
  /^(the dataset (contains|consists|includes)|we use the|our (code|implementation|model) is (available|based))/i,
  /^(figure|table|equation|section|appendix)\s*\d+/i,
  /^(as shown in|see (figure|table)|refer to)/i,
  /^(the remainder of|the rest of this paper)/i,
];

const MIN_WORDS = 8;
const MAX_WORDS = 120;

export function scoreCandidate(sentence) {
  const text = (sentence || "").trim();
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length < MIN_WORDS || words.length > MAX_WORDS) {
    return { isCandidate: false, signals: ["length"], score: 0 };
  }

  for (const re of REJECT_PATTERNS) {
    if (re.test(text)) {
      return { isCandidate: false, signals: ["reject_pattern"], score: 0 };
    }
  }

  const signals = [];
  let score = 0;

  if (COMPARATIVE.test(text)) {
    signals.push("comparative");
    score += 3;
  }
  if (QUANTITATIVE.test(text)) {
    signals.push("quantitative");
    score += 3;
  }
  if (CAUSAL.test(text)) {
    signals.push("causal");
    score += 2;
  }
  if (PERFORMANCE.test(text)) {
    signals.push("performance");
    score += 2;
  }
  if (LIMITATION.test(text)) {
    signals.push("limitation");
    score += 2;
  }

  const hasMethodLike =
    /\b([A-Z][A-Za-z0-9]+(?:-[A-Z0-9]+)?|\bBERT\b|\bGPT\b|\bResNet\b|\bVGG\b|\bCNN\b|\bLSTM\b|\bTransformer\b)/.test(
      text
    );
  if (hasMethodLike && score > 0) score += 1;

  return {
    isCandidate: score >= 2,
    signals,
    score,
  };
}

export function filterCandidates(windows) {
  return windows
    .map((w) => {
      const result = scoreCandidate(w.current);
      return { ...w, ...result };
    })
    .filter((w) => w.isCandidate)
    .sort((a, b) => b.score - a.score);
}
