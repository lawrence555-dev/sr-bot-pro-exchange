import mongoose from 'mongoose';

const rateSchema = new mongoose.Schema({
    botUsd: { type: Number, required: true },
    srTwd: { type: Number, required: true },
    srUsd: { type: Number, required: true },
    recordTime: { type: Date, required: true }, // The logical time of the scraped data
    dateStr: { type: String, required: true },  // YYYY-MM-DD for daily uniqueness
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '30d' // Automatically delete documents after 30 days
    }
});

const Rate = mongoose.model('Rate', rateSchema);

export default Rate;
