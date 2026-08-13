import React, { useState } from "react";
import {
  Shield,
  Cloud,
  CheckCircle2,
  Sparkles,
  Share2,
  UserCircle,
  Copy,
  Check,
  PanelLeft,
  PanelRight
} from "lucide-react";

import "./Header.css";

export default function Header({
  docTitle,
  setDocTitle,
  onAnalyzeAll,
  leftPanelOpen,
  setLeftPanelOpen,
  rightPanelOpen,
  setRightPanelOpen
}) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="header">
      {/* Brand Logo & App Name */}
      <div className="brand">
        <button
          className={`header-nav-toggle ${leftPanelOpen ? "active" : ""}`}
          onClick={() => setLeftPanelOpen && setLeftPanelOpen(!leftPanelOpen)}
          title={leftPanelOpen ? "Close Navigation Sidebar" : "Open Navigation Sidebar"}
        >
          <PanelLeft size={17} />
        </button>

        <div className="brand-icon">
          <Shield size={20} fill="white" className="shield-icon" />
        </div>

        <div className="brand-titles">
          <div className="brand-name">
            PaperGuard <span>AI</span>
          </div>
          <div className="brand-subtitle">
            Live Research Writing Environment
          </div>
        </div>
      </div>

      {/* Document Title & Sync Status */}
      <div className="document-title">
        <input
          type="text"
          value={docTitle}
          onChange={(e) => setDocTitle && setDocTitle(e.target.value)}
          className="doc-title-input"
          title="Click to rename document"
        />
        <div className="saved-badge">
          <Cloud size={14} className="cloud-icon" />
          <CheckCircle2 size={13} className="check-icon" />
          <span>Saved to Cloud</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        <div className="agents-active-pill" onClick={onAnalyzeAll} title="Run 5 AI Agents Scan">
          <Sparkles size={15} className="sparkle-active" />
          <span>5 AI Agents Active</span>
          <span className="live-dot" />
        </div>

        <button className="share-btn" onClick={() => setShowShareModal(!showShareModal)}>
          <Share2 size={14} />
          <span>Share</span>
        </button>

        <button
          className={`header-ai-toggle ${rightPanelOpen ? "active" : ""}`}
          onClick={() => setRightPanelOpen && setRightPanelOpen(!rightPanelOpen)}
          title={rightPanelOpen ? "Close PaperGuard AI Panel" : "Open PaperGuard AI Panel"}
        >
          <PanelRight size={17} />
        </button>

        <div className="user-profile-icon" title="Logged in as Researcher">
          <UserCircle size={24} />
        </div>

        <div className="window-buttons">
          <span title="Minimize">−</span>
          <span title="Maximize">□</span>
          <span title="Close">×</span>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="share-modal-dropdown">
          <strong>Share Research Manuscript</strong>
          <p>Anyone with this link can collaborate and view AI claim verifications.</p>
          <div className="share-link-input">
            <input type="text" readOnly value="https://paperguard.ai/doc/manuscript-842" />
            <button onClick={handleCopyShareLink}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
