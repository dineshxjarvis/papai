import React from 'react';
import { Check, X, MoreHorizontal, FileText, RefreshCw } from 'lucide-react';
import './InvestigationTimeline.css';

const AGENT_MAPPING = {
  claim_decomposition: "Claim Decomposed",
  query_expansion: "Query Expanded",
  research: "Literature Search",
  relevance_ranking: "Relevance Ranking",
  evidence_extraction: "Evidence Extraction",
  adversarial_critic: "Adversarial Analysis",
  coverage_analysis: "Coverage Analysis",
  verdict: "Verdict Generated"
};

const AGENT_ORDER = Object.keys(AGENT_MAPPING);

function StepIcon({ status }) {
  if (status === "completed") return <Check size={12} strokeWidth={3} />;
  if (status === "running") return <div style={{width: 6, height: 6, borderRadius: '50%', backgroundColor: 'white'}} />;
  if (status === "error" || status === "failed") return <X size={12} strokeWidth={3} />;
  return null; // queued has no icon, just border
}

export default function InvestigationTimeline({ trace = [], isRunning = false, onReverify, onShowWhy }) {
  // Build a map of latest state per agent
  const latestTrace = {};
  for (const step of trace) {
    if (step?.agent) latestTrace[step.agent] = step;
  }

  const steps = AGENT_ORDER.map(agentKey => {
    const step = latestTrace[agentKey];
    
    // Determine status
    let status = "queued";
    if (step) {
      if (step.status === "running" || step.status === "started") status = "running";
      else if (step.status === "complete" || step.status === "completed") status = "completed";
      else if (step.status === "error" || step.status === "failed") status = "failed";
      else status = "running"; // fallback for arbitrary intermediate states
    } else if (isRunning && Object.keys(latestTrace).length > 0) {
      // If we are running and this step is after the current running step, it's queued
      status = "queued";
    }

    // Determine timestamp
    let timeString = null;
    if (step && step.timestamp) {
      // The backend sends ISO strings or similar
      const d = new Date(step.timestamp);
      if (!isNaN(d.getTime())) {
        timeString = d.toLocaleTimeString([], { hour12: false });
      }
    }

    return {
      id: agentKey,
      title: AGENT_MAPPING[agentKey],
      status,
      detail: step?.detail || "",
      time: timeString
    };
  });

  // If there's no trace and not running, we show an empty state or just the empty timeline
  const isEmpty = trace.length === 0 && !isRunning;

  return (
    <div className="investigation-timeline-panel">
      <div className="investigation-header">
        <span>INVESTIGATION</span>
        <MoreHorizontal size={16} style={{cursor: 'pointer'}} />
      </div>

      <div className="timeline-list">
        {steps.map(step => (
          <div key={step.id} className={`timeline-step ${step.status}`}>
            <div className="step-indicator">
              <StepIcon status={step.status} />
            </div>
            <div className="step-content">
              <span className="step-title">{step.title}</span>
              {step.detail && <span className="step-detail">{step.detail}</span>}
              {step.time && <span className="step-time">{step.time}</span>}
            </div>
          </div>
        ))}
      </div>

      {!isEmpty && (
        <div className="related-actions">
          <div className="related-actions-title">RELATED ACTIONS</div>
          
          <button className="action-btn" onClick={onShowWhy}>
            <FileText size={14} />
            View Full Audit Trace
          </button>
          
          <button className="action-btn" onClick={onReverify}>
            <RefreshCw size={14} />
            Re-verify Claim
          </button>
        </div>
      )}
    </div>
  );
}
