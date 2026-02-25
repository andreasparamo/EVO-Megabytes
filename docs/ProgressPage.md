# ProgressPage Implementation Plan
**Branch:** `progressPage`  
**Project:** EVO-Megabytes / LearnToType  
**Stack:** Next.js (App Router) · React · Firebase Firestore · Tailwind CSS · shadcn/ui

---

## 1. Overview

The Progress Page is a personal analytics dashboard that surfaces each authenticated user's **best WPM score** for each test length category — **Short**, **Medium**, and **Long**. It must be fair (no score inflation from lucky results), bug-free (atomic Firestore writes, race-condition-safe), and intuitive to read at a glance.

---

## 2. Test Length Definitions

To ensure consistency across the whole app, define test categories in a single shared constants file.

```js
// src/lib/constants.js  (add to existing file or create)
export const TEST_CATEGORIES = {
  short:  { label: "Short",  minWords: 1,   maxWords: 25  },
  medium: { label: "Medium", minWords: 26,  maxWords: 75  },
  long:   { label: "Long",   minWords: 76,  maxWords: Infinity },
};
```

These word-count boundaries must be referenced identically in **both** the test-scoring logic and the Progress Page display logic so the buckets always agree.

---

## 3. Firestore Data Model

### 3a. Collection Structure

```
users/
  {uid}/
    progress/
      short/
        bestWpm:       number        // all-time best WPM for short tests
        bestAccuracy:  number        // accuracy (%) at that best run
        totalRuns:     number        // total short tests completed
        lastUpdated:   Timestamp
      medium/
        bestWpm:       number
        bestAccuracy:  number
        totalRuns:     number
        lastUpdated:   Timestamp
      long/
        bestWpm:       number
        bestAccuracy:  number
        totalRuns:     number
        lastUpdated:   Timestamp

    history/
      {autoId}/
        wpm:           number
        accuracy:      number
        wordCount:     number
        category:      "short" | "medium" | "long"
        timestamp:     Timestamp
```

### 3b. Why Two Sub-Collections?

- `progress/{category}` — stores **only aggregated bests**, cheap to read, always current.
- `history/{autoId}` — stores **every run**, enabling future charts/trends without burdening the bests document.

---

## 4. Firestore Security Rules

Add to `firestore.rules` to ensure users can only read/write their own data:

```
match /users/{uid}/progress/{category} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}

match /users/{uid}/history/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

---

## 5. Score Submission Logic (Fair & Bug-Free)

This is the most critical part. The function runs **after a test ends** and must be called from the existing test-completion handler.

### 5a. Fairness Rules (Anti-Inflation)

Before a score is submitted, it must pass all of the following validation checks. Any failure silently discards the result without error-ing out the UI.

| Rule | Rationale |
|------|-----------|
| `wpm > 0` | Prevents empty or zero-score submissions |
| `accuracy >= 50%` | Filters out accidental completions; below 50% accuracy is not a meaningful score |
| `wordCount >= TEST_CATEGORIES[category].minWords` | Ensures the test wasn't cut short |
| Test was not interrupted/reset | A flag `testCompleted = true` must be set only at natural finish |
| Timer elapsed naturally (not force-finished via cheat) | Compare `expectedDuration` vs `actualDuration` if time-based tests are used |
| No special characters or clipboard paste detected | Guard against pasting (handled in existing typing engine) |

### 5b. Category Classifier

```js
// src/lib/scoreUtils.js

import { TEST_CATEGORIES } from "./constants";

export function classifyTest(wordCount) {
  for (const [key, { minWords, maxWords }] of Object.entries(TEST_CATEGORIES)) {
    if (wordCount >= minWords && wordCount <= maxWords) return key;
  }
  return null; // unknown length — do not save
}
```

### 5c. Atomic Score Submission with Firestore Transaction

Using a **Firestore transaction** ensures that if two tabs finish a test simultaneously (a real edge case with multiplayer), neither write corrupts the best score document.

```js
// src/lib/progressService.js

import { db } from "@/lib/firebase";
import {
  doc, collection, runTransaction,
  addDoc, serverTimestamp, getDoc
} from "firebase/firestore";
import { classifyTest } from "./scoreUtils";

/**
 * Saves a completed test result to Firestore.
 * Only updates bestWpm if the new score is strictly higher.
 *
 * @param {string} uid - Authenticated user ID
 * @param {object} result - { wpm, accuracy, wordCount, testCompleted }
 */
export async function saveTestResult(uid, result) {
  const { wpm, accuracy, wordCount, testCompleted } = result;

  // --- Fairness Gate ---
  if (!testCompleted)          return { saved: false, reason: "test_not_completed" };
  if (!wpm || wpm <= 0)        return { saved: false, reason: "invalid_wpm" };
  if (accuracy < 50)           return { saved: false, reason: "accuracy_too_low" };

  const category = classifyTest(wordCount);
  if (!category)               return { saved: false, reason: "unknown_category" };

  const progressRef = doc(db, "users", uid, "progress", category);
  const historyRef  = collection(db, "users", uid, "history");

  try {
    await runTransaction(db, async (transaction) => {
      const progressSnap = await transaction.get(progressRef);
      const existing = progressSnap.exists() ? progressSnap.data() : null;

      const isNewBest = !existing || wpm > existing.bestWpm;
      const currentRuns = existing?.totalRuns ?? 0;

      // Always update totalRuns; only update best fields if score improved
      transaction.set(progressRef, {
        bestWpm:      isNewBest ? wpm      : existing.bestWpm,
        bestAccuracy: isNewBest ? accuracy : existing.bestAccuracy,
        totalRuns:    currentRuns + 1,
        lastUpdated:  serverTimestamp(),
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

    return { saved: true };
  } catch (err) {
    console.error("saveTestResult failed:", err);
    return { saved: false, reason: "firestore_error" };
  }
}
```

### 5d. Hook Into Existing Test Completion

In whichever component handles test-end (likely a `TypingTest` component), call:

```js
import { saveTestResult } from "@/lib/progressService";
import { useAuth } from "@/context/AuthContext"; // adjust to your auth context path

const { user } = useAuth();

// Inside the test-completion handler:
async function handleTestComplete({ wpm, accuracy, wordCount }) {
  if (user) {
    const outcome = await saveTestResult(user.uid, {
      wpm,
      accuracy,
      wordCount,
      testCompleted: true, // only pass true when naturally finished
    });
    if (outcome.saved) {
      // optionally show "New Personal Best!" toast
    }
  }
}
```

---

## 6. Progress Page — File Structure

```
src/
  app/
    progress/
      page.js             ← Next.js route: /progress
  components/
    progress/
      ProgressDashboard.jsx   ← Parent dashboard layout
      CategoryCard.jsx        ← WPM card for one category (Short/Medium/Long)
      RecentHistory.jsx       ← Optional: last 10 runs table
      ProgressSkeleton.jsx    ← Loading skeleton
  lib/
    progressService.js    ← saveTestResult + fetchProgress (see below)
    scoreUtils.js         ← classifyTest + validation helpers
    constants.js          ← TEST_CATEGORIES
```

---

## 7. Data Fetching

```js
// Add to src/lib/progressService.js

import { getDocs, query, orderBy, limit } from "firebase/firestore";

/**
 * Fetches all three best-score documents for a user.
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

  return results; // { short: {...} | null, medium: {...} | null, long: {...} | null }
}

/**
 * Fetches the 10 most recent history entries for a user.
 */
export async function fetchRecentHistory(uid, count = 10) {
  const ref = collection(db, "users", uid, "history");
  const q   = query(ref, orderBy("timestamp", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
```

---

## 8. React Components

### 8a. `src/app/progress/page.js`

```js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProgressDashboard from "@/components/progress/ProgressDashboard";
import ProgressSkeleton  from "@/components/progress/ProgressSkeleton";
import { fetchProgress, fetchRecentHistory } from "@/lib/progressService";

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [progress, setProgress]     = useState(null);
  const [history, setHistory]       = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login"); // redirect unauthenticated users
      return;
    }

    async function load() {
      try {
        const [prog, hist] = await Promise.all([
          fetchProgress(user.uid),
          fetchRecentHistory(user.uid),
        ]);
        setProgress(prog);
        setHistory(hist);
      } catch (err) {
        setError("Failed to load progress. Please try again.");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) return <ProgressSkeleton />;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;

  return <ProgressDashboard progress={progress} history={history} />;
}
```

### 8b. `ProgressDashboard.jsx`

```jsx
import CategoryCard   from "./CategoryCard";
import RecentHistory  from "./RecentHistory";
import { TEST_CATEGORIES } from "@/lib/constants";

export default function ProgressDashboard({ progress, history }) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground mb-2">Your Progress</h1>
      <p className="text-muted-foreground mb-8">
        Personal best WPM scores across all test lengths.
      </p>

      {/* Best Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(TEST_CATEGORIES).map(([key, { label }]) => (
          <CategoryCard
            key={key}
            label={label}
            data={progress?.[key]}
          />
        ))}
      </div>

      {/* Recent History */}
      {history.length > 0 && <RecentHistory history={history} />}
    </main>
  );
}
```

### 8c. `CategoryCard.jsx`

```jsx
export default function CategoryCard({ label, data }) {
  const hasData = data && data.bestWpm > 0;

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </span>

      {hasData ? (
        <>
          <p className="text-5xl font-bold text-accent">{data.bestWpm}</p>
          <p className="text-sm text-muted-foreground">WPM — Best</p>
          <div className="mt-2 text-sm text-foreground space-y-1">
            <p>Accuracy: <span className="font-semibold">{data.bestAccuracy}%</span></p>
            <p>Tests taken: <span className="font-semibold">{data.totalRuns}</span></p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm">
          <p>No data yet.</p>
          <p className="mt-1 text-xs">Complete a {label.toLowerCase()} test to start tracking.</p>
        </div>
      )}
    </div>
  );
}
```

### 8d. `RecentHistory.jsx`

```jsx
export default function RecentHistory({ history }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-4">Recent Runs</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">WPM</th>
              <th className="px-4 py-3 text-left">Accuracy</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Words</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((run, i) => (
              <tr key={run.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-bold text-accent">{run.wpm}</td>
                <td className="px-4 py-3">{run.accuracy}%</td>
                <td className="px-4 py-3 capitalize">{run.category}</td>
                <td className="px-4 py-3">{run.wordCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {run.timestamp?.toDate
                    ? run.timestamp.toDate().toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

### 8e. `ProgressSkeleton.jsx`

```jsx
export default function ProgressSkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded mb-4" />
      <div className="h-4 w-72 bg-muted rounded mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-6 h-40" />
        ))}
      </div>
    </main>
  );
}
```

---

## 9. Navigation — Linking the Page

Add a **Progress** link to your existing navigation component (wherever the navbar/sidebar lives):

```jsx
import Link from "next/link";
// Inside your nav:
<Link href="/progress" className="hover:text-accent transition-colors">
  Progress
</Link>
```

The page should only appear in the nav when a user is logged in. Wrap the link with an auth check using your existing `useAuth` context.

---

## 10. Edge Cases & Bug-Prevention Checklist

| Scenario | Handling |
|----------|----------|
| User not logged in visits `/progress` | Redirected to `/login` via `router.push` |
| Firestore doc doesn't exist yet (new user) | `getDoc` returns `snap.exists() = false`; treated as `null`; card shows "No data yet." |
| Two simultaneous test completions (race condition) | `runTransaction` guarantees atomic read-compare-write; last-wins safety built in |
| WPM = 0 or NaN submitted | Rejected in fairness gate before Firestore write |
| Accuracy below 50% | Rejected in fairness gate; score discarded silently |
| Word count doesn't match any category | `classifyTest` returns `null`; save is skipped |
| Network error during save | `try/catch` around `runTransaction`; returns `{ saved: false, reason: "firestore_error" }` |
| Network error during fetch | `try/catch` in `useEffect`; `error` state shown to user |
| User logs out while on Progress page | Auth context update triggers re-render; redirect fires |
| Server timestamp not yet resolved (null) | `toDate()` guarded with a conditional in `RecentHistory` |

---

## 11. Implementation Sequence (Step-by-Step)

Follow this order to minimize merge conflicts and integration issues:

1. **Add constants** — Define `TEST_CATEGORIES` in `src/lib/constants.js`.
2. **Add scoreUtils** — Add `classifyTest()` and validation helpers to `src/lib/scoreUtils.js`.
3. **Add Firestore rules** — Update `firestore.rules` for `progress` and `history` sub-collections.
4. **Build progressService** — Implement `saveTestResult`, `fetchProgress`, and `fetchRecentHistory` in `src/lib/progressService.js`.
5. **Hook into test completion** — Import and call `saveTestResult` from the existing typing test component.
6. **Build components** — Create `ProgressSkeleton`, `CategoryCard`, `RecentHistory`, then `ProgressDashboard`.
7. **Build the page** — Create `src/app/progress/page.js` with auth guard and data fetching.
8. **Wire navigation** — Add the `/progress` link to the nav, gated behind `user` auth state.
9. **Test all edge cases** — Verify all scenarios from the checklist in Section 10 manually.
10. **PR and merge** — Open pull request from `progressPage` into `main` with a summary of all changes.

---

## 12. Optional Future Enhancements

These are out of scope for this branch but worth noting for later:

- **WPM Trend Chart** — Plot the last 30 runs per category using a line chart (Recharts is already in the project).
- **Accuracy Trend** — Separate accuracy tracking over time alongside WPM.
- **Personal Bests Timeline** — Show when each personal best was set, not just the score.
- **Badge/Achievement System** — Unlock icons at WPM milestones (e.g., 50, 75, 100 WPM).
- **Comparative Stats** — Compare user's best against site-wide average (requires aggregate cloud function).
- **Reset Progress** — A user-initiated reset button with a confirmation dialog, which clears `progress/` sub-collection documents.

---

*Last updated: February 2026 — EVO-Megabytes / progressPage branch*