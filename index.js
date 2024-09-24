const express = require('express');
const { Telegraf } = require('telegraf');
const morgan = require('morgan'); // Logging middleware
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PORT = process.env.PORT || 10000; // Render typically assigns port 10000
const URL = process.env.RENDER_URL || `https://your-app.onrender.com`;

// Initialize the Telegram bot
const bot = new Telegraf(BOT_TOKEN);

// Set the webhook for the bot (this ensures the bot works via the URL)
bot.telegram.setWebhook(`${URL}/bot${BOT_TOKEN}`);

// Use Express to handle the bot webhook callback
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

// Middleware to log all HTTP requests into a file called access.log
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));

// Route to display logs/errors on a webpage
app.get('/', (req, res) => {
  const logFilePath = path.join(__dirname, 'access.log');
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading log file');
    } else {
      res.send(`
        <html>
          <head>
            <title>Bot Logs</title>
          </head>
          <body>
            <h1>Bot Logs</h1>
            <pre>${data}</pre>
          </body>
        </html>
      `);
    }
  });
});

// Endpoint to clear logs (optional)
app.get('/clear-logs', (req, res) => {
  fs.writeFileSync(path.join(__dirname, 'access.log'), ''); // Clears the log file
  res.send('Logs cleared.');
});

// Command to start the bot
bot.start((ctx) => ctx.reply('Welcome to the Stripe Validator Bot! Send a card number to validate it.'));
bot.help((ctx) => ctx.reply('Send me a card number to validate it with Stripe.'));

// Handle card number validation using Stripe
bot.on('text', async (ctx) => {
  const cardNumber = ctx.message.text.trim();

  // Stripe API endpoint for token creation
  const stripeTokenEndpoint = 'https://api.stripe.com/v1/tokens';

  try {
    // Sending card details to Stripe API for validation
    const response = await axios.post(stripeTokenEndpoint, {
      card: {
        number: cardNumber,
        exp_month: 12,
        exp_year: 2024,
        cvc: '123'
      }
    }, {
      headers: {
        Authorization: `Bearer ${STRIPE_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const result = response.data;

    // Respond to the user with success
    ctx.reply(`Card validation successful! Token ID: ${result.id}`);
    console.log(`Card validation for ${cardNumber}: Successful. Token: ${result.id}`);

  } catch (error) {
    // Handle any validation errors
    if (error.response) {
      ctx.reply(`Card validation failed: ${error.response.data.error.message}`);
      console.log(`Card validation for ${cardNumber} failed: ${error.response.data.error.message}`);
    } else {
      ctx.reply(`An error occurred: ${error.message}`);
      console.log(`Error validating card: ${error.message}`);
    }
  }
});

// Error logging for any unexpected issues
bot.catch((err, ctx) => {
  console.error(`Error encountered for ${ctx.updateType}:`, err);
});

// Start the Express server to listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
