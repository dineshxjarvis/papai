/**
 * Query Expander — support + adversarial queries from atomic entities
 * Mostly deterministic templates; optional LLM polish
 */

export function expandQueries(decomposition, claimText) {
  const { method = [], baseline = [], dataset = [], metric = [], value = [] } = decomposition;
  const m = method[0] || "";
  const b = baseline[0] || "";
  const d = dataset[0] || "";
  const met = metric[0] || "";
  const v = value[0] || "";

  const support = [];
  const adversarial = [];

  if (m && d && met) support.push(`${m} ${d} ${met}`);
  if (m && d) support.push(`${m} ${d} accuracy`);
  if (m && b && d) support.push(`${m} vs ${b} ${d}`);
  if (m && v) support.push(`"${m}" "${v}"`);
  if (m && met && v) support.push(`${m} ${met} ${v}`);
  if (!support.length) support.push(claimText.slice(0, 120));

  if (m) {
    adversarial.push(`${m} limitations`);
    adversarial.push(`${m} does not improve`);
    adversarial.push(`${m} not statistically significant`);
    if (d) adversarial.push(`${m} ${d} failure OR poor performance`);
    if (d && /medical|clinical|healthcare/i.test(claimText)) {
      adversarial.push(`${m} medical imaging domain shift`);
      adversarial.push(`${m} small dataset medical`);
    }
  } else {
    adversarial.push(`${claimText.slice(0, 80)} limitations`);
  }

  const queries = [
    ...support.slice(0, 4).map((q) => ({ q, channel: "support" })),
    ...adversarial.slice(0, 4).map((q) => ({ q, channel: "adversarial" })),
  ];

  // dedupe
  const seen = new Set();
  return queries.filter(({ q }) => {
    const k = q.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
