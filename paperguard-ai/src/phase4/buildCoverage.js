export function buildClaimCoverage(result = {}, claim = {}) {
  const coverage = result.coverage || {};
  const atomCoverageList = coverage.atom_coverage || [];
  
  const rows = [];
  
  atomCoverageList.forEach((ac, i) => {
    rows.push({
      key: ac.atom_id || `atom_${i}`,
      label: ac.atom_id || `Atom ${i+1}`,
      value: null, // we can omit value
      status: (ac.status === "SUPPORTED" || ac.status === "COVERED") ? "matched" : "unchecked",
    });
  });
  
  // If no atoms were explicitly checked, check subject/predicate from claim
  if (rows.length === 0 && result.claim) {
    if (result.claim.subject) {
      rows.push({
        key: "subject",
        label: "Subject",
        value: result.claim.subject,
        status: coverage.overall_status !== "INSUFFICIENT" ? "matched" : "unchecked"
      });
    }
    if (result.claim.predicate) {
      rows.push({
        key: "predicate",
        label: "Predicate",
        value: result.claim.predicate,
        status: coverage.overall_status !== "INSUFFICIENT" ? "matched" : "unchecked"
      });
    }
  }

  const matched = rows.filter((r) => r.status === "matched").length;
  const total = rows.length;
  const ratio = total > 0 ? matched / total : 0;

  return {
    rows,
    matched,
    total,
    ratio,
    overall: coverage.overall_status || "UNKNOWN"
  };
}
