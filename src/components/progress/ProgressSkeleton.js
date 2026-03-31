"use client";

/**
 * ProgressSkeleton — Animated loading skeleton for the progress page.
 * Mirrors the layout of ProgressDashboard so the transition feels seamless.
 */
export default function ProgressSkeleton() {
    return (
        <div className="progress-container">
            <div className="progress-header">
                <div className="skeleton-bar skeleton-bar--title" />
                <div className="skeleton-bar skeleton-bar--subtitle" />
            </div>

            <div className="progress-grid">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="progress-card progress-card--skeleton">
                        <div className="skeleton-bar skeleton-bar--icon" />
                        <div className="skeleton-bar skeleton-bar--wpm" />
                        <div className="skeleton-bar skeleton-bar--label" />
                        <div className="skeleton-bar skeleton-bar--stat" />
                        <div className="skeleton-bar skeleton-bar--stat" />
                    </div>
                ))}
            </div>
        </div>
    );
}
