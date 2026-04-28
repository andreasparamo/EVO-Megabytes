"use client";
import { useEffect } from "react";
import { cleanupNinjaMatch } from "@/lib/ninjaRaceMatchmaking";
import styles from "@/src/app/battle/components/RaceResults.module.css";

export default function NRResults({ matchData, userId, onPlayAgain, onExit }) {
  const winner = matchData?.gameState?.winner;
  const isWinner = winner === userId;
  const iDidForfeit = matchData?.players?.[userId]?.forfeit === true;
  const opponentId = Object.keys(matchData?.players || {}).find((id) => id !== userId);
  const opponentForfeited = opponentId && matchData?.players?.[opponentId]?.forfeit === true;
  const myStats = matchData?.players?.[userId];
  const opponentStats = opponentId ? matchData?.players[opponentId] : null;

  useEffect(() => {
    if (matchData?.matchId && userId) {
      cleanupNinjaMatch(matchData.matchId, userId);
    }
  }, [matchData, userId]);

  return (
    <div className={styles.container}>
      <h2 className={`${styles.title} ${isWinner ? styles.winner : styles.loser}`}>
        {isWinner
          ? opponentForfeited ? "You Won! (Forfeit)" : "You Won!"
          : iDidForfeit ? "You Forfeited" : "You Lost"}
      </h2>

      <div className={styles.statsGrid}>
        <div className={styles.playerCard}>
          <h3 className={styles.playerTitle}>You</h3>
          <div className={styles.statRow}>
            <span>WPM:</span>
            <strong>{myStats?.wpm || 0}</strong>
          </div>
          <div className={styles.statRow}>
            <span>Accuracy:</span>
            <strong>{myStats?.accuracy || 0}%</strong>
          </div>
          <div className={styles.statRow}>
            <span>Progress:</span>
            <strong>{Math.round(myStats?.progress || 0)}%</strong>
          </div>
        </div>

        <div className={styles.vs}>VS</div>

        <div className={styles.playerCard}>
          <h3 className={styles.playerTitle}>{opponentStats?.displayName || "Opponent"}</h3>
          <div className={styles.statRow}>
            <span>WPM:</span>
            <strong>{opponentStats?.wpm || 0}</strong>
          </div>
          <div className={styles.statRow}>
            <span>Accuracy:</span>
            <strong>{opponentStats?.accuracy || 0}%</strong>
          </div>
          <div className={styles.statRow}>
            <span>Progress:</span>
            <strong>{Math.round(opponentStats?.progress || 0)}%</strong>
          </div>
        </div>
      </div>

      <div className={styles.buttons}>
        <button onClick={onPlayAgain} className={`${styles.button} ${styles.primaryButton}`}>
          Play Again
        </button>
        <button onClick={onExit} className={styles.button}>
          Exit to Menu
        </button>
      </div>
    </div>
  );
}
