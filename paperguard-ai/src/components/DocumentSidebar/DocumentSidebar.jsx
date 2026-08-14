import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Settings, 
  FileSearch, 
  ListOrdered,
  History,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import './DocumentSidebar.css';

export default function DocumentSidebar({
  claims = [],
  activeClaimId,
  onSelectClaim,
  onVerifyClaim
}) {
  const [activeNav, setActiveNav] = useState('manuscript');
  
  const supportingCount = claims.filter(
    (c) => c.color === "green" || c.type === "green" || c.status === "Supported"
  ).length;
  const partialCount = claims.filter(
    (c) => c.color === "yellow" || c.type === "yellow" || c.status === "Partially Supported"
  ).length;
  const contradictingCount = claims.filter(
    (c) => c.color === "red" || c.type === "red" || c.status === "Contradicting"
  ).length;
  const unverifiedCount = claims.filter(
    (c) => c.status === "Unverified" || c.status === "Needs Review"
  ).length;

  return (
    <div className="document-sidebar">
      {/* Document Navigation */}
      <div className="sidebar-section">
        <div className="sidebar-heading">DOCUMENT</div>
        <div className="nav-list">
          <div className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`} onClick={() => setActiveNav('overview')}>
            <div className="nav-item-left">
              <Search size={16} />
              <span>Overview</span>
            </div>
          </div>
          
          <div className={`nav-item ${activeNav === 'manuscript' ? 'active' : ''}`} onClick={() => setActiveNav('manuscript')}>
            <div className="nav-item-left">
              <FileText size={16} />
              <span>Manuscript</span>
            </div>
          </div>
          
          <div className={`nav-item ${activeNav === 'claims' ? 'active' : ''}`} onClick={() => setActiveNav('claims')}>
            <div className="nav-item-left">
              <ShieldCheckIcon />
              <span>Claims</span>
            </div>
            {claims.length > 0 && <span className="nav-badge">{claims.length}</span>}
          </div>
          
          <div className={`nav-item ${activeNav === 'evidence' ? 'active' : ''}`} onClick={() => setActiveNav('evidence')}>
            <div className="nav-item-left">
              <BookOpen size={16} />
              <span>Evidence</span>
            </div>
          </div>
          
          <div className={`nav-item ${activeNav === 'references' ? 'active' : ''}`} onClick={() => setActiveNav('references')}>
            <div className="nav-item-left">
              <ListOrdered size={16} />
              <span>References</span>
            </div>
          </div>
          
          <div className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={() => setActiveNav('history')}>
            <div className="nav-item-left">
              <History size={16} />
              <span>History</span>
            </div>
          </div>
          
          <div className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}>
            <div className="nav-item-left">
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Claims List */}
      {(activeNav === 'overview' || activeNav === 'claims' || activeNav === 'manuscript') && (
        <div className="sidebar-section">
          <div className="sidebar-heading">
            <span>CLAIMS</span>
            <span style={{textTransform: 'lowercase', fontWeight: 400}}>{claims.length} detected</span>
          </div>
          
          <div className="claims-list">
            {claims.map((claim) => {
              const color = claim.color || claim.type || "gray";
              const isSelected = activeClaimId === claim.id;
              
              let statusBadgeClass = "badge-neutral";
              if (color === "green") statusBadgeClass = "badge-success";
              else if (color === "yellow") statusBadgeClass = "badge-warning";
              else if (color === "red") statusBadgeClass = "badge-danger";

              return (
                <div 
                  key={claim.id} 
                  className={`claim-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectClaim && onSelectClaim(claim)}
                >
                  <div className="claim-text-row">
                    <div className={`status-dot ${color === 'green' ? 'connected' : color === 'red' ? 'disconnected' : ''}`} style={{
                      backgroundColor: color === 'green' ? 'var(--success)' : 
                                       color === 'red' ? 'var(--danger)' : 
                                       color === 'yellow' ? 'var(--warning)' : 'var(--neutral)',
                      marginTop: 4,
                      flexShrink: 0
                    }}></div>
                    <span className="claim-text">{claim.text}</span>
                  </div>
                  <div className="claim-meta-row">
                    <span className={`badge ${statusBadgeClass}`}>{claim.status}</span>
                    <span className="claim-id">{typeof claim.id === "string" ? claim.id.slice(0, 4) : claim.id}</span>
                    {onVerifyClaim && (
                      <button
                        className="claim-verify-btn"
                        title="Verify this claim"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVerifyClaim(claim.id);
                        }}
                      >
                        <ShieldCheckIcon />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Evidence Library */}
      {(activeNav === 'overview' || activeNav === 'evidence') && (
        <div className="sidebar-section" style={{marginTop: 'auto', marginBottom: 0}}>
          <div className="sidebar-heading">
            <span>EVIDENCE LIBRARY</span>
          </div>
          
          <div className="evidence-summary">
            <div className="evidence-row">
              <div className="evidence-label">
                <div className="status-dot" style={{backgroundColor: 'var(--success)'}}></div>
                <span>Supporting</span>
              </div>
              <span className="evidence-count">{supportingCount}</span>
            </div>
            
            <div className="evidence-row">
              <div className="evidence-label">
                <div className="status-dot" style={{backgroundColor: 'var(--danger)'}}></div>
                <span>Contradicting</span>
              </div>
              <span className="evidence-count">{contradictingCount}</span>
            </div>
            
            <div className="evidence-row">
              <div className="evidence-label">
                <div className="status-dot" style={{backgroundColor: 'var(--warning)'}}></div>
                <span>Partial</span>
              </div>
              <span className="evidence-count">{partialCount}</span>
            </div>
          </div>
          
          <div className="researcher-mode-footer" style={{marginTop: '24px'}}>
            <ShieldCheckIcon />
            <div className="researcher-mode-text">
              <strong>Researcher Mode</strong>
              <span>Scientific verification, powered by AI.</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty states for other tabs */}
      {['references', 'history', 'settings'].includes(activeNav) && (
        <div className="sidebar-section" style={{marginTop: 'auto', textAlign: 'center', color: 'var(--text-secondary)'}}>
          <p>No {activeNav} data available for this document.</p>
        </div>
      )}
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
