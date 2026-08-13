import React, { useState } from "react";
import {
  FileText,
  Search,
  BookOpen,
  Quote,
  History,
  Settings,
  X,
  ChevronRight,
  Bookmark
} from "lucide-react";

import "./LeftPanel.css";

export default function LeftPanel({ open, onClose, editor }) {
  const [activeNav, setActiveNav] = useState("document");
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToHeading = (text) => {
    if (!editor) return;
    const content = editor.getText();
    const index = content.indexOf(text);
    if (index !== -1) {
      editor.chain().focus().setTextSelection(index + 1).run();
    }
  };

  return (
    <aside className={`left-panel ${open ? "open" : ""}`}>
      <div className="left-panel-header">
        <strong>Navigation</strong>
        <button onClick={onClose} className="left-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="left-panel-tabs">
        <button
          className={activeNav === "document" ? "active" : ""}
          onClick={() => setActiveNav("document")}
          title="Document Headings"
        >
          <FileText size={16} />
        </button>
        <button
          className={activeNav === "search" ? "active" : ""}
          onClick={() => setActiveNav("search")}
          title="Search Document"
        >
          <Search size={16} />
        </button>
        <button
          className={activeNav === "library" ? "active" : ""}
          onClick={() => setActiveNav("library")}
          title="Reference Papers"
        >
          <BookOpen size={16} />
        </button>
        <button
          className={activeNav === "history" ? "active" : ""}
          onClick={() => setActiveNav("history")}
          title="Version History"
        >
          <History size={16} />
        </button>
      </div>

      <div className="left-panel-body">
        {activeNav === "document" && (
          <div className="toc-list">
            <div className="toc-section-title">MANUSCRIPT HEADINGS</div>
            <button className="toc-item h1" onClick={() => scrollToHeading("1. Introduction")}>
              <ChevronRight size={12} />
              <span>1. Introduction</span>
            </button>
            <button className="toc-item h1" onClick={() => scrollToHeading("2. Related Work")}>
              <ChevronRight size={12} />
              <span>2. Related Work</span>
            </button>
            <button className="toc-item h1" onClick={() => scrollToHeading("3. Methodology")}>
              <ChevronRight size={12} />
              <span>3. Methodology</span>
            </button>
          </div>
        )}

        {activeNav === "search" && (
          <div className="search-pane">
            <div className="search-input-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Find in manuscript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <div className="search-results-info">
                Searching for <strong>"{searchQuery}"</strong>...
              </div>
            )}
          </div>
        )}

        {activeNav === "library" && (
          <div className="library-pane">
            <div className="library-card">
              <Bookmark size={14} className="icon-blue" />
              <div>
                <strong>Deep Residual Learning (ResNet)</strong>
                <span>He et al., CVPR 2016</span>
              </div>
            </div>
            <div className="library-card">
              <Bookmark size={14} className="icon-purple" />
              <div>
                <strong>Very Deep Convolutional Networks (VGG)</strong>
                <span>Simonyan et al., ICLR 2015</span>
              </div>
            </div>
          </div>
        )}

        {activeNav === "history" && (
          <div className="history-pane">
            <div className="history-item">
              <span className="time">Just now</span>
              <span className="desc">Added Claim Verification Markers</span>
            </div>
            <div className="history-item">
              <span className="time">10 mins ago</span>
              <span className="desc">Imported Manuscript Draft</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
