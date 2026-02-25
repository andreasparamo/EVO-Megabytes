"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import BattleMatchmaking from "./components/BattleMatchmaking";
import BattleRace from "./components/BattleRace";
import RaceResults from "./components/RaceResults";
import "./battle.css";

export default function BattlePage() {
  const { user } = useAuth();
  const [gameState, setGameState] = useState("matchmaking"); // matchmaking, countdown, racing, finished
  const [matchData, setMatchData] = useState(null);
  const [countdown, setCountdown] = useState(3);

  const handleMatchFound = (match) => {
    console.log("Match found in page:", match);
    setMatchData(match);
    setGameState("countdown");
    setCountdown(3);
  };

  const handleRaceFinish = (finalMatchData) => {
    console.log("Race finished:", finalMatchData);
    setMatchData(finalMatchData);
    setGameState("finished");
  };

  const handlePlayAgain = () => {
    setGameState("matchmaking");
    setMatchData(null);
    setCountdown(3);
  };

  const handleExit = () => {
    setGameState("matchmaking");
    setMatchData(null);
    setCountdown(3);
  };

  // Countdown timer logic
  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "countdown" && countdown === 0) {
      setGameState("racing");
    }
  }, [gameState, countdown]);

  if (!user) {
    return (
      <main className="battle-container">
        <div className="battle-hero">
          <h1>Battle Arena</h1>
          <p className="muted">Challenge players in real-time typing races</p>
        </div>
        <div className="battle-arena">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>
              Please log in to participate in battles
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="battle-container">
      <div className="battle-hero">
        <h1>Battle Arena</h1>
        <p className="muted">Challenge players in real-time typing races</p>
      </div>

      <div className="battle-arena">
        {gameState === "matchmaking" && (
          <BattleMatchmaking onMatchFound={handleMatchFound} />
        )}

        {gameState === "countdown" && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h2
              style={{
                fontSize: "2rem",
                marginBottom: "1rem",
                color: "var(--text-primary)",
              }}
            >
              Match Found! 🎮
            </h2>
            <p
              style={{
                fontSize: "1.2rem",
                marginBottom: "2rem",
                color: "var(--text-secondary)",
              }}
            >
              Opponent: <strong>{matchData?.opponentName}</strong>
            </p>
            <div
              style={{
                fontSize: "5rem",
                fontWeight: "bold",
                color: "var(--accent-1)",
                marginTop: "40px",
                animation: "pulse 1s ease-in-out",
              }}
            >
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </div>
        )}

        {gameState === "racing" && matchData && (
          <BattleRace
            matchId={matchData.matchId}
            userId={user.uid}
            onFinish={handleRaceFinish}
          />
        )}

        {gameState === "finished" && matchData && (
          <RaceResults
            matchData={matchData}
            userId={user.uid}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        )}
      </div>
    </main>
  );
}
