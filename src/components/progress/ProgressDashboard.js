"use client";

import CategoryCard from "./CategoryCard";
import { TEST_CATEGORIES } from "@/lib/constants";

/**
 * ProgressDashboard — Lays out the three best-WPM category cards.
 * Pure presentational component — data is passed in via props.
 */
export default function ProgressDashboard({ progress }) {
    return (
        <div className="progress-container">
            <div className="progress-header">
                <h1>Your Progress</h1>
                <p>Personal best WPM scores across all test lengths.</p>
            </div>

            <div className="progress-grid">
                {Object.entries(TEST_CATEGORIES).map(([key, { label }]) => (
                    <CategoryCard
                        key={key}
                        label={label}
                        data={progress?.[key]}
                    />
                ))}
            </div>
        </div>
    );
}
