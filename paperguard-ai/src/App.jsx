import React, { useState, useCallback, useMemo } from "react";
import useEditor from "./hooks/useEditor";
import useClaimLog from "./hooks/useClaimLog";
import useClaimDetection from "./hooks/useClaimDetection";
import useClaimVerification from "./hooks/useClaimVerification";
import { createPhase3Handlers } from "./phase3/wireAppHandlers";
import { buildPhase4ViewModel } from "./phase4/buildPhase4ViewModel";

import AppShell from "./components/AppShell/AppShell";
import TopBar from "./components/TopBar/TopBar";
import DocumentSidebar from "./components/DocumentSidebar/DocumentSidebar";
import VerificationWorkspace from "./components/Verification/VerificationWorkspace";
import InvestigationTimeline from "./components/Investigation/InvestigationTimeline";
import EditorToolbar from "./components/Manuscript/EditorToolbar";
import StatusBar from "./components/StatusBar/StatusBar";
import DocumentEditor from "./components/editor/DocumentEditor";
import { insertPageBreak, removePageBreak } from "./editor/commands";

import "./App.css";

export default function App() {
  const editor = useEditor();
  const claimLog = useClaimLog([]);

  const [docTitle, setDocTitle] = useState("Research_Paper_Draft.docx");
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
  const [tracesByClaimId, setTracesByClaimId] = useState({});

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
    activeRuns,
    resultsByClaimId,
  } = useClaimVerification({
    provider: "auto",
    useMock: false,
  });

  const { handleVerifyClaim: _handleVerifyClaim } = createPhase3Handlers({
    claimLog,
    verifyClaim,
    setTracesByClaimId,
    setRightPanelOpen,
    setIsScanning,
    showToast,
  });

  // Smart verify: resolve claim from log, then call backend verification.
  // Falls back to detect+verify on the current selection if claim not yet in log.
  const handleVerifyClaim = useCallback(async (claimOrId) => {
    if (!claimOrId) {
      showToast('No claim selected');
      return null;
    }

    const id = typeof claimOrId === 'string' ? claimOrId : claimOrId?.id;

    // Always prefer the raw claims array (has full data like text, entities, etc.)
    let target = claimLog.claims.find(c => c.id === id);

    // Also search uiClaims in case it's a ui-only object
    if (!target) {
      const uiMatch = claimLog.uiClaims?.find(c => c.id === id);
      if (uiMatch?.raw) target = uiMatch.raw;
      else if (uiMatch) target = uiMatch;
    }

    if (target && target.text) {
      return _handleVerifyClaim(target);
    }

    // Fallback: detect the current editor selection first, then verify
    if (editor) {
      setIsScanning(true);
      setRightPanelOpen(true);
      showToast('Detecting claim from selection…');
      const found = await detection.detectSelection();
      setIsScanning(false);
      if (found.length > 0) {
        return _handleVerifyClaim(found[0]);
      }
      showToast('No scientific claim detected — select claim text and try again');
    }
    return null;
  }, [claimLog.claims, claimLog.uiClaims, _handleVerifyClaim, editor, detection, showToast]);

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

    // Resolve the claim object
    let claim = typeof claimOrText === "object"
      ? (claimOrText.raw || claimOrText)
      : null;

    const targetText = typeof claimOrText === "string"
      ? claimOrText
      : (claimOrText?.text || "");

    // Find existing claim by exact or fuzzy text match
    if (!claim && targetText) {
      claim = claimLog.claims.find((c) => c.text === targetText) ||
              claimLog.claims.find((c) =>
                c.text && targetText && (
                  c.text.includes(targetText.slice(0, 40)) ||
                  targetText.includes(c.text.slice(0, 40))
                )
              );
    }

    // If still no match, upsert a synthetic claim so the workspace shows it
    if (!claim && targetText && targetText.trim().length > 10) {
      const syntheticClaim = {
        id: `syn_${targetText.replace(/[^a-z0-9]/gi, "").slice(0, 20).toLowerCase()}`,
        text: targetText.trim(),
        status: "detected",
        color: "yellow",
        type: "yellow",
        confidence: 70,
        source: "click",
        claimType: "other",
        detectedAt: new Date().toISOString(),
      };
      claimLog.addClaims([syntheticClaim]);
      claim = syntheticClaim;
    }

    if (claim?.id) {
      claimLog.setActiveClaimId(claim.id);
      setRightPanelOpen(true);
    }

    // Scroll to + select the text in the editor
    if (targetText) {
      const docText = editor.state.doc.textContent;
      const index = docText.indexOf(targetText);
      if (index !== -1) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: index + 1, to: index + 1 + targetText.length })
          .run();
      }
    }
  };

  const handleInspectClaim = (claimId) => {
    if (claimId) {
      claimLog.setActiveClaimId(claimId);
      setRightPanelOpen(true);
    }
  };

  // Phase 4 View Model construction
  const activeClaimResult = resultsByClaimId[claimLog.activeClaimId];
  const activeRun = activeRuns[claimLog.activeClaimId];
  
  const p4ViewModel = useMemo(() => {
    if (!activeClaimResult) return null;
    const activeClaimId = claimLog.activeClaimId;
    const targetClaim = claimLog.claims.find(c => c.id === activeClaimId) || { id: activeClaimId, text: activeClaimResult.claim?.claim_text || "" };
    return buildPhase4ViewModel(targetClaim, activeClaimResult);
  }, [activeClaimResult, claimLog.claims, claimLog.activeClaimId]);

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (editor) {
        // Clear all claims before loading new file
        claimLog.clearClaims();
        setTracesByClaimId({});
        
        // Use setContent. If the file is plain text, wrap paragraphs in <p> manually so TipTap parses it correctly
        // Or if it's html, it parses directly. We'll do a simple plain text conversion if there's no HTML tags
        let parsedContent = content;
        if (!content.includes('<') || !content.includes('>')) {
          parsedContent = content.split('\n').filter(line => line.trim()).map(line => `<p>${line.trim()}</p>`).join('');
        }
        
        editor.commands.setContent(parsedContent);
        setDocTitle(file.name);
        showToast(`Loaded ${file.name}`);
      }
    };
    reader.onerror = () => {
      showToast("Error reading file");
    };
    reader.readAsText(file);
  };

  return (
    <>
      <AppShell
        topBar={
          <TopBar 
            docTitle={docTitle} 
            onAnalyzeAll={handleAnalyzeAll} 
            onVerifySelected={() => {
              if (claimLog.activeClaimId) handleVerifyClaim(claimLog.activeClaimId);
            }}
            hasSelection={editor && !editor.state.selection.empty}
            onFileUpload={handleFileUpload}
          />
        }
        sidebar={
          <DocumentSidebar 
            claims={claimLog.uiClaims} 
            activeClaimId={claimLog.activeClaimId}
            onSelectClaim={handleSelectClaim}
            onVerifyClaim={handleVerifyClaim}
          />
        }
        manuscript={
          <div style={{display: 'flex', flexDirection: 'column', height: '100%', width: '100%'}}>
            <EditorToolbar editor={editor} fontFamily={fontFamily} setFontFamilyProp={setFontFamily} />
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
              onVerifyClaim={handleVerifyClaim}
              onInspectClaim={handleInspectClaim}
              activeClaimId={claimLog.activeClaimId}
              claims={claimLog.claims}
            />
          </div>
        }
        verification={
          <VerificationWorkspace
            activeClaim={claimLog.claims.find(c => c.id === claimLog.activeClaimId)}
            verificationResult={activeClaimResult}
            p4ViewModel={p4ViewModel}
            onVerify={(id) => handleVerifyClaim(id || claimLog.activeClaimId)}
            onClose={() => setRightPanelOpen(false)}
          />
        }
        investigation={
          <InvestigationTimeline 
            trace={tracesByClaimId[claimLog.activeClaimId] || []} 
            isRunning={activeRun?.status === "running"} 
            onReverify={() => handleVerifyClaim(claimLog.activeClaimId)}
            onShowWhy={() => {}} 
          />
        }
        statusBar={
          <StatusBar backendConnected={true} useMock={false} /> 
        }
        isVerificationOpen={rightPanelOpen}
        isInvestigationOpen={rightPanelOpen}
      />
      {toastMessage && (
        <div className="app-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
