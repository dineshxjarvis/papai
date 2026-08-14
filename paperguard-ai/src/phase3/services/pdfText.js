/**
 * Full-text PDF extraction via pdfjs-dist
 * npm i pdfjs-dist
 *
 * Optional CORS proxy:
 * VITE_PDF_PROXY_URL=http://localhost:8000/api/pdf-proxy?url=
 */

const SECTION_RE =
  /^(?:\d+(?:\.\d+)*\.?\s+)?(abstract|introduction|related work|background|method|methods|methodology|experiments?|results?|discussion|conclusion|limitations?|references|appendix)\b/i;

function env(name) {
  try {
    return import.meta.env?.[name] || "";
  } catch {
    return "";
  }
}

function resolvePdfUrl(pdfUrl) {
  const proxy = env("VITE_PDF_PROXY_URL");
  if (proxy && pdfUrl) {
    return `${proxy}${encodeURIComponent(pdfUrl)}`;
  }
  return pdfUrl;
}

export async function extractPdfText(pdfUrl, { signal, maxPages = 20 } = {}) {
  if (!pdfUrl) return null;

  let pdfjs;
  try {
    pdfjs = await import("pdfjs-dist");
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      } catch {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "4.10.38"}/pdf.worker.min.mjs`;
        } catch {
          /* optional */
        }
      }
    }
  } catch {
    console.warn("[pdfText] pdfjs-dist not installed — skip full text");
    return null;
  }

  const url = resolvePdfUrl(pdfUrl);

  try {
    const loadingTask = pdfjs.getDocument({
      url,
      withCredentials: false,
      isEvalSupported: false,
    });
    if (signal) {
      signal.addEventListener("abort", () => {
        try {
          loadingTask.destroy();
        } catch {
          /* ignore */
        }
      });
    }
    const pdf = await loadingTask.promise;
    const n = Math.min(pdf.numPages, maxPages);
    const pages = [];

    for (let i = 1; i <= n; i++) {
      if (signal?.aborted) break;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ page: i, text });
    }

    return {
      pages,
      fullText: pages.map((p) => p.text).join("\n\n"),
      numPages: pdf.numPages,
    };
  } catch (e) {
    if (url !== pdfUrl) {
      try {
        return await extractPdfTextDirect(pdfjs, pdfUrl, signal, maxPages);
      } catch (e2) {
        console.warn("[pdfText] extract failed:", e2.message);
        return null;
      }
    }
    console.warn("[pdfText] extract failed:", e.message);
    return null;
  }
}

async function extractPdfTextDirect(pdfjs, pdfUrl, signal, maxPages) {
  const loadingTask = pdfjs.getDocument({
    url: pdfUrl,
    withCredentials: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const n = Math.min(pdf.numPages, maxPages);
  const pages = [];
  for (let i = 1; i <= n; i++) {
    if (signal?.aborted) break;
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ page: i, text });
  }
  return {
    pages,
    fullText: pages.map((p) => p.text).join("\n\n"),
    numPages: pdf.numPages,
  };
}

export function chunkPdfBySection(pages, { maxChunkChars = 1200 } = {}) {
  const chunks = [];
  let currentSection = "Body";

  for (const { page, text } of pages || []) {
    if (!text) continue;
    const paras = text.split(/(?<=\.)\s+(?=[A-Z])/);
    let buf = "";
    for (const para of paras) {
      const line = para.trim();
      if (!line) continue;
      if (line.length < 80 && SECTION_RE.test(line)) {
        if (buf.trim()) {
          chunks.push({
            page,
            section: currentSection,
            text: buf.trim().slice(0, maxChunkChars),
          });
          buf = "";
        }
        currentSection = line.replace(/^\d+(\.\d+)*\.?\s*/, "").slice(0, 60);
        continue;
      }
      if ((buf + " " + line).length > maxChunkChars) {
        if (buf.trim()) {
          chunks.push({ page, section: currentSection, text: buf.trim() });
        }
        buf = line;
      } else {
        buf = buf ? buf + " " + line : line;
      }
    }
    if (buf.trim()) {
      chunks.push({
        page,
        section: currentSection,
        text: buf.trim().slice(0, maxChunkChars),
      });
    }
  }
  return chunks;
}

export function selectRelevantChunks(chunks, decomposition, claimText, topN = 6) {
  const needles = [
    claimText,
    ...(decomposition.method || []),
    ...(decomposition.baseline || []),
    ...(decomposition.dataset || []),
    ...(decomposition.metric || []),
    ...(decomposition.value || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  const scored = (chunks || []).map((c) => {
    const t = c.text.toLowerCase();
    let score = 0;
    for (const n of needles) {
      if (n.length > 2 && t.includes(n)) score += 1;
    }
    if (/result|experiment/i.test(c.section || "")) score += 0.5;
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((c) => c.score > 0).slice(0, topN);
}
