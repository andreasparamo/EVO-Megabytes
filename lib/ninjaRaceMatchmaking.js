import { rtdb } from "./realtimeDatabase";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  get,
  onDisconnect,
} from "./realtimeDatabase";

const MAX_QUOTE_LEN = 250;

function generateMatchID() {
  return `nrmatch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateLobbyID() {
  return `nrlobby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function fetchNinjaQuote() {
  try {
    const [res1, res2] = await Promise.all([
      fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random?_=${Date.now()}`),
      fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random?_=${Date.now() + 1}`),
    ]);
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
    let combined = `${data1.text} ${data2.text}`.trim().replace(/\s+/g, " ");
    return combined.slice(0, MAX_QUOTE_LEN);
  } catch {
    return "Error connecting to the public database. Please verify your connection and restart the match to try again.";
  }
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

export async function createNinjaLobby(userId, displayName, difficulty) {
  const lobbyId = generateLobbyID();
  const quote = await fetchNinjaQuote();

  const lobbyRef = ref(rtdb, `ninjarace/lobbies/${lobbyId}`);
  await set(lobbyRef, {
    lobbyId,
    creatorId: userId,
    creatorName: displayName,
    difficulty,
    quote,
    status: "waiting",
    players: {
      [userId]: { displayName, joinedAt: Date.now() },
    },
    createdAt: Date.now(),
  });

  onDisconnect(lobbyRef).remove();
  return { success: true, lobbyId };
}

export async function joinNinjaLobby(lobbyId, userId, displayName) {
  const lobbyRef = ref(rtdb, `ninjarace/lobbies/${lobbyId}`);
  const snapshot = await get(lobbyRef);

  if (!snapshot.exists()) return { success: false, message: "Lobby not found" };
  const lobby = snapshot.val();
  if (lobby.status !== "waiting") return { success: false, message: "Lobby already started" };
  if (Object.keys(lobby.players || {}).length >= 2) return { success: false, message: "Lobby is full" };

  await set(ref(rtdb, `ninjarace/lobbies/${lobbyId}/players/${userId}`), {
    displayName,
    joinedAt: Date.now(),
  });
  return { success: true };
}

export async function leaveNinjaLobby(lobbyId, userId, isCreator) {
  if (isCreator) {
    await remove(ref(rtdb, `ninjarace/lobbies/${lobbyId}`));
  } else {
    await remove(ref(rtdb, `ninjarace/lobbies/${lobbyId}/players/${userId}`));
  }
}

export function listenToNinjaLobby(lobbyId, callback) {
  return onValue(ref(rtdb, `ninjarace/lobbies/${lobbyId}`), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

export function listenToNinjaLobbies(callback) {
  return onValue(ref(rtdb, "ninjarace/lobbies"), (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.values(snapshot.val()).filter((l) => l.status === "waiting"));
    } else {
      callback([]);
    }
  });
}

export async function startNinjaLobbyMatch(lobbyId, creatorId) {
  const lobbyRef = ref(rtdb, `ninjarace/lobbies/${lobbyId}`);
  const snapshot = await get(lobbyRef);

  if (!snapshot.exists()) return { success: false, message: "Lobby not found" };
  const lobby = snapshot.val();
  if (lobby.creatorId !== creatorId) return { success: false, message: "Only the creator can start" };

  const playerEntries = Object.entries(lobby.players || {});
  if (playerEntries.length < 2) return { success: false, message: "Need 2 players to start" };

  const matchId = generateMatchID();
  const players = {};
  playerEntries.forEach(([pid, pdata]) => {
    players[pid] = {
      displayName: pdata.displayName,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      finishedAt: null,
    };
  });

  await set(ref(rtdb, `ninjarace/matches/${matchId}`), {
    matchId,
    players,
    gameState: {
      status: "racing",
      quote: lobby.quote,
      difficulty: lobby.difficulty,
      createdAt: Date.now(),
      startTime: Date.now(),
      winner: null,
    },
  });

  const p1id = playerEntries[0][0];
  const p2id = playerEntries[1][0];

  await set(ref(rtdb, `ninjarace/userMatches/${p1id}`), {
    matchId,
    opponentId: p2id,
    opponentName: lobby.players[p2id].displayName,
  });
  await set(ref(rtdb, `ninjarace/userMatches/${p2id}`), {
    matchId,
    opponentId: p1id,
    opponentName: lobby.players[p1id].displayName,
  });

  await remove(lobbyRef);
  return { success: true, matchId };
}

// ─── Match notifications ──────────────────────────────────────────────────────

export function listenNinjaMatch(userId, onMatchFound) {
  const userMatchRef = ref(rtdb, `ninjarace/userMatches/${userId}`);
  return onValue(userMatchRef, (snapshot) => {
    if (snapshot.exists()) {
      onMatchFound(snapshot.val());
    }
  });
}

// ─── Race ─────────────────────────────────────────────────────────────────────

export function listenToNinjaMatchUpdates(matchId, onUpdate, onError) {
  return onValue(
    ref(rtdb, `ninjarace/matches/${matchId}`),
    (snapshot) => {
      if (snapshot.exists()) onUpdate(snapshot.val());
    },
    (error) => {
      console.error("listenToNinjaMatchUpdates error:", error);
      if (onError) onError(error);
    },
  );
}

export async function updateNinjaPlayerProgress(matchId, userId, progressData) {
  try {
    await update(ref(rtdb, `ninjarace/matches/${matchId}/players/${userId}`), {
      progress: progressData.progress,
      wpm: progressData.wpm,
      accuracy: progressData.accuracy,
      lastUpdate: Date.now(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markNinjaPlayerFinished(matchId, userId) {
  try {
    const finishTime = Date.now();
    await update(ref(rtdb, `ninjarace/matches/${matchId}/players/${userId}`), {
      finished: true,
      finishedAt: finishTime,
    });

    const matchSnapshot = await get(ref(rtdb, `ninjarace/matches/${matchId}`));
    if (matchSnapshot.exists()) {
      const matchData = matchSnapshot.val();
      if (!matchData.gameState.winner) {
        await update(ref(rtdb, `ninjarace/matches/${matchId}/gameState`), {
          winner: userId,
          status: "finished",
          finishedAt: finishTime,
        });
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function forfeitNinjaMatch(matchId, userId) {
  try {
    const snapshot = await get(ref(rtdb, `ninjarace/matches/${matchId}`));
    if (!snapshot.exists()) return { success: false };

    const matchData = snapshot.val();
    const opponentId = Object.keys(matchData.players).find((id) => id !== userId);
    const finishTime = Date.now();

    await update(ref(rtdb, `ninjarace/matches/${matchId}/players/${userId}`), {
      finished: true,
      forfeit: true,
      finishedAt: finishTime,
    });
    await update(ref(rtdb, `ninjarace/matches/${matchId}/gameState`), {
      winner: opponentId,
      status: "finished",
      finishedAt: finishTime,
    });
    await update(ref(rtdb, `ninjarace/matches/${matchId}/players/${opponentId}`), {
      finished: true,
      finishedAt: finishTime,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function cleanupNinjaMatch(_matchId, userId) {
  try {
    await remove(ref(rtdb, `ninjarace/userMatches/${userId}`));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
