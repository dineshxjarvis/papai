import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
} from "lucide-react";

import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleBulletList,
  toggleOrderedList,
  alignLeft,
  alignCenter,
  alignRight,
  undo,
  redo,
} from "../../editor/commands";

export default function EditorToolbar({
  editor,
}) {
  if (!editor) {
    return null;
  }

  return (
    <div className="editor-toolbar">

      <button
        onClick={() => undo(editor)}
        title="Undo"
      >
        <Undo2 size={16} />
      </button>

      <button
        onClick={() => redo(editor)}
        title="Redo"
      >
        <Redo2 size={16} />
      </button>


      <span className="toolbar-divider" />


      <button
        className={
          editor.isActive("bold")
            ? "active"
            : ""
        }
        onClick={() => toggleBold(editor)}
      >
        <Bold size={16} />
      </button>


      <button
        className={
          editor.isActive("italic")
            ? "active"
            : ""
        }
        onClick={() => toggleItalic(editor)}
      >
        <Italic size={16} />
      </button>


      <button
        onClick={() => toggleUnderline(editor)}
      >
        <Underline size={16} />
      </button>


      <span className="toolbar-divider" />


      <button
        className={
          editor.isActive("bulletList")
            ? "active"
            : ""
        }
        onClick={() =>
          toggleBulletList(editor)
        }
      >
        <List size={16} />
      </button>


      <button
        className={
          editor.isActive("orderedList")
            ? "active"
            : ""
        }
        onClick={() =>
          toggleOrderedList(editor)
        }
      >
        <ListOrdered size={16} />
      </button>


      <span className="toolbar-divider" />


      <button onClick={() => alignLeft(editor)}>
        <AlignLeft size={16} />
      </button>

      <button onClick={() => alignCenter(editor)}>
        <AlignCenter size={16} />
      </button>

      <button onClick={() => alignRight(editor)}>
        <AlignRight size={16} />
      </button>

    </div>
  );
}
