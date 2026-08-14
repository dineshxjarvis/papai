const ABBREVIATIONS = new Set([
  "e.g", "i.e", "et al", "fig", "figs", "tab", "tbl", "eq", "eqs",
  "dr", "mr", "mrs", "ms", "prof", "vs", "etc", "cf", "al", "approx",
  "dept", "univ", "vol", "no", "pp", "sec", "ref", "refs", "ch", "chap",
  "ed", "eds", "proc", "conf", "jour", "jan", "feb", "mar", "apr",
  "jun", "jul", "aug", "sep", "oct", "nov", "dec",
]);

export function segmentSentences(text) {
  if (!text) return [];

  const sentences = [];
  let start = 0;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];

    if (ch === "." || ch === "?" || ch === "!") {
      // Guard: decimal number  76.3  or  0.05
      const prevCh = text[i - 1];
      const nextCh = text[i + 1];
      if (
        ch === "." &&
        prevCh &&
        /\d/.test(prevCh) &&
        nextCh &&
        /\d/.test(nextCh)
      ) {
        continue; // do not split
      }

      // Guard: version  v2.0  /  v1.2.3
      if (ch === "." && /v\d+$/i.test(text.slice(Math.max(0, i - 4), i))) {
        continue;
      }

      // Guard: citation-like [12.3] or (3.1)
      if (ch === "." && /[\[\(]\d+$/.test(text.slice(Math.max(0, i - 6), i))) {
        continue;
      }

      const before = text.slice(Math.max(0, i - 10), i).toLowerCase();
      const isAbbrev = [...ABBREVIATIONS].some((a) => before.endsWith(a));

      const next = text[i + 1];
      const nextNext = text[i + 2];

      if (
        !isAbbrev &&
        (next === undefined ||
          next === " " ||
          next === "\n" ||
          (next === '"' &&
            (nextNext === " " ||
              nextNext === "\n" ||
              nextNext === undefined)))
      ) {
        const sentence = text.slice(start, i + 1).trim();
        if (sentence.length > 0) {
          const realStart = text.indexOf(sentence, start);
          sentences.push({
            text: sentence,
            start: realStart >= 0 ? realStart : start,
            end: realStart >= 0 ? realStart + sentence.length : i + 1,
          });
        }
        start = i + 1;
        while (start < len && /\s/.test(text[start])) start++;
      }
    }
  }

  if (start < len) {
    const sentence = text.slice(start).trim();
    if (sentence.length > 0) {
      const realStart = text.indexOf(sentence, start);
      sentences.push({
        text: sentence,
        start: realStart >= 0 ? realStart : start,
        end: realStart >= 0 ? realStart + sentence.length : len,
      });
    }
  }

  return sentences;
}

export function withContext(sentences, section = "Body") {
  return sentences.map((s, idx) => ({
    ...s,
    prev: idx > 0 ? sentences[idx - 1].text : "",
    next: idx < sentences.length - 1 ? sentences[idx + 1].text : "",
    section,
  }));
}
