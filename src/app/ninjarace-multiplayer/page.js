"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { get, ref, rtdb } from "@/lib/realtimeDatabase";
import NRMatchmaking from "./components/NRMatchmaking";
import NRLobby from "./components/NRLobby";
import NRRace from "./components/NRRace";
import NRResults from "./components/NRResults";
import "@/src/app/battle/battle.css";

const STORAGE_KEY = "ninjarace_mp_session";

function loadSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveSession(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function NinjaRaceMultiplayerPage() {
  const { user } = useAuth();

  const [gameState, setGameState] = useState(() => loadSession()?.gameState ?? "matchmaking");
  const [lobbyId, setLobbyId] = useState(() => loadSession()?.lobbyId ?? null);
  const [isCreator, setIsCreator] = useState(() => loadSession()?.isCreator ?? false);
  const [matchData, setMatchData] = useState(() => loadSession()?.matchData ?? null);

  // if the user refreshed mid-match, make sure the lobby/match still exists before restoring state
  useEffect(() => {
    const session = loadSession();
    if (!session || session.gameState === "matchmaking") return;

    async function validate() {
      if (session.gameState === "racing" || session.gameState === "finished") {
        const matchId = session.matchData?.matchId;
        if (!matchId) { clearSession(); setGameState("matchmaking"); return; }
        const snap = await get(ref(rtdb, `ninjarace/matches/${matchId}`));
        if (!snap.exists()) { clearSession(); setGameState("matchmaking"); }
      } else if (session.gameState === "lobby") {
        const snap = await get(ref(rtdb, `ninjarace/lobbies/${session.lobbyId}`));
        if (!snap.exists()) { clearSession(); setGameState("matchmaking"); }
      }
    }
    validate();
  }, []);

  // keep localStorage in sync so navigation doesn't wipe the active session
  useEffect(() => {
    if (gameState === "matchmaking") {
      clearSession();
    } else {
      saveSession({ gameState, lobbyId, isCreator, matchData });
    }
  }, [gameState, lobbyId, isCreator, matchData]);

  const handleLobbyJoined = (id, creator) => {
    setLobbyId(id);
    setIsCreator(creator);
    setGameState("lobby");
  };

  const handleMatchFound = (match) => {
    setMatchData(match);
    setGameState("racing");
  };

  const handleLobbyLeft = () => {
    setLobbyId(null);
    setIsCreator(false);
    setGameState("matchmaking");
  };

  const handleRaceFinish = (finalMatchData) => {
    setMatchData(finalMatchData);
    setGameState("finished");
  };

  const handlePlayAgain = () => {
    clearSession();
    setGameState("matchmaking");
    setMatchData(null);
    setLobbyId(null);
    setIsCreator(false);
  };

  const handleExit = () => {
    clearSession();
    setGameState("matchmaking");
    setMatchData(null);
    setLobbyId(null);
    setIsCreator(false);
  };

  if (!user) {
    return (
      <main className="battle-container">
        <div className="battle-hero">
          <h1>Ninja Race — Multiplayer</h1>
          <p className="muted">Race real players in a live typing showdown</p>
        </div>
        <div className="battle-arena">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>
              Please log in to race other players
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="battle-container">
      <div className="battle-hero">
        <h1>Ninja Race — Multiplayer</h1>
        <p className="muted">Race real players in a live typing showdown</p>
      </div>

      <div className="battle-arena">
        {gameState === "matchmaking" && (
          <NRMatchmaking onLobbyJoined={handleLobbyJoined} />
        )}

        {gameState === "lobby" && (
          <NRLobby
            lobbyId={lobbyId}
            userId={user.uid}
            isCreator={isCreator}
            onMatchFound={handleMatchFound}
            onLeave={handleLobbyLeft}
          />
        )}

        {gameState === "racing" && matchData && (
          <NRRace
            matchId={matchData.matchId}
            userId={user.uid}
            onFinish={handleRaceFinish}
          />
        )}

        {gameState === "finished" && matchData && (
          <NRResults
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
