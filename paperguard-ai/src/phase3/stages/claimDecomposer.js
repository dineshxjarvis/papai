/**
 * Claim Decomposer — break claim into atomic components
 * LLM primary; deterministic fallback from Phase 2 entities
 */

import { phase3LLM } from "../services/llm.js";

const SYSTEM = `You decompose scientific claims into atomic components for evidence verification.
Return ONLY JSON:
{
  "method": string[],
  "baseline": string[],
  "dataset": string[],
  "metric": string[],
  "value": string[],
  "polarity": "positive"|"negative"|"neutral",
  "relationship": "higher-than"|"lower-than"|"equals"|"improves"|"reduces"|"reports"|"other"|null,
  "atomicClaims": string[],
  "specificity": "high"|"medium"|"low"
}
atomicClaims = minimal checkable statements (e.g. "ResNet-50 evaluated on ImageNet", "Top-1 accuracy is 76.3%", "ResNet-50 > VGG-16").
Be strict. Do not invent entities not present or clearly implied.`;

function fallbackDecompose(claim) {
  const text = claim.text || "";
  const ent = claim.entities || {};
  const method = [ent.method].filter(Boolean);
  const baseline = [ent.baseline].filter(Boolean);
  const dataset = [ent.dataset].filter(Boolean);
  const metric = [ent.metric].filter(Boolean);
  const value = [ent.value].filter(Boolean);

  // light regex fill
  const m = text.match(/\b(ResNet-?\d*|VGG-?\d*|BERT|GPT-?\d*|LSTM|Transformer|CNN|YOLO)\b/gi) || [];
  m.forEach((x) => {
    if (!method.map((y) => y.toLowerCase()).includes(x.toLowerCase())) method.push(x);
  });
  const ds = text.match(/\b(ImageNet|CIFAR-?\d*|COCO|SQuAD|GLUE|MNIST)\b/gi) || [];
  ds.forEach((x) => {
    if (!dataset.map((y) => y.toLowerCase()).includes(x.toLowerCase())) dataset.push(x);
  });
  const val = text.match(/\d+(?:\.\d+)?\s*%/g) || [];
  val.forEach((x) => {
    if (!value.includes(x)) value.push(x);
  });

  let relationship = null;
  if (/higher than|outperform|better than|superior/i.test(text)) relationship = "higher-than";
  else if (/lower than|worse than|inferior/i.test(text)) relationship = "lower-than";
  else if (/improves?/i.test(text)) relationship = "improves";
  else if (/reduces?/i.test(text)) relationship = "reduces";
  else if (/\d+(\.\d+)?\s*%/.test(text)) relationship = "reports";

  const atoms = [];
  if (method[0] && dataset[0]) atoms.push(`${method[0]} evaluated on ${dataset[0]}`);
  if (method[0] && value[0]) atoms.push(`${method[0]} achieves ${value[0]}`);
  if (method[0] && baseline[0]) atoms.push(`${method[0]} compared to ${baseline[0]}`);
  if (metric[0] && value[0]) atoms.push(`${metric[0]} is ${value[0]}`);

  const filled = [method, baseline, dataset, metric, value].filter((a) => a.length).length;
  const specificity = filled >= 3 ? "high" : filled >= 2 ? "medium" : "low";

  return {
    method,
    baseline,
    dataset,
    metric,
    value,
    polarity: claim.polarity || "neutral",
    relationship,
    atomicClaims: atoms.length ? atoms : [text],
    specificity,
  };
}

export async function decomposeClaim(claim, { signal, provider = "auto", useMock = false } = {}) {
  if (useMock || provider === "mock") {
    return fallbackDecompose(claim);
  }
  try {
    const raw = await phase3LLM(
      SYSTEM,
      `Claim: "${claim.text}"\nExisting entities: ${JSON.stringify(claim.entities || {})}`,
      signal,
      provider
    );
    return {
      method: [].concat(raw.method || []).filter(Boolean),
      baseline: [].concat(raw.baseline || []).filter(Boolean),
      dataset: [].concat(raw.dataset || []).filter(Boolean),
      metric: [].concat(raw.metric || []).filter(Boolean),
      value: [].concat(raw.value || []).filter(Boolean),
      polarity: raw.polarity || "neutral",
      relationship: raw.relationship || null,
      atomicClaims: [].concat(raw.atomicClaims || []).filter(Boolean),
      specificity: raw.specificity || "medium",
    };
  } catch (e) {
    console.warn("[ClaimDecomposer] LLM failed, fallback:", e.message);
    return fallbackDecompose(claim);
  }
}
