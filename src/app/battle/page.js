"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { get, ref, rtdb } from "@/lib/realtimeDatabase";
import BattleMatchmaking from "./components/BattleMatchmaking";
import BattleLobby from "./components/BattleLobby";
import BattleRace from "./components/BattleRace";
import RaceResults from "./components/RaceResults";
import "./battle.css";

const STORAGE_KEY = "battle_session";

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

export default function BattlePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [gameMode, setGameMode] = useState(null); // null = selection, "battle" = code battle

  // Initialise state from localStorage so navigation doesn't reset the battle
  const [gameState, setGameState] = useState(
    () => loadSession()?.gameState ?? "matchmaking",
  );
  const [lobbyId, setLobbyId] = useState(() => loadSession()?.lobbyId ?? null);
  const [isCreator, setIsCreator] = useState(
    () => loadSession()?.isCreator ?? false,
  );
  const [matchData, setMatchData] = useState(
    () => loadSession()?.matchData ?? null,
  );

  // Validate restored session — if the match/lobby no longer exists in Firebase, reset
  useEffect(() => {
    const session = loadSession();
    if (!session || session.gameState === "matchmaking") return;

    async function validate() {
      if (session.gameState === "racing" || session.gameState === "finished") {
        const matchId = session.matchData?.matchId;
        if (!matchId) {
          clearSession();
          setGameState("matchmaking");
          return;
        }
        const snap = await get(ref(rtdb, `battle/matches/${matchId}`));
        if (!snap.exists()) {
          clearSession();
          setGameState("matchmaking");
        }
      } else if (session.gameState === "lobby") {
        const snap = await get(ref(rtdb, `battle/lobbies/${session.lobbyId}`));
        if (!snap.exists()) {
          clearSession();
          setGameState("matchmaking");
        }
      }
    }
    validate();
  }, []);

  // Keep localStorage in sync whenever battle state changes
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
    // Stay in "battle" mode so they go straight back to matchmaking
  };

  const handleExit = () => {
    clearSession();
    setGameState("matchmaking");
    setMatchData(null);
    setLobbyId(null);
    setIsCreator(false);
    setGameMode(null); // Back to game selection
  };

  if (!user) {
    return (
      <main className="battle-container">
        <div className="battle-hero">
          <h1>Battle Arena</h1>
          <p className="muted">Challenge players in real-time typing races</p>
        </div>
        <div className="battle-arena">
          <div className="battle-login-prompt">
            <p>Please log in to participate in battles</p>
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
        {gameMode === null && (
          <div className="game-select-grid">
            <button
              className="game-select-card"
              onClick={() => setGameMode("battle")}
            >
              <div className="game-select-thumb">
                <img
                  src="/code_battle.png"
                  alt="Code Battle"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <div className="game-select-thumb-fallback">
                  <span>🖼️</span>
                  <span>Add image</span>
                </div>
              </div>
              <div className="game-select-info">
                <h3>Code Battle</h3>
                <p>Race to type a code snippet</p>
              </div>
            </button>

            <button
              className="game-select-card"
              onClick={() => router.push("/ninjarace-multiplayer")}
            >
              <div className="game-select-thumb">
                {/* Replace src with your Ninja Race image */}
                <img
                  src="/racetrack.jpg"
                  alt="Ninja Race"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <div className="game-select-thumb-fallback">
                  <span>🖼️</span>
                  <span>Add image</span>
                </div>
              </div>
              <div className="game-select-info">
                <h3>Ninja Race</h3>
                <p>Race to type a random quote</p>
              </div>
            </button>
          </div>
        )}

        {gameMode === "battle" && gameState === "matchmaking" && (
          <BattleMatchmaking onLobbyJoined={handleLobbyJoined} />
        )}

        {gameMode === "battle" && gameState === "lobby" && (
          <BattleLobby
            lobbyId={lobbyId}
            userId={user.uid}
            isCreator={isCreator}
            onMatchFound={handleMatchFound}
            onLeave={handleLobbyLeft}
          />
        )}

        {gameMode === "battle" && gameState === "racing" && matchData && (
          <BattleRace
            matchId={matchData.matchId}
            userId={user.uid}
            onFinish={handleRaceFinish}
          />
        )}

        {gameMode === "battle" && gameState === "finished" && matchData && (
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
