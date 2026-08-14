import React from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link, Undo, Redo
} from 'lucide-react';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  setFontFamily,
  alignLeft,
  alignCenter,
  alignRight,
  alignJustify,
  toggleBulletList,
  toggleOrderedList,
  insertLink
} from "../../editor/commands";
import './EditorToolbar.css';

export default function EditorToolbar({ editor, fontFamily, setFontFamilyProp }) {
  if (!editor) return null;

  const handleFontFamilySelect = (e) => {
    const font = e.target.value;
    if (setFontFamilyProp) setFontFamilyProp(font);
    setFontFamily(editor, font);
  };

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <select 
          className="toolbar-select"
          value={fontFamily}
          onChange={handleFontFamilySelect}
        >
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Inter">Inter</option>
        </select>
        <select className="toolbar-select">
          <option>Normal</option>
          <option>Heading 1</option>
          <option>Heading 2</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`} onClick={() => toggleBold(editor)}>
          <Bold size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`} onClick={() => toggleItalic(editor)}>
          <Italic size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive("underline") ? "active" : ""}`} onClick={() => toggleUnderline(editor)}>
          <Underline size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive("strike") ? "active" : ""}`} onClick={() => toggleStrike(editor)}>
          <Strikethrough size={14} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className={`toolbar-btn ${editor.isActive({ textAlign: "left" }) ? "active" : ""}`} onClick={() => alignLeft(editor)}>
          <AlignLeft size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive({ textAlign: "center" }) ? "active" : ""}`} onClick={() => alignCenter(editor)}>
          <AlignCenter size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive({ textAlign: "right" }) ? "active" : ""}`} onClick={() => alignRight(editor)}>
          <AlignRight size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive({ textAlign: "justify" }) ? "active" : ""}`} onClick={() => alignJustify(editor)}>
          <AlignJustify size={14} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`} onClick={() => toggleBulletList(editor)}>
          <List size={14} />
        </button>
        <button className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`} onClick={() => toggleOrderedList(editor)}>
          <ListOrdered size={14} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => insertLink(editor, prompt("Enter link URL:"))}>
          <Link size={14} />
        </button>
      </div>
      
      <div className="toolbar-divider" style={{marginLeft: 'auto'}} />
      
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={14} />
        </button>
        <button className="toolbar-btn" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={14} />
        </button>
      </div>
    </div>
  );
}
