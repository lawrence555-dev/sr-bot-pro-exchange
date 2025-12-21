import React, { useState, useEffect } from 'react';
import { Zap, Landmark, RefreshCw, Loader2, Info, Globe } from 'lucide-react';

function App() {
    const [twdAmount, setTwdAmount] = useState(50000);
    // Use verified rates as initial state
    const [rateTwd, setRateTwd] = useState(0.995);
    const [rateUsdSell, setRateUsdSell] = useState(31.8);
    const [rateUsdBuy, setRateUsdBuy] = useState(31.36);
    const [lastUpdated, setLastUpdated] = useState('2025/12/20 16:40');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [results, setResults] = useState({
        totalA: 0,
        totalB: 0,
        diff: 0,
        isAWinner: true
    });

    const updateRates = async (forceScrape = false) => {
        setLoading(true);
        setError(null);
        try {
            if (forceScrape) {
                // Trigger the actual scraping process (takes ~15s)
                const scrapeRes = await fetch('/api/scrape');
                if (!scrapeRes.ok) {
                    const errData = await scrapeRes.json().catch(() => ({}));
                    throw new Error(errData.stderr || errData.details || '即時抓取服務異常');
                }
            }

            // Fetch the rates.json which is updated by the background scraper
            const response = await fetch('/api/rates?t=' + Date.now());
            if (!response.ok) throw new Error('無法讀取匯率資料庫');
            const newData = await response.json();

            if (newData.botUsd && newData.srTwd && newData.srUsd) {
                setRateUsdSell(newData.botUsd);
                setRateTwd(newData.srTwd);
                setRateUsdBuy(newData.srUsd);
                setLastUpdated(newData.lastUpdated);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(forceScrape ? `同步失敗: ${err.message}` : '自動更新失敗，顯示為快照或預設匯率數據');
        } finally {
            // If it was a force scrape, we want a small extra delay for the file system to catch up
            setTimeout(() => setLoading(false), forceScrape ? 1000 : 500);
        }
    };

    // Auto-fetch on mount
    useEffect(() => {
        updateRates();
    }, []);

    useEffect(() => {
        const totalA = Math.floor(twdAmount * rateTwd);
        const usdInBot = Math.floor(twdAmount / rateUsdSell);
        const totalB = Math.floor(usdInBot * rateUsdBuy);
        const diff = Math.abs(totalA - totalB);
        const isAWinner = totalA >= totalB;

        setResults({ totalA, totalB, diff, isAWinner });
    }, [twdAmount, rateTwd, rateUsdSell, rateUsdBuy]);

    return (
        <div className="w-full max-w-[414px] mx-auto min-h-screen flex flex-col p-5 lg:p-6 bg-[#0B0D11]">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 pt-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Zap className="text-white w-5 h-5 fill-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-white">換匯分析</h1>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest opacity-80">最後更新: {lastUpdated}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.open('https://www.superrichthailand.com/#!/en/exchange', '_blank')} className="btn-sync group">
                        <Globe className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                    </button>
                    <button onClick={() => window.open('https://rate.bot.com.tw/xrt?Lang=zh-TW', '_blank')} className="btn-sync group">
                        <Landmark className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    </button>
                    <button
                        onClick={() => updateRates(true)}
                        className={`btn-sync group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                        )}
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-[10px] font-bold flex items-center gap-3">
                    <Info className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="space-y-5">
                {/* Budget Card */}
                <div className="data-card bg-emerald-500/5 border-emerald-500/20 p-6 rounded-3xl">
                    <label className="label-text text-emerald-500 text-xs mb-2 block">台幣預算 (TWD)</label>
                    <div className="flex items-baseline">
                        <input
                            type="number"
                            value={twdAmount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') setTwdAmount('');
                                else setTwdAmount(parseFloat(val));
                            }}
                            onBlur={(e) => {
                                if (e.target.value === '') setTwdAmount(50000);
                            }}
                            className="text-5xl font-black bg-transparent border-none focus:outline-none text-white w-full pr-2"
                        />
                        <span className="text-emerald-500 font-black text-2xl">TWD</span>
                    </div>
                </div>

                {/* Result Card */}
                <div className={`result-card border p-6 rounded-3xl transition-all duration-500 ${results.isAWinner ? 'border-emerald-500/30' : 'border-blue-500/30'}`}>
                    <div className="flex flex-col gap-4 mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">AI 最佳策略建議</p>
                            <h2 className="text-3xl font-black italic tracking-tight" style={{ color: results.isAWinner ? '#10B981' : '#3B82F6' }}>
                                {results.isAWinner ? '建議：台幣直換' : '建議：美金中轉'}
                            </h2>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-60">預估領取總額</p>
                            <p className="text-4xl font-black text-white italic tracking-tighter">฿ {(results.isAWinner ? results.totalA : results.totalB).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border transition-colors ${results.isAWinner ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">A: 台幣直換</p>
                            <p className={`text-lg font-black ${results.isAWinner ? 'text-emerald-400' : 'text-white'}`}>฿ {results.totalA.toLocaleString()}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border transition-colors ${!results.isAWinner ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">B: 美金中轉</p>
                            <p className={`text-lg font-black ${!results.isAWinner ? 'text-blue-400' : 'text-white'}`}>฿ {results.totalB.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-2.5 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <Info className="w-5 h-5 text-slate-500 mt-0.5" />
                        <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                            {results.isAWinner
                                ? `目前總部台幣匯率強勁！直接兌換可多領 ฿ ${results.diff.toLocaleString()}。推薦直接前往 SuperRich。`
                                : `美金優勢顯著！建議前往台銀換取 $100 面額美金，到泰國總部後可多換 ฿ ${results.diff.toLocaleString()}。`
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 py-2">
                    <div className="h-px flex-grow bg-slate-800/50"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">匯率設定</span>
                    <div className="h-px flex-grow bg-slate-800/50"></div>
                </div>

                {/* Input Cards Stack */}
                <div className="grid grid-cols-1 gap-4 pb-12">
                    <div className="data-card p-5">
                        <div className="flex justify-between items-center mb-2">
                            <label className="label-text text-xs">台銀現鈔賣出 (USD)</label>
                            <span className="badge bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold">BOT Rate</span>
                        </div>
                        <input
                            type="number"
                            value={rateUsdSell}
                            step="0.001"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') setRateUsdSell('');
                                else setRateUsdSell(parseFloat(val));
                            }}
                            className="text-2xl font-bold bg-transparent border-none text-white focus:outline-none"
                        />
                    </div>

                    <div className="data-card p-5">
                        <div className="flex justify-between items-center mb-2">
                            <label className="label-text text-xs">總部台幣買入 (TWD/THB)</label>
                            <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">SR TWD</span>
                        </div>
                        <input
                            type="number"
                            value={rateTwd}
                            step="0.001"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') setRateTwd('');
                                else setRateTwd(parseFloat(val));
                            }}
                            className="text-2xl font-bold bg-transparent border-none text-white focus:outline-none"
                        />
                    </div>

                    <div className="data-card p-5">
                        <div className="flex justify-between items-center mb-2">
                            <label className="label-text text-xs">總部美金買入 (USD/THB)</label>
                            <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">SR USD</span>
                        </div>
                        <input
                            type="number"
                            value={rateUsdBuy}
                            step="0.01"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') setRateUsdBuy('');
                                else setRateUsdBuy(parseFloat(val));
                            }}
                            className="text-2xl font-bold bg-transparent border-none text-white focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
