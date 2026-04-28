"use client";
import { useState, useEffect } from "react";
import {
  listenToNinjaLobby,
  listenNinjaMatch,
  leaveNinjaLobby,
  startNinjaLobbyMatch,
} from "@/lib/ninjaRaceMatchmaking";
import styles from "@/src/app/battle/components/BattleLobby.module.css";

export default function NRLobby({ lobbyId, userId, isCreator, onMatchFound, onLeave }) {
  const [lobby, setLobby] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsubLobby = listenToNinjaLobby(lobbyId, (data) => {
      setLobby(data);
      if (!data) onLeave();
    });

    const unsubMatch = listenNinjaMatch(userId, (match) => {
      if (match) onMatchFound(match);
    });

    return () => {
      unsubLobby();
      unsubMatch();
    };
  }, [lobbyId, userId]);

  async function handleStart() {
    setStarting(true);
    await startNinjaLobbyMatch(lobbyId, userId);
    // the redirect to the race happens when listenNinjaMatch picks up the new userMatches entry
  }

  async function handleLeave() {
    await leaveNinjaLobby(lobbyId, userId, isCreator);
    if (!isCreator) onLeave();
  }

  if (!lobby) return <div className={styles.loading}>Loading lobby...</div>;

  const players = Object.values(lobby.players || {});
  const canStart = isCreator && players.length >= 2;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Race Lobby</h2>
        <div className={styles.meta}>
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
              {lobby.creatorId &&
                Object.keys(lobby.players || {}).find(
                  (k) => lobby.players[k].displayName === p.displayName
                ) === lobby.creatorId && (
                  <span className={styles.hostTag}>Host</span>
                )}
            </div>
          ))}
          {players.length < 2 && (
            <div className={styles.playerEmpty}>Waiting for opponent to join...</div>
          )}
        </div>
      </div>

      <div className={styles.snippetSection}>
        <h3 className={styles.sectionLabel}>Quote to Type</h3>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.95rem" }}>
          {lobby.quote}
        </p>
      </div>

      <div className={styles.actions}>
        {isCreator ? (
          <button
            className={styles.startButton}
            disabled={!canStart || starting}
            onClick={handleStart}
          >
            {starting ? "Starting..." : canStart ? "Start Race" : "Waiting for opponent..."}
          </button>
        ) : (
          <p className={styles.waitingText}>Waiting for the host to start the race...</p>
        )}
        <button className={styles.leaveButton} onClick={handleLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
