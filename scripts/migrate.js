import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Rate from '../models/Rate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to process date
function processDate(timeStr) {
    if (!timeStr) return null;

    // Convert "2025/12/25 22:23" to Date object
    // Replace slashes with dashes for better compatibility if needed, 
    // but JS Date constructor usually handles slashes well.
    const recordTime = new Date(timeStr);

    if (isNaN(recordTime.getTime())) return null;

    // Convert to Taiwan Time YYYY-MM-DD
    const dateStr = recordTime.toLocaleDateString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-'); // Ensure YYYY-MM-DD format

    return { recordTime, dateStr };
}

async function migrate() {
    console.log('Starting migration...');

    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI environment variable is missing.');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected.');

        const historyPath = path.join(__dirname, '../data/history.json');
        if (!fs.existsSync(historyPath)) {
            console.error('Error: history.json not found at', historyPath);
            process.exit(1);
        }

        const rawData = fs.readFileSync(historyPath, 'utf8');
        const historyData = JSON.parse(rawData);

        if (!Array.isArray(historyData)) {
            console.error('Error: history.json is not an array.');
            process.exit(1);
        }

        console.log(`Found ${historyData.length} records to process.`);

        let successCount = 0;

        for (const item of historyData) {
            const { time, botUsd, srTwd, srUsd } = item;

            const dateInfo = processDate(time);
            if (!dateInfo) {
                console.warn(`Skipping invalid date: ${time}`);
                continue;
            }

            const { recordTime, dateStr } = dateInfo;

            // Upsert: Update if exists (by dateStr), otherwise Insert
            await Rate.updateOne(
                { dateStr: dateStr }, // Filter
                {
                    $set: {
                        botUsd: Number(botUsd),
                        srTwd: Number(srTwd),
                        srUsd: Number(srUsd),
                        recordTime: recordTime,
                        dateStr: dateStr,
                        createdAt: new Date() // Renew 30-day TTL if updated
                    }
                },
                { upsert: true }
            );

            successCount++;
        }

        console.log(`Migration completed. Successfully upserted ${successCount} records.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected.');
        process.exit(0);
    }
}

migrate();
