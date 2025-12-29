import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import Rate from './models/Rate.js';
import { scrapeAllRates } from './scripts/scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB Connected Successfully'))
        .catch(err => {
            console.error('MongoDB Connection Failed:', err.message);
            if (err.code === 18) {
                console.error('================================================');
                console.error('[HINT] Authentication Failed (Code 18).');
                console.error('1. Check if your Username/Password is correct.');
                console.error('2. IMPORTANT: If your password contains special characters (@, :, /, #), they MUST be URL Encoded.');
                console.error('   Example: "@" -> "%40", ":" -> "%3A"');
                console.error('================================================');
            }
        });
} else {
    console.warn('MONGODB_URI not found in env, skipping DB connection');
}

// Helper: Save daily rate to DB (Upsert)
async function saveDailyRate(data) {
    if (!mongoose.connection.readyState) {
        console.warn('DB not connected, skipping save.');
        return;
    }

    try {
        const recordTime = new Date();
        const dateStr = recordTime.toLocaleDateString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-'); // YYYY-MM-DD

        const updatedRate = await Rate.findOneAndUpdate(
            { dateStr: dateStr }, // Filter by today's date
            {
                $set: {
                    botUsd: data.botUsd,
                    srTwd: data.srTwd,
                    srUsd: data.srUsd,
                    recordTime: recordTime,
                    dateStr: dateStr,
                    createdAt: new Date() // Renew TTL
                }
            },
            { upsert: true, new: true }
        );

        console.log(`[DB] Successfully saved/updated rate for ${dateStr}:`, updatedRate._id);
        return updatedRate;
    } catch (error) {
        console.error('[DB] Save daily rate failed:', error.message);
    }
}

// Scheduler: Run every day at 23:50 (Asia/Taipei)
// Note: node-cron uses server time. Zeabur default is usually UTC.
// 23:50 Taipei = 15:50 UTC. 
// However, to be safe, we can specify timezone if the system supports it, 
// or simpler: rely on `timezone` option in node-cron.
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
        await saveDailyRate(data);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Manual scrape failed:', error.message);
        res.status(500).json({ error: 'Scrape failed', details: error.message });
    }
});

// 2. Get latest rates (from DB)
app.get('/api/rates', async (req, res) => {
    try {
        const latestRate = await Rate.findOne().sort({ recordTime: -1 });
        if (latestRate) {
            res.json({
                botUsd: latestRate.botUsd,
                srTwd: latestRate.srTwd,
                srUsd: latestRate.srUsd,
                lastUpdated: latestRate.recordTime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            });
        } else {
            res.status(404).json({ error: 'No rates found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'DB Query Failed', details: error.message });
    }
});

// 3. Get history (from DB)
app.get('/api/history', async (req, res) => {
    try {
        const history = await Rate.find().sort({ recordTime: -1 }).limit(30);
        const formattedHistory = history.map(h => ({
            time: h.recordTime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            botUsd: h.botUsd,
            srTwd: h.srTwd,
            srUsd: h.srUsd,
            lastUpdated: h.recordTime.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        })).reverse(); // Reverse to chronological order (Old -> New) for charts

        res.json(formattedHistory);
    } catch (error) {
        res.status(500).json({ error: 'DB Query Failed', details: error.message });
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

    // Auto-scrape on startup (Optional: keep this if user wants immediate data on deploy)
    console.log('Startup: Triggering auto-scrape...');
    try {
        const data = await scrapeAllRates();
        await saveDailyRate(data);
    } catch (error) {
        console.error('Startup scrape warning:', error.message);
    }
});
