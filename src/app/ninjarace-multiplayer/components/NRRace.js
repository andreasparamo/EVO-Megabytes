"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  listenToNinjaMatchUpdates,
  updateNinjaPlayerProgress,
  markNinjaPlayerFinished,
  forfeitNinjaMatch,
} from "@/lib/ninjaRaceMatchmaking";

const BACKGROUND_URL = "/track.png";
const USER_IMAGE_URL = "/running_ninja.jpg";
const OPPONENT_IMAGE_URL = "/running_demon.jpg";

const timeLimits = {
  beginner: 75,
  intermediate: 60,
  expert: 50,
};

export default function NRRace({ matchId, userId, onFinish }) {
  const [matchData, setMatchData] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [hasError, setHasError] = useState(false);
  const [myFinished, setMyFinished] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [noTransition, setNoTransition] = useState(true);

  const inputRef = useRef(null);
  const startTimeRef = useRef(null);
  const totalKeystrokesRef = useRef(0);
  const correctCharsRef = useRef(0);

  const quote = matchData?.gameState?.quote || "";
  const difficulty = matchData?.gameState?.difficulty || "beginner";
  const opponentId = Object.keys(matchData?.players || {}).find((id) => id !== userId);
  const opponentData = opponentId ? matchData?.players[opponentId] : null;
  const myData = matchData?.players?.[userId];

  // Listen to match updates
  useEffect(() => {
    if (!matchId) return;
    const unsub = listenToNinjaMatchUpdates(
      matchId,
      (data) => {
        setMatchData(data);
        if (data.gameState?.winner) {
          // short pause so both players see the finish state before jumping to results
          setTimeout(() => onFinish(data), 1000);
        }
      },
      (error) => setLoadError(error.message),
    );
    return () => unsub();
  }, [matchId, onFinish]);

  // Start timer once quote is loaded
  useEffect(() => {
    if (!quote || startTimeRef.current) return;
    startTimeRef.current = Date.now();
    setTimeout(() => setNoTransition(false), 50); // let the racer render at position 0 before enabling the slide animation
    inputRef.current?.focus();
  }, [quote]);

  // Countdown timer
  useEffect(() => {
    if (!quote || myFinished) return;
    const limit = timeLimits[difficulty] ?? 75;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        if (!myFinished) {
          markNinjaPlayerFinished(matchId, userId);
          setMyFinished(true);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [quote, myFinished, difficulty, matchId, userId]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!startTimeRef.current || !quote) return { wpm: 0, accuracy: 100, progress: 0 };
    const minutes = (Date.now() - startTimeRef.current) / 60000;
    const wpm = Math.round(correctCharsRef.current / 5 / minutes) || 0;
    const total = totalKeystrokesRef.current;
    const accuracy = total > 0 ? Math.round((correctCharsRef.current / total) * 100) : 100;
    const progress = quote.length > 0 ? (userInput.length / quote.length) * 100 : 0;
    return { wpm, accuracy, progress };
  }, [userInput, quote]);

  // Sync progress to Firebase
  useEffect(() => {
    if (!startTimeRef.current || !matchId || myFinished) return;
    const interval = setInterval(() => {
      updateNinjaPlayerProgress(matchId, userId, {
        progress: stats.progress,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
      });
    }, 200);
    return () => clearInterval(interval);
  }, [matchId, userId, stats, myFinished]);

  const handleInput = (e) => {
    if (myFinished) return;
    const val = e.target.value;

    // backspace is locked in multiplayer — mistakes count against your accuracy
    if (val.length < userInput.length) return;

    const addedChar = val.slice(userInput.length).slice(-1);
    if (!addedChar) return;

    const expectedChar = quote[userInput.length];
    totalKeystrokesRef.current++;

    if (addedChar === expectedChar) {
      setHasError(false);
      const newInput = userInput + addedChar;
      setUserInput(newInput);
      correctCharsRef.current = newInput.length;

      if (newInput.length === quote.length) {
        markNinjaPlayerFinished(matchId, userId);
        setMyFinished(true);
      }
    } else {
      setHasError(true);
    }
  };

  const handleForfeit = async () => {
    await forfeitNinjaMatch(matchId, userId);
  };

  const userProgress = quote.length > 0 ? (userInput.length / quote.length) * 100 : 0;
  const opponentProgress = opponentData?.progress || 0;
  const racerTransition = noTransition ? "none" : "left 0.1s linear";

  if (loadError) return <div style={{ color: "#fff", padding: "2rem" }}>Failed to load match: {loadError}</div>;
  if (!quote) return <div style={{ color: "#fff", padding: "2rem" }}>Loading race...</div>;

  return (
    <div style={{ color: "#fff", width: "100%" }} onClick={() => inputRef.current?.focus()}>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.9rem", color: "#aaa" }}>
        <span>WPM: <strong style={{ color: "#fff" }}>{stats.wpm}</strong></span>
        <span>Accuracy: <strong style={{ color: "#fff" }}>{stats.accuracy}%</strong></span>
        <span>Progress: <strong style={{ color: "#fff" }}>{Math.round(userProgress)}%</strong></span>
        {timeLeft !== null && (
          <span style={{ marginLeft: "auto" }}>
            Time: <strong style={{ color: timeLeft <= 10 ? "#ef4444" : "#fff" }}>{timeLeft}s</strong>
          </span>
        )}
      </div>

      {/* Race track */}
      <div style={{
        position: "relative",
        padding: "20px",
        borderRadius: "8px",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${BACKGROUND_URL}')`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        minHeight: "160px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: "1.5rem",
      }}>
        {/* Opponent lane */}
        <div style={{ height: "60px", position: "relative", display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{
            position: "absolute",
            left: `${opponentProgress}%`,
            transition: racerTransition,
            transform: "translateX(-100%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 2,
          }}>
            <div style={{ background: "#4f46e5", padding: "4px 10px", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
              {opponentData?.displayName || "Opponent"}
            </div>
            <img src={OPPONENT_IMAGE_URL} alt="Opponent" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #4f46e5", transform: "scaleX(-1)" }} />
          </div>
        </div>

        {/* Your lane */}
        <div style={{ height: "60px", position: "relative", display: "flex", alignItems: "center" }}>
          <div style={{
            position: "absolute",
            left: `${userProgress}%`,
            transition: racerTransition,
            transform: "translateX(-100%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 2,
          }}>
            <div style={{ background: "#4ade80", padding: "4px 10px", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold", color: "#000", boxShadow: "0 4px 6px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
              YOU
            </div>
            <img src={USER_IMAGE_URL} alt="You" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #4ade80" }} />
          </div>
        </div>

        {/* Finish line */}
        <div style={{ position: "absolute", right: "10px", top: 0, bottom: 0, width: "4px", background: "repeating-linear-gradient(0deg, #fff, #fff 10px, #000 10px, #000 20px)", zIndex: 1 }} />
      </div>

      {/* Quote display */}
      <div style={{ fontSize: "1.1rem", lineHeight: "1.8", marginBottom: "1rem", background: "#0b0b0b", padding: "20px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
        {quote.split("").map((char, i) => {
          let color = "#888";
          let background = "transparent";
          let textDecoration = "none";

          if (i < userInput.length) {
            color = "#4ade80";
          } else if (i === userInput.length) {
            if (hasError) {
              color = "#ef4444";
              background = "rgba(239,68,68,0.2)";
            } else {
              textDecoration = "underline";
              background = "#444";
            }
          }

          return (
            <span key={i} style={{ color, background, textDecoration }}>
              {char}
            </span>
          );
        })}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={handleInput}
        disabled={myFinished}
        style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
        spellCheck={false}
        autoComplete="off"
      />

      {myFinished && (
        <div style={{ textAlign: "center", padding: "1rem", background: "rgba(74,222,128,0.1)", borderRadius: "8px", border: "1px solid #4ade80", marginBottom: "1rem" }}>
          You finished! Waiting for opponent...
        </div>
      )}

      {!myFinished && (
        <p style={{ color: "#666", fontSize: "0.85rem", textAlign: "center" }}>Click anywhere to focus and start typing!</p>
      )}

      {/* Forfeit */}
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        {!showForfeitConfirm ? (
          <button
            onClick={() => setShowForfeitConfirm(true)}
            style={{ background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 16px", borderRadius: "6px", cursor: "pointer" }}
          >
            Leave Game
          </button>
        ) : (
          <div style={{ background: "#1a1a1a", border: "1px solid #444", borderRadius: "8px", padding: "1rem", display: "inline-block" }}>
            <p style={{ marginBottom: "0.75rem" }}>Forfeit the match? Your opponent will win.</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button onClick={handleForfeit} style={{ background: "#ef4444", border: "none", color: "#fff", padding: "6px 16px", borderRadius: "6px", cursor: "pointer" }}>
                Yes, Forfeit
              </button>
              <button onClick={() => setShowForfeitConfirm(false)} style={{ background: "#333", border: "none", color: "#fff", padding: "6px 16px", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
