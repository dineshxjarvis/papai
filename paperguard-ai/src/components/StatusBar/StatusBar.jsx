import React from 'react';
import { ShieldCheck, Server, Key, Cpu } from 'lucide-react';
import './StatusBar.css';

export default function StatusBar({ backendConnected, useMock, llmProvider = "Groq + Semantic Scholar" }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <ShieldCheck size={14} />
        <span className="status-brand">PaperGuard AI</span>
        <span>Trustworthy research. Verified by evidence.</span>
      </div>
      
      <div className="status-right">
        <div className="status-item">
          <div className={`status-dot ${backendConnected ? 'connected' : 'disconnected'}`}></div>
          {backendConnected ? "Backend Connected" : "Backend Disconnected"}
        </div>
        
        <div className="status-item" style={{opacity: useMock ? 0.6 : 1}}>
          <Server size={12} />
          {useMock ? "Mock Mode" : "Real Mode"}
        </div>
        
        <div className="status-item">
          <Cpu size={12} />
          {llmProvider}
        </div>
        
        <div className="status-item">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
