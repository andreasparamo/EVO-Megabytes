"use client";
import { useEffect } from "react";
import styles from "./RaceResults.module.css";
import { saveBattleResult } from "@/lib/firestoreService";

export default function RaceResults({
  matchData,
  userId,
  onPlayAgain,
  onExit,
}) {
  const winner = matchData?.gameState?.winner;
  const isWinner = winner === userId;
  const myStats = matchData?.players?.[userId];
  const opponentId = Object.keys(matchData?.players || {}).find(
    (id) => id !== userId,
  );
  const opponentStats = opponentId ? matchData?.players[opponentId] : null;

  // Save battle result to Firestore when results are displayed
  useEffect(() => {
    const saveResult = async () => {
      if (matchData && userId) {
        const battleData = {
          matchId: matchData.matchId,
          opponentName: opponentStats?.displayName || "Opponent",
          opponentId: opponentId,
          result: isWinner ? "win" : "loss",
          myWPM: myStats?.wpm || 0,
          myAccuracy: myStats?.accuracy || 0,
          opponentWPM: opponentStats?.wpm || 0,
          opponentAccuracy: opponentStats?.accuracy || 0,
          language: matchData?.gameState?.language || "c",
          snippet: matchData?.gameState?.snippet || "",
        };

        const result = await saveBattleResult(userId, battleData);
        if (result.success) {
          console.log("Battle result saved successfully");
        } else {
          console.error("Failed to save battle result:", result.error);
        }
      }
    };

    saveResult();
  }, [matchData, userId, isWinner, myStats, opponentStats, opponentId]);

  return (
    <div className={styles.container}>
      <h2
        className={`${styles.title} ${isWinner ? styles.winner : styles.loser}`}
      >
        {isWinner ? "You Won!" : "You Lost"}
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
          <h3 className={styles.playerTitle}>
            {opponentStats?.displayName || "Opponent"}
          </h3>
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
        <button
          onClick={onPlayAgain}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          Play Again
        </button>
        <button onClick={onExit} className={styles.button}>
          Exit to Menu
        </button>
      </div>
    </div>
  );
}
