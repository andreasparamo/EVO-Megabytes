"use client";

/**
 * CategoryCard — Displays the best WPM for a single test category (Short / Medium / Long).
 * Shows a premium card with the WPM score, accuracy, and total runs.
 * Falls back to an empty-state prompt when no data exists.
 */
export default function CategoryCard({ label, data }) {
    const hasData = data && data.bestWpm > 0;

    return (
        <div className="progress-card">
            <div className="progress-card__header">
                <span className="progress-card__label">{label}</span>
            </div>

            {hasData ? (
                <>
                    <p className="progress-card__wpm">{Math.round(data.bestWpm)}</p>
                    <p className="progress-card__wpm-label">WPM Best</p>

                    <div className="progress-card__stats">
                        <span className="progress-card__stats-heading">Overall</span>
                        <div className="progress-card__stat">
                            <span className="progress-card__stat-label">Accuracy</span>
                            <span className="progress-card__stat-value">{Math.round(data.bestAccuracy)}%</span>
                        </div>
                        <div className="progress-card__stat">
                            <span className="progress-card__stat-label">Tests taken</span>
                            <span className="progress-card__stat-value">{data.totalRuns}</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="progress-card__empty">
                    <p className="progress-card__empty-msg">No data yet</p>
                    <p className="progress-card__empty-hint">
                        Complete a {label.toLowerCase()} test to start tracking.
                    </p>
                </div>
            )}
        </div>
    );
}
