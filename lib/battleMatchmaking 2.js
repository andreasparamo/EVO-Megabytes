import { rtdb } from "./realtimeDatabase";
import { getRandomSnippet } from "@/src/data/codeSnippets";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  get,
  push,
  onDisconnect,
} from "./realtimeDatabase";

function generateMatchID() {
  //generates the match ID
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; //example: match_1707574800_a7b2c9x1
}

export async function joinQueue(userId, displayName) {
  try {
    const queueRef = ref(rtdb, `battle/queue/${userId}`); //creates a reference to that dir
    await set(queueRef, {
      userId,
      displayName,
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

  const opponent = players.find(
    (p) => p.userId !== currentUser.userId && p.status === "waiting",
  ); //finding opponent

  if (!opponent) {
    console.log("No opponents available");
    return { success: false, message: "No opponents" };
  }

  const matchId = generateMatchID();
  const snippet = getRandomSnippet("c"); //may chnage to gemini created

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
      status: "countdown", // countdown -> racing -> finished
      snippet: snippet,
      language: "c",
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

  //remove the players from queue since they joined a match
  await remove(ref(rtdb, `battle/queue/${currentUser.userId}`));
  await remove(ref(rtdb, `battle/queue/${opponent.userId}`));

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
      const players = matchData.players;

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

export async function cleanupMatch(matchId, userId) {
  try {
    await remove(ref(rtdb, `battle/userMatches/${userId}`)); // remove match reference for user
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

// Listen to match data updates during race
export function listenToMatchUpdates(matchId, onUpdate) {
  const matchRef = ref(rtdb, `battle/matches/${matchId}`);

  const unsubscribe = onValue(matchRef, (snapshot) => {
    if (snapshot.exists()) {
      const matchData = snapshot.val();
      onUpdate(matchData);
    }
  });

  return unsubscribe;
}
