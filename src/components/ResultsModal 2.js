"use client";
import { useEffect, useRef } from "react";
import WpmChart from "@/src/components/WpmChart";
import useThemeColors from "@/src/hooks/useThemeColors";

export default function ResultsModal({ isOpen, onClose, onRestart, stats, mode, wpmHistory }) {
  // Use refs to keep callback references stable
  const onCloseRef = useRef(onClose);
  const onRestartRef = useRef(onRestart);
  
  useEffect(() => {
    onCloseRef.current = onClose;
    onRestartRef.current = onRestart;
  });

  const colors = useThemeColors();

  // Keyboard shortcuts: Escape to close, Tab to restart
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
      if (e.key === "Tab") {
        e.preventDefault();
        onRestartRef.current?.();
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "none", 
          width: "100%", 
          height: "100%", 
          borderRadius: "0",
          border: "none",
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
          overflow: "hidden"
        }}
      >
        {/* Header with title and compact stats */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexShrink: 0
        }}>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem", color: colors.text }}>Test Complete</h2>
          <div style={{ display: "flex", gap: "3rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: colors.muted, textTransform: "uppercase" }}>WPM</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.accent1 }}>{stats.wpm}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: colors.muted, textTransform: "uppercase" }}>Accuracy</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.accent1 }}>{stats.acc}%</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: colors.muted, textTransform: "uppercase" }}>Mode</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.accent1 }}>{mode}</div>
            </div>
          </div>
        </div>

        {/* Graph Area - takes remaining space */}
        <div 
          style={{
            flex: 1,
            width: "100%",
            minHeight: "300px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "1rem"
          }}
        >
          <WpmChart 
            data={wpmHistory || []} 
            finalWpm={stats.wpm} 
            finalAcc={stats.acc} 
          />
        </div>

        {/* Actions at the bottom */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center",
          marginTop: "1.5rem",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn-primary" onClick={onRestart}>
              Try Again
            </button>
          </div>
          <span style={{ fontSize: "0.75rem", color: colors.muted }}>
            press tab to restart
          </span>
        </div>
      </div>
    </div>
  );
}
