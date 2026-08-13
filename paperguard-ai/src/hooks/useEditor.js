import { useEditor as useTiptapEditor } from "@tiptap/react";

import { editorExtensions } from "../editor/extensions";
import {
  initialDocument,
  editorConfig,
} from "../editor/editorConfig";

export default function useEditor() {
  const editor = useTiptapEditor({
    extensions: editorExtensions,

    content: initialDocument,

    ...editorConfig,
  });

  return editor;
}
