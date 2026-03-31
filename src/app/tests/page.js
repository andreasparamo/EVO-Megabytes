"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./tests.module.css";
import ResultsModal from "@/src/components/ResultsModal";
import { useAuth } from "@/context/AuthContext";
import { saveTestResult } from "@/lib/progressService";

// Deterministic seed helpers (same on server and client)
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generateWords(count, seed) {
  const rng = mulberry32(seed >>> 0);
  const arr = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * WORD_BANK.length);
    arr.push(WORD_BANK[idx]);
  }
  return arr;
}

const WORD_BANK = [
  "time", "year", "people", "way", "day", "man", "thing", "woman", "life", "child",
  "world", "school", "state", "family", "student", "group", "country", "problem", "hand",
  "place", "case", "week", "company", "system", "program", "question", "work", "night", "point",
  "home", "water", "room", "mother", "area", "money", "story", "fact", "month", "lot",
];

const MODES = {
  Short: 10,
  Medium: 25,
  Long: 50,
};

export default function TestsPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState("Short");

  // Seed is deterministic for SSR hydration; we vary it later on user actions.
  const [seed, setSeed] = useState(() => hashString(`mode:${"Short"}`));

  // Use deterministic words for the initial render (avoids hydration mismatch)
  const [words, setWords] = useState(() => generateWords(MODES.Short, seed));
  const [inputs, setInputs] = useState(() => Array(MODES.Short).fill(""));
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [wpmHistory, setWpmHistory] = useState([]);
  const [isNewBest, setIsNewBest] = useState(false);

  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Focus hidden input on mount and on click
  useEffect(() => {
    focusInput();
  }, []);
  function focusInput() {
    inputRef.current?.focus();
  }

  // Reset when mode changes (deterministic seed for this mode)
  useEffect(() => {
    const nextSeed = hashString(`mode:${mode}`);
    const nextWords = generateWords(MODES[mode], nextSeed);
    setSeed(nextSeed);
    setWords(nextWords);
    setInputs(Array(nextWords.length).fill(""));
    setIndex(0);
    setStartedAt(null);
    setEndedAt(null);
    setShowResults(false);
    setWpmHistory([]);
  }, [mode]);

  const stats = useMemo(() => {
    const end = endedAt ?? (startedAt ? Date.now() : null);
    const elapsedMs = startedAt && end ? end - startedAt : 0;

    let correctChars = 0;
    let wrongChars = 0;
    let extraChars = 0;
    let skippedChars = 0;

    words.forEach((w, wi) => {
      const typed = inputs[wi] ?? "";
      const minLen = Math.min(w.length, typed.length);

      for (let i = 0; i < minLen; i++) {
        if (typed[i] === w[i]) correctChars++;
        else wrongChars++;
      }
      if (typed.length > w.length) {
        extraChars += typed.length - w.length;
      } else if (typed.length < w.length) {
        // Count untyped as skipped once the user moved on from the word
        if (wi < index || (wi === index && showResults)) {
          skippedChars += w.length - typed.length;
        }
      }
    });

    const mistakes = wrongChars + extraChars + skippedChars;
    const totalConsidered = correctChars + mistakes;
    const acc = totalConsidered > 0 ? Math.round((correctChars / totalConsidered) * 100) : 100;

    // Standardized WPM: (correctChars + spaces) / 5 — matches the chart formula
    const wordsCompleted = showResults ? words.length : index;
    const spaces = wordsCompleted;
    const standardizedWordCount = (correctChars + spaces) / 5;
    const elapsedMin = elapsedMs > 0 ? elapsedMs / 60000 : 1;
    const safeElapsedMin = Math.max(elapsedMin, 1 / 60);
    const wpm = Math.max(0, Math.round(standardizedWordCount / safeElapsedMin));

    return { wpm, acc, mistakes, elapsedMs };
  }, [inputs, words, startedAt, endedAt, index, showResults]);

  function onKeyDown(e) {
    if (showResults) return;

    const key = e.key;

    // Start timer on first printable input
    if (!startedAt && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setStartedAt(Date.now());
    }

    if (key === "Backspace") {
      e.preventDefault();
      setInputs((prev) => {
        const next = [...prev];
        const cur = next[index] || "";
        if (cur.length > 0) {
          next[index] = cur.slice(0, -1);
          return next;
        }
        // Optional: move back to previous word if at start
        if (index > 0) {
          const prevWordTyped = next[index - 1] || "";
          next[index - 1] = prevWordTyped; // no change; keep as-is
          setIndex(index - 1);
        }
        return next;
      });
      return;
    }

    if (key === " " || key === "Enter") {
      e.preventDefault();

      // Record WPM data point on word completion (skip index 0 — cold-start outlier)
      if (startedAt && index > 0) {
        const now = Date.now();
        const elapsedMs = now - startedAt;
        const elapsedMin = elapsedMs / 60000;

        // Build a snapshot of correct chars using inputs (which is current
        // because character keystrokes update inputs synchronously before space fires)
        let correctChars = 0;
        let totalChars = 0;
        for (let wi = 0; wi <= index; wi++) {
          const typed = inputs[wi] ?? "";
          const word = words[wi];
          const minLen = Math.min(word.length, typed.length);
          for (let i = 0; i < minLen; i++) {
            if (typed[i] === word[i]) correctChars++;
          }
          totalChars += word.length;
        }

        // Standardized WPM: (correctChars + spaces) / 5 = "standard words"
        const spaces = index + 1;
        const standardizedWordCount = (correctChars + spaces) / 5;
        const safeElapsedMin = Math.max(elapsedMin, 1 / 60);
        const wpm = Math.round(standardizedWordCount / safeElapsedMin);
        const acc = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

        setWpmHistory((prev) => [
          ...prev,
          { time: elapsedMs / 1000, wpm, acc, wordIndex: index }
        ]);
      }

      // Move to next word, finalize current
      if (index < words.length - 1) {
        setIndex(index + 1);
      } else {
        // End of test
        const endTime = Date.now();
        setEndedAt(endTime);
        setShowResults(true);

        // Save result to Firestore for progress tracking
        if (user && startedAt) {
          const elapsedMs = endTime - startedAt;
          const elapsedMin = Math.max(elapsedMs / 60000, 1 / 60);

          let correctChars = 0;
          let totalChars = 0;
          for (let wi = 0; wi < words.length; wi++) {
            const typed = inputs[wi] ?? "";
            const word = words[wi];
            const minLen = Math.min(word.length, typed.length);
            for (let ci = 0; ci < minLen; ci++) {
              if (typed[ci] === word[ci]) correctChars++;
            }
            totalChars += word.length;
          }
          const spaces = words.length;
          const finalWpm = Math.max(0, Math.round(((correctChars + spaces) / 5) / elapsedMin));
          const finalAcc = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

          saveTestResult(user.uid, {
            wpm: finalWpm,
            accuracy: finalAcc,
            wordCount: words.length,
            testCompleted: true,
          }).then((outcome) => {
            if (outcome.saved && outcome.isNewBest) {
              setIsNewBest(true);
              console.log("New personal best!");
            }
          });
        }
      }
      return;
    }

    // Tab to restart
    if (key === "Tab") {
      e.preventDefault();
      restart();
      return;
    }

    // Accept single printable characters only
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setInputs((prev) => {
        const next = [...prev];
        next[index] = (next[index] || "") + key;
        return next;
      });
    }
  }

  function restart() {
    // Generate a new random seed on the client only (post-hydration)
    let nextSeed = Date.now() ^ (Math.random() * 0x7fffffff);
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      const b = new Uint32Array(1);
      window.crypto.getRandomValues(b);
      nextSeed = b[0];
    }
    const nextWords = generateWords(MODES[mode], nextSeed);
    setSeed(nextSeed);
    setWords(nextWords);
    setInputs(Array(nextWords.length).fill(""));
    setIndex(0);
    setStartedAt(null);
    setEndedAt(null);
    setShowResults(false);
    setWpmHistory([]);
    setIsNewBest(false);
    requestAnimationFrame(() => focusInput());
  }

  return (
    <main className={styles.wrap} ref={containerRef} onClick={focusInput}>
      <section className={styles.header}>
        <h1 className={styles.title}>Typing Test</h1>
        <div className={styles.modes}>
          {Object.keys(MODES).map((m) => (
            <button
              key={m}
              className={`${styles.modeBtn} ${mode === m ? styles.active : ""}`}
              onClick={() => setMode(m)}
              type="button"
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.testArea}>
        <div className={`${styles.words} ${showResults ? styles.fadeOut : styles.fadeIn}`}>
          {words.map((w, wi) => {
            const typed = inputs[wi] ?? "";
            const chars = w.split("");
            const isCurrent = wi === index;

            return (
              <div
                key={`${w}-${wi}`}
                className={`${styles.word} ${isCurrent ? styles.currentWord : ""}`}
              >
                {chars.map((ch, ci) => {
                  const hasTyped = ci < typed.length;
                  const t = hasTyped ? typed[ci] : "";
                  let cls = styles.char;

                  if (hasTyped) {
                    if (t === ch) cls = `${styles.char} ${styles.correct}`;
                    else cls = `${styles.char} ${styles.wrong}`;
                  } else if (!hasTyped && (wi < index || showResults)) {
                    cls = `${styles.char} ${styles.skipped}`;
                  }

                  // Add lessons-like current-char underline on the next char
                  const isCursor = isCurrent && !showResults && ci === typed.length;

                  return (
                    <span key={ci} className={`${cls} ${isCursor ? styles.cursor : ""}`}>
                      {ch}
                    </span>
                  );
                })}
                {/* Extra typed letters beyond target length */}
                {typed.length > w.length &&
                  typed
                    .slice(w.length)
                    .split("")
                    .map((extra, i) => (
                      <span key={`x${i}`} className={`${styles.char} ${styles.extra}`}>
                        {extra}
                      </span>
                    ))}

                {/* When at end of the word, show caret after the last char */}
                {isCurrent && !showResults && typed.length >= w.length && (
                  <span className={styles.caret} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hidden input to capture keystrokes */}
        <input
          ref={inputRef}
          className={styles.hiddenInput}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
        />

        <div className={styles.controls}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <button className={styles.action} onClick={restart} type="button">
              Reset
            </button>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
              press tab to restart
            </span>
          </div>
        </div>

        {/* Results Modal */}
        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          onRestart={restart}
          stats={stats}
          mode={mode}
          wpmHistory={wpmHistory}
          isNewBest={isNewBest}
        />
      </section>
    </main>
  );
}