import { rtdb } from "./realtimeDatabase";
import { getRandomSnippet } from "@/src/data/codeSnippets";
import { generateCodeSnippets } from "@/src/data/geminiService";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  get,
  onDisconnect,
} from "./realtimeDatabase";

function generateMatchID() {
  return `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function joinQueue(userId, displayName, language = "c", difficulty = "medium") {
  try {
    const queueRef = ref(rtdb, `battle/queue/${userId}`); //creates a reference to that dir
    await set(queueRef, {
      userId,
      displayName,
      language,
      difficulty,
      joinedAt: Date.now(),
      status: "waiting",
    });
    onDisconnect(queueRef).remove(); //user is removed if the user closess the app and also deletes them from the queue
    console.log(`${displayName} joined!`);
    return { success: true };
  } catch (error) {
    console.error("Error joining queue:", error);
    return { success: false, error: error.message };
  }
}

export async function leaveQueue(userId) {
  try {
    const queueRef = ref(rtdb, `battle/queue/${userId}`);
    await remove(queueRef); //removes user
    console.log(`${userId} left the queue`);
    return { success: true };
  } catch (error) {
    console.error("Error leaving the queue: ", error);
    return { success: false, error: error.message };
  }
}

export function listenMatch(userId, onMatchFound) {
  const userMatchRef = ref(rtdb, `battle/userMatches/${userId}`);

  const unsubscribe = onValue(userMatchRef, (snapshot) => {
    if (snapshot.exists()) {
      //checks if there is any changes in this and captures the data
      const matchData = snapshot.val();
      console.log("Match Found!", matchData);
      onMatchFound(matchData); //function to redirect the user to the race screen
    }
  });

  return unsubscribe; //to stop listening to the match updates from the database
}

export async function createMatch(currentUser) {
  // Check if user already has a match
  const userMatchRef = ref(rtdb, `battle/userMatches/${currentUser.userId}`);
  const existingMatch = await get(userMatchRef);
  if (existingMatch.exists()) {
    console.log("User already has a match");
    return { success: false, message: "Already in a match" };
  }

  const queueRef = ref(rtdb, "battle/queue");
  const snapshot = await get(queueRef); //gets the list of people

  const queueData = snapshot.val();

  // Check if queue is empty
  if (!queueData) {
    console.log("Queue is empty");
    return { success: false, message: "Queue is empty" };
  }

  const players = Object.values(queueData); //list of players available

  // Get current user's joinedAt from the queue
  const myQueueSnapshot = await get(ref(rtdb, `battle/queue/${currentUser.userId}`));
  const myJoinedAt = myQueueSnapshot.val()?.joinedAt || Date.now();

  const opponent = players.find(
    (p) => p.userId !== currentUser.userId && p.status === "waiting",
  ); //finding opponent

  if (!opponent) {
    console.log("No opponents available");
    return { success: false, message: "No opponents" };
  }

  // Only the player who joined LATER creates the match — eliminates dual creation race condition
  if (myJoinedAt <= opponent.joinedAt) {
    console.log("Waiting for opponent to create match");
    return { success: false, message: "Waiting for opponent" };
  }

  const matchId = generateMatchID();
  const language = currentUser.language || "c";
  const difficulty = currentUser.difficulty || "medium";

  let snippet = await generateCodeSnippets(language, difficulty);
  if (!snippet) {
    snippet = getRandomSnippet(language);
  }

  const matchData = {
    matchId,
    players: {
      [currentUser.userId]: {
        displayName: currentUser.displayName,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishedAt: null,
      },
      [opponent.userId]: {
        displayName: opponent.displayName,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishedAt: null,
      },
    },
    gameState: {
      status: "countdown",
      snippet: snippet,
      language,
      difficulty,
      createdAt: Date.now(),
      startTime: null,
      winner: null,
    },
  };

  const matchRef = ref(rtdb, `battle/matches/${matchId}`); //create a match room
  await set(matchRef, matchData); //write matchData to matchref

  // Notify both players about the match and got to race
  await set(ref(rtdb, `battle/userMatches/${currentUser.userId}`), {
    matchId,
    opponentId: opponent.userId,
    opponentName: opponent.displayName,
  });

  await set(ref(rtdb, `battle/userMatches/${opponent.userId}`), {
    matchId,
    opponentId: currentUser.userId,
    opponentName: currentUser.displayName,
  });

  // Only remove ourselves — opponent removes themselves when they receive the match notification
  await remove(ref(rtdb, `battle/queue/${currentUser.userId}`));

  console.log(`match created: ${matchId}`);
  console.log(`${currentUser.displayName} vs ${opponent.displayName}`);
  return {
    success: true,
    matchId,
    opponentId: opponent.userId,
    opponentName: opponent.displayName,
  };
}

// Update player progress during race
export async function updatePlayerProgress(matchId, userId, progressData) {
  try {
    const playerRef = ref(rtdb, `battle/matches/${matchId}/players/${userId}`);
    await update(playerRef, {
      progress: progressData.progress,
      wpm: progressData.wpm,
      accuracy: progressData.accuracy,
      lastUpdate: Date.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating progress:", error);
    return { success: false, error: error.message };
  }
}

// Mark player as finished
export async function markPlayerFinished(matchId, userId) {
  try {
    const playerRef = ref(rtdb, `battle/matches/${matchId}/players/${userId}`);
    const matchRef = ref(rtdb, `battle/matches/${matchId}`);

    const finishTime = Date.now();

    // Update player status
    await update(playerRef, {
      finished: true,
      finishedAt: finishTime,
    });

    // Check if this player is the first to finish (winner)
    const matchSnapshot = await get(matchRef);
    if (matchSnapshot.exists()) {
      const matchData = matchSnapshot.val();

      // If no winner yet, this player wins
      if (!matchData.gameState.winner) {
        await update(ref(rtdb, `battle/matches/${matchId}/gameState`), {
          winner: userId,
          status: "finished",
          finishedAt: finishTime,
        });
        console.log(`Winner: ${userId}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking finished:", error);
    return { success: false, error: error.message };
  }
}

export async function forfeitMatch(matchId, userId) {
  try {
    const matchRef = ref(rtdb, `battle/matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (!snapshot.exists()) return { success: false };

    const matchData = snapshot.val();
    const opponentId = Object.keys(matchData.players).find((id) => id !== userId);
    const finishTime = Date.now();

    // Mark forfeiting player as finished with forfeit flag
    await update(ref(rtdb, `battle/matches/${matchId}/players/${userId}`), {
      finished: true,
      forfeit: true,
      finishedAt: finishTime,
    });

    // Set opponent as winner and end the game
    await update(ref(rtdb, `battle/matches/${matchId}/gameState`), {
      winner: opponentId,
      status: "finished",
      finishedAt: finishTime,
    });

    // Mark opponent as finished so allFinished check triggers for both players
    await update(ref(rtdb, `battle/matches/${matchId}/players/${opponentId}`), {
      finished: true,
      finishedAt: finishTime,
    });

    return { success: true };
  } catch (error) {
    console.error("Error forfeiting match:", error);
    return { success: false, error: error.message };
  }
}

export async function cleanupMatch(_matchId, userId) {
  try {
    await remove(ref(rtdb, `battle/userMatches/${userId}`));
    await remove(ref(rtdb, `battle/queue/${userId}`)); // safety net in case queue entry was not removed
    return { success: true };
  } catch (error) {
    console.error("Error cleaning up match:", error);
    return { success: false, error: error.message };
  }
}

// Start countdown and transition to racing
export async function startRace(matchId) {
  try {
    await update(ref(rtdb, `battle/matches/${matchId}/gameState`), {
      status: "racing",
      startTime: Date.now(),
    });
    console.log(`Race started: ${matchId}`);
    return { success: true };
  } catch (error) {
    console.error("Error starting race:", error);
    return { success: false, error: error.message };
  }
}

// ─── Lobby-based matchmaking ─────────────────────────────────────────────────

function generateLobbyID() {
  return `lobby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function createLobby(userId, displayName, language, difficulty) {
  const lobbyId = generateLobbyID();

  let snippet = await generateCodeSnippets(language, difficulty);
  if (!snippet) snippet = getRandomSnippet(language);

  const lobbyRef = ref(rtdb, `battle/lobbies/${lobbyId}`);
  await set(lobbyRef, {
    lobbyId,
    creatorId: userId,
    creatorName: displayName,
    language,
    difficulty,
    snippet,
    status: "waiting",
    players: {
      [userId]: { displayName, joinedAt: Date.now() },
    },
    createdAt: Date.now(),
  });

  onDisconnect(lobbyRef).remove();
  return { success: true, lobbyId };
}

export async function joinLobby(lobbyId, userId, displayName) {
  const lobbyRef = ref(rtdb, `battle/lobbies/${lobbyId}`);
  const snapshot = await get(lobbyRef);

  if (!snapshot.exists()) return { success: false, message: "Lobby not found" };
  const lobby = snapshot.val();
  if (lobby.status !== "waiting") return { success: false, message: "Lobby already started" };
  if (Object.keys(lobby.players || {}).length >= 2) return { success: false, message: "Lobby is full" };

  await set(ref(rtdb, `battle/lobbies/${lobbyId}/players/${userId}`), {
    displayName,
    joinedAt: Date.now(),
  });
  return { success: true };
}

export async function leaveLobby(lobbyId, userId, isCreator) {
  if (isCreator) {
    await remove(ref(rtdb, `battle/lobbies/${lobbyId}`));
  } else {
    await remove(ref(rtdb, `battle/lobbies/${lobbyId}/players/${userId}`));
  }
}

export function listenToLobby(lobbyId, callback) {
  return onValue(ref(rtdb, `battle/lobbies/${lobbyId}`), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export function listenToLobbies(callback) {
  return onValue(ref(rtdb, "battle/lobbies"), (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.values(snapshot.val()).filter((l) => l.status === "waiting"));
    } else {
      callback([]);
    }
  });
}

export async function startLobbyMatch(lobbyId, creatorId) {
  const lobbyRef = ref(rtdb, `battle/lobbies/${lobbyId}`);
  const snapshot = await get(lobbyRef);

  if (!snapshot.exists()) return { success: false, message: "Lobby not found" };
  const lobby = snapshot.val();
  if (lobby.creatorId !== creatorId) return { success: false, message: "Only the creator can start" };

  const playerEntries = Object.entries(lobby.players || {});
  if (playerEntries.length < 2) return { success: false, message: "Need 2 players to start" };

  const matchId = generateMatchID();
  const players = {};
  playerEntries.forEach(([pid, pdata]) => {
    players[pid] = { displayName: pdata.displayName, progress: 0, wpm: 0, accuracy: 100, finished: false, finishedAt: null };
  });

  await set(ref(rtdb, `battle/matches/${matchId}`), {
    matchId,
    players,
    gameState: {
      status: "countdown",
      snippet: lobby.snippet,
      language: lobby.language,
      difficulty: lobby.difficulty,
      createdAt: Date.now(),
      startTime: null,
      winner: null,
    },
  });

  const p1id = playerEntries[0][0];
  const p2id = playerEntries[1][0];

  await set(ref(rtdb, `battle/userMatches/${p1id}`), {
    matchId, opponentId: p2id, opponentName: lobby.players[p2id].displayName,
  });
  await set(ref(rtdb, `battle/userMatches/${p2id}`), {
    matchId, opponentId: p1id, opponentName: lobby.players[p1id].displayName,
  });

  await remove(lobbyRef);
  return { success: true, matchId };
}

// ─── Listen to match data updates during race ─────────────────────────────────

// Listen to match data updates during race
export function listenToMatchUpdates(matchId, onUpdate, onError) {
  const matchRef = ref(rtdb, `battle/matches/${matchId}`);

  const unsubscribe = onValue(
    matchRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.val());
      }
    },
    (error) => {
      console.error("listenToMatchUpdates error:", error.code, error.message);
      if (onError) onError(error);
    },
  );

  return unsubscribe;
}
