export function suggestAlternatives(claim, result = {}) {
  const verdict = result.verdict || "";
  if (verdict === "supported") return [];

  const safer = result.safer_wording;
  if (safer) {
    return [
      {
        id: "safer-wording-suggested",
        label: "Safer Wording",
        text: safer.suggested_wording,
      }
    ];
  }
  
  return [];
}
