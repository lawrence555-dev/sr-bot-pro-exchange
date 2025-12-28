import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../data/rates.json');
const HISTORY_PATH = path.join(__dirname, '../data/history.json');

// 確保目錄存在
const dir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

async function scrapeBOT() {
    console.log('Fetching BOT rates (CSV)...');
    try {
        const response = await axios.get('https://rate.bot.com.tw/xrt/flcsv/0/day', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://rate.bot.com.tw/',
                'Origin': 'https://rate.bot.com.tw/',
                'Connection': 'keep-alive'
            }
        });
        const csvData = response.data;
        const lines = csvData.split('\n');
        for (const line of lines) {
            if (line.startsWith('USD')) {
                const columns = line.split(',');
                // 索引 12 (第13欄) 通常是「本行賣出」現鈔匯率
                const usdSell = parseFloat(columns[12]);
                if (!isNaN(usdSell)) return usdSell;
            }
        }
    } catch (error) {
        console.error('BOT fetch failed:', error.message);
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Headers:', JSON.stringify(error.response.headers));
            console.error('Error Body Preview:', typeof error.response.data === 'string' ? error.response.data.substring(0, 500) : error.response.data);
        }
    }
    return 31.815; // Fallback
}

async function scrapeSR(retries = 2) {
    console.log(`Fetching SuperRich rates (Playwright), retries left: ${retries}...`);
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        const page = await context.newPage();

        await page.goto('https://www.superrichthailand.com/#!/en/exchange', { waitUntil: 'networkidle', timeout: 60000 });

        // 等待特定選項載入以確保 API 已回傳 (因為是隱藏的，使用 state: 'attached')
        await page.waitForSelector('select#selectCurrency option[data-unit="TWD"]', { state: 'attached', timeout: 30000 });

        // Check if USD option exists
        const usdExists = await page.evaluate(() => {
            const el = document.querySelector('select#selectCurrency option[data-unit="USD"][data-demon="100"]');
            return !!el;
        });
        console.log('USD Option Exists:', usdExists);

        if (!usdExists) {
            console.log('Dumping all USD options...');
            const options = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('select#selectCurrency option[data-unit="USD"]')).map(opt => ({
                    text: opt.innerText,
                    demon: opt.getAttribute('data-demon'),
                    buy: opt.getAttribute('data-buy')
                }));
            });
            console.log('Available USD Options:', JSON.stringify(options, null, 2));
        }

        const rates = await page.evaluate(() => {
            const getRate = (unit, demon) => {
                const selector = demon
                    ? `select#selectCurrency option[data-unit="${unit}"][data-demon="${demon}"]`
                    : `select#selectCurrency option[data-unit="${unit}"]`;
                const el = document.querySelector(selector);
                return el ? parseFloat(el.getAttribute('data-buy')) : null;
            };

            return {
                twdRate: getRate('TWD'),
                usdRate: getRate('USD', '100')
            };
        });

        if (!rates.twdRate || !rates.usdRate) {
            console.error('Rates extraction failed. TWD:', rates.twdRate, 'USD:', rates.usdRate);
            throw new Error('SR rates extraction failed');
        }

        return rates;
    } catch (error) {
        console.error('SR scraping failed:', error.message);
        if (retries > 0) {
            await browser.close();
            return scrapeSR(retries - 1);
        }
        return { twdRate: 1.005, usdRate: 31.39 }; // Fallback
    } finally {
        await browser.close();
    }
}

async function run() {
    try {
        const [botUsd, srRates] = await Promise.all([
            scrapeBOT(),
            scrapeSR()
        ]);

        const timestamp = new Date().toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const result = {
            botUsd,
            srTwd: srRates.twdRate,
            srUsd: srRates.usdRate,
            lastUpdated: timestamp
        };

        // Save current rates
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
        console.log('Successfully saved rates to:', OUTPUT_PATH);

        // Update history
        let history = [];
        if (fs.existsSync(HISTORY_PATH)) {
            try {
                history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
            } catch (e) {
                console.error('History parse failed, resetting...');
            }
        }

        // Add new record
        history.push({
            time: timestamp,
            ...result
        });

        // Keep last 50 records
        if (history.length > 50) history = history.slice(-50);

        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
        console.log('Successfully updated history at:', HISTORY_PATH);

        console.log(result);
    } catch (error) {
        console.error('Scraping process failed:', error.message);
        process.exit(1);
    }
}

run();
