// lib/progressService.js
// Firestore operations for saving test results and fetching progress data.

import { db } from "@/lib/firebase";
import {
    doc, collection, runTransaction,
    addDoc, serverTimestamp, getDoc,
    getDocs, query, orderBy, limit,
} from "firebase/firestore";
import { classifyTest } from "./scoreUtils";

/**
 * Saves a completed test result to Firestore.
 * Only updates bestWpm if the new score is strictly higher.
 *
 * @param {string} uid - Authenticated user ID
 * @param {object} result - { wpm, accuracy, wordCount, testCompleted }
 * @returns {{ saved: boolean, reason?: string }}
 */
export async function saveTestResult(uid, result) {
    const { wpm, accuracy, wordCount, testCompleted } = result;

    // --- Fairness Gate ---
    if (!testCompleted) return { saved: false, reason: "test_not_completed" };
    if (!wpm || wpm <= 0) return { saved: false, reason: "invalid_wpm" };
    if (accuracy < 50) return { saved: false, reason: "accuracy_too_low" };

    const category = classifyTest(wordCount);
    if (!category) return { saved: false, reason: "unknown_category" };

    const progressRef = doc(db, "users", uid, "progress", category);
    const historyRef = collection(db, "users", uid, "history");

    let isNewBest = false;

    try {
        await runTransaction(db, async (transaction) => {
            const progressSnap = await transaction.get(progressRef);
            const existing = progressSnap.exists() ? progressSnap.data() : null;

            isNewBest = !existing || wpm > existing.bestWpm;
            const currentRuns = existing?.totalRuns ?? 0;

            // Always update totalRuns; only update best fields if score improved
            transaction.set(progressRef, {
                bestWpm: isNewBest ? wpm : existing.bestWpm,
                bestAccuracy: isNewBest ? accuracy : existing.bestAccuracy,
                totalRuns: currentRuns + 1,
                lastUpdated: serverTimestamp(),
            });
        });

        // Append to history outside transaction (non-critical, eventual consistency OK)
        await addDoc(historyRef, {
            wpm,
            accuracy,
            wordCount,
            category,
            timestamp: serverTimestamp(),
        });

        return { saved: true, isNewBest };
    } catch (err) {
        console.error("saveTestResult failed:", err);
        return { saved: false, reason: "firestore_error" };
    }
}

/**
 * Fetches all three best-score documents for a user.
 * @param {string} uid
 * @returns {{ short: object|null, medium: object|null, long: object|null }}
 */
export async function fetchProgress(uid) {
    const categories = ["short", "medium", "long"];
    const results = {};

    await Promise.all(
        categories.map(async (cat) => {
            const ref = doc(db, "users", uid, "progress", cat);
            const snap = await getDoc(ref);
            results[cat] = snap.exists() ? snap.data() : null;
        })
    );

    return results;
}

/**
 * Fetches the most recent history entries for a user.
 * @param {string} uid
 * @param {number} count
 */
export async function fetchRecentHistory(uid, count = 10) {
    const ref = collection(db, "users", uid, "history");
    const q = query(ref, orderBy("timestamp", "desc"), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
