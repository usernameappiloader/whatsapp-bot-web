# Multifunctional Telegram Bot

This bot provides various features like downloading media, generating QR codes, text-to-speech, and more.

## Setup

1. Clone or download the files.

2. Install dependencies: `pip install -r requirements.txt`

3. Set environment variables: Copy `.env` and fill in your TELEGRAM_TOKEN.

4. For local testing, run `python bot.py` (but webhook needs a public URL, use ngrok for testing).

5. For Railway deployment:

   - Create a Railway project.

   - Connect your repo or upload files.

   - Set environment variables: TELEGRAM_TOKEN and WEBHOOK_URL (Railway will provide the URL).

   - Deploy.

6. Set Telegram webhook: Use `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WEBHOOK_URL>/webhook`

## Commands

- /start - Welcome message

- /help - List commands

- /download <url> - Download file

- /voice <text> - Text to speech

- /yt <url> - Download YouTube video

- /insta <url> - Download Instagram media

- /tiktok <url> - Download TikTok video

- /qr <text> - Generate QR code

- /fun - Random joke

- /app <package> - Get app download link

## Notes

- Downloads are temporary and deleted after sending.

- Ensure compliance with terms of service for downloads.
