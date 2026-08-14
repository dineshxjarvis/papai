const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "al", "fig", "eq", "ref", "vol", "no", "dr", "mr", "ms",
  "prof", "approx", "vs", "cf", "min", "max", "std", "avg", "tab",
]);

export function splitSentences(text) {
  if (!text || typeof text !== "string") return [];

  const cleaned = text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
  if (!cleaned) return [];

  let protectedText = cleaned.replace(/\b([A-Za-z]{1,6})\./g, (match, abbr) => {
    if (ABBREVIATIONS.has(abbr.toLowerCase())) return `${abbr}<ABB>`;
    return match;
  });

  protectedText = protectedText.replace(/(\d)\.(\d)/g, "$1<DEC>$2");

  const raw = protectedText.split(/(?<=[.!?])\s+(?=[A-Z("])/);

  return raw
    .map((s) => s.replace(/<ABB>/g, ".").replace(/<DEC>/g, ".").trim())
    .filter((s) => s.length >= 20);
}

export function buildContextWindows(sentences) {
  return sentences.map((current, index) => ({
    prev: index > 0 ? sentences[index - 1] : null,
    current,
    next: index < sentences.length - 1 ? sentences[index + 1] : null,
    index,
  }));
}

export function htmlToPlainText(html) {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
