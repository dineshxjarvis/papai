function s2Key() {
  try {
    return import.meta.env?.VITE_SEMANTIC_SCHOLAR_API_KEY || "";
  } catch {
    return "";
  }
}

function s2Base() {
  return "/api/s2/graph/v1";
}

export async function searchSemanticScholar(query, { limit = 8, signal } = {}) {
  const url =
    `${s2Base()}/paper/search?query=${encodeURIComponent(query)}` +
    `&limit=${limit}` +
    `&fields=paperId,title,abstract,year,citationCount,url,openAccessPdf,externalIds,venue`;

  const headers = {};
  const key = s2Key();
  if (key) headers["x-api-key"] = key;

  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((p) => {
    const arxivId = p.externalIds?.ArXiv || null;
    let pdfUrl = p.openAccessPdf?.url || null;
    if (arxivId) pdfUrl = `/api/arxiv-pdf/pdf/${arxivId}.pdf`;
    return {
      paperId: p.paperId,
      title: p.title || "",
      abstract: p.abstract || "",
      year: p.year || null,
      citationCount: p.citationCount || 0,
      url: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      pdfUrl,
      venue: p.venue || null,
      source: "s2",
      arxivId,
    };
  });
}
