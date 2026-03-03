"use client";
import { useEffect, useRef } from "react";

/**
 * Confetti — A burst of confetti particles, svelte-confetti style.
 * Pure canvas-based, no dependencies. Fires once when `active` becomes true.
 */
export default function Confetti({ active }) {
    const canvasRef = useRef(null);
    const firedRef = useRef(false);

    useEffect(() => {
        if (!active || firedRef.current) return;
        firedRef.current = true;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        function resize() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + "px";
            canvas.style.height = window.innerHeight + "px";
            ctx.scale(dpr, dpr);
        }
        resize();

        const PARTICLE_COUNT = 150;
        const COLORS = [
            "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff",
            "#ff6ec7", "#a855f7", "#f97316", "#06d6a0",
            "#e0aaff", "#00cec9",
        ];
        const SHAPES = ["square", "circle", "strip"];

        const particles = [];
        const W = window.innerWidth;
        const H = window.innerHeight;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            particles.push({
                x: W / 2 + (Math.random() - 0.5) * W * 0.4,
                y: H * 0.35 + (Math.random() - 0.5) * H * 0.2,
                vx: Math.cos(angle) * speed * (0.6 + Math.random()),
                vy: Math.sin(angle) * speed * (0.6 + Math.random()) - 4,
                size: 4 + Math.random() * 6,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                gravity: 0.12 + Math.random() * 0.08,
                drag: 0.97 + Math.random() * 0.02,
                opacity: 1,
                fadeStart: 1200 + Math.random() * 800, // ms before fading
            });
        }

        let start = null;
        let rafId;

        function frame(ts) {
            if (!start) start = ts;
            const elapsed = ts - start;

            ctx.clearRect(0, 0, W, H);

            let alive = false;

            for (const p of particles) {
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;

                if (elapsed > p.fadeStart) {
                    p.opacity = Math.max(0, p.opacity - 0.02);
                }

                if (p.opacity <= 0) continue;
                alive = true;

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;

                if (p.shape === "square") {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                } else if (p.shape === "circle") {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // strip / rectangle
                    ctx.fillRect(-p.size / 2, -p.size * 1.5 / 2, p.size, p.size * 1.5);
                }

                ctx.restore();
            }

            if (alive && elapsed < 3500) {
                rafId = requestAnimationFrame(frame);
            } else {
                ctx.clearRect(0, 0, W, H);
            }
        }

        rafId = requestAnimationFrame(frame);

        return () => cancelAnimationFrame(rafId);
    }, [active]);

    // Reset the fired flag when active goes back to false
    useEffect(() => {
        if (!active) firedRef.current = false;
    }, [active]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                pointerEvents: "none",
            }}
        />
    );
}
