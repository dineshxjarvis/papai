export function clearClaimHighlights(editor) {
  if (!editor) return;
  const { state } = editor;
  const { tr } = state;
  let modified = false;

  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    node.marks.forEach((mark) => {
      if (mark.type.name === "highlight") {
        tr.removeMark(pos, pos + node.nodeSize, mark.type);
        modified = true;
      }
    });
  });

  if (modified) editor.view.dispatch(tr);
}

export function highlightClaimInEditor(editor, claim) {
  if (!editor || !claim?.text) return false;

  const colorMap = {
    green: "#d1fae5",
    yellow: "#fef3c7",
    red: "#fce7f3",
    blue: "#dbeafe",
  };

  const bg = colorMap[claim.color || claim.type || "yellow"] || colorMap.yellow;
  const needle = claim.text.trim();
  if (needle.length < 10) return false;

  const doc = editor.state.doc;
  let found = false;

  doc.descendants((node, pos) => {
    if (found || !node.isText) return;
    const text = node.text || "";
    let idx = text.indexOf(needle);

    if (idx === -1) {
      const short = needle.slice(0, 60);
      idx = text.indexOf(short);
      if (idx === -1) return;
      const from = pos + idx;
      const to = Math.min(from + needle.length, pos + text.length);
      editor.chain().setTextSelection({ from, to }).setHighlight({ color: bg }).run();
      found = true;
      return;
    }

    const from = pos + idx;
    const to = from + needle.length;
    editor.chain().setTextSelection({ from, to }).setHighlight({ color: bg }).run();
    found = true;
  });

  if (found) editor.commands.focus("end");
  return found;
}

export function highlightClaimsInEditor(editor, claims = []) {
  if (!editor) return;
  for (const claim of claims) {
    highlightClaimInEditor(editor, claim);
  }
}
