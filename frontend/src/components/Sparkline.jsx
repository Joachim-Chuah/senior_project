import React from 'react';

export default function Sparkline({ prices, width = 80, height = 32, positive }) {
    if (!prices || prices.length < 2) return <div style={{ width, height }} />;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pad = 2;

    const pts = prices.map((p, i) => {
        const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (p - min) / range) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const color = positive ? '#22c55e' : '#ef4444';
    const fillId = `fill-${positive ? 'up' : 'dn'}-${width}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Fill area */}
            <polygon
                points={`${pad},${height} ${pts} ${width - pad},${height}`}
                fill={`url(#${fillId})`}
            />
            {/* Line */}
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}
