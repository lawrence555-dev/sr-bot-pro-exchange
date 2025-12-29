import React, { useState, useEffect } from 'react';
import { Zap, Landmark, RefreshCw, Loader2, Info, Globe, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import InteractiveChart from './components/InteractiveChart';

function App() {
    const [twdAmount, setTwdAmount] = useState(50000);
    const [rateTwd, setRateTwd] = useState(0.995);
    const [rateUsdSell, setRateUsdSell] = useState(31.8);
    const [rateUsdBuy, setRateUsdBuy] = useState(31.36);
    const [lastUpdated, setLastUpdated] = useState('...');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const [results, setResults] = useState({
        totalA: 0,
        totalB: 0,
        diff: 0,
        isAWinner: true
    });

    const updateRates = async (forceScrape = false) => {
        setLoading(true);
        setLoading(true);
        // setError(null); // Keep previous error until success
        try {
            if (forceScrape) {
                const scrapeRes = await fetch('/api/scrape');
                if (!scrapeRes.ok) {
                    const errData = await scrapeRes.json().catch(() => ({}));
                    throw new Error(errData.stderr || errData.details || '即時抓取服務異常');
                }
            }

            const [ratesRes, historyRes] = await Promise.all([
                fetch('/api/rates?t=' + Date.now()),
                fetch('/api/history?t=' + Date.now())
            ]);

            let validData = false;
            if (ratesRes.ok) {
                const newData = await ratesRes.json();
                // Validate that we have actual numbers and they are valid (greater than 0)
                if (typeof newData.botUsd === 'number' && typeof newData.srTwd === 'number' && typeof newData.srUsd === 'number') {
                    if (newData.srTwd > 0 && newData.srUsd > 0) {
                        setRateUsdSell(newData.botUsd);
                        setRateTwd(newData.srTwd);
                        setRateUsdBuy(newData.srUsd);
                        setLastUpdated(newData.lastUpdated);
                        setError(null); // Clear error only on success
                        validData = true;
                    } else {
                        const errMsg = '抓取數據異常 (Retrieved 0)';
                        console.warn(errMsg);
                        setError(errMsg);
                    }
                }
            }

            // If data is invalid and it's our first try, auto-trigger a scrape
            if (!validData && !forceScrape) {
                console.log('Detected invalid/missing data on startup, triggering auto-sync...');
                return await updateRates(true);
            }

            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData);
            }
            if (!loading) { // Avoid overlapping state updates from recursion
                setTimeout(() => setLoading(false), forceScrape ? 1000 : 500);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(forceScrape ? `同步失敗: ${err.message}` : '自動更新失敗，顯示為快照或預設匯率數據');
        } finally {
            if (!loading) { // Avoid overlapping state updates from recursion
                setTimeout(() => setLoading(false), forceScrape ? 1000 : 500);
            }
        }
    };

    const [viewMode, setViewMode] = useState('rates'); // 'rates' | 'chart'

    useEffect(() => {
        updateRates();
    }, []);

    const handleSwipe = (direction) => {
        if (direction === 'left' && viewMode === 'rates') setViewMode('chart');
        if (direction === 'right' && viewMode === 'chart') setViewMode('rates');
    };

    // Simple swipe detection logic
    let touchStart = 0;
    const onTouchStart = (e) => (touchStart = e.targetTouches[0].clientX);
    const onTouchEnd = (e) => {
        const touchEnd = e.changedTouches[0].clientX;
        if (touchStart - touchEnd > 50) handleSwipe('left');
        if (touchStart - touchEnd < -50) handleSwipe('right');
    };

    useEffect(() => {
        // Safe calculations with fallback to prevent NaN
        const amt = Number(twdAmount) || 0;
        const rTwd = Number(rateTwd) || 0;
        const rUsdSell = Number(rateUsdSell) || 31.8;
        const rUsdBuy = Number(rateUsdBuy) || 31.36;

        const totalA = Math.floor(amt * rTwd);
        const usdInBot = rUsdSell > 0 ? Math.floor(amt / rUsdSell) : 0;
        const totalB = Math.floor(usdInBot * rUsdBuy);
        const diff = Math.abs(totalA - totalB);
        const isAWinner = totalA >= totalB;

        setResults({ totalA, totalB, diff, isAWinner });
    }, [twdAmount, rateTwd, rateUsdSell, rateUsdBuy]);

    const historyTwd = history.map(h => ({ time: h.time, value: h.srTwd }));
    const historyUsd = history.map(h => ({ time: h.time, value: h.srUsd }));

    return (
        <div className="w-full max-w-[440px] mx-auto bg-[#08090C] text-white font-['Outfit'] antialiased overflow-x-hidden">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="min-h-[100dvh] flex flex-col p-6 pb-2">
                {/* Header */}
                <header className="relative z-10 flex justify-between items-center mb-6 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-transform hover:scale-105 active:scale-95 duration-300">
                            <Wallet className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">SR-BOT PRO</h1>
                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-[0.2em]">
                                {viewMode === 'rates' ? '即時換匯分析' : '30 天趨勢監測'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => updateRates(true)}
                        className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5 text-emerald-400" />
                        )}
                    </button>
                </header>

                <div className="relative z-10 flex-grow flex flex-col gap-6">
                    {/* Input Block (Always visible or pinned) */}
                    <div className="glass-morphic p-7 rounded-[2rem] border-emerald-500/20 shadow-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <label className="text-[11px] font-black uppercase tracking-widest text-emerald-400/80">台幣換匯預算</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="number"
                                value={twdAmount}
                                onChange={(e) => setTwdAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="text-5xl font-black bg-transparent border-none focus:outline-none text-white w-full tracking-tighter"
                                placeholder="0"
                            />
                            <span className="text-emerald-500 font-black text-xl ml-2">TWD</span>
                        </div>
                    </div>

                    {/* Carousel Area */}
                    <div
                        className="relative min-h-[440px] touch-pan-y"
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                    >
                        {/* Pagination Dots */}
                        <div className="flex justify-center gap-2 mb-4">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${viewMode === 'rates' ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/20'}`}></div>
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${viewMode === 'chart' ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/20'}`}></div>
                        </div>

                        <div className="relative w-full h-full overflow-hidden">
                            {/* Card A: Recommendations */}
                            <div className={`absolute inset-0 transition-all duration-500 transform ${viewMode === 'rates' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
                                <div className={`relative overflow-hidden p-7 h-full rounded-[2rem] border transition-all duration-700 shadow-2xl glass-morphic ${results.isAWinner ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-blue-500/40 bg-blue-500/5'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className={`w-4 h-4 ${results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}`} />
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">AI 策略建議</span>
                                    </div>
                                    <h2 className={`text-4xl font-black tracking-tight mb-4 ${results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}`}>
                                        {results.isAWinner ? '台幣直換' : '美金中轉'}
                                    </h2>
                                    <div className="py-6 border-y border-white/5 space-y-1">
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest opacity-60">預估換得總額 (THB)</p>
                                        <p className="text-5xl font-black text-white italic tracking-tighter">
                                            ฿ {(results.isAWinner ? results.totalA : results.totalB).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <div className="flex justify-between items-center text-sm font-bold bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="text-slate-500 uppercase italic">Profit Margin</span>
                                            <span className={results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}>
                                                {results.isAWinner ? 'HIGH EFFICIENCY' : 'SMART SAVING'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium text-center italic opacity-60">
                                            Swipe Left to see 30-Day Trend →
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card B: Interactive Chart */}
                            <div className={`absolute inset-0 transition-all duration-500 transform ${viewMode === 'chart' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                                <div className="glass-morphic p-6 h-full rounded-[2rem] border-blue-500/20 shadow-2xl flex flex-col">
                                    <div className="flex items-center gap-2 mb-6">
                                        <TrendingUp className="w-4 h-4 text-blue-400" />
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">30 天匯率趨勢分析</span>
                                    </div>
                                    <div className="flex-grow flex items-center justify-center">
                                        {history.length > 0 ? (
                                            <InteractiveChart data={history} />
                                        ) : (
                                            <div className="text-slate-500 text-xs animate-pulse font-bold tracking-tighter">分析中...</div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium text-center italic opacity-60 mt-4">
                                        ← Swipe Right to see Live Strategy
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Info / Links */}
                <div className="mt-8 space-y-6 pb-8">
                    <div className="flex gap-3">
                        <button onClick={() => window.open('https://www.superrichthailand.com', '_blank')} className="flex-1 glass-morphic p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group">
                            <Globe className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase text-slate-500">SuperRich</span>
                        </button>
                        <button onClick={() => window.open('https://rate.bot.com.tw', '_blank')} className="flex-1 glass-morphic p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group">
                            <Landmark className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase text-slate-500">BOT Bank</span>
                        </button>
                    </div>
                    <footer className="text-center opacity-30">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Antigravity Pro • v2.1 • {lastUpdated}</p>
                    </footer>
                </div>
            </div>

            <style>{`
                .glass-morphic {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                }
                @font-face {
                    font-family: 'Outfit';
                    src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;400;700;900&display=swap');
                }
            `}</style>
        </div>
    );
}

export default App;
