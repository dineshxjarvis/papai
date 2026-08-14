import React, { useState, useCallback } from "react";
import useEditor from "./hooks/useEditor";
import useClaimLog from "./hooks/useClaimLog";
import useClaimDetection from "./hooks/useClaimDetection";
import useClaimVerification from "./hooks/useClaimVerification";
import { createPhase3Handlers } from "./phase3/wireAppHandlers";

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
  const claimLog = useClaimLog([]);

  const [docTitle, setDocTitle] = useState("Research_Paper_Draft.docx");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const [fontFamily, setFontFamily] = useState("Times New Roman");
  const [fontSize, setFontSize] = useState("12");
  const [viewMode, setViewMode] = useState("page");
  const [darkModeCanvas, setDarkModeCanvas] = useState(false);
  const [zoom, setZoom] = useState(100);

  const [pages, setPages] = useState([{ id: 1, content: "" }]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [agentTrace, setAgentTrace] = useState([]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3200);
  }, []);

  // Phase 2 detection
  const detection = useClaimDetection(editor, claimLog, {
    enabled: true,
    provider: "auto",
    onProgress: (stage, detail) => {
      setScanProgress(`${stage}: ${detail}`);
    },
    onError: (err) => {
      showToast(`Detection error: ${err.message}`);
      setIsScanning(false);
    },
  });

  // Phase 3 verification
  const {
    verifyClaim,
    cancel: cancelVerification,
    isVerifying,
    activeRun,
    lastResult,
  } = useClaimVerification({
    provider: "auto",
    useMock: false,
  });

  const { handleVerifyClaim } = createPhase3Handlers({
    claimLog,
    verifyClaim,
    setAgentTrace,
    setRightPanelOpen,
    setIsScanning,
    showToast,
  });

  const handleAddPage = () => {
    const newPageObj = {
      id: Date.now(),
      content: `<p>Start writing on Page ${pages.length + 1}...</p>`,
    };
    setPages((prev) => [...prev, newPageObj]);
    setActivePageIndex(pages.length);
    if (editor) insertPageBreak(editor);
    showToast(`Added new A4 Page ${pages.length + 1}`);
  };

  const handleDeletePage = (indexToDelete) => {
    if (pages.length <= 1) {
      showToast("Cannot delete the last remaining page.");
      return;
    }
    setPages((prev) => prev.filter((_, idx) => idx !== indexToDelete));
    setActivePageIndex((prev) =>
      Math.max(0, Math.min(prev, pages.length - 2))
    );
    if (editor) removePageBreak(editor);
    showToast("Page deleted");
  };

  const handlePageContentChange = () => {};

  const handleAnalyzeAll = async () => {
    if (!editor) return;
    setIsScanning(true);
    setRightPanelOpen(true);
    setScanProgress("Starting full document scan…");
    showToast("Scanning document for claims…");

    const found = await detection.detectAll();

    setIsScanning(false);
    setScanProgress("");
    showToast(
      found.length
        ? `Found ${found.length} claim${found.length > 1 ? "s" : ""}`
        : "No claims detected above threshold"
    );
  };

  const handleAnalyzeSelection = async () => {
    if (!editor) return;
    setIsScanning(true);
    setRightPanelOpen(true);
    setScanProgress("Analyzing selection…");

    const found = await detection.detectSelection();

    setIsScanning(false);
    setScanProgress("");
    showToast(
      found.length
        ? `Added ${found.length} claim${found.length > 1 ? "s" : ""}`
        : "No claim detected in selection"
    );
  };

  const handleSelectClaim = (claimOrText) => {
    if (!editor) return;

    const claim =
      typeof claimOrText === "object"
        ? claimOrText.raw || claimOrText
        : claimLog.claims.find((c) => c.text === claimOrText);

    if (claim?.id) claimLog.setActiveClaimId(claim.id);

    const targetText =
      typeof claimOrText === "string" ? claimOrText : claimOrText.text;

    if (targetText) {
      const docText = editor.state.doc.textContent;
      const index = docText.indexOf(targetText);

      if (index !== -1) {
        editor
          .chain()
          .focus()
          .setTextSelection({
            from: index + 1,
            to: index + 1 + targetText.length,
          })
          .run();
        showToast("Selected claim in manuscript");
      } else {
        showToast("Claim text focused");
      }
    }
  };

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

  const handleInsertCitation = () => {
    if (!editor) return;
    const citationHtml = ` <sup>[Citation: He et al., CVPR 2016]</sup> `;
    editor.chain().focus().insertContent(citationHtml).run();
    showToast("Inserted IEEE Citation marker");
  };

  return (
    <div className="app-container">
      <MotionBackground />

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

      <main className="main-content-layout">
        <LeftPanel
          open={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          editor={editor}
        />

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

        <aside className={`right-panel-drawer ${rightPanelOpen ? "open" : ""}`}>
          <div className="drawer-flex-wrapper">
            <AIPanel
              claims={claimLog.uiClaims}
              activeClaimId={claimLog.activeClaimId}
              onSelectClaim={handleSelectClaim}
              onVerifyClaim={handleVerifyClaim}
              onAnalyzeSelection={handleAnalyzeSelection}
              onClose={() => setRightPanelOpen(false)}
              isScanning={isScanning || isVerifying}
              scanProgress={scanProgress}
              verificationResult={lastResult}
              activeClaim={
                claimLog.claims.find((c) => c.id === claimLog.activeClaimId) ||
                null
              }
            />

            <AgentPanel
              trace={agentTrace}
              activeRun={activeRun}
              isRunning={isVerifying}
            />
          </div>
        </aside>
      </main>

      <StatusBar
        editor={editor}
        zoom={zoom}
        setZoom={setZoom}
        pages={pages}
        activePageIndex={activePageIndex}
      />

      {toastMessage && (
        <div className="app-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
