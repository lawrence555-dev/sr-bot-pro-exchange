import { chromium } from 'playwright';
import axios from 'axios';

// 1. Bank of Taiwan (Cash Sell) - CSV source
const TWBANK_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/day';

// 2. SuperRich Thailand (Green) - HTML source
const SR_URL = 'https://www.superrichthailand.com/api/exchange/rate/latest';

async function scrapeBOT() {
    console.log('Fetching BOT rates (CSV)...');
    try {
        const response = await axios.get(TWBANK_URL, {
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
            viewport: { width: 1920, height: 1080 },
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
        // Return nulls or zeros so UI can show error state instead of fake data
        return { twdRate: 0, usdRate: 0 }; // Fallback to 0 to indicate failure
    } finally {
        await browser.close();
    }
}

export async function scrapeAllRates() {
    console.log('Starting scrape process...');

    try {
        // Parallel execution
        const [botRate, srRates] = await Promise.all([
            scrapeBOT(),
            scrapeSR()
        ]);

        const lastUpdated = new Date().toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const result = {
            botUsd: botRate,
            srTwd: srRates.twdRate,
            srUsd: srRates.usdRate,
            lastUpdated
        };

        console.log('Scrape finished. Result:', result);
        return result;

    } catch (error) {
        console.error('Scraping process failed:', error.message);
        throw error;
    }
}
