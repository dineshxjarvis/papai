const COMPARISON_RE =
  /\b(outperforms?|better than|higher than|higher \w+ than|lower than|lower \w+ than|worse than|superior to|inferior to|compared (to|with)|versus|vs\.?|relative to|exceeds?|surpasses?)\b/i;

const QUANTITATIVE_RE =
  /(\d+(\.\d+)?\s*%|\b(accuracy|precision|recall|f1|bleu|rouge|auc|map|rmse|mae|p\s*[<>=]\s*\d|ci\s*[=:]|confidence interval|effect size|odds ratio|hazard ratio)\b)/i;

const CAUSAL_ANCHORED =
  /\b(improves?|reduces?|increases?|decreases?|leads to|results in|causes?|enhances?|degrades?|boosts?|hurts?)\b[\s\S]{0,40}\b(accuracy|performance|error|loss|score|bleu|f1|auc|precision|recall|by\s+\d|significantly|substantially)\b/i;

const PERFORMANCE_RE =
  /\b(state[- ]of[- ]the[- ]art|sota|achieves?|reaches?|attains?|obtains?|reports?|demonstrates?|shows that|we (show|find|observe|demonstrate))\b/i;

const LIMITATION_RE =
  /\b(limitation|however|although|despite|fail(s|ed)? to|does not|cannot|unable to|only when|restricted to|not statistically significant)\b/i;

const REJECT_RE =
  /^(in this (paper|work|study|section)|we propose|we present|we introduce|the (goal|aim|purpose) of|this paper is organized|the remainder of|figure \d+|table \d+)/i;

export function isCandidate(sentence) {
  if (!sentence || sentence.length < 25) return false;
  if (sentence.length > 600) return false;

  const hasSignal =
    COMPARISON_RE.test(sentence) ||
    QUANTITATIVE_RE.test(sentence) ||
    CAUSAL_ANCHORED.test(sentence) ||
    PERFORMANCE_RE.test(sentence) ||
    LIMITATION_RE.test(sentence);

  // Soft reject: meta openings only die if they have NO claim signal
  if (REJECT_RE.test(sentence.trim()) && !hasSignal) {
    return false;
  }

  return hasSignal;
}

export function filterCandidates(sentences) {
  return sentences.filter((s) => isCandidate(s.text));
}
