import React, { useState, useRef } from "react";
import {
  Clipboard,
  Scissors,
  Copy,
  WandSparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sparkles,
  MousePointer2,
  Table,
  BookOpen,
  Image as ImageIcon,
  FileCheck,
  Search,
  Eye,
  FileText,
  Palette,
  CheckCircle,
  Upload,
  FilePlus,
  Download,
  Printer,
  Link,
  SplitSquareVertical,
  Sigma,
  Bookmark,
  Plus,
  Trash2
} from "lucide-react";

import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  setFontFamily,
  setHighlightColor,
  clearFormatting,
  toggleBulletList,
  toggleOrderedList,
  setParagraph,
  setHeading,
  setBlockquote,
  alignLeft,
  alignCenter,
  alignRight,
  alignJustify,
  cutSelection,
  copySelection,
  pasteToEditor,
  insertTable,
  insertImage,
  insertLink,
  insertPageBreak,
  insertBlankPage,
  removePageBreak,
  insertSymbol,
  insertCitation,
  loadDocumentContent
} from "../../editor/commands";

import "./Ribbon.css";

export default function Ribbon({
  editor,
  onAnalyzeAll,
  onAnalyzeSelection,
  onAddPage,
  onDeletePage,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  viewMode,
  setViewMode,
  darkModeCanvas,
  setDarkModeCanvas,
  docTitle,
  setDocTitle,
  showToast
}) {
  const [activeTab, setActiveTab] = useState("Home");
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);

  // Citation Modal States
  const [authorName, setAuthorName] = useState("Smith et al.");
  const [pubYear, setPubYear] = useState("2024");
  const [journalName, setJournalName] = useState("IEEE Trans. Medical Imaging");

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  if (!editor) return null;

  const tabs = [
    "File",
    "Home",
    "Insert",
    "References",
    "Review",
    "View",
    "AI Tools",
  ];

  // Font Handlers
  const handleFontFamilySelect = (e) => {
    const font = e.target.value;
    setFontFamily(font);
    setFontFamily(editor, font);
  };

  const handleFontSizeSelect = (e) => {
    const size = e.target.value;
    setFontSize(size);
  };

  const handleApplyHighlight = (colorHex) => {
    setHighlightColor(editor, colorHex);
    setShowHighlightMenu(false);
  };

  // File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content);
          loadDocumentContent(editor, parsed.html || parsed.text || content);
        } catch {
          loadDocumentContent(editor, content);
        }
      } else if (file.name.endsWith(".html") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        loadDocumentContent(editor, content);
      } else {
        const formatted = content
          .split("\n\n")
          .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
          .join("");
        loadDocumentContent(editor, formatted);
      }

      setDocTitle(file.name);
      if (showToast) showToast(`Loaded file: ${file.name}`);
    };

    reader.readAsText(file);
  };

  // Image Upload Handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      insertImage(editor, dataUrl, file.name);
      if (showToast) showToast(`Inserted image: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Insert Link Handler
  const handleInsertLinkPrompt = () => {
    const url = prompt("Enter Web Link URL (e.g. https://arxiv.org/abs/2308.09124):");
    if (url) {
      insertLink(editor, url);
      if (showToast) showToast("Hyperlink inserted");
    }
  };

  // Insert Citation Submit
  const handleAddCitationSubmit = (e) => {
    e.preventDefault();
    const citeText = `${authorName}, ${pubYear}`;
    insertCitation(editor, citeText);
    setShowCitationModal(false);
    if (showToast) showToast(`Inserted Citation: [${citeText}]`);
  };

  // Math Symbols List
  const mathSymbols = ["α", "β", "γ", "δ", "θ", "λ", "μ", "π", "σ", "ω", "∑", "∫", "√", "±", "≈", "≠", "≤", "≥", "∞", "Δ", "∇", "∈", "∩", "∪"];

  return (
    <section className="ribbon">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.html,.json,.docx"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* Ribbon Tab Bar */}
      <div className="ribbon-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`ribbon-tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ribbon Tool Body */}
      <div className="ribbon-content">
        {/* HOME TAB */}
        {activeTab === "Home" && (
          <>
            {/* Clipboard Group */}
            <div className="tool-group clipboard-group">
              <button
                className="large-tool"
                onClick={() => pasteToEditor(editor)}
                title="Paste from Clipboard"
              >
                <Clipboard size={22} className="tool-icon-blue" />
                <span>Paste</span>
              </button>

              <div className="small-tools">
                <button onClick={() => cutSelection(editor)} title="Cut Selection">
                  <Scissors size={13} />
                  <span>Cut</span>
                </button>
                <button onClick={() => copySelection(editor)} title="Copy Selection">
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
                <button onClick={() => clearFormatting(editor)} title="Clear Formatting">
                  <WandSparkles size={13} />
                  <span>Clear</span>
                </button>
              </div>
              <label className="group-label">Clipboard</label>
            </div>

            {/* Font & Formatting Group */}
            <div className="tool-group font-group">
              <div className="font-selectors">
                <select
                  value={fontFamily}
                  onChange={handleFontFamilySelect}
                  title="Font Family"
                  className="ribbon-select font-family-select"
                >
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                </select>

                <select
                  value={fontSize}
                  onChange={handleFontSizeSelect}
                  title="Font Size"
                  className="ribbon-select font-size-select"
                >
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="20">20</option>
                  <option value="24">24</option>
                  <option value="28">28</option>
                </select>
              </div>

              <div className="format-buttons-row">
                <button
                  className={`format-btn ${editor.isActive("bold") ? "active" : ""}`}
                  onClick={() => toggleBold(editor)}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive("italic") ? "active" : ""}`}
                  onClick={() => toggleItalic(editor)}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive("underline") ? "active" : ""}`}
                  onClick={() => toggleUnderline(editor)}
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive("strike") ? "active" : ""}`}
                  onClick={() => toggleStrike(editor)}
                  title="Strikethrough"
                >
                  <Strikethrough size={15} />
                </button>

                <div className="highlighter-wrapper">
                  <button
                    className={`format-btn highlight-ic-btn ${editor.isActive("highlight") ? "active" : ""}`}
                    onClick={() => handleApplyHighlight("#fef08a")}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowHighlightMenu(!showHighlightMenu);
                    }}
                    title="Highlight Selection (Right-click for colors)"
                  >
                    <Highlighter size={15} className="highlighter-icon" />
                  </button>

                  {showHighlightMenu && (
                    <div className="highlight-color-menu">
                      <span
                        className="color-picker-dot yellow"
                        onClick={() => handleApplyHighlight("#fef08a")}
                        title="Yellow Highlight"
                      />
                      <span
                        className="color-picker-dot green"
                        onClick={() => handleApplyHighlight("#bbf7d0")}
                        title="Green Highlight"
                      />
                      <span
                        className="color-picker-dot red"
                        onClick={() => handleApplyHighlight("#fecaca")}
                        title="Red Highlight"
                      />
                    </div>
                  )}
                </div>
              </div>
              <label className="group-label">Font & Formatting</label>
            </div>

            {/* Paragraph Group */}
            <div className="tool-group paragraph-group">
              <div className="format-buttons-row">
                <button
                  className={`format-btn ${editor.isActive({ textAlign: "left" }) ? "active" : ""}`}
                  onClick={() => alignLeft(editor)}
                  title="Align Left"
                >
                  <AlignLeft size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive({ textAlign: "center" }) ? "active" : ""}`}
                  onClick={() => alignCenter(editor)}
                  title="Align Center"
                >
                  <AlignCenter size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive({ textAlign: "right" }) ? "active" : ""}`}
                  onClick={() => alignRight(editor)}
                  title="Align Right"
                >
                  <AlignRight size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive("bulletList") ? "active" : ""}`}
                  onClick={() => toggleBulletList(editor)}
                  title="Bullet List"
                >
                  <List size={15} />
                </button>

                <button
                  className={`format-btn ${editor.isActive("orderedList") ? "active" : ""}`}
                  onClick={() => toggleOrderedList(editor)}
                  title="Numbered List"
                >
                  <ListOrdered size={15} />
                </button>
              </div>
              <label className="group-label">Paragraph</label>
            </div>

            {/* Styles Group */}
            <div className="tool-group styles-group">
              <div className="styles-list">
                <button
                  className={`style-pill ${
                    editor.isActive("paragraph") && !editor.isActive("heading") && !editor.isActive("blockquote")
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setParagraph(editor)}
                >
                  <span className="style-title">Normal</span>
                  <span className="style-sub">AaBbCc</span>
                </button>

                <button
                  className={`style-pill ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
                  onClick={() => setHeading(editor, 1)}
                >
                  <span className="style-title">Heading 1</span>
                  <span className="style-sub h1-preview">AaBb</span>
                </button>

                <button
                  className={`style-pill ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
                  onClick={() => setHeading(editor, 2)}
                >
                  <span className="style-title">Heading 2</span>
                  <span className="style-sub h2-preview">AaBb</span>
                </button>

                <button
                  className={`style-pill ${editor.isActive("blockquote") ? "active" : ""}`}
                  onClick={() => setBlockquote(editor)}
                >
                  <span className="style-title">Quote</span>
                  <span className="style-sub quote-preview font-italic">"Aa"</span>
                </button>
              </div>
              <label className="group-label">Styles</label>
            </div>

            {/* PaperGuard AI Group */}
            <div className="tool-group ai-ribbon-group">
              <div className="ai-ribbon-buttons">
                <button className="ai-btn-large primary" onClick={onAnalyzeAll} title="Scan manuscript with 5 AI Agents">
                  <Sparkles size={20} className="sparkle-anim" />
                  <div className="ai-btn-label">
                    <strong>AI Scan</strong>
                    <small>Full Analysis</small>
                  </div>
                </button>

                <button className="ai-btn-large secondary" onClick={onAnalyzeSelection} title="Fact Check highlighted selection">
                  <MousePointer2 size={18} />
                  <div className="ai-btn-label">
                    <strong>Select Text</strong>
                    <small>Fact Check</small>
                  </div>
                </button>
              </div>
              <label className="group-label">PaperGuard AI</label>
            </div>
          </>
        )}

        {/* INSERT TAB */}
        {activeTab === "Insert" && (
          <>
            {/* Pages Operations */}
            <div className="tool-group">
              <button
                className="large-tool"
                onClick={() => {
                  if (onAddPage) onAddPage();
                  else insertBlankPage(editor);
                }}
                title="Add New Blank A4 Page"
              >
                <FilePlus size={22} className="tool-icon-blue" />
                <span>Blank Page</span>
              </button>

              <div className="small-tools">
                <button
                  onClick={() => {
                    if (onAddPage) onAddPage();
                    else insertPageBreak(editor);
                  }}
                  title="Insert Page Break (Ctrl+Enter)"
                >
                  <SplitSquareVertical size={13} className="tool-icon-purple" />
                  <span>Page Break</span>
                </button>
                <button
                  onClick={() => {
                    if (onDeletePage) onDeletePage();
                    else removePageBreak(editor);
                  }}
                  title="Remove Active Page"
                >
                  <Trash2 size={13} className="tool-icon-red" style={{ color: "#ef4444" }} />
                  <span>Delete Page</span>
                </button>
              </div>
              <label className="group-label">Pages</label>
            </div>

            {/* Tables */}
            <div className="tool-group">
              <div className="popover-wrapper">
                <button
                  className="large-tool"
                  onClick={() => setShowTablePicker(!showTablePicker)}
                  title="Insert Table"
                >
                  <Table size={22} className="tool-icon-blue" />
                  <span>Table</span>
                </button>

                {showTablePicker && (
                  <div className="table-grid-popover">
                    <strong>Insert Table Grid</strong>
                    <div className="quick-grid-buttons">
                      <button onClick={() => { insertTable(editor, 2, 2); setShowTablePicker(false); }}>2 x 2</button>
                      <button onClick={() => { insertTable(editor, 3, 3); setShowTablePicker(false); }}>3 x 3</button>
                      <button onClick={() => { insertTable(editor, 4, 4); setShowTablePicker(false); }}>4 x 4</button>
                      <button onClick={() => { insertTable(editor, 5, 5); setShowTablePicker(false); }}>5 x 5</button>
                    </div>
                  </div>
                )}
              </div>
              <label className="group-label">Tables</label>
            </div>

            {/* Illustrations / Pictures */}
            <div className="tool-group">
              <button
                className="large-tool"
                onClick={() => imageInputRef.current && imageInputRef.current.click()}
                title="Upload Picture from PC"
              >
                <ImageIcon size={22} className="tool-icon-green" />
                <span>Picture</span>
              </button>
              <label className="group-label">Illustrations</label>
            </div>

            {/* Links */}
            <div className="tool-group">
              <button
                className="large-tool"
                onClick={handleInsertLinkPrompt}
                title="Insert Hyperlink"
              >
                <Link size={22} className="tool-icon-blue" />
                <span>Hyperlink</span>
              </button>
              <label className="group-label">Links</label>
            </div>

            {/* Academic Citations */}
            <div className="tool-group">
              <button
                className="large-tool"
                onClick={() => setShowCitationModal(true)}
                title="Insert IEEE Citation"
              >
                <BookOpen size={22} className="tool-icon-purple" />
                <span>Citation</span>
              </button>
              <label className="group-label">Citations</label>
            </div>

            {/* Symbols & Math */}
            <div className="tool-group">
              <div className="popover-wrapper">
                <button
                  className="large-tool"
                  onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                  title="Insert Math Symbols"
                >
                  <Sigma size={22} className="tool-icon-blue" />
                  <span>Symbols</span>
                </button>

                {showSymbolPicker && (
                  <div className="symbol-popover-grid">
                    <strong>Scientific Symbols</strong>
                    <div className="symbols-buttons-row">
                      {mathSymbols.map((sym) => (
                        <button
                          key={sym}
                          onClick={() => {
                            insertSymbol(editor, sym);
                            setShowSymbolPicker(false);
                          }}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <label className="group-label">Symbols</label>
            </div>
          </>
        )}

        {/* FILE TAB */}
        {activeTab === "File" && (
          <div className="tool-group file-tab-tools">
            <button
              className="large-tool"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Upload file from PC (.docx, .txt, .md, .html)"
            >
              <Upload size={22} className="tool-icon-blue" />
              <span>Upload</span>
            </button>

            <button
              className="large-tool"
              onClick={() => {
                if (confirm("Create new blank manuscript? Current unsaved changes will be cleared.")) {
                  loadDocumentContent(editor, "<h1>Untitled Manuscript</h1><p>Start writing your paper here...</p>");
                  setDocTitle("New_Manuscript.docx");
                  if (showToast) showToast("Created new document");
                }
              }}
              title="New Blank Document"
            >
              <FilePlus size={22} className="tool-icon-green" />
              <span>New</span>
            </button>

            <button
              className="large-tool"
              onClick={() => {
                const text = editor.getText();
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = docTitle || "PaperGuard_Draft.txt";
                a.click();
                if (showToast) showToast("Saved document to local disk");
              }}
              title="Save to Computer"
            >
              <Download size={22} className="tool-icon-purple" />
              <span>Save As</span>
            </button>

            <button
              className="large-tool"
              onClick={() => window.print()}
              title="Print Document"
            >
              <Printer size={22} />
              <span>Print</span>
            </button>

            <label className="group-label">Document Operations</label>
          </div>
        )}

        {/* REFERENCES TAB */}
        {activeTab === "References" && (
          <div className="ribbon-tab-pane">
            <button className="tab-pane-btn" onClick={() => setShowCitationModal(true)}>
              <BookOpen size={18} />
              <span>Add Citation</span>
            </button>
            <button className="tab-pane-btn" onClick={onAnalyzeAll}>
              <FileCheck size={18} />
              <span>Verify All Claims</span>
            </button>
          </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === "Review" && (
          <div className="ribbon-tab-pane">
            <button className="tab-pane-btn" onClick={onAnalyzeAll}>
              <Sparkles size={18} />
              <span>Check Scientific Validity</span>
            </button>
            <button className="tab-pane-btn" onClick={onAnalyzeSelection}>
              <Search size={18} />
              <span>Detect Weak Claims</span>
            </button>
          </div>
        )}

        {/* VIEW TAB */}
        {activeTab === "View" && (
          <div className="ribbon-tab-pane">
            <button
              className={`tab-pane-btn ${viewMode === "page" ? "active" : ""}`}
              onClick={() => setViewMode("page")}
            >
              <FileText size={18} />
              <span>Print Page Layout</span>
            </button>
            <button
              className={`tab-pane-btn ${viewMode === "flow" ? "active" : ""}`}
              onClick={() => setViewMode("flow")}
            >
              <Eye size={18} />
              <span>Continuous Flow</span>
            </button>
            <button
              className={`tab-pane-btn ${darkModeCanvas ? "active" : ""}`}
              onClick={() => setDarkModeCanvas(!darkModeCanvas)}
            >
              <Palette size={18} />
              <span>{darkModeCanvas ? "Light Canvas" : "Dark Canvas"}</span>
            </button>
          </div>
        )}

        {/* AI TOOLS TAB */}
        {activeTab === "AI Tools" && (
          <div className="ribbon-tab-pane">
            <button className="tab-pane-btn highlight" onClick={onAnalyzeAll}>
              <Sparkles size={18} />
              <span>Run 5-Agent Suite</span>
            </button>
            <div className="ai-preset-info">
              <span>Model: <strong>PaperGuard DeepCheck v2.4</strong></span>
              <span className="dot-status active">5/5 Agents Standby</span>
            </div>
          </div>
        )}
      </div>

      {/* Citation Modal Dialog */}
      {showCitationModal && (
        <div className="ribbon-modal-backdrop">
          <div className="ribbon-modal-box">
            <h3>Insert Academic Citation</h3>
            <form onSubmit={handleAddCitationSubmit}>
              <div className="modal-field">
                <label>Authors (e.g. He et al. / Smith & Lee):</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Publication Year:</label>
                <input
                  type="text"
                  required
                  value={pubYear}
                  onChange={(e) => setPubYear(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Journal / Conference Title:</label>
                <input
                  type="text"
                  value={journalName}
                  onChange={(e) => setJournalName(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-cancel" onClick={() => setShowCitationModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Insert Citation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
