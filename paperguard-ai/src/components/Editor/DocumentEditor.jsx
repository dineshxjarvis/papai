import React, { useRef, useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { Sparkles } from "lucide-react";
import PageNavigationSidebar from "../PageNavigation/PageNavigationSidebar";
import "./Editor.css";

export default function DocumentEditor({
  editor,
  fontFamily = "Times New Roman",
  fontSize = "12",
  viewMode = "page",
  darkModeCanvas = false,
  zoom = 100,
  pages = [{ id: 1 }],
  activePageIndex = 0,
  setActivePageIndex,
  onAddPage,
  onDeletePage,
  onPageContentChange,
  onClaimClick,
  onAnalyzeSelection
}) {
  const scrollWrapperRef = useRef(null);
  const pageRefs = useRef([]);

  if (!editor) {
    return (
      <div className="editor-loading">
        <Sparkles size={24} className="spin-icon" />
        <span>Initializing Document Editor...</span>
      </div>
    );
  }

  // Handle scroll to detect active visible page
  const handleScroll = () => {
    if (!scrollWrapperRef.current || !pageRefs.current.length) return;
    const wrapperTop = scrollWrapperRef.current.getBoundingClientRect().top;

    let closestIndex = 0;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, index) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - wrapperTop);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });

    if (setActivePageIndex && closestIndex !== activePageIndex) {
      setActivePageIndex(closestIndex);
    }
  };

  // Scroll to selected page when thumbnail is clicked
  const handleSelectPage = (index) => {
    if (setActivePageIndex) setActivePageIndex(index);
    if (pageRefs.current[index]) {
      pageRefs.current[index].scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  // Handle click on claims in the document
  const handleEditorClick = (e) => {
    const target = e.target.closest("mark");
    if (target) {
      const text = target.innerText.trim();
      if (onClaimClick) {
        onClaimClick(text);
      }
    }
  };

  const scaleValue = zoom / 100;
  const rulerTicks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className={`editor-container ${darkModeCanvas ? "dark-canvas" : ""}`}>
      {/* Left MS Word Page Navigation Sidebar */}
      {viewMode === "page" && (
        <PageNavigationSidebar
          pages={pages}
          activePageIndex={activePageIndex}
          onSelectPage={handleSelectPage}
          onAddPage={onAddPage}
          onDeletePage={onDeletePage}
        />
      )}

      {/* Main Document Canvas Scroll Wrapper */}
      <div
        className={`editor-wrapper ${viewMode === "flow" ? "flow-mode" : "page-mode"}`}
        ref={scrollWrapperRef}
        onScroll={handleScroll}
      >
        <div
          className="editor-zoom-container"
          style={{
            zoom: scaleValue,
            WebkitZoom: scaleValue,
            transformOrigin: "top center"
          }}
        >
          {/* MS Word Top Horizontal Ruler Bar */}
          {viewMode === "page" && (
            <div className="ms-word-ruler">
              <div className="ruler-left-margin" title="Left Margin (1 inch)" />
              <div className="ruler-track">
                <div className="ruler-indent-marker top" title="First Line Indent" />
                <div className="ruler-indent-marker bottom" title="Left Indent" />
                {rulerTicks.map((tick) => (
                  <div key={tick} className="ruler-tick-mark">
                    <span className="ruler-number">{tick}</span>
                    <div className="ruler-subticks">
                      <span /><span /><span />
                    </div>
                  </div>
                ))}
              </div>
              <div className="ruler-right-margin" title="Right Margin (1 inch)" />
            </div>
          )}

          {/* Stack of A4 Paper Pages */}
          <div className="pages-stack-container">
            {pages.map((page, index) => {
              const isPageActive = activePageIndex === index;

              return (
                <div
                  key={page.id || index}
                  id={`page-sheet-${index}`}
                  ref={(el) => (pageRefs.current[index] = el)}
                  className={`document-paper page-sheet-card ${isPageActive ? "active-page-sheet" : ""}`}
                  style={{
                    fontFamily: fontFamily || "Times New Roman",
                    fontSize: `${fontSize}pt`
                  }}
                  onClick={handleEditorClick}
                >
                  {/* Top Header Marker */}
                  <div className="page-header-marker">
                    <span className="doc-title-watermark">PaperGuard AI • Research Manuscript Draft</span>
                    <span className="page-number-watermark">
                      Page {index + 1} of {pages.length}
                    </span>
                  </div>

                  {/* Page Body Content */}
                  {index === 0 ? (
                    <EditorContent editor={editor} className="paperguard-tiptap-content" />
                  ) : (
                    <div
                      className="paperguard-tiptap-content secondary-page-content"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) =>
                        onPageContentChange && onPageContentChange(index, e.target.innerHTML)
                      }
                      dangerouslySetInnerHTML={{
                        __html: page.content || `<p>Page ${index + 1} content...</p>`
                      }}
                    />
                  )}

                  {/* Bottom Footer Marker */}
                  <div className="page-footer-marker">
                    <span>Confidential Draft • Page {index + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
