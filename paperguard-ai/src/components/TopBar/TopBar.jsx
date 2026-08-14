import React, { useRef } from 'react';
import { ShieldCheck, FileText, Sparkles, Search, Settings, HelpCircle, ChevronDown, Upload } from 'lucide-react';
import './TopBar.css';

export default function TopBar({
  docTitle = "Deep Learning for Medical Image Classification",
  onAnalyzeAll,
  onVerifySelected,
  hasSelection,
  onFileUpload
}) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // reset input
    if (e.target) e.target.value = null;
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <ShieldCheck size={28} className="brand-icon" />
          <div className="brand-text-wrapper">
            <span className="brand-name">PaperGuard AI</span>
            <span className="brand-slogan">Better evidence. Stronger research.</span>
          </div>
        </div>
      </div>

      <div className="topbar-center">
        <FileText size={16} className="doc-icon" />
        <span className="doc-title">{docTitle}</span>
        <ChevronDown size={14} className="doc-icon" style={{marginLeft: 4, cursor: 'pointer'}} />
        <div className="save-status">
          <div className="status-dot"></div>
          Saved
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
            accept=".txt,.md,.html"
          />
          <button className="btn-secondary" onClick={handleUploadClick} title="Upload Text File">
            <Upload size={16} />
            Upload File
          </button>

          <button className="btn-secondary" onClick={onAnalyzeAll}>
            <Sparkles size={16} />
            Scan for Claims
          </button>
          
          <button 
            className="btn-primary" 
            onClick={onVerifySelected}
            disabled={!hasSelection}
            style={{ opacity: hasSelection ? 1 : 0.6 }}
          >
            <Search size={16} />
            Verify Selected Claim
          </button>
        </div>
        
        <div className="topbar-icons">
          <Settings size={18} className="icon-btn" />
          <HelpCircle size={18} className="icon-btn" />
          <div className="avatar">RS</div>
        </div>
      </div>
    </div>
  );
}
