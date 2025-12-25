# SR-BOT Pro Exchange v2.0 (換匯分析) 🚀

![Premium Dashboard](./docs/images/dashboard_v2.png)

這是一個專為 iPhone 17 Pro 與現代網頁設計優化的泰銖換匯分析工具。v2.0 帶來了全新的 **Premium Glassmorphism** 視覺語彙與 **趨勢分析圖表**。

## ✨ v2.0 核心更新

- **💎 Premium Glassmorphism UI**：全新的毛玻璃設計語彙，具備高品質的背景模糊、光澤邊框與流暢的動態效果。
- **📊 歷史趨勢圖表**：新增 SVG Sparkline 圖表，即時視覺化台幣與美金基準匯率的波動趨勢。
- **🛡️ 爬蟲穩定性強化**：
    - **重試機制**：自動處理 Playwright 抓取時的偶發性網路問題。
    - **歷史記錄**：自動記錄匯率變動至 `history.json`。
- **🎨 精緻排版**：全面改用 **Outfit** 字體，並優化了視覺階層與資訊展示。

## 🛠️ 技術架構

- **Frontend**: React, Vite, Tailwind CSS, SVG Charts
- **Backend**: Node.js, Express (生產環境伺服器)
- **Scraping**: Playwright (具備自動重試與歷史存檔功能)
- **UI System**: Premium Glassmorphic Design

## 🌐 雲端部署 (以 Render 為例)

本專案已針對 Render **Web Service** 進行優化：

- **Service Type**: Web Service
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

> [!NOTE]
> 部署時建議使用 Node 20+ 環境。

## 🚀 如何本地運行

### 1. 安裝環境
```bash
git clone https://github.com/lawrence555-dev/sr-bot-pro-exchange.git
cd sr-bot-pro-exchange
npm install
npx playwright install chromium
```

### 2. 開發模式 (Vite)
```bash
npm run dev
```

### 3. 生產模式模擬 (Express)
```bash
npm run build
npm start
```

## 📁 專案結構

- `src/App.jsx`: 前端核心邏輯與 Glassmorphic UI。
- `src/components/TrendChart.jsx`: SVG 趨勢圖表組件。
- `server.js`: Express 伺服器，支援伺服即時匯率與歷史數據。
- `scripts/scraper.js`: 增強型爬蟲，支援歷史記錄與失敗重試。
- `src/data/`: 存儲 `rates.json` (現行) 與 `history.json` (歷史)。

---
*Developed by Lawrence & Antigravity - Optimized for Premium Experience*
