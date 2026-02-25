// lib/constants.js
// Shared test category definitions — used by both scoring and display logic.
// Boundaries are aligned with the MODES in src/app/tests/page.js:
//   Short = 10 words, Medium = 25 words, Long = 50 words

export const TEST_CATEGORIES = {
    short: { label: "Short", minWords: 1, maxWords: 15 },
    medium: { label: "Medium", minWords: 16, maxWords: 40 },
    long: { label: "Long", minWords: 41, maxWords: Infinity },
};
