import React from 'react';
import './AppShell.css';

export default function AppShell({ topBar, sidebar, manuscript, verification, investigation, statusBar, isInvestigationOpen, isVerificationOpen }) {
  return (
    <div className="app-shell">
      <header className="app-shell-header">
        {topBar}
      </header>
      
      <main className="app-shell-main">
        <aside className="sidebar-region">
          {sidebar}
        </aside>
        
        <section className="manuscript-region">
          {manuscript}
        </section>
        
        {isVerificationOpen && (
          <aside className="verification-region">
            {verification}
          </aside>
        )}
        
        {isInvestigationOpen && (
          <aside className="investigation-region">
            {investigation}
          </aside>
        )}
      </main>
      
      <footer className="app-shell-footer">
        {statusBar}
      </footer>
    </div>
  );
}
