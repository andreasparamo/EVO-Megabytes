"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createNinjaLobby,
  joinNinjaLobby,
  listenToNinjaLobbies,
} from "@/lib/ninjaRaceMatchmaking";
import styles from "@/src/app/battle/components/BattleMatchmaking.module.css";

const difficultyLabels = {
  beginner: "Beginner (75s)",
  intermediate: "Intermediate (60s)",
  expert: "Expert (50s)",
};

export default function NRMatchmaking({ onLobbyJoined }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("create");
  const [difficulty, setDifficulty] = useState("beginner");
  const [creating, setCreating] = useState(false);
  const [lobbies, setLobbies] = useState([]);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (tab !== "join") return;
    const unsub = listenToNinjaLobbies(setLobbies);
    return () => unsub();
  }, [tab]);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    const displayName = user.displayName || user.email || "Anonymous";
    const result = await createNinjaLobby(user.uid, displayName, difficulty);
    setCreating(false);
    if (result.success) {
      onLobbyJoined(result.lobbyId, true);
    }
  }

  async function handleJoin(lobbyId) {
    if (!user) return;
    setJoiningId(lobbyId);
    const displayName = user.displayName || user.email || "Anonymous";
    const result = await joinNinjaLobby(lobbyId, user.uid, displayName);
    setJoiningId(null);
    if (result.success) {
      onLobbyJoined(lobbyId, false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Ninja Race — Multiplayer</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "create" ? styles.activeTab : ""}`}
          onClick={() => setTab("create")}
        >
          Create Race
        </button>
        <button
          className={`${styles.tab} ${tab === "join" ? styles.activeTab : ""}`}
          onClick={() => setTab("join")}
        >
          Join Race
        </button>
      </div>

      {tab === "create" && (
        <div>
          <p className={styles.subtitle}>
            Pick a difficulty — a random quote will be fetched for both players to type.
          </p>
          <div className={styles.selectors}>
            <div className={styles.selectorGroup}>
              <label className={styles.selectorLabel}>Difficulty</label>
              <select
                className={styles.select}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="beginner">Beginner (75s)</option>
                <option value="intermediate">Intermediate (60s)</option>
                <option value="expert">Expert (50s)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className={styles.findButton}
          >
            {creating ? "Fetching quote..." : "Create Race"}
          </button>
        </div>
      )}

      {tab === "join" && (
        <div>
          <p className={styles.subtitle}>Join an open race room.</p>
          {lobbies.length === 0 ? (
            <p className={styles.noLobbies}>No open races. Create one!</p>
          ) : (
            <div className={styles.lobbyList}>
              {lobbies.map((lobby) => (
                <div key={lobby.lobbyId} className={styles.lobbyCard}>
                  <div className={styles.lobbyInfo}>
                    <span className={styles.lobbyCreator}>{lobby.creatorName}</span>
                    <span className={styles.lobbyMeta}>
                      {difficultyLabels[lobby.difficulty] || lobby.difficulty}
                    </span>
                  </div>
                  <button
                    className={styles.joinButton}
                    disabled={joiningId === lobby.lobbyId || lobby.creatorId === user?.uid}
                    onClick={() => handleJoin(lobby.lobbyId)}
                  >
                    {joiningId === lobby.lobbyId
                      ? "Joining..."
                      : lobby.creatorId === user?.uid
                      ? "Your Room"
                      : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
