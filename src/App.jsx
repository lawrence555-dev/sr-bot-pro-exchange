import React, { useState, useEffect } from 'react';
import { Zap, Landmark, RefreshCw, Loader2, Info, Globe, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import TrendChart from './components/TrendChart';

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
        } catch (err) {
            console.error('Fetch error:', err);
            setError(forceScrape ? `同步失敗: ${err.message}` : '自動更新失敗，顯示為快照或預設匯率數據');
        } finally {
            if (!loading) { // Avoid overlapping state updates from recursion
                setTimeout(() => setLoading(false), forceScrape ? 1000 : 500);
            }
        }
    };

    useEffect(() => {
        updateRates();
    }, []);

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
        <div className="w-full max-w-[440px] mx-auto bg-[#08090C] text-white font-['Outfit'] antialiased">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
            </div>

            {/* First Viewport Height Section */}
            <div className="min-h-[100dvh] flex flex-col p-6 pb-2">
                {/* Header */}
                <header className="relative z-10 flex justify-between items-center mb-6 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-transform hover:scale-105 active:scale-95 duration-300">
                            <Wallet className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">SR-BOT 匯率分析</h1>
                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-[0.2em]">
                                即時引擎: {lastUpdated}
                                {error && <span className="text-amber-500 ml-2 animate-pulse">(!Sync Failed)</span>}
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
                            <RefreshCw className="w-5 h-5 text-emerald-400 hover:rotate-180 transition-transform duration-500" />
                        )}
                    </button>
                </header>

                {error && (
                    <div className="relative z-10 mb-6 p-4 glass-morphic border-amber-500/30 rounded-2xl text-amber-400 text-xs font-bold flex items-center gap-3 animate-shake">
                        <Info className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="relative z-10 flex-grow flex flex-col justify-between">
                    <div className="space-y-6">
                        {/* Budget input with pulse effect */}
                        <div className="glass-morphic p-7 rounded-[2rem] border-emerald-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-emerald-500/40">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                <label className="text-[11px] font-black uppercase tracking-widest text-emerald-400/80">台幣換匯預算 (TWD)</label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    value={twdAmount}
                                    onChange={(e) => setTwdAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    onBlur={() => twdAmount === '' && setTwdAmount(50000)}
                                    className="text-6xl font-black bg-transparent border-none focus:outline-none text-white w-full tracking-tighter selection:bg-emerald-500/30"
                                    placeholder="0"
                                />
                                <span className="text-emerald-500 font-black text-2xl ml-2">TWD</span>
                            </div>
                        </div>

                        {/* AI Analysis Result */}
                        <div className={`relative overflow-hidden p-7 rounded-[2rem] border transition-all duration-700 shadow-2xl glass-morphic ${results.isAWinner ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-blue-500/40 bg-blue-500/5'}`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full ${results.isAWinner ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className={`w-4 h-4 ${results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}`} />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-80">AI 換匯策略建議</span>
                                </div>

                                <h2 className={`text-4xl font-black tracking-tight mb-4 ${results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {results.isAWinner ? '台幣直換' : '美金中轉'}
                                    <span className="text-white ml-2 text-xl italic font-light">BEST RATE</span>
                                </h2>

                                <div className="py-4 border-y border-white/5 space-y-1">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest opacity-60">預估換得總額 (THB)</p>
                                    <p className="text-5xl font-black text-white italic tracking-tighter">
                                        ฿ {loading && results.totalA === 0 ? '...' : (results.isAWinner ? results.totalA : results.totalB).toLocaleString()}
                                    </p>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${results.isAWinner ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">台幣直換</p>
                                        <p className={`text-xl font-black ${results.isAWinner ? 'text-emerald-400' : 'text-slate-400'}`}>฿ {loading && results.totalA === 0 ? '...' : results.totalA.toLocaleString()}</p>
                                    </div>
                                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${!results.isAWinner ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">美金中轉</p>
                                        <p className={`text-xl font-black ${!results.isAWinner ? 'text-blue-400' : 'text-slate-400'}`}>฿ {loading && results.totalB === 0 ? '...' : results.totalB.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-6 p-5 glass-morphic rounded-2xl border-white/5 flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${results.isAWinner ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                                        <TrendingUp className={`w-4 h-4 ${results.isAWinner ? 'text-emerald-400' : 'text-blue-400'}`} />
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed font-bold">
                                        {results.isAWinner
                                            ? `目前台幣直換最具優勢！您可以多換得 ฿ ${results.diff.toLocaleString()}。推薦前往 SuperRich 總部兌換。`
                                            : `美金中轉展現強大優勢！先在台銀換取 $100 美金再到泰國總部，可多領 ฿ ${results.diff.toLocaleString()}。`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trends Divider - Pushed to the very bottom of the first fold */}
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-grow bg-white/10"></div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">市場匯率動態分析</span>
                            <div className="h-px flex-grow bg-white/10"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content (Trends + Links) */}
            <div className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    <TrendChart data={historyTwd} color="#10B981" label="SuperRich 台幣基準趨勢" />
                    <TrendChart data={historyUsd} color="#3B82F6" label="SuperRich 美金基準趨勢" />
                </div>

                {/* External Links */}
                <div className="flex gap-3">
                    <button onClick={() => window.open('https://www.superrichthailand.com/#!/en/exchange', '_blank')} className="flex-1 glass-morphic p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
                        <Globe className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">SuperRich 官網</span>
                    </button>
                    <button onClick={() => window.open('https://rate.bot.com.tw/xrt?Lang=zh-TW', '_blank')} className="flex-1 glass-morphic p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
                        <Landmark className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">台銀牌告匯率</span>
                    </button>
                </div>

                <footer className="mt-12 text-center pb-8 opacity-40">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Antigravity 頂級匯率分析系統 • v2.1</p>
                </footer>
            </div>

            <style>{`
                .glass-morphic {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}

export default App;
