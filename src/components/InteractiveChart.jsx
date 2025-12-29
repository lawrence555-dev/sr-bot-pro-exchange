import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
                <p className="text-slate-400 text-[10px] mb-1 font-mono uppercase tracking-widest">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-bold">
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-300 min-w-[60px]">{entry.name}</span>
                            <span className="font-mono" style={{ color: entry.color }}>
                                {Number(entry.value).toFixed(3)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const InteractiveChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Process data for the chart
    // Assumes input data array has: { dateStr, srTwd, botUsd, srUsd }
    // Calculate cross rate for each
    const chartData = data.map(item => {
        // Direct: TW -> TH (srTwd)
        // Cross: TW -> USD (botUsd) -> TH (srUsd) = srUsd / botUsd
        const crossRate = item.botUsd > 0 ? (item.srUsd / item.botUsd) : 0;
        return {
            date: item.dateStr.slice(5).replace('-', '/'), // MM/DD
            direct: item.srTwd,
            cross: crossRate,
            fullDate: item.dateStr
        };
    }).reverse(); // Ensure chronological order (oldest to newest)

    return (
        <div className="w-full h-[240px] select-none">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <CartesianGrid
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                        strokeDasharray="3 3"
                    />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        isAnimationActive={false} // Performance
                    />
                    <Line
                        type="monotone"
                        dataKey="direct"
                        name="Direct (TWD)"
                        stroke="#10B981" // emerald-500
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#10B981' }}
                        animationDuration={1000}
                    />
                    <Line
                        type="monotone" // or step
                        dataKey="cross"
                        name="Cross (USD)"
                        stroke="#3B82F6" // blue-500
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#3B82F6' }}
                        animationDuration={1000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InteractiveChart;
