require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper function to generate random card numbers from BIN
function generateCardFromBin(bin) {
    const cardNumber = bin + Math.floor(100000000000 + Math.random() * 900000000000);
    return cardNumber;
}

// Fetch BIN details from a BIN API
async function fetchBinDetails(bin) {
    try {
        const response = await axios.get(`https://lookup.binlist.net/${bin}`);
        return response.data;
    } catch (error) {
        return { error: "Could not fetch BIN details." };
    }
}

// Command to generate cards and show BIN details
bot.command('/generate_card', async (ctx) => {
    const bin = ctx.message.text.split(' ')[1];  // Get BIN from the command
    if (!bin || bin.length !== 6) {
        return ctx.reply('Please provide a valid 6-digit BIN.');
    }

    // Generate random card number
    const cardNumber = generateCardFromBin(bin);

    // Fetch BIN details
    const binDetails = await fetchBinDetails(bin);

    if (binDetails.error) {
        return ctx.reply(binDetails.error);
    }

    // Construct the response message with BIN details
    const message = `
    BIN: ${bin}
    Bank: ${binDetails.bank ? binDetails.bank.name : 'Unknown'}
    Country: ${binDetails.country ? binDetails.country.name : 'Unknown'}
    Card Type: ${binDetails.type || 'Unknown'}
    Brand: ${binDetails.brand || 'Unknown'}
    VBV Status: ${binDetails.prepaid ? 'Non-VBV' : 'VBV'}  // Assuming prepaid means non-VBV
    Generated Card Number: ${cardNumber}
    `;

    await ctx.reply(message);
});

// Start bot
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
