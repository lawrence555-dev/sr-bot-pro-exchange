import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../src/data/rates.json');

// 確保目錄存在
const dir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

async function scrapeBOT() {
    console.log('Fetching BOT rates (CSV)...');
    try {
        const response = await axios.get('https://rate.bot.com.tw/xrt/flcsv/0/day', { timeout: 10000 });
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
    }
    return 31.815; // Fallback
}

async function scrapeSR() {
    console.log('Fetching SuperRich rates (Playwright)...');
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        await page.goto('https://www.superrichthailand.com/#!/en/exchange', { waitUntil: 'networkidle', timeout: 60000 });

        // 等待特定選項載入以確保 API 已回傳 (因為是隱藏的，使用 state: 'attached')
        await page.waitForSelector('select#selectCurrency option[data-unit="TWD"]', { state: 'attached', timeout: 30000 });

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
            throw new Error('SR rates extraction failed');
        }

        return rates;
    } catch (error) {
        console.error('SR scraping failed:', error.message);
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

        const result = {
            botUsd,
            srTwd: srRates.twdRate,
            srUsd: srRates.usdRate,
            lastUpdated: new Date().toLocaleString('zh-TW', {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
        console.log('Successfully saved rates to:', OUTPUT_PATH);
        console.log(result);
    } catch (error) {
        console.error('Scraping process failed:', error.message);
        process.exit(1);
    }
}

run();
