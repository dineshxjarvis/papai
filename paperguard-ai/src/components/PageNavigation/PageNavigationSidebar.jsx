import React from "react";
import { FileText, Plus, Trash2, Layers } from "lucide-react";
import "./PageNavigationSidebar.css";

export default function PageNavigationSidebar({
  pages = [],
  activePageIndex = 0,
  onSelectPage,
  onAddPage,
  onDeletePage
}) {
  return (
    <aside className="page-nav-sidebar" title="MS Word Navigation Pane">
      {/* Navigation Header */}
      <div className="page-nav-header">
        <div className="nav-title-group">
          <Layers size={15} className="nav-icon-blue" />
          <span className="nav-title">Pages</span>
          <span className="page-badge-count">{pages.length}</span>
        </div>

        <button
          className="btn-quick-add-page"
          onClick={onAddPage}
          title="Add New Blank Page"
        >
          <Plus size={14} />
          <span>Page</span>
        </button>
      </div>

      {/* Page Thumbnails List */}
      <div className="page-thumbnails-scroll">
        {pages.map((page, index) => {
          const isActive = activePageIndex === index;

          return (
            <div
              key={page.id || index}
              className={`page-thumb-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectPage && onSelectPage(index)}
              title={`Jump to Page ${index + 1}`}
            >
              {/* Miniature A4 Page Box */}
              <div className="mini-a4-card">
                {/* Header line representation */}
                <div className="mini-header-line" />

                {/* Page Content Skeleton Lines */}
                <div className="mini-content-skeleton">
                  <div className="mini-heading-line" />
                  <div className="mini-text-line w-90" />
                  <div className="mini-text-line w-80" />
                  <div className="mini-text-line w-95" />
                  {index === 0 && (
                    <div className="mini-highlight-box green" />
                  )}
                  <div className="mini-text-line w-85" />
                  <div className="mini-text-line w-60" />
                </div>

                {/* Footer line representation */}
                <div className="mini-footer-line" />
              </div>

              {/* Page Number Label & Delete Action */}
              <div className="page-thumb-footer">
                <span className="page-thumb-label">Page {index + 1}</span>
                {pages.length > 1 && (
                  <button
                    className="btn-delete-page-thumb"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage && onDeletePage(index);
                    }}
                    title={`Delete Page ${index + 1}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
