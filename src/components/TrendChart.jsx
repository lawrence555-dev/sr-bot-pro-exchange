import React from 'react';

const TrendChart = ({ data, color = '#10B981', label = '匯率趨勢' }) => {
    if (!data || data.length < 2) return null;

    const padding = 10;
    const width = 300;
    const height = 60;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - ((d.value - min) / range * (height - 2 * padding) + padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-bold text-slate-300">{(data[data.length - 1].value).toFixed(3)}</span>
            </div>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <defs>
                    <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M ${points.split(' ')[0]} L ${points} V ${height} H ${padding} Z`}
                    fill={`url(#gradient-${label})`}
                />
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                />
            </svg>
        </div>
    );
};

export default TrendChart;
