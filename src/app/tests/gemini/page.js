"use client";
import { useState } from "react";
import { generateCodeSnippets, testGeminiConnection } from "@/src/data/geminiService";

export default function GeminiTestPage() {
  const [language, setLanguage] = useState("c");
  const [difficulty, setDifficulty] = useState("medium");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handlePing() {
    setLoading(true);
    setResult(null);
    const res = await testGeminiConnection();
    setResult(res);
    setLoading(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    const snippet = await generateCodeSnippets(language, difficulty);
    setResult(snippet ? { success: true, snippet } : { success: false, message: "Failed to generate snippet" });
    setLoading(false);
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: "monospace" }}>
      <h1>Gemini API Test</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={selectStyle}>
          <option value="c">C</option>
          <option value="cpp">C++</option>
          <option value="csharp">C#</option>
        </select>

        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={selectStyle}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button onClick={handlePing} disabled={loading} style={btnStyle("#555")}>
          Ping
        </button>
        <button onClick={handleGenerate} disabled={loading} style={btnStyle("#1a73e8")}>
          Generate Snippet
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <div style={{ background: "#1e1e1e", color: "#d4d4d4", borderRadius: "8px", padding: "20px" }}>
          <p style={{ color: result.success ? "#4caf50" : "#f44336", marginTop: 0 }}>
            {result.success ? "✓ Success" : "✗ Failed"}
          </p>
          {result.message && <p style={{ margin: "4px 0" }}>{result.message}</p>}
          {result.response && <p style={{ margin: "4px 0" }}>{result.response}</p>}
          {result.snippet && (
            <>
              <p style={{ margin: "8px 0 4px", color: "#888" }}>
                {result.snippet.description} · {result.snippet.difficulty}
              </p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {result.snippet.code}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  padding: "8px 12px",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1px solid #555",
  background: "#2a2a2a",
  color: "#fff",
};

const btnStyle = (bg) => ({
  padding: "8px 20px",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "none",
  background: bg,
  color: "#fff",
  cursor: "pointer",
});
