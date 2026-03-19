"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createLobby, joinLobby, listenToLobbies } from "@/lib/battleMatchmaking";
import styles from "./BattleMatchmaking.module.css";

export default function BattleMatchmaking({ onLobbyJoined }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("create"); // "create" | "join"
  const [language, setLanguage] = useState("c");
  const [difficulty, setDifficulty] = useState("medium");
  const [creating, setCreating] = useState(false);
  const [lobbies, setLobbies] = useState([]);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (tab !== "join") return;
    const unsub = listenToLobbies(setLobbies);
    return () => unsub();
  }, [tab]);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    const displayName = user.displayName || user.email || "Anonymous";
    const result = await createLobby(user.uid, displayName, language, difficulty);
    setCreating(false);
    if (result.success) {
      onLobbyJoined(result.lobbyId, true);
    }
  }

  async function handleJoin(lobbyId) {
    if (!user) return;
    setJoiningId(lobbyId);
    const displayName = user.displayName || user.email || "Anonymous";
    const result = await joinLobby(lobbyId, user.uid, displayName);
    setJoiningId(null);
    if (result.success) {
      onLobbyJoined(lobbyId, false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Battle Arena</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "create" ? styles.activeTab : ""}`}
          onClick={() => setTab("create")}
        >
          Create Battle
        </button>
        <button
          className={`${styles.tab} ${tab === "join" ? styles.activeTab : ""}`}
          onClick={() => setTab("join")}
        >
          Join Battle
        </button>
      </div>

      {tab === "create" && (
        <div>
          <p className={styles.subtitle}>
            Pick a language and difficulty — a code snippet will be generated for both players.
          </p>
          <div className={styles.selectors}>
            <div className={styles.selectorGroup}>
              <label className={styles.selectorLabel}>Language</label>
              <select
                className={styles.select}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
              </select>
            </div>
            <div className={styles.selectorGroup}>
              <label className={styles.selectorLabel}>Difficulty</label>
              <select
                className={styles.select}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className={styles.findButton}
          >
            {creating ? "Generating snippet..." : "Create Battle"}
          </button>
        </div>
      )}

      {tab === "join" && (
        <div>
          <p className={styles.subtitle}>Join an open battle room.</p>
          {lobbies.length === 0 ? (
            <p className={styles.noLobbies}>No open battles. Create one!</p>
          ) : (
            <div className={styles.lobbyList}>
              {lobbies.map((lobby) => (
                <div key={lobby.lobbyId} className={styles.lobbyCard}>
                  <div className={styles.lobbyInfo}>
                    <span className={styles.lobbyCreator}>{lobby.creatorName}</span>
                    <span className={styles.lobbyMeta}>
                      {lobby.language.toUpperCase()} · {lobby.difficulty}
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
