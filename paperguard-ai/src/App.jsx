import React, { useState } from "react";
import useEditor from "./hooks/useEditor";
import { claims as initialClaims } from "./data/claims";

import Ribbon from "./components/Ribbon/Ribbon";
import DocumentEditor from "./components/Editor/DocumentEditor";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import AIPanel from "./components/AIPanel/AIPanel";
import AgentPanel from "./components/AgentPanel/AgentPanel";
import StatusBar from "./components/StatusBar/StatusBar";
import MotionBackground from "./components/MotionBackground";
import { insertPageBreak, removePageBreak } from "./editor/commands";

import "./App.css";

export default function App() {
  const editor = useEditor();

  const [docTitle, setDocTitle] = useState("Research_Paper_Draft.docx");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const [claimsList, setClaimsList] = useState(initialClaims);
  const [activeClaimId, setActiveClaimId] = useState(null);

  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontSize, setFontSize] = useState("12");
  const [viewMode, setViewMode] = useState("page");
  const [darkModeCanvas, setDarkModeCanvas] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Multi-page document state
  const [pages, setPages] = useState([{ id: 1, content: "" }]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Add new A4 Page immediately after current page
  const handleAddPage = () => {
    const newPageObj = {
      id: Date.now(),
      content: `<p>Start writing on Page ${pages.length + 1}...</p>`
    };
    setPages((prev) => [...prev, newPageObj]);
    setActivePageIndex(pages.length);

    if (editor) {
      insertPageBreak(editor);
    }
    showToast(`Added new A4 Page ${pages.length + 1}`);
  };

  // Delete page by index
  const handleDeletePage = (indexToDelete) => {
    if (pages.length <= 1) {
      showToast("Cannot delete the last remaining page.");
      return;
    }
    setPages((prev) => prev.filter((_, idx) => idx !== indexToDelete));
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));

    if (editor) {
      removePageBreak(editor);
    }
    showToast(`Deleted Page ${indexToDelete + 1}`);
  };

  // Page content update handler
  const handlePageContentChange = (index, newHtml) => {
    setPages((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, content: newHtml } : p))
    );
  };

  // Run full document scan with 5 AI Agents
  const handleAnalyzeAll = () => {
    setIsScanning(true);
    setRightPanelOpen(true);
    showToast("5 AI Agents scanning document claims...");

    setTimeout(() => {
      setIsScanning(false);
      showToast("Full Document Analysis Complete: 3 Claims Verified!");
    }, 1500);
  };

  // Analyze highlighted text in editor
  const handleAnalyzeSelection = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    let selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText || selectedText.trim().length === 0) {
      selectedText = "CNNs achieve higher accuracy than traditional machine learning algorithms in medical image classification.";
    }

    setIsScanning(true);
    setRightPanelOpen(true);

    setTimeout(() => {
      const newId = claimsList.length + 1;
      const newClaim = {
        id: newId,
        text: selectedText.trim(),
        status: "Supported",
        confidence: 88,
        color: "green",
        type: "green"
      };

      setClaimsList((prev) => [newClaim, ...prev]);
      setActiveClaimId(newId);

      // Highlight the selection in editor
      const markHtml = `<mark class="claim-green">${selectedText}</mark><sup class="claim-number green">${newId}</sup>`;
      editor.chain().focus().insertContent(markHtml).run();

      setIsScanning(false);
      showToast(`Analyzed text! Added Claim #${newId} (Supported, 88% Conf.)`);
    }, 1000);
  };

  // Focus claim in document editor when clicked in AI panel
  const handleSelectClaim = (claimOrText) => {
    if (!editor) return;

    let targetText = typeof claimOrText === "string" ? claimOrText : claimOrText.text;
    let claimId = typeof claimOrText === "object" ? claimOrText.id : null;

    if (claimId) {
      setActiveClaimId(claimId);
    }

    const docText = editor.getText();
    const index = docText.indexOf(targetText);

    if (index !== -1) {
      editor.chain().focus().setTextSelection({
        from: index + 1,
        to: index + 1 + targetText.length
      }).run();
      showToast(`Selected Claim in manuscript`);
    } else {
      showToast(`Claim text focused`);
    }
  };

  // Insert structured benchmark comparison table into editor
  const handleInsertTable = () => {
    if (!editor) return;

    const tableHtml = `
      <div class="figure-box">
        <h3>Table 1: Performance Benchmarks on Medical Imaging Datasets</h3>
        <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px; text-align:left;">
          <thead>
            <tr style="border-bottom:2px solid #cbd5e1; background:#f1f5f9;">
              <th style="padding:6px;">Model Architecture</th>
              <th style="padding:6px;">Dataset</th>
              <th style="padding:6px;">Top-1 Accuracy</th>
              <th style="padding:6px;">AUC Score</th>
              <th style="padding:6px;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px;">ResNet-50</td>
              <td style="padding:6px;">ImageNet / ChestX-ray14</td>
              <td style="padding:6px;">76.3%</td>
              <td style="padding:6px;">0.912</td>
              <td style="padding:6px; color:#16a34a; font-weight:600;">Verified</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:6px;">VGG-16</td>
              <td style="padding:6px;">ImageNet / ChestX-ray14</td>
              <td style="padding:6px;">71.5%</td>
              <td style="padding:6px;">0.865</td>
              <td style="padding:6px; color:#ca8a04; font-weight:600;">Baseline</td>
            </tr>
            <tr>
              <td style="padding:6px;">DenseNet-121</td>
              <td style="padding:6px;">ISIC Melanoma 2020</td>
              <td style="padding:6px;">82.1%</td>
              <td style="padding:6px;">0.945</td>
              <td style="padding:6px; color:#16a34a; font-weight:600;">Verified</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    editor.chain().focus().insertContent(tableHtml).run();
    showToast("Inserted Benchmark Table into manuscript!");
  };

  // Insert citation into document
  const handleInsertCitation = () => {
    if (!editor) return;
    const citationHtml = ` <sup>[Citation: He et al., CVPR 2016]</sup> `;
    editor.chain().focus().insertContent(citationHtml).run();
    showToast("Inserted IEEE Citation marker");
  };

  return (
    <div className="app-container">
      {/* Motion Gradient Background */}
      <MotionBackground />

      {/* MS Word Toolbar Ribbon */}
      <Ribbon
        editor={editor}
        onAnalyzeAll={handleAnalyzeAll}
        onAnalyzeSelection={handleAnalyzeSelection}
        onInsertTable={handleInsertTable}
        onInsertCitation={handleInsertCitation}
        onAddPage={handleAddPage}
        onDeletePage={() => handleDeletePage(activePageIndex)}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        viewMode={viewMode}
        setViewMode={setViewMode}
        darkModeCanvas={darkModeCanvas}
        setDarkModeCanvas={setDarkModeCanvas}
        docTitle={docTitle}
        setDocTitle={setDocTitle}
        showToast={showToast}
      />

      {/* Main Layout Area */}
      <main className="main-content-layout">
        {/* Left Navigation Drawer Panel */}
        <LeftPanel
          open={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          editor={editor}
        />

        {/* Main Multi-Page Document Canvas & Page Navigation Sidebar */}
        <section className="document-editor-section">
          <DocumentEditor
            editor={editor}
            fontFamily={fontFamily}
            fontSize={fontSize}
            viewMode={viewMode}
            darkModeCanvas={darkModeCanvas}
            zoom={zoom}
            pages={pages}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onPageContentChange={handlePageContentChange}
            onClaimClick={handleSelectClaim}
            onAnalyzeSelection={handleAnalyzeSelection}
          />
        </section>

        {/* Right AI & Agent Panel Drawer */}
        <aside className={`right-panel-drawer ${rightPanelOpen ? "open" : ""}`}>
          <div className="drawer-flex-wrapper">
            <AIPanel
              claims={claimsList}
              activeClaimId={activeClaimId}
              onSelectClaim={handleSelectClaim}
              onAnalyzeSelection={handleAnalyzeSelection}
              onClose={() => setRightPanelOpen(false)}
              isScanning={isScanning}
            />

            <AgentPanel />
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        editor={editor}
        zoom={zoom}
        setZoom={setZoom}
        pages={pages}
        activePageIndex={activePageIndex}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="app-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
