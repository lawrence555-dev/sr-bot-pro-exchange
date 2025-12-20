import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. API endpoint to trigger scraping
app.get('/api/scrape', (req, res) => {
    console.log('Production: Scrape request received');
    exec('node scripts/scraper.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Scrape error: ${error}`);
            return res.status(500).json({ error: error.message });
        }
        console.log('Scrape completed successfully');
        res.json({ success: true });
    });
});

// 2. Dynamic serving of rates.json
app.get('/api/rates', (req, res) => {
    const ratesPath = path.join(__dirname, 'src/data/rates.json');
    if (fs.existsSync(ratesPath)) {
        res.sendFile(ratesPath);
    } else {
        res.status(404).json({ error: 'Rates not found' });
    }
});

// 3. Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// 4. Fallback to index.html for SPA routing (MUST BE LAST)
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
