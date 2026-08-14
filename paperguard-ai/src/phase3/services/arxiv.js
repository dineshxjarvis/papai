export async function searchArxiv(query, { limit = 5, signal } = {}) {
  const url =
    `/api/arxiv/api/query?search_query=all:${encodeURIComponent(query)}` +
    `&start=0&max_results=${limit}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  return parseArxivXml(xml);
}

function parseArxivXml(xml) {
  const entries = xml.split("<entry>").slice(1);
  return entries.map((entry) => {
    const title =
      (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]
        ?.replace(/\s+/g, " ")
        .trim() || "";
    const summary =
      (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]
        ?.replace(/\s+/g, " ")
        .trim() || "";
    const id = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim() || "";
    const published =
      (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || "";
    const arxivId = id
      .replace("http://arxiv.org/abs/", "")
      .replace("https://arxiv.org/abs/", "");

    return {
      paperId: `arxiv:${arxivId}`,
      title,
      abstract: summary,
      year: published ? Number(published.slice(0, 4)) : null,
      citationCount: 0,
      url: id.startsWith("http") ? id : `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: arxivId ? `/api/arxiv-pdf/pdf/${arxivId}.pdf` : null,
      venue: "arXiv",
      source: "arxiv",
      arxivId,
    };
  });
}
