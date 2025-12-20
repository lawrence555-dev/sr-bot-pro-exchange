# SR-BOT Pro Exchange (換匯分析) 🚀

![Dashboard View](./docs/images/dashboard.png)

這是一個專為 iPhone 17 Pro 螢幕優化的泰銖換匯分析工具。它能即時抓取 **台灣銀行 (BOT)** 與 **SuperRich Thailand** 的匯率，並自動計算「台幣直換」與「美金中轉」哪種方式最划算。

## ✨ 核心功能

- **📱 iPhone 17 Pro 優化**：完美支援 402x874 邏輯解析度，具備高質感的深色模式與流暢動態效果。
- **🔄 Live Sync 即時同步**：內建伺服器端爬蟲 (Playwright)，點擊同步按鈕即可獲取當下最精確的官網匯率。
- **🤖 AI 最佳策略建議**：自動對比匯率差額，直接告訴您在哪裡換錢能換到最多泰銖。
- **🔗 一鍵跳轉**：快速存取台銀與 SuperRich 官網匯率頁面。

## 🛠️ 技術架構

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Backend Scraping**: Node.js, Playwright (自動繞過 CORS 與 401 驗證)
- **Design**: Premium Dark Mode UI

## 🚀 如何快速啟動

### 1. 安裝環境
確保您的電腦已安裝 Node.js，然後克隆專案並安裝依賴：

```bash
git clone https://github.com/lawrence555-dev/sr-bot-pro-exchange.git
cd sr-bot-pro-exchange
npm install
```

### 2. 啟動開發伺服器
```bash
npm run dev
```
啟動後打開瀏覽器訪問 `http://localhost:5173`。

### 3. 即時抓取匯率
在網頁右上角點擊 **「同步 (Refresh)」** 圖標，程式會啟動背景爬蟲抓取最新數據（約需 15 秒）。

## 📁 專案結構

- `src/App.jsx`: 主要 UI 邏輯與匯率計算。
- `scripts/scraper.js`: 負責抓取台銀與 SuperRich 的獨立爬蟲選單。
- `src/data/rates.json`: 匯率數據快照。
- `vite.config.js`: 自定義 API 端點以觸發伺服器端爬蟲。

---
*Developed by Lawrence & Antigravity*
