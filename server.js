import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import fs from 'fs';
import { scrapeAllRates } from './scripts/scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Get Taiwan Date String (YYYY-MM-DD)
function getTaiwanDateStr(dateObj) {
    return dateObj.toLocaleDateString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');
}

// Helper: Save daily rate to JSON file (Upsert + 30 days limit)
async function saveDailyRate(data) {
    try {
        let history = [];
        if (fs.existsSync(HISTORY_PATH)) {
            try {
                history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
                if (!Array.isArray(history)) history = [];
            } catch (e) {
                console.error('[File] Error reading history.json, resetting:', e.message);
                history = [];
            }
        }

        const now = new Date();
        const dateStr = getTaiwanDateStr(now);
        const lastUpdatedFormatted = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

        const newRecord = {
            dateStr: dateStr, // Key for uniqueness
            recordTime: now.toISOString(),
            lastUpdated: lastUpdatedFormatted,
            botUsd: data.botUsd,
            srTwd: data.srTwd,
            srUsd: data.srUsd
        };

        // 1. Upsert Logic: Check if today's record exists
        const existingIndex = history.findIndex(item => item.dateStr === dateStr);

        if (existingIndex !== -1) {
            console.log(`[File] Updating existing record for ${dateStr}`);
            history[existingIndex] = newRecord;
        } else {
            console.log(`[File] Adding new record for ${dateStr}`);
            history.push(newRecord);
        }

        // 2. Sort by Date (Old -> New) to ensure correct slicing
        history.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));

        // 3. Keep only last 30 days
        if (history.length > 30) {
            console.log(`[File] Trimming history to last 30 days`);
            history = history.slice(-30);
        }

        // 4. Write back
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
        console.log('[File] Successfully saved to history.json');
        return newRecord;

    } catch (error) {
        console.error('[File] Save daily rate failed:', error.message);
    }
}

// Scheduler: Run every day at 23:50 (Asia/Taipei)
cron.schedule('50 23 * * *', async () => {
    console.log('[Cron] Starting daily scrape job...');
    try {
        const data = await scrapeAllRates();
        await saveDailyRate(data);
    } catch (error) {
        console.error('[Cron] Job failed:', error.message);
    }
}, {
    timezone: "Asia/Taipei"
});

// 0. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. API endpoint to trigger scraping (Manual)
app.get('/api/scrape', async (req, res) => {
    console.log('Manual Scrape request received');
    try {
        const data = await scrapeAllRates();
        const savedRecord = await saveDailyRate(data);
        res.json({ success: true, data: savedRecord });
    } catch (error) {
        console.error('Manual scrape failed:', error.message);
        res.status(500).json({ error: 'Scrape failed', details: error.message });
    }
});

// 2. Get latest rates (from File)
app.get('/api/rates', (req, res) => {
    try {
        if (!fs.existsSync(HISTORY_PATH)) {
            return res.status(404).json({ error: 'No data available' });
        }
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        const latestInfo = history[history.length - 1]; // Last item is newest

        if (latestInfo) {
            res.json(latestInfo);
        } else {
            res.status(404).json({ error: 'No rates found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Read File Failed', details: error.message });
    }
});

// 3. Get history (from File)
app.get('/api/history', (req, res) => {
    try {
        if (!fs.existsSync(HISTORY_PATH)) {
            return res.json([]); // Return empty array if no file
        }
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));

        // For chart display, usually we want Oldest -> Newest (left to right).
        // But the user's previous request implemented reverse(). 
        // Let's verify: The previous code did "reverse() // New -> Old".
        // Let's stick to returning raw history (Old -> New) or whatever frontend expects.
        // Frontend likely renders whatever it gets.
        // Let's reverse it to match previous behavior: Newest first.
        res.json([...history].reverse());

    } catch (error) {
        res.status(500).json({ error: 'Read File Failed', details: error.message });
    }
});

// 4. Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// 5. Fallback to index.html for SPA routing (MUST BE LAST)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data Directory: ${DATA_DIR}`);

    // Auto-scrape on startup
    console.log('Startup: Triggering auto-scrape...');
    try {
        const data = await scrapeAllRates();
        await saveDailyRate(data);
    } catch (error) {
        console.error('Startup scrape warning:', error.message);
    }
});
