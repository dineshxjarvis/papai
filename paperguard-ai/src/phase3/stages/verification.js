/**
 * Verification — atomic coverage + constraint checks (mostly deterministic)
 */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function atomMatched(atom, evidenceList) {
  const a = norm(atom);
  if (!a) return false;
  return evidenceList.some((e) => {
    if (e.supportsClaim === "no" || e.supportsClaim === "unclear") return false;
    const blob = norm(`${e.evidenceSpan} ${JSON.stringify(e.experiment || {})}`);
    // token overlap heuristic
    const words = a.split(" ").filter((w) => w.length > 2);
    const hits = words.filter((w) => blob.includes(w)).length;
    return hits >= Math.ceil(words.length * 0.6);
  });
}

function entityCovered(entityList, evidenceList) {
  if (!entityList?.length) return null; // N/A
  return entityList.some((ent) =>
    evidenceList.some((e) => {
      if (e.supportsClaim === "no") return false;
      const blob = norm(`${e.evidenceSpan} ${Object.values(e.experiment || {}).join(" ")}`);
      return blob.includes(norm(ent));
    })
  );
}

export function verifyAgainstEvidence(decomposition, evidenceList) {
  const usable = evidenceList.filter((e) => e.supportsClaim === "yes" || e.supportsClaim === "partial");

  const atoms = decomposition.atomicClaims || [];
  const atomResults = atoms.map((atom) => ({
    atom,
    matched: atomMatched(atom, usable),
  }));
  const matchedAtoms = atomResults.filter((a) => a.matched).length;
  const totalAtoms = Math.max(atoms.length, 1);

  const components = {
    method: entityCovered(decomposition.method, usable),
    baseline: entityCovered(decomposition.baseline, usable),
    dataset: entityCovered(decomposition.dataset, usable),
    metric: entityCovered(decomposition.metric, usable),
    value: entityCovered(decomposition.value, usable),
  };

  const componentKeys = Object.keys(components).filter((k) => decomposition[k]?.length);
  const matchedComponents = componentKeys.filter((k) => components[k] === true).length;
  const totalComponents = Math.max(componentKeys.length, 1);

  const coverage = {
    matched: matchedComponents,
    total: totalComponents,
    ratio: matchedComponents / totalComponents,
    components,
    atoms: atomResults,
    atomRatio: matchedAtoms / totalAtoms,
  };

  const verifications = usable.map((e) => {
    const mismatches = [];
    if (decomposition.dataset?.length && components.dataset === false) mismatches.push("dataset_mismatch_or_missing");
    if (decomposition.metric?.length && components.metric === false) mismatches.push("metric_mismatch_or_missing");
    if (decomposition.method?.length && components.method === false) mismatches.push("method_mismatch_or_missing");

    let entailment = "partial";
    if (e.supportsClaim === "yes" && mismatches.length === 0) entailment = "supports";
    else if (e.supportsClaim === "no") entailment = "contradicts";
    else if (e.supportsClaim === "unclear") entailment = "irrelevant";

    return {
      paperId: e.paperId,
      entailment,
      constraintOk: mismatches.length === 0,
      mismatches,
      verified: e.supportsClaim === "yes" && mismatches.length === 0,
      evidenceQuality: e.evidenceQuality,
      evidenceSource: e.evidenceSource,
    };
  });

  return { coverage, verifications };
}
