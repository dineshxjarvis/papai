import { normalizeClaim } from "../types/claim";

const DETECTOR_SYSTEM_PROMPT = `You are the Claim Detection Agent inside PaperGuard AI, a scientific evidence auditor.

Your job: decide whether a sentence from a research paper is a SCIENTIFIC CLAIM that asserts a finding, comparison, causal effect, or quantitative result.

DETECT (is_claim = true) when the sentence:
- Makes a comparative assertion (A outperforms B, higher than, better than…)
- Reports a quantitative result (76.3% accuracy, F1=0.91, p<0.01…)
- States a causal/technical effect (X improves Y, reduces error, increases throughput…)
- Claims performance / SOTA / significant improvement
- States a limitation of a method with assertive language

DO NOT DETECT (is_claim = false) when the sentence:
- Is a general background statement ("Deep learning is widely used in healthcare")
- Only describes what the paper does ("In this paper we propose…")
- Only states dataset size or implementation details without an asserted finding
- Is a caption, heading, or reference pointer

Return STRICT JSON only (no markdown):
{
  "is_claim": boolean,
  "claim_type": "comparative" | "quantitative" | "causal" | "performance" | "limitation" | "none",
  "confidence": number,
  "claim_span": string,
  "entities": {
    "method": string|null,
    "baseline": string|null,
    "metric": string|null,
    "value": string|null,
    "dataset": string|null
  },
  "polarity": "positive" | "negative" | "neutral",
  "reason": string
}`;

async function detectWithLLM(windows, apiBase = "") {
  const payload = {
    sentences: windows.map((w, i) => ({
      id: `s_${i}`,
      prev: w.prev,
      current: w.current,
      next: w.next,
    })),
  };

  const res = await fetch(`${apiBase}/api/detect-claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Claim detection API failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

function detectLocalStructured(windows) {
  return windows.map((w) => {
    const text = w.current;

    const hasComparativeStructure =
      /\b(outperform[s]?|better than|higher than|lower than|superior to|worse than|compared (to|with)|versus|more \w+ than|less \w+ than)\b/i.test(
        text
      );

    const hasQuantitativeStructure =
      /\b\d+(\.\d+)?\s*%\b/.test(text) ||
      /\b(top-1|top-5|f1|bleu|rouge|auc|accuracy|precision|recall)\b.*\b\d+/i.test(text) ||
      /\bp\s*[<≤]\s*0\.\d+/i.test(text);

    const hasCausalStructure =
      /\b(improv(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|decreas(?:e|es|ed|ing)|leads? to|results? in|causes?)\b.+\b/i.test(
        text
      );

    const hasPerformanceVerb =
      /\b(achieves?|reaches?|attains?|demonstrates?|shows that|we (show|find|observe))\b/i.test(text);

    const hasLimitationStructure =
      /\b(not statistically significant|no significant (difference|improvement)|fails? to|does not (improve|outperform|generalize)|limited (by|to))\b/i.test(
        text
      );

    const isBackground =
      (/^(deep learning|machine learning|neural networks|artificial intelligence)\b.*\b(is|are|has been|have been)\b.*\b(used|applied|popular|important|widely)\b/i.test(
        text
      ) ||
        (/\bwidely used\b/i.test(text) &&
          !hasComparativeStructure &&
          !hasQuantitativeStructure));

    const isMeta =
      /^(in this (paper|work|study)|we (propose|present|introduce)|this (paper|section))\b/i.test(text);

    let is_claim = false;
    let claim_type = "none";
    let confidence = 0.35;
    let polarity = "neutral";

    if (isBackground || isMeta) {
      is_claim = false;
      claim_type = "none";
      confidence = 0.15;
    } else if (hasLimitationStructure) {
      is_claim = true;
      claim_type = "limitation";
      confidence = 0.82;
      polarity = "negative";
    } else if (hasComparativeStructure && hasQuantitativeStructure) {
      is_claim = true;
      claim_type = "comparative";
      confidence = 0.9;
      polarity = "positive";
    } else if (hasComparativeStructure) {
      is_claim = true;
      claim_type = "comparative";
      confidence = 0.84;
      polarity = /worse|lower|fail|not\b/i.test(text) ? "negative" : "positive";
    } else if (hasQuantitativeStructure && hasPerformanceVerb) {
      is_claim = true;
      claim_type = "quantitative";
      confidence = 0.88;
      polarity = "positive";
    } else if (hasCausalStructure) {
      is_claim = true;
      claim_type = "causal";
      confidence = 0.8;
      polarity = /reduc|decreas|degrad|hurt/i.test(text) ? "negative" : "positive";
    } else if (hasPerformanceVerb && /\b(state-of-the-art|sota|significant)\b/i.test(text)) {
      is_claim = true;
      claim_type = "performance";
      confidence = 0.78;
      polarity = "positive";
    }

    const methodMatch = text.match(
      /\b(ResNet-?\d+|VGG-?\d+|BERT|RoBERTa|GPT-?\d*|CNN|LSTM|Transformer|YOLO|U-Net|EfficientNet)[s]?\b/i
    );
    const valueMatch = text.match(/(\d+(\.\d+)?\s*%)/);
    const metricMatch = text.match(
      /\b(top-1 accuracy|top-5 accuracy|accuracy|f1(?:-score)?|bleu|rouge-?[l12]?|auc|precision|recall)\b/i
    );
    const datasetMatch = text.match(
      /\b(ImageNet|CIFAR-?\d*|COCO|SQuAD|GLUE|MNIST|KITTI|WikiText)\b/i
    );
    const baselineMatch = text.match(/\b(?:than|versus|vs\.?)\s+([A-Z][A-Za-z0-9\-]+)/);

    return {
      id: `local_${w.index}`,
      is_claim,
      claim_type,
      confidence,
      claim_span: text,
      entities: {
        method: methodMatch ? methodMatch[0] : null,
        baseline: baselineMatch ? baselineMatch[1] : null,
        metric: metricMatch ? metricMatch[0] : null,
        value: valueMatch ? valueMatch[0] : null,
        dataset: datasetMatch ? datasetMatch[0] : null,
      },
      polarity,
      reason: is_claim
        ? `Structured signals: type=${claim_type}`
        : isBackground
          ? "General background statement without measurable assertion"
          : isMeta
            ? "Paper meta-description, not a scientific finding"
            : "Insufficient assertive/comparative/quantitative structure",
    };
  });
}

export async function detectClaims(windows, options = {}) {
  const {
    apiBase = import.meta.env.VITE_API_BASE || "",
    forceLocal = false,
    confidenceThreshold = 0.65,
    source = "live",
  } = options;

  if (!windows || windows.length === 0) return [];

  let rawResults = [];

  if (!forceLocal) {
    try {
      rawResults = await detectWithLLM(windows, apiBase);
    } catch (err) {
      console.warn("[ClaimDetector] LLM API unavailable, using local structured classifier:", err.message);
      rawResults = detectLocalStructured(windows);
    }
  } else {
    rawResults = detectLocalStructured(windows);
  }

  const claims = [];

  for (let i = 0; i < rawResults.length; i++) {
    const r = rawResults[i];
    if (!r || r.is_claim !== true) continue;

    const conf =
      typeof r.confidence === "number"
        ? r.confidence <= 1
          ? r.confidence
          : r.confidence / 100
        : 0;

    if (conf < confidenceThreshold) continue;

    const window =
      windows[i] || windows.find((w) => `s_${w.index}` === r.id) || windows[0];

    claims.push(
      normalizeClaim(
        {
          ...r,
          text: r.claim_span || window?.current || r.text,
          claim_type: r.claim_type,
          confidence: conf,
          status: "detected",
          from: window?.from ?? null,
          to: window?.to ?? null,
        },
        source
      )
    );
  }

  return claims;
}

export { DETECTOR_SYSTEM_PROMPT };
