import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  BookOpen,
  RefreshCw,
} from "lucide-react";

import VerificationResult from "./VerificationResult";
import "./AIPanel.css";

export default function AIPanel({
  claims = [],
  activeClaimId,
  onSelectClaim,
  onVerifyClaim,
  onAnalyzeSelection,
  onClose,
  isScanning,
  verificationResult,
  activeClaim,
}) {
  const [activeTab, setActiveTab] = useState("live");
  const [filterType, setFilterType] = useState("all");

  const supportingCount = claims.filter(
    (c) => c.color === "green" || c.type === "green" || c.status === "Supported"
  ).length;
  const partialCount = claims.filter(
    (c) => c.color === "yellow" || c.type === "yellow" || c.status === "Partially Supported"
  ).length;
  const contradictingCount = claims.filter(
    (c) => c.color === "red" || c.type === "red" || c.status === "Contradicting"
  ).length;

  const filteredClaims = claims.filter((claim) => {
    if (filterType === "all") return true;
    if (filterType === "green")
      return claim.color === "green" || claim.type === "green" || claim.status === "Supported";
    if (filterType === "yellow")
      return claim.color === "yellow" || claim.type === "yellow" || claim.status === "Partially Supported";
    if (filterType === "red")
      return claim.color === "red" || claim.type === "red" || claim.status === "Contradicting";
    return true;
  });

  return (
    <section className="ai-panel">
      {/* Panel Header */}
      <div className="ai-header">
        <div className="ai-header-title">
          <Sparkles className="sparkle-blue" size={18} />
          <strong>PaperGuard AI Panel</strong>
        </div>
        <button onClick={onClose} className="panel-close-btn" title="Close Panel">
          <X size={18} />
        </button>
      </div>

      {/* Panel Tabs */}
      <div className="ai-tabs">
        <button
          className={activeTab === "live" ? "active" : ""}
          onClick={() => setActiveTab("live")}
        >
          Live Analysis
        </button>
        <button
          className={activeTab === "claims" ? "active" : ""}
          onClick={() => setActiveTab("claims")}
        >
          Claims ({claims.length})
        </button>
        <button
          className={activeTab === "evidence" ? "active" : ""}
          onClick={() => setActiveTab("evidence")}
        >
          Evidence
        </button>
        <button
          className={activeTab === "trace" ? "active" : ""}
          onClick={() => setActiveTab("trace")}
        >
          Agent Logs
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="ai-content">
        {activeTab === "live" && (
          <>
            {/* Banner */}
            <div className="claim-detected-banner">
              <div className="claim-icon-bg">
                <ShieldCheck size={22} />
              </div>
              <div className="banner-text">
                <strong>{claims.length} Scientific Claims Scanned</strong>
                <span>Real-time cross-verification against paper databases</span>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="stats-grid">
              <div
                className={`stat-card green ${filterType === "green" ? "active" : ""}`}
                onClick={() => setFilterType(filterType === "green" ? "all" : "green")}
              >
                <span>Supporting</span>
                <strong>{supportingCount}</strong>
              </div>

              <div
                className={`stat-card yellow ${filterType === "yellow" ? "active" : ""}`}
                onClick={() => setFilterType(filterType === "yellow" ? "all" : "yellow")}
              >
                <span>Partially Supported</span>
                <strong>{partialCount}</strong>
              </div>

              <div
                className={`stat-card red ${filterType === "red" ? "active" : ""}`}
                onClick={() => setFilterType(filterType === "red" ? "all" : "red")}
              >
                <span>Contradicting</span>
                <strong>{contradictingCount}</strong>
              </div>
            </div>

            {/* Recent Claims Header */}
            <div className="recent-claims-header">
              <strong>{filterType === "all" ? "Document Claims" : `${filterType} Claims`}</strong>
              {filterType !== "all" && (
                <button onClick={() => setFilterType("all")} className="clear-filter-btn">
                  Show All
                </button>
              )}
            </div>

            {/* Claims Cards List */}
            <div className="claims-scroll-list">
              {filteredClaims.map((claim) => {
                const color = claim.color || claim.type || "yellow";
                const isSelected = activeClaimId === claim.id;

                return (
                  <div
                    key={claim.id}
                    className={`claim-card ${color} ${isSelected ? "selected" : ""}`}
                    onClick={() => onSelectClaim && onSelectClaim(claim)}
                  >
                    <div className={`claim-number-badge ${color}`}>
                      {typeof claim.id === "string" ? claim.id.slice(0, 4) : claim.id}
                    </div>

                    <div className="claim-card-body">
                      <p className="claim-text">{claim.text}</p>

                      <div className="claim-meta-row">
                        <span className={`status-pill ${color}`}>
                          {color === "green" && <CheckCircle size={10} />}
                          {color === "yellow" && <AlertTriangle size={10} />}
                          {color === "red" && <XCircle size={10} />}
                          {claim.status}
                        </span>

                        <span className="confidence-meter">
                          Confidence: <strong>{claim.confidence}%</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-verify"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerifyClaim?.(claim.raw || claim);
                        }}
                      >
                        Verify Evidence
                      </button>
                    </div>

                    <ArrowRight size={15} className="arrow-nav" />
                  </div>
                );
              })}
            </div>

            {/* Show Me Why / verdict block when verificationResult exists */}
            {verificationResult && verificationResult.claimId === activeClaimId && (
              <VerificationResult result={verificationResult} />
            )}

            {/* Action Button */}
            <button
              className={`analyze-selection-btn ${isScanning ? "scanning" : ""}`}
              onClick={onAnalyzeSelection}
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <RefreshCw size={16} className="spin-icon" />
                  Analyzing Selection...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Selected Text
                </>
              )}
            </button>
            <p className="ai-hint-text">
              Highlight any sentence in the manuscript to trigger live agent validation
            </p>
          </>
        )}

        {activeTab === "claims" && (
          <div className="claims-tab-pane">
            <div className="claims-list-detailed">
              {claims.map((claim) => (
                <div key={claim.id} className="detailed-claim-box">
                  <div className="detailed-header">
                    <span className={`status-pill ${claim.color || claim.type}`}>
                      Claim • {claim.status}
                    </span>
                    <span className="conf-badge">{claim.confidence}% Conf.</span>
                  </div>
                  <p className="detailed-text">"{claim.text}"</p>
                  <div className="detailed-actions">
                    <button onClick={() => onSelectClaim(claim)}>
                      <Search size={12} /> Locate in Text
                    </button>
                    <button
                      className="btn-verify"
                      onClick={() => onVerifyClaim?.(claim.raw || claim)}
                    >
                      Verify Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="evidence-tab-pane">
            <div className="evidence-card support">
              <div className="evidence-source">
                <BookOpen size={14} className="icon-blue" />
                <span>arXiv:2308.09124 • Medical AI Journal</span>
              </div>
              <p className="evidence-quote">
                "ResNet architectures demonstrate statistically significant top-1 accuracy gains over VGG networks across 12 medical image benchmarks (p &lt; 0.01)."
              </p>
              <div className="evidence-footer">
                <span>Matched to Claim</span>
                <span className="score">85% Similarity</span>
              </div>
            </div>

            <div className="evidence-card contradict">
              <div className="evidence-source">
                <BookOpen size={14} className="icon-purple" />
                <span>PubMed ID: 3849102 • Clinical Machine Learning</span>
              </div>
              <p className="evidence-quote">
                "On small-sample clinical cohorts (N &lt; 500), deep networks exhibit over-fitting risks and fail to achieve statistical superiority over linear classifiers."
              </p>
              <div className="evidence-footer">
                <span>Matched to Claim</span>
                <span className="score">72% Similarity</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trace" && (
          <div className="trace-tab-pane">
            <div className="log-line success">
              <span className="timestamp">11:27:01</span>
              <span>[Claim Detector] Identified atomic research claims</span>
            </div>
            <div className="log-line info">
              <span className="timestamp">11:27:03</span>
              <span>[Research Agent] Queried Semantic Scholar API for papers</span>
            </div>
            <div className="log-line warning">
              <span className="timestamp">11:27:05</span>
              <span>[Adversarial Agent] Detected potential contradiction</span>
            </div>
            <div className="log-line success">
              <span className="timestamp">11:27:07</span>
              <span>[Verification Agent] Synthesis complete. Confidence score generated.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
