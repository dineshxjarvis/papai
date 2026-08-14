import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import { Search, Info, MoreHorizontal } from 'lucide-react';
import './ClaimBubbleMenu.css';

export default function ClaimBubbleMenu({ editor, onVerifyClaim, onInspectClaim, onAnalyzeSelection, claims = [] }) {
  if (!editor) return null;

  // Get selected text to look up claim by text match (handles both TipTap ClaimMark and raw HTML marks)
  const getActiveClaimId = () => {
    // First try TipTap ClaimMark extension attributes
    const markAttrs = editor.getAttributes('claimMark');
    if (markAttrs?.claimId) return markAttrs.claimId;

    // Fallback: match selected text against known claims
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!selectedText || selectedText.length < 10) return null;

    const found = claims.find(c =>
      c.text && (
        c.text.includes(selectedText) ||
        selectedText.includes(c.text.slice(0, 30))
      )
    );
    return found?.id || null;
  };

  const isOnClaim = editor.isActive('claimMark') || (() => {
    const { from, to } = editor.state.selection;
    if (from === to) return false;
    const sel = editor.state.doc.textBetween(from, to, ' ').trim();
    return claims.some(c => c.text && (c.text.includes(sel) || sel.includes(c.text?.slice(0, 20))));
  })();

  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 100, placement: 'top' }}
      shouldShow={({ state }) => !state.selection.empty}
    >
      <div className="claim-bubble-menu">
        <div className="bubble-btn-group">
          <button 
            className="bubble-btn"
            onClick={() => {
              const claimId = getActiveClaimId();
              if (claimId && onVerifyClaim) {
                onVerifyClaim(claimId);
              } else if (onAnalyzeSelection) {
                onAnalyzeSelection();
              }
            }}
          >
            <Search size={14} />
            <span>{isOnClaim ? 'Verify' : 'Detect & Verify'}</span>
          </button>
          
          <button 
            className="bubble-btn"
            onClick={() => {
              const claimId = getActiveClaimId();
              if (claimId && onInspectClaim) {
                onInspectClaim(claimId);
              } else if (onAnalyzeSelection) {
                // Fall back to detect selection if no claim found
                onAnalyzeSelection();
              }
            }}
          >
            <Info size={14} />
            <span>Inspect</span>
          </button>

          <button className="bubble-btn icon-only">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
}
