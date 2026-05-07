import React, { useEffect, useRef } from 'react';

const SPACING  = 28;
const BASE_R   = 1;
const WAVE_R   = 1.2;
const AMPLITUDE = 5;

export default function WaveBackground({ darkMode }) {
    const canvasRef = useRef(null);
    const rafRef    = useRef(null);
    const timeRef   = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize, { passive: true });

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const t    = timeRef.current;
            const cols = Math.ceil(canvas.width  / SPACING) + 2;
            const rows = Math.ceil(canvas.height / SPACING) + 2;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = col * SPACING;
                    const y = row * SPACING;

                    // Diagonal wave — sweeps top-left → bottom-right
                    const wave = Math.sin(col * 0.35 + row * 0.15 - t * 1.4);

                    const yDisplace = AMPLITUDE * wave;
                    const radius    = BASE_R + WAVE_R * 0.6 * (wave + 1) / 2;
                    const alpha     = darkMode
                        ? 0.22 + 0.28 * (wave + 1) / 2
                        : 0.10 + 0.14 * (wave + 1) / 2;

                    ctx.beginPath();
                    ctx.arc(x, y + yDisplace, radius, 0, Math.PI * 2);
                    ctx.fillStyle = darkMode
                        ? `rgba(79,126,255,${alpha.toFixed(3)})`
                        : `rgba(44,62,80,${alpha.toFixed(3)})`;
                    ctx.fill();
                }
            }

            timeRef.current += 0.018;
            rafRef.current = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [darkMode]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
