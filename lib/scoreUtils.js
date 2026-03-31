// lib/scoreUtils.js
// Utility for classifying a test result into a category based on word count.

import { TEST_CATEGORIES } from "./constants";

/**
 * Returns the category key ("short" | "medium" | "long") for a given word count,
 * or null if the count doesn't match any category.
 */
export function classifyTest(wordCount) {
    for (const [key, { minWords, maxWords }] of Object.entries(TEST_CATEGORIES)) {
        if (wordCount >= minWords && wordCount <= maxWords) return key;
    }
    return null; // unknown length — do not save
}
