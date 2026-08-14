export function evidenceSupportLabel(supportsClaim) {
  const v = String(supportsClaim || "").toLowerCase();
  if (v === "yes") return { key: "yes", text: "Supporting" };
  if (v === "no") return { key: "no", text: "Contradicting" };
  if (v === "partial" || v === "partially") return { key: "mixed", text: "Partial match" };
  if (v === "unclear" || v === "unknown") return { key: "mixed", text: "Unclear" };
  return { key: "mixed", text: "Noted" };
}
