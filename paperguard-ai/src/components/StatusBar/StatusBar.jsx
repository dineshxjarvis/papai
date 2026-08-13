import React, { useState } from "react";
import { Sparkles, Minus, Plus, Globe } from "lucide-react";
import "./StatusBar.css";

export default function StatusBar({ editor, zoom = 100, setZoom, pages = [], activePageIndex = 0 }) {
  const [predictionsOn, setPredictionsOn] = useState(true);
  const [language, setLanguage] = useState("English (US)");

  let wordCount = 0;
  let charCount = 0;
  let pageTotal = Math.max(1, pages.length);

  if (editor) {
    const text = editor.getText() || "";
    wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    charCount = text.length;
  }

  const handleZoomIn = () => {
    if (setZoom) setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    if (setZoom) setZoom((prev) => Math.max(prev - 10, 50));
  };

  return (
    <footer className="status-bar">
      {/* Document Metrics - Clean MS Word Spacing */}
      <div className="status-metrics">
        <span>Page {activePageIndex + 1} of {pageTotal}</span>
        <span>{wordCount} Words</span>
        <span>{charCount} Characters</span>
        <div className="lang-picker">
          <Globe size={12} />
          <span>{language}</span>
        </div>
      </div>

      {/* Center AI Status Indicator */}
      <div className="status-center">
        <button
          className={`prediction-toggle ${predictionsOn ? "active" : ""}`}
          onClick={() => setPredictionsOn(!predictionsOn)}
          title="Toggle Real-time AI Text Predictions"
        >
          <Sparkles size={12} className="sparkle-gold" />
          <span>Text Predictions: <strong>{predictionsOn ? "ON" : "OFF"}</strong></span>
        </button>
      </div>

      {/* Right Zoom Controls */}
      <div className="status-zoom">
        <button onClick={handleZoomOut} title="Zoom Out" disabled={zoom <= 50}>
          <Minus size={12} />
        </button>
        <input
          type="range"
          min="50"
          max="200"
          value={zoom}
          onChange={(e) => setZoom && setZoom(Number(e.target.value))}
          className="zoom-slider"
        />
        <button onClick={handleZoomIn} title="Zoom In" disabled={zoom >= 200}>
          <Plus size={12} />
        </button>
        <span
          className="zoom-value"
          onClick={() => setZoom && setZoom(100)}
          title="Click to reset to 100%"
        >
          {zoom}%
        </span>
      </div>
    </footer>
  );
}
