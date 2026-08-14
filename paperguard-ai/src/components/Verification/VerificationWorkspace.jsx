import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle, FileText, Target, BookOpen, Layers, Search } from 'lucide-react';
import './VerificationWorkspace.css';
import ShowMeWhy from '../Phase4/ShowMeWhy';

export default function VerificationWorkspace({
  activeClaim,
  verificationResult,
  p4ViewModel,
  onVerify,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!activeClaim) {
    return (
      <div className="verification-workspace">
        <div className="empty-verification">
          <ShieldCheck size={48} className="empty-icon" />
          <p>Select a claim in the manuscript or sidebar to verify its scientific accuracy.</p>
        </div>
      </div>
    );
  }

  const vm = p4ViewModel;

  return (
    <div className="verification-workspace">
      {/* Header */}
      <div className="verification-header">
        <div className="header-left">
          <span className="verification-title">VERIFICATION WORKSPACE</span>
          <div className="claim-header-box">
            <ShieldCheck size={20} style={{color: 'var(--primary-blue)', marginTop: 2, flexShrink: 0}} />
            <span className="claim-header-text">"{activeClaim.text}"</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="verification-tabs">
        <button 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          Evidence
        </button>
        <button 
          className={`tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          Conflicts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'why' ? 'active' : ''}`}
          onClick={() => setActiveTab('why')}
        >
          Why?
        </button>
      </div>

      {/* Content */}
      <div className="verification-content">
        {!vm && (
          <div className="empty-verification" style={{textAlign: 'center', maxWidth: 300, margin: '0 auto'}}>
            <Search size={48} className="empty-icon" style={{color: 'var(--primary-blue)', opacity: 0.8}} />
            <h3 style={{margin: '16px 0 8px', fontSize: 16, color: 'var(--text-main)'}}>CLAIM READY</h3>
            <p style={{marginBottom: 24, color: 'var(--text-secondary)'}}>
              This claim has been detected but has not been verified against the literature yet.
            </p>
            <button className="btn-primary" onClick={() => onVerify(activeClaim.id)} style={{width: '100%', justifyContent: 'center'}}>
              <ShieldCheck size={16} />
              Verify Scientific Accuracy
            </button>
          </div>
        )}

        {vm && activeClaim.text !== vm.audit?.claimText && (
          <div className="verdict-banner yellow" style={{marginBottom: 16}}>
            <AlertTriangle size={20} style={{color: 'var(--warning)', flexShrink: 0}} />
            <div className="verdict-text-group">
              <span className="verdict-title">CLAIM CHANGED</span>
              <span className="verdict-desc">
                The manuscript text has been edited since this verification.
              </span>
            </div>
            <button className="btn-secondary" onClick={() => onVerify(activeClaim.id)} style={{marginLeft: 'auto'}}>
              Re-Verify
            </button>
          </div>
        )}

        {vm && activeTab === 'summary' && (
          <div className="summary-grid">
            <div className={`verdict-banner ${vm.tone}`}>
              {vm.tone === 'green' && <CheckCircle size={24} style={{color: 'var(--success)', flexShrink: 0}} />}
              {vm.tone === 'yellow' && <AlertTriangle size={24} style={{color: 'var(--warning)', flexShrink: 0}} />}
              {vm.tone === 'red' && <XCircle size={24} style={{color: 'var(--danger)', flexShrink: 0}} />}
              
              <div className="verdict-text-group">
                <span className="verdict-title">{vm.verdictLabel}</span>
                <span className="verdict-desc">
                  Based on {vm.scope.papersAnalyzed} papers ({vm.strength.supportingPapers} supporting, {vm.scope.contradicting} contradicting)
                </span>
              </div>
            </div>

            <div className="metrics-row">
              <div className="metric-card">
                <span className="metric-label">Confidence</span>
                <span className="metric-value">{vm.strength.assessmentConfidence}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Coverage</span>
                <span className="metric-value">{vm.coverage?.matched || 0}/{vm.coverage?.total || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Atoms</span>
                <span className="metric-value">{vm.coverage?.rows?.length || 0}</span>
              </div>
            </div>

            {vm.coverage?.rows && vm.coverage.rows.length > 0 && (
              <div className="coverage-list">
                <span className="evidence-section-title"><Target size={14} /> Atomic Claim Coverage</span>
                {vm.coverage.rows.map((row, i) => (
                  <div key={i} className="coverage-item">
                    {row.status === 'matched' ? (
                      <CheckCircle size={14} className="coverage-icon matched" />
                    ) : (
                      <AlertTriangle size={14} className="coverage-icon missing" />
                    )}
                    <div className="coverage-text">
                      <span className="coverage-label">{row.label}</span>
                      {row.value && <span className="coverage-val">{row.value}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vm && activeTab === 'evidence' && (
          <div className="evidence-tab-pane">
            <div className="evidence-section">
              <span className="evidence-section-title" style={{color: 'var(--success)'}}>
                <CheckCircle size={14} /> Supporting Evidence ({vm.support.length})
              </span>
              {vm.support.length === 0 ? (
                <div className="empty-verification" style={{padding: 'var(--space-2)'}}>No supporting evidence found.</div>
              ) : (
                vm.support.map((e, i) => (
                  <div key={i} className="evidence-card support">
                    <div className="evidence-title">{e.title}</div>
                    {e.span && <div className="evidence-span">"{e.span}"</div>}
                    <div className="evidence-meta">
                      <span>{e.source} • {e.quality}</span>
                      {e.link && <a href={e.link.url} target="_blank" rel="noreferrer" className="evidence-link">Open {e.link.label}</a>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {vm && activeTab === 'conflicts' && (
          <div className="evidence-tab-pane">
            <div className="evidence-section">
              <span className="evidence-section-title" style={{color: 'var(--danger)'}}>
                <AlertTriangle size={14} /> Contradicting & Limitations ({vm.contradict.length})
              </span>
              {vm.contradict.length === 0 ? (
                <div className="empty-verification" style={{padding: 'var(--space-2)'}}>No contradicting evidence found.</div>
              ) : (
                vm.contradict.map((e, i) => (
                  <div key={i} className="evidence-card contradict">
                    <div className="evidence-title">{e.title}</div>
                    {e.span && <div className="evidence-span">"{e.span}"</div>}
                    <div className="evidence-meta">
                      <span>{e.source}</span>
                      {e.link && <a href={e.link.url} target="_blank" rel="noreferrer" className="evidence-link">Open {e.link.label}</a>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {vm.alternatives?.length > 0 && (
              <div className="evidence-section">
                <span className="evidence-section-title" style={{color: 'var(--warning)'}}>
                  <Layers size={14} /> Safer Alternatives
                </span>
                {vm.alternatives.map(a => (
                  <div key={a.id} className="evidence-card" style={{borderLeft: '3px solid var(--warning)'}}>
                    <div className="evidence-title">{a.label}</div>
                    <div className="evidence-span">{a.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vm && activeTab === 'why' && (
          <div className="audit-container">
            <ShowMeWhy audit={vm.audit} onClose={() => setActiveTab('summary')} />
          </div>
        )}
      </div>
    </div>
  );
}
