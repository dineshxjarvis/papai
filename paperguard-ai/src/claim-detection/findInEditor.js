/**
 * Map claim text → exact TipTap/ProseMirror { from, to }
 * Handles claims that span multiple text nodes (bold, italic, citations, links).
 */

export function findClaimRange(editor, claimText) {
  if (!editor || !claimText) return null;

  const needle = claimText.trim().replace(/\s+/g, " ");
  if (needle.length < 10) return null;

  // Build flat buffer: each char maps to a document position
  const pieces = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (let i = 0; i < node.text.length; i++) {
      pieces.push({ ch: node.text[i], pos: pos + i });
    }
  });

  if (pieces.length === 0) return null;

  // Normalized search string (collapse whitespace like needle)
  let flat = "";
  const indexMap = []; // flat offset → doc pos
  for (let i = 0; i < pieces.length; i++) {
    const { ch, pos } = pieces[i];
    if (/\s/.test(ch)) {
      if (flat.length === 0 || flat[flat.length - 1] === " ") continue;
      flat += " ";
      indexMap.push(pos);
    } else {
      flat += ch;
      indexMap.push(pos);
    }
  }

  const idx = flat.indexOf(needle);
  if (idx === -1) {
    // Fallback: first 48 chars
    const head = needle.slice(0, Math.min(48, needle.length));
    const idx2 = flat.indexOf(head);
    if (idx2 === -1) return null;
    const from = indexMap[idx2];
    const endIdx = Math.min(idx2 + needle.length - 1, indexMap.length - 1);
    const to = indexMap[endIdx] + 1;
    return { from, to };
  }

  const from = indexMap[idx];
  const endIdx = Math.min(idx + needle.length - 1, indexMap.length - 1);
  const to = indexMap[endIdx] + 1;
  return { from, to };
}
