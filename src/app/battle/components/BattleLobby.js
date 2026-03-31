"use client";
import { useState, useEffect } from "react";
import {
  listenToLobby,
  listenMatch,
  leaveLobby,
  startLobbyMatch,
} from "@/lib/battleMatchmaking";
import styles from "./BattleLobby.module.css";

export default function BattleLobby({ lobbyId, userId, isCreator, onMatchFound, onLeave }) {
  const [lobby, setLobby] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Listen for lobby state changes
    const unsubLobby = listenToLobby(lobbyId, (data) => {
      setLobby(data);
      if (!data) onLeave(); // lobby was deleted (creator disconnected)
    });

    // Both players listen for their match notification
    const unsubMatch = listenMatch(userId, (match) => {
      if (match) onMatchFound(match);
    });

    return () => {
      unsubLobby();
      unsubMatch();
    };
  }, [lobbyId, userId]);

  async function handleStart() {
    setStarting(true);
    await startLobbyMatch(lobbyId, userId);
    // Redirect happens via listenMatch when userMatches is written
  }

  async function handleLeave() {
    await leaveLobby(lobbyId, userId, isCreator);
    if (!isCreator) onLeave();
    // Creator leave: lobby deleted → listenToLobby fires null → onLeave called
  }

  if (!lobby) return <div className={styles.loading}>Loading lobby...</div>;

  const players = Object.values(lobby.players || {});
  const canStart = isCreator && players.length >= 2;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Battle Lobby</h2>
        <div className={styles.meta}>
          <span className={styles.badge}>{lobby.language.toUpperCase()}</span>
          <span className={styles.badge}>{lobby.difficulty}</span>
        </div>
      </div>

      <div className={styles.players}>
        <h3 className={styles.sectionLabel}>Players</h3>
        <div className={styles.playerList}>
          {players.map((p) => (
            <div key={p.displayName} className={styles.player}>
              <span className={styles.playerDot} />
              {p.displayName}
              {lobby.players && Object.keys(lobby.players)[0] === Object.keys(lobby.players).find(
                (k) => lobby.players[k].displayName === p.displayName
              ) && lobby.creatorId === Object.keys(lobby.players).find(
                (k) => lobby.players[k].displayName === p.displayName
              ) && <span className={styles.hostTag}>Host</span>}
            </div>
          ))}
          {players.length < 2 && (
            <div className={styles.playerEmpty}>Waiting for opponent to join...</div>
          )}
        </div>
      </div>

      <div className={styles.snippetSection}>
        <h3 className={styles.sectionLabel}>Code Snippet</h3>
        <pre className={styles.snippet}>{lobby.snippet?.code}</pre>
      </div>

      <div className={styles.actions}>
        {isCreator ? (
          <button
            className={styles.startButton}
            disabled={!canStart || starting}
            onClick={handleStart}
          >
            {starting ? "Starting..." : canStart ? "Start Match" : "Waiting for opponent..."}
          </button>
        ) : (
          <p className={styles.waitingText}>Waiting for the host to start the match...</p>
        )}
        <button className={styles.leaveButton} onClick={handleLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
