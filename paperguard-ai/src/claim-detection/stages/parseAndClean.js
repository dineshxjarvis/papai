export function cleanText(raw) {
  if (!raw || typeof raw !== "string") return "";

  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^page\s+\d+\s*(of\s+\d+)?$/gim, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/^\s*\[\d+\]\s*$/gm, "")
    .trim();
}

export function splitBySections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = { section: "Body", text: "" };

  // FIXED: matches "1. Introduction", "2. Methods", "# Abstract", etc.
  const headingRe =
    /^(#{1,3}\s+)?(([0-9]+(\.[0-9]+)*)\.?\s+)?(abstract|introduction|related work|background|method|methods|methodology|experiments?|results?|discussion|conclusion|limitations?|references)\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (headingRe.test(trimmed) && trimmed.length < 80) {
      if (current.text.trim()) {
        sections.push({ ...current, text: current.text.trim() });
      }
      current = {
        section: trimmed.replace(/^#+\s*/, ""),
        text: "",
      };
    } else {
      current.text += line + "\n";
    }
  }
  if (current.text.trim()) {
    sections.push({ ...current, text: current.text.trim() });
  }

  return sections.length ? sections : [{ section: "Body", text }];
}
