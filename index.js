require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Initialize Telegram bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper function to generate a valid card number from BIN using Luhn algorithm
function generateCardFromBin(bin) {
    let cardNumber = bin + Math.floor(100000000000 + Math.random() * 900000000000); // Random 12 digits

    // Luhn algorithm implementation
    function luhnCheck(num) {
        let arr = (num + '')
            .split('')
            .reverse()
            .map(x => parseInt(x));
        let sum = arr.reduce((acc, val, idx) =>
            (idx % 2) ? (val * 2 > 9 ? acc + val * 2 - 9 : acc + val * 2) : acc + val, 0);
        return sum % 10 === 0;
    }

    // Keep generating until we get a valid Luhn card number
    while (!luhnCheck(cardNumber)) {
        cardNumber = bin + Math.floor(100000000000 + Math.random() * 900000000000);
    }

    return cardNumber;
}

// Validate card number using regex
function validateCardNumber(cardNumber) {
    const regex = /^4[0-9]{12}(?:[0-9]{3})?$/;  // Example Visa regex
    return regex.test(cardNumber);
}

// Fetch BIN details from API
async function fetchBinDetails(bin) {
    try {
        const response = await axios.get(`https://lookup.binlist.net/${bin}`);
        return response.data;
    } catch (error) {
        return { error: "Could not fetch BIN details." };
    }
}

// Generate a random expiration date and CVC
function generateExpiryAndCVC() {
    const expMonth = ('0' + Math.floor(Math.random() * 12 + 1)).slice(-2); // Random month between 01 and 12
    const expYear = Math.floor(new Date().getFullYear() + Math.random() * 5);  // Random year, up to 5 years ahead
    const cvc = Math.floor(100 + Math.random() * 900);  // Random CVC (3 digits)

    return {
        expMonth: expMonth,
        expYear: expYear,
        cvc: cvc
    };
}

// Command to generate cards and show BIN details
bot.command('/generate_card', async (ctx) => {
    const bin = ctx.message.text.split(' ')[1];  // Get BIN from command input
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

    // Generate expiry date and CVC
    const { expMonth, expYear, cvc } = generateExpiryAndCVC();

    // Validate the card number
    if (!validateCardNumber(cardNumber)) {
        return ctx.reply('Generated card number is invalid.');
    }

    // Construct the response message
    const message = `
    BIN: ${bin}
    Bank: ${binDetails.bank ? binDetails.bank.name : 'Unknown'}
    Country: ${binDetails.country ? binDetails.country.name : 'Unknown'}
    Card Type: ${binDetails.type || 'Unknown'}
    Brand: ${binDetails.brand || 'Unknown'}
    VBV Status: ${binDetails.prepaid ? 'Non-VBV' : 'VBV'}
    Generated Card: ${cardNumber}|${expMonth}|${expYear}|${cvc}
    `;

    await ctx.reply(message);
});

bot.command('/options', (ctx) => {
    return ctx.reply('Choose an option:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Generate Card', callback_data: 'generate_card' }],
                [{ text: 'Check BIN', callback_data: 'check_bin' }]
            ]
        }
    });
});

bot.action('generate_card', (ctx) => {
    ctx.reply('Send the BIN to generate a card.');
});

bot.action('check_bin', (ctx) => {
    ctx.reply('Send the BIN to check details.');
});
// Start the bot and bind to the port for Render
bot.launch({
    webhook: {
        domain: process.env.DOMAIN,
        port: process.env.PORT || 10000
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
