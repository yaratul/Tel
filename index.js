require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');

// Initialize the bot
const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Basic regex to validate card format (more improvements can be made)
const cardRegex = /^(\d{16})\|(\d{2})\|(\d{4})\|(\d{3,4})$/;

// Function to generate a fake card number based on a BIN
function generateCardFromBin(bin) {
    let cardNumber = bin;
    for (let i = bin.length; i < 16; i++) {
        cardNumber += Math.floor(Math.random() * 10); // Generate random digits
    }

    const expMonth = ('0' + (Math.floor(Math.random() * 12) + 1)).slice(-2);
    const expYear = (new Date().getFullYear() + Math.floor(Math.random() * 5)).toString();
    const cvc = Math.floor(100 + Math.random() * 900).toString();

    return `${cardNumber}|${expMonth}|${expYear}|${cvc}`;
}

// Command to generate cards from BIN
bot.command('/generate', (ctx) => {
    const messageParts = ctx.message.text.split(' ');
    if (messageParts.length < 2 || messageParts[1].length < 6) {
        return ctx.reply('Please provide a valid BIN (first 6 digits of the card)');
    }

    const bin = messageParts[1];
    const card = generateCardFromBin(bin);

    // You can extend this by querying a service or database to get more card details (VBV/non-VBV etc.)
    return ctx.reply(`Generated Card:\n${card}`);
});

// Regex-based card validation and basic details extraction
bot.command('/validate', (ctx) => {
    const cardDetails = ctx.message.text.split(' ').slice(1).join(' '); // Get card details after command

    if (!cardRegex.test(cardDetails)) {
        return ctx.reply('Invalid card format. Use: cc_number|MM|YYYY|CVC');
    }

    const [cardNumber, expMonth, expYear, cvc] = cardDetails.split('|');
    return ctx.reply(`Card: ${cardNumber.slice(0, 6)}******${cardNumber.slice(-4)}\nExp: ${expMonth}/${expYear}\nCVC: ${cvc}`);
});

// Webhook setup (for better uptime)
bot.telegram.setWebhook(`${process.env.DOMAIN}/bot${process.env.BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${process.env.BOT_TOKEN}`));

// Route for keep-alive
app.get('/', (req, res) => {
    res.send('Bot is running');
});

// Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Keep-Alive mechanism to ping the bot every 5 minutes
setInterval(() => {
    axios.get(`https://${process.env.DOMAIN}`)
        .then(() => console.log('Keep-alive ping'))
        .catch((err) => console.log('Keep-alive failed', err));
}, 5 * 60 * 1000); // Ping every 5 minutes

// Start bot (Use webhook)
bot.launch();

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = {
    init: function(bot) {
        console.log('Bot initialized!');
    }
};
