# SR-BOT Pro Exchange v2.1 - 系統分析文件

## 1. 系統架構圖 (System Architecture)

本系統採用輕量化的 **Node.js + File-based Storage** 架構，專為 Zeabur 容器環境與 Volume 掛載設計。

```mermaid
graph TD
    User(("User / iPhone")) -->|HTTPS| LoadBalancer["Zeabur Edge Network"]
    
    subgraph "SR-BOT Pro Container"
        LoadBalancer -->|Port 8080| Express[Express Server]
        
        Express -->|GET /| StaticFE["Static Frontend (Vite Build)"]
        Express -->|GET /api/rates| RatesAPI["Rates API"]
        Express -->|GET /api/chart| ChartAPI["Trend Chart API"]
        
        Scheduler["node-cron Scheduler"] -->|Trigger 23:50| ScraperService
        
        subgraph "Core Logic"
            ScraperService["Scraper Service"] 
            RatesAPI
            ChartAPI
        end
        
        ScraperService -->|Fetch| BOT["Bank of Taiwan (CSV)"]
        ScraperService -->|Fetch| SR["SuperRich Thailand (HTML)"]
    end
    
    subgraph "Persistent Storage"
        Volume["Zeabur Volume (/app/data)"]
        HistoryFile[history.json]
    end
    
    ScraperService -->|Upsert| HistoryFile
    RatesAPI -->|Read| HistoryFile
    ChartAPI -->|Read/Compute| HistoryFile
    Volume --- HistoryFile
```

## 2. 資料流流程圖 (Data Flow)

描述資料如何從外部來源抓取、處理、儲存，最後呈現給使用者的完整流程。

```mermaid
sequenceDiagram
    participant Cron as Scheduler (23:50)
    participant Scraper as Scraper Service
    participant External as External Banks
    participant FS as File System (/app/data)
    participant API as Express API
    participant UI as Frontend User

    %% 爬蟲流程
    Note over Cron, FS: **每日自動爬蟲流程**
    Cron->>Scraper: 觸發每日爬取
    par Fetch Rates
        Scraper->>External: 請求台灣銀行 (SCSV)
        Scraper->>External: 請求 SuperRich (Playwright)
    end
    External-->>Scraper: 回傳匯率數據
    Scraper->>Scraper: 數據正規化 & 格式檢查
    Scraper->>FS: 讀取 history.json
    Scraper->>Scraper: 合併數據 (Upsert based on YYYY-MM-DD)
    Scraper->>Scraper: 裁切舊數據 (保留最新 30 筆)
    Scraper->>FS: 寫回 history.json (Persisted)

    %% 使用者查詢流程
    Note over API, UI: **使用者查詢流程**
    UI->>API: 請求趨勢圖表 (/api/trend-chart)
    API->>FS: 讀取 history.json
    FS-->>API: 回傳歷史數據
    API->>API: 計算 Cross Rate (美金中轉匯率)
    API->>API: 生成 Chart URL (QuickChart)
    API-->>UI: 回傳圖表連結
    UI->>UI: 渲染圖表
```

## 3. 模組功能分析

### A. 爬蟲模組 (`scripts/scraper.js`)
- **功能**：負責從外部網站獲取原始匯率數據。
- **特點**：
    - **混合抓取策略**：同時使用 `axios` (針對 CSV) 與 `playwright` (針對動態渲染網頁)。
    - **純函數設計**：重構後的爬蟲不涉及資料庫操作，僅回傳標準化 JSON 物件，易於測試與維護。

### B. 伺服器核心 (`server.js`)
- **角色**：系統的中樞神經，整合排程、API 與資料存取。
- **關鍵邏輯**：
    - **資料持久化 (Persistence)**：利用 Zeabur 掛載的 Volume，將資料寫入 `/app/data/history.json`。
    - **每日去重 (Deduplication)**：使用 `dateStr` (YYYY-MM-DD) 作為唯一鍵值，確保同一天多次執行也只會更新同一筆記錄，防止數據膨脹。
    - **自動滾動 (Rolling Retention)**：每次寫入時自動檢查長度，僅保留最近 30 天數據。

### C. 趨勢視覺化 (`/api/trend-chart`)
- **目的**：解決使用者「這時候換划算嗎？」的決策痛點。
- **實現**：
    - 即時計算 **Cross Rate (交叉匯率)**：`srUsd (泰國美金買價) / botUsd (台灣美金賣價)`。
    - 使用 `QuickChart` 生成靜態圖片，減輕前端渲染負擔，並確保在所有裝置 (包含 Line 預覽) 都能正常顯示。

## 4. 部署環境規格

- **平台**：Zeabur
- **容器**：Node.js (LTS)
- **瀏覽器環境**：Playwright Container (`mcr.microsoft.com/playwright`)
- **儲存**：Persistent Volume (1GB+) Mount at `/app/data`
- **時區**：Asia/Taipei (GMT+8)
