import React, { useRef, useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { Sparkles } from "lucide-react";
import ClaimBubbleMenu from "../Manuscript/ClaimBubbleMenu";
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
  onAnalyzeSelection,
  onVerifyClaim,
  onInspectClaim,
  activeClaimId,
  claims = []
}) {
  const scrollWrapperRef = useRef(null);

  // Apply active claim styling directly to the DOM to avoid mutating the document
  useEffect(() => {
    if (!editor || !editor.view) return;
    
    const marks = editor.view.dom.querySelectorAll("mark.claim-mark");
    marks.forEach(mark => {
      if (activeClaimId && mark.getAttribute("data-claim-id") === activeClaimId) {
        mark.classList.add("active-claim");
        // Scroll to the active claim if it was just selected
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        mark.classList.remove("active-claim");
      }
    });
  }, [activeClaimId, editor?.state?.doc]);
  const pageRefs = useRef([]);
  const previousPagesLength = useRef(pages.length);

  // Auto-scroll to newly added page when pages array length increases
  useEffect(() => {
    if (pages.length > previousPagesLength.current) {
      const newPageIndex = pages.length - 1;
      if (setActivePageIndex) setActivePageIndex(newPageIndex);
      setTimeout(() => {
        if (pageRefs.current[newPageIndex]) {
          pageRefs.current[newPageIndex].scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 50);
    }
    previousPagesLength.current = pages.length;
  }, [pages.length, setActivePageIndex]);

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
      // Clone the mark, remove any <sup> footnote numbers, then get clean text
      const clone = target.cloneNode(true);
      clone.querySelectorAll("sup").forEach(s => s.remove());
      const text = (clone.innerText || clone.textContent || "").trim();
      if (text && onClaimClick) {
        onClaimClick(text);
      }
    }
  };

  const scaleValue = zoom / 100;
  const rulerTicks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className={`editor-container ${darkModeCanvas ? "dark-canvas" : ""}`}>
      {editor && <ClaimBubbleMenu editor={editor} onVerifyClaim={onVerifyClaim} onInspectClaim={onInspectClaim} onAnalyzeSelection={onAnalyzeSelection} claims={claims} />}

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
                  onClick={(e) => {
                    if (setActivePageIndex) setActivePageIndex(index);
                    const sheetEl = document.getElementById(`page-sheet-${index}`);
                    if (sheetEl) {
                      sheetEl.classList.remove("liquid-click-anim");
                      void sheetEl.offsetWidth;
                      sheetEl.classList.add("liquid-click-anim");
                    }
                    handleEditorClick(e);
                  }}
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
