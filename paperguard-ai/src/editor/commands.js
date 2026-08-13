export function toggleBold(editor) {
  if (!editor) return;
  editor.chain().focus().toggleBold().run();
}

export function toggleItalic(editor) {
  if (!editor) return;
  editor.chain().focus().toggleItalic().run();
}

export function toggleUnderline(editor) {
  if (!editor) return;
  if (editor.can().toggleUnderline?.()) {
    editor.chain().focus().toggleUnderline().run();
  }
}

export function toggleStrike(editor) {
  if (!editor) return;
  editor.chain().focus().toggleStrike().run();
}

export function setFontFamily(editor, font) {
  if (!editor) return;
  if (font === "default") {
    editor.chain().focus().unsetFontFamily().run();
  } else {
    editor.chain().focus().setFontFamily(font).run();
  }
}

export function setHighlightColor(editor, color = "#fef08a") {
  if (!editor) return;
  editor.chain().focus().toggleHighlight({ color }).run();
}

export function clearFormatting(editor) {
  if (!editor) return;
  editor.chain().focus().unsetAllMarks().clearNodes().run();
}

export function toggleBulletList(editor) {
  if (!editor) return;
  editor.chain().focus().toggleBulletList().run();
}

export function toggleOrderedList(editor) {
  if (!editor) return;
  editor.chain().focus().toggleOrderedList().run();
}

export function setParagraph(editor) {
  if (!editor) return;
  editor.chain().focus().setParagraph().run();
}

export function setHeading(editor, level = 1) {
  if (!editor) return;
  editor.chain().focus().toggleHeading({ level }).run();
}

export function setBlockquote(editor) {
  if (!editor) return;
  editor.chain().focus().toggleBlockquote().run();
}

export function alignLeft(editor) {
  if (!editor) return;
  editor.chain().focus().setTextAlign("left").run();
}

export function alignCenter(editor) {
  if (!editor) return;
  editor.chain().focus().setTextAlign("center").run();
}

export function alignRight(editor) {
  if (!editor) return;
  editor.chain().focus().setTextAlign("right").run();
}

export function alignJustify(editor) {
  if (!editor) return;
  editor.chain().focus().setTextAlign("justify").run();
}

export function undo(editor) {
  if (!editor) return;
  editor.chain().focus().undo().run();
}

export function redo(editor) {
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
    editor.chain().focus().insertContent(tableHtml).run();
  }
}

export function insertImage(editor, src, alt = "Manuscript Figure") {
  if (!editor || !src) return;
  if (editor.can().setImage?.()) {
    editor.chain().focus().setImage({ src, alt }).run();
  } else {
    editor.chain().focus().insertContent(`<div class="figure-box"><img src="${src}" alt="${alt}" style="max-width:100%; border-radius:6px;" /><p><em>[${alt}]</em></p></div>`).run();
  }
}

export function insertLink(editor, url) {
  if (!editor || !url) return;
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
    // Insert a pageBreak node and an explicit full-height blank paragraph
    editor
      .chain()
      .focus()
      .insertContent({ type: "pageBreak" })
      .insertContent("<p class=\"blank-page-paragraph\">&nbsp;</p>")
      .run();

    // Add a brief insertion animation and scroll the new blank page into view
    try {
      setTimeout(() => {
        const root = editor.view?.dom;
        if (!root) return;
        const nodes = root.querySelectorAll('.blank-page-paragraph');
        const last = nodes[nodes.length - 1];
        if (last) {
          last.classList.add('page-insert-anim');

          // First try native scrollIntoView (may fail with CSS zoom)
          try {
            last.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {
            // ignore
          }

          // If the element is still outside the visible area (zoom can affect scrolling),
          // calculate offsets relative to the `.editor-wrapper` scroll container and scroll it.
          setTimeout(() => {
            try {
              const container = root.closest('.editor-wrapper') || document.querySelector('.editor-wrapper');
              if (container) {
                const lastRect = last.getBoundingClientRect();
                const contRect = container.getBoundingClientRect();
                if (lastRect.bottom > contRect.bottom || lastRect.top < contRect.top) {
                  const offset = lastRect.top - contRect.top - (contRect.height / 2) + (lastRect.height / 2);
                  container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
                }
              }
            } catch (e) {
              // ignore
            }
            setTimeout(() => last.classList.remove('page-insert-anim'), 900);
          }, 120);
        }
      }, 60);
    } catch (e) {
      // ignore DOM timing errors
    }
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
  if (!editor || !symbol) return;
  editor.chain().focus().insertContent(` ${symbol} `).run();
}

export function insertCitation(editor, citationText) {
  if (!editor) return;
  const label = citationText || "Citation: He et al., CVPR 2016";
  editor.chain().focus().insertContent(` <sup>[${label}]</sup> `).run();
}

export function loadDocumentContent(editor, content) {
  if (!editor) return;
  editor.chain().focus().setContent(content).run();
}
