"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  listenToMatchUpdates,
  updatePlayerProgress,
  markPlayerFinished,
} from "@/lib/battleMatchmaking";
import OpponentProgress from "./OpponentProgress";
import styles from "./BattleRace.module.css";
import KeyboardLayout, {
  normalizeKeyChar,
} from "@/src/components/KeyboardLayout"; // keyboard UI + key normalizer helper
import "@/src/components/KeyboardLayout.css"; // base styles for kb-wrap, kb-row, kb-key classes

export default function BattleRace({ matchId, userId, onFinish }) {
  const [matchData, setMatchData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [wrongChars, setWrongChars] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [activeKeys, setActiveKeys] = useState(new Set()); // tracks which key is highlighted as "next to press"
  const [keyFlash, setKeyFlash] = useState({ key: null, type: null }); // drives the green/red flash on each keypress
  const inputRef = useRef(null);

  const snippet = matchData?.gameState?.snippet?.code || "";
  const opponentId = Object.keys(matchData?.players || {}).find(
    (id) => id !== userId,
  );
  const opponentData = opponentId ? matchData?.players[opponentId] : null;

  // Listen to match updates
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = listenToMatchUpdates(matchId, (data) => {
      setMatchData(data);
      if (data.gameState.winner && data.gameState.winner !== userId) {
        setTimeout(() => onFinish(data), 1000);
      }
    });

    return () => unsubscribe();
  }, [matchId, userId, onFinish]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!startedAt) return { wpm: 0, accuracy: 100, progress: 0 };

    const minutes = (Date.now() - startedAt) / 60000;
    const wpm = Math.round(correctChars / 5 / minutes) || 0;
    const total = correctChars + wrongChars;
    const accuracy = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    const progress =
      snippet.length > 0 ? (currentIndex / snippet.length) * 100 : 0;

    return { wpm, accuracy, progress };
  }, [correctChars, wrongChars, startedAt, currentIndex, snippet.length]);

  // Update Firebase
  useEffect(() => {
    if (!startedAt || !matchId) return;

    const interval = setInterval(() => {
      updatePlayerProgress(matchId, userId, {
        progress: stats.progress,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
      });
    }, 200);

    return () => clearInterval(interval);
  }, [matchId, userId, stats, startedAt]);

  // Highlight the next key to press whenever currentIndex or snippet changes
  useEffect(() => {
    const nextChar = snippet[currentIndex]; // the character the player needs to type next
    if (!nextChar) return; // nothing to highlight at the end of the snippet
    setActiveKeys(new Set([normalizeKeyChar(nextChar)])); // normalize (e.g. uppercase → lowercase) then highlight
  }, [currentIndex, snippet]);

  // Handle typing
  const handleKeyDown = (e) => {
    const key = e.key;

    if (
      !startedAt &&
      key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      setStartedAt(Date.now());
    }

    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const expected = snippet[currentIndex];
      if (key === expected) {
        setCorrectChars((prev) => prev + 1);
      } else {
        setWrongChars((prev) => prev + 1);
      }

      // Flash the expected key green (correct) or red (wrong) for 150 ms
      const norm = normalizeKeyChar(expected); // normalize the expected char to match keyboard key ids
      setKeyFlash({ key: norm, type: key === expected ? "correct" : "wrong" }); // trigger the flash colour
      setTimeout(() => setKeyFlash({ key: null, type: null }), 150); // clear flash after 150 ms

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex >= snippet.length) {
        markPlayerFinished(matchId, userId);
        setTimeout(() => onFinish(matchData), 1000);
      }
    }

    if (key === "Backspace" && currentIndex > 0) {
      e.preventDefault();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!snippet) return <div>Loading race...</div>;

  return (
    <div className={styles.container} onClick={() => inputRef.current?.focus()}>
      {opponentData && (
        <OpponentProgress
          opponentName={opponentData.displayName}
          progress={opponentData.progress || 0}
          wpm={opponentData.wpm || 0}
          accuracy={opponentData.accuracy || 100}
        />
      )}

      <div className={styles.statsContainer}>
        <div className={styles.stat}>
          <span>WPM: </span>
          <strong>{stats.wpm}</strong>
        </div>
        <div className={styles.stat}>
          <span>Accuracy: </span>
          <strong>{stats.accuracy}%</strong>
        </div>
        <div className={styles.stat}>
          <span>Progress: </span>
          <strong>{Math.round(stats.progress)}%</strong>
        </div>
      </div>

      <div className={styles.codeContainer}>
        <pre className={styles.code}>
          {snippet.split("").map((char, i) => {
            const isTyped = i < currentIndex;
            const isCursor = i === currentIndex;

            let className = styles.char;
            if (isTyped) className += ` ${styles.typed}`;
            if (isCursor) className += ` ${styles.cursor}`;

            return (
              <span key={i} className={className}>
                {char}
              </span>
            );
          })}
        </pre>
      </div>

      <input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        className={styles.hiddenInput}
        spellCheck={false}
        autoComplete="off"
      />

      {/* Keyboard layout — shows the full keyboard, highlights the next key, flashes on correct/wrong */}
      <KeyboardLayout
        activeKeys={activeKeys} // the key to glow (next char to type)
        keyFlash={keyFlash} // { key, type } drives the green/red flash
        lessonChars={null} // null = render all keys; pass a Set to filter to snippet chars only
      />

      <p className={styles.hint}>Click anywhere to focus and start typing!</p>
    </div>
  );
}
