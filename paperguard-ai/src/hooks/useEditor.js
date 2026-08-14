import { useEditor as useTiptapEditor } from "@tiptap/react";
import { editorExtensions } from "../editor/extensions";
import { initialDocument, editorConfig } from "../editor/editorConfig";

export default function useEditor(options = {}) {
  const { onUpdate } = options;

  const editor = useTiptapEditor({
    extensions: editorExtensions,
    content: initialDocument,
    ...editorConfig,
    onUpdate: ({ editor: ed }) => {
      if (onUpdate) {
        const html = ed.getHTML();
        const text = ed.getText();
        onUpdate({ editor: ed, html, text });
      }
    },
  });

  return editor;
}
