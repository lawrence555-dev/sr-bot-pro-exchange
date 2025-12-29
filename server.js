import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// MongoDB Connection
if (process.env.MONGODB_URI) {
    const maskedURI = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log('================================================');
    console.log(`[DEBUG] Attempting to connect to MongoDB with URI: ${maskedURI}`);
    console.log('================================================');

    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB Connected Successfully'))
        .catch(err => console.error('MongoDB Connection Failed:', err));
} else {
    console.warn('MONGODB_URI not found in env, skipping DB connection');
}

// 0. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. API endpoint to trigger scraping
app.get('/api/scrape', (req, res) => {
    console.log('Production: Scrape request received');
    console.log('CWD:', process.cwd());
    const scriptPath = path.join(__dirname, 'scripts/scraper.js');
    console.log('Script Path:', scriptPath);

    exec(`node "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Scrape execution error: ${error.message}`);
            console.error(`Stderr: ${stderr}`);
            // Return detailed error to UI for debugging
            return res.status(500).json({
                error: 'Scrape failed',
                details: error.message,
                stderr: stderr
            });
        }
        console.log('Scrape completed successfully');
        console.log('Stdout:', stdout);
        res.json({ success: true });
    });
});

// 2. Dynamic serving of rates.json & history.json
app.get('/api/rates', (req, res) => {
    const ratesPath = path.join(__dirname, 'data/rates.json');
    if (fs.existsSync(ratesPath)) {
        res.sendFile(ratesPath);
    } else {
        res.status(404).json({ error: 'Rates not found' });
    }
});

app.get('/api/history', (req, res) => {
    const historyPath = path.join(__dirname, 'data/history.json');
    if (fs.existsSync(historyPath)) {
        res.sendFile(historyPath);
    } else {
        res.status(404).json({ error: 'History not found' });
    }
});

// 3. Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// 4. Fallback to index.html for SPA routing (MUST BE LAST)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Auto-scrape on startup to ensure fresh data
    console.log('Startup: Triggering auto-scrape...');
    const scriptPath = path.join(__dirname, 'scripts/scraper.js');
    exec(`node "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Startup scrape failed: ${error.message}`);
            console.error(`Stderr: ${stderr}`);
        } else {
            console.log('Startup scrape completed successfully');
            console.log('Stdout:', stdout);
        }
    });
});
