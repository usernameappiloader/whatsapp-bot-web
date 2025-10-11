from flask import Flask, request
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
import os
import yt_dlp
import instaloader
from gtts import gTTS
import qrcode
import requests
from google_play_scraper import app as gps_app
import tempfile
import shutil

app = Flask(__name__)

TOKEN = os.getenv('TELEGRAM_TOKEN')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')

application = Application.builder().token(TOKEN).build()

async def start(update, context):
    await update.message.reply_text("Welcome to the multifunctional bot! Use /help for commands.")

async def help_command(update, context):
    help_text = """
Available commands:
/download <url> - Download file from URL
/voice <text> - Generate voice from text
/yt <url> - Download YouTube video
/insta <url> - Download Instagram media
/tiktok <url> - Download TikTok video
/qr <text> - Generate QR code
/fun - Get a random joke
/app <package_name> - Get download link for Android app
    """
    await update.message.reply_text(help_text)

async def download(update, context):
    url = ' '.join(context.args)
    if not url:
        await update.message.reply_text("Provide a URL to download.")
        return
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                shutil.copyfileobj(response.raw, tmp)
                tmp_path = tmp.name
            await update.message.reply_document(open(tmp_path, 'rb'))
            os.unlink(tmp_path)
        else:
            await update.message.reply_text("Failed to download.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def voice(update, context):
    text = ' '.join(context.args)
    if not text:
        await update.message.reply_text("Provide text for voice.")
        return
    try:
        tts = gTTS(text)
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            tts.save(tmp.name)
            tmp_path = tmp.name
        await update.message.reply_voice(open(tmp_path, 'rb'))
        os.unlink(tmp_path)
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def yt(update, context):
    url = ' '.join(context.args)
    if not url:
        await update.message.reply_text("Provide YouTube URL.")
        return
    try:
        ydl_opts = {'outtmpl': 'temp.%(ext)s'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
        await update.message.reply_document(open(filename, 'rb'))
        os.unlink(filename)
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def insta(update, context):
    url = ' '.join(context.args)
    if not url:
        await update.message.reply_text("Provide Instagram URL.")
        return
    try:
        L = instaloader.Instaloader()
        post = instaloader.Post.from_shortcode(L.context, url.split('/')[-2])
        L.download_post(post, target='temp')
        # Assuming single media, send the file
        files = os.listdir('temp')
        if files:
            file_path = os.path.join('temp', files[0])
            await update.message.reply_document(open(file_path, 'rb'))
            shutil.rmtree('temp')
        else:
            await update.message.reply_text("No media found.")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def tiktok(update, context):
    url = ' '.join(context.args)
    if not url:
        await update.message.reply_text("Provide TikTok URL.")
        return
    try:
        ydl_opts = {'outtmpl': 'temp.%(ext)s'}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
        await update.message.reply_document(open(filename, 'rb'))
        os.unlink(filename)
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def qr(update, context):
    text = ' '.join(context.args)
    if not text:
        await update.message.reply_text("Provide text for QR code.")
        return
    try:
        img = qrcode.make(text)
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            img.save(tmp)
            tmp_path = tmp.name
        await update.message.reply_photo(open(tmp_path, 'rb'))
        os.unlink(tmp_path)
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def fun(update, context):
    try:
        response = requests.get('https://api.chucknorris.io/jokes/random')
        joke = response.json()['value']
        await update.message.reply_text(joke)
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

async def app_download(update, context):
    package = ' '.join(context.args)
    if not package:
        await update.message.reply_text("Provide app package name.")
        return
    try:
        result = gps_app(package)
        await update.message.reply_text(f"Download link: {result['url']}")
    except Exception as e:
        await update.message.reply_text(f"Error: {str(e)}")

# Add handlers
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("help", help_command))
application.add_handler(CommandHandler("download", download))
application.add_handler(CommandHandler("voice", voice))
application.add_handler(CommandHandler("yt", yt))
application.add_handler(CommandHandler("insta", insta))
application.add_handler(CommandHandler("tiktok", tiktok))
application.add_handler(CommandHandler("qr", qr))
application.add_handler(CommandHandler("fun", fun))
application.add_handler(CommandHandler("app", app_download))

@app.route('/webhook', methods=['POST'])
async def webhook():
    json_data = await request.get_json()
    update = Update.de_json(json_data, application.bot)
    await application.process_update(update)
    return 'OK'

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    application.run_webhook(listen="0.0.0.0", port=port, url_path="webhook", webhook_url=WEBHOOK_URL)
