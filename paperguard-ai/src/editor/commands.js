// Helper to check if user focus/selection is currently on a secondary page
function isSecondaryPageFocused(editor) {
  if (!editor) return true;
  if (editor.isFocused) return false;

  const sel = window.getSelection();
  if (sel && sel.anchorNode) {
    const parentNode = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
    if (parentNode && parentNode.closest && parentNode.closest('.secondary-page-content')) {
      return true;
    }
  }
  return false;
}

export function toggleBold(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("bold", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleBold().run();
}

export function toggleItalic(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("italic", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleItalic().run();
}

export function toggleUnderline(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("underline", false, null);
    return;
  }
  if (!editor) return;
  if (editor.can().toggleUnderline?.()) {
    editor.chain().focus().toggleUnderline().run();
  }
}

export function toggleStrike(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("strikeThrough", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleStrike().run();
}

export function setFontFamily(editor, font) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("fontName", false, font);
    return;
  }
  if (!editor) return;
  if (font === "default") {
    editor.chain().focus().unsetFontFamily().run();
  } else {
    editor.chain().focus().setFontFamily(font).run();
  }
}

export function setHighlightColor(editor, color = "#fef08a") {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("hiliteColor", false, color);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleHighlight({ color }).run();
}

export function clearFormatting(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("removeFormat", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().unsetAllMarks().clearNodes().run();
}

export function toggleBulletList(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("insertUnorderedList", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleBulletList().run();
}

export function toggleOrderedList(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("insertOrderedList", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleOrderedList().run();
}

export function setParagraph(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("formatBlock", false, "<p>");
    return;
  }
  if (!editor) return;
  editor.chain().focus().setParagraph().run();
}

export function setHeading(editor, level = 1) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("formatBlock", false, `<h${level}>`);
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleHeading({ level }).run();
}

export function setBlockquote(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("formatBlock", false, "<blockquote>");
    return;
  }
  if (!editor) return;
  editor.chain().focus().toggleBlockquote().run();
}

export function alignLeft(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("justifyLeft", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().setTextAlign("left").run();
}

export function alignCenter(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("justifyCenter", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().setTextAlign("center").run();
}

export function alignRight(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("justifyRight", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().setTextAlign("right").run();
}

export function alignJustify(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("justifyFull", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().setTextAlign("justify").run();
}

export function undo(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("undo", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().undo().run();
}

export function redo(editor) {
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("redo", false, null);
    return;
  }
  if (!editor) return;
  editor.chain().focus().redo().run();
}

export async function copySelection(editor) {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, " ");
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
  }
}

export async function cutSelection(editor) {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, " ");
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    editor.chain().focus().deleteSelection().run();
  }
}

export async function pasteToEditor(editor) {
  if (isSecondaryPageFocused(editor)) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        document.execCommand("insertText", false, text);
        return;
      }
    } catch {
      // Fallback
    }
    const fallback = prompt("Paste text into document:");
    if (fallback) {
      document.execCommand("insertText", false, fallback);
    }
    return;
  }
  if (!editor) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      editor.chain().focus().insertContent(text).run();
      return;
    }
  } catch {
    // Clipboard fallback
  }
  const fallback = prompt("Paste text into document:");
  if (fallback) {
    editor.chain().focus().insertContent(fallback).run();
  }
}

export function insertTable(editor, rows = 3, cols = 3) {
  if (!editor) return;
  if (editor.can().insertTable?.()) {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  } else {
    // Fallback HTML table
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:14px 0;"><thead><tr>`;
    for (let c = 1; c <= cols; c++) tableHtml += `<th style="border:1px solid #cbd5e1; padding:8px; background:#f1f5f9;">Header ${c}</th>`;
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) tableHtml += `<td style="border:1px solid #cbd5e1; padding:8px;">Cell ${r},${c}</td>`;
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table>`;
    if (isSecondaryPageFocused(editor)) {
      document.execCommand("insertHTML", false, tableHtml);
    } else {
      editor.chain().focus().insertContent(tableHtml).run();
    }
  }
}

export function insertImage(editor, src, alt = "Manuscript Figure") {
  if (!src) return;
  const imgHtml = `<div class="figure-box"><img src="${src}" alt="${alt}" style="max-width:100%; border-radius:6px;" /><p><em>[${alt}]</em></p></div>`;
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("insertHTML", false, imgHtml);
    return;
  }
  if (!editor) return;
  if (editor.can().setImage?.()) {
    editor.chain().focus().setImage({ src, alt }).run();
  } else {
    editor.chain().focus().insertContent(imgHtml).run();
  }
}

export function insertLink(editor, url) {
  if (!url) return;
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("createLink", false, url);
    return;
  }
  if (!editor) return;
  if (editor.can().setLink?.()) {
    editor.chain().focus().setLink({ href: url }).run();
  } else {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ") || url;
    editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`).run();
  }
}

export function insertPageBreak(editor) {
  if (!editor) return;
  if (editor.commands.setPageBreak) {
    editor.commands.setPageBreak();
  } else {
    editor.chain().focus().insertContent({ type: "pageBreak" }).insertContent("<p></p>").run();
  }
}

export function insertBlankPage(editor) {
  if (!editor) return;
  if (editor.commands.setPageBreak) {
    editor.commands.setPageBreak();
  } else {
    editor
      .chain()
      .focus()
      .insertContent({ type: "pageBreak" })
      .insertContent("<p class=\"blank-page-paragraph\">&nbsp;</p>")
      .run();
  }
}

export function removePageBreak(editor) {
  if (!editor) return;
  if (editor.isActive("pageBreak")) {
    editor.chain().focus().deleteNode("pageBreak").run();
  } else {
    const { state } = editor.view;
    let foundPos = null;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "pageBreak") {
        foundPos = pos;
      }
    });
    if (foundPos !== null) {
      editor.chain().focus().deleteRange({ from: foundPos, to: foundPos + 1 }).run();
    } else {
      editor.chain().focus().deleteSelection().run();
    }
  }
}

export function insertSymbol(editor, symbol) {
  if (!symbol) return;
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("insertText", false, ` ${symbol} `);
    return;
  }
  if (!editor) return;
  editor.chain().focus().insertContent(` ${symbol} `).run();
}

export function insertCitation(editor, citationText) {
  const label = citationText || "Citation: He et al., CVPR 2016";
  const citeHtml = ` <sup>[${label}]</sup> `;
  if (isSecondaryPageFocused(editor)) {
    document.execCommand("insertHTML", false, citeHtml);
    return;
  }
  if (!editor) return;
  editor.chain().focus().insertContent(citeHtml).run();
}

export function loadDocumentContent(editor, content) {
  if (!editor) return;
  editor.chain().focus().setContent(content).run();
}
