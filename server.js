const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, getDevice } = require('@whiskeysockets/baileys');
const ytdl = require('ytdl-core');
const fs = require('fs');
const pino = require('pino');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Servir les fichiers frontend

const sockets = {};

function getInnerMessage(msg) {
  if (msg.message?.viewOnceMessage) return msg.message.viewOnceMessage.message;
  if (msg.message?.viewOnceMessageV2) return msg.message.viewOnceMessageV2.message;
  return msg.message;
}

function hasMedia(innerMsg) {
  return innerMsg?.imageMessage || innerMsg?.videoMessage || innerMsg?.audioMessage || innerMsg?.documentMessage || innerMsg?.stickerMessage;
}

app.post('/generate-pairing-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Numéro de téléphone requis' });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_${phoneNumber}`);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      auth: state,
      version,
      logger: pino({ level: 'silent' }),
    });

    const pairingCode = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
    sockets[phoneNumber] = { sock, state };

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
      const { connection } = update;
      if (connection === 'open') console.log(`Connecté pour ${phoneNumber}`);
      if (connection === 'close') delete sockets[phoneNumber];
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const innerMsg = getInnerMessage(msg);
      const text = innerMsg?.conversation || innerMsg?.extendedTextMessage?.text || '';

      if (text.startsWith('!ping')) {
        await sock.sendMessage(from, { text: 'Pong!' });
      } else if (text.startsWith('!help')) {
        await sock.sendMessage(from, { text: 'Commandes: !ping, !downloadsong <URL>, !downloadvideo <URL>, !viewonce <URL>, !help' });
      } else if (text.startsWith('!downloadsong ')) {
        const url = text.split(' ')[1];
        if (!ytdl.validateURL(url)) return sock.sendMessage(from, { text: 'URL YouTube invalide !' });
        try {
          const fileName = 'song.mp3';
          const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
          stream.pipe(fs.createWriteStream(fileName));
          stream.on('end', async () => {
            await sock.sendMessage(from, { audio: fs.readFileSync(fileName), mimetype: 'audio/mp3' });
            fs.unlinkSync(fileName);
          });
        } catch (err) {
          await sock.sendMessage(from, { text: 'Erreur téléchargement chanson !' });
        }
      } else if (text.startsWith('!downloadvideo ')) {
        const url = text.split(' ')[1];
        if (!ytdl.validateURL(url)) return sock.sendMessage(from, { text: 'URL YouTube invalide !' });
        try {
          const fileName = 'video.mp4';
          const stream = ytdl(url, { quality: 'highestvideo' });
          stream.pipe(fs.createWriteStream(fileName));
          stream.on('end', async () => {
            await sock.sendMessage(from, { video: fs.readFileSync(fileName), mimetype: 'video/mp4' });
            fs.unlinkSync(fileName);
          });
        } catch (err) {
          await sock.sendMessage(from, { text: 'Erreur téléchargement vidéo !' });
        }
      } else if (text.startsWith('!viewonce ')) {
        const url = text.split(' ')[1];
        if (!ytdl.validateURL(url)) return sock.sendMessage(from, { text: 'URL YouTube invalide !' });
        try {
          const fileName = 'viewonce.mp4';
          const stream = ytdl(url, { quality: 'highestvideo' });
          stream.pipe(fs.createWriteStream(fileName));
          stream.on('end', async () => {
            await sock.sendMessage(from, { video: fs.readFileSync(fileName), mimetype: 'video/mp4', viewOnce: true });
            fs.unlinkSync(fileName);
          });
        } catch (err) {
          await sock.sendMessage(from, { text: 'Erreur envoi view once !' });
        }
      }

      if (hasMedia(innerMsg)) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer');
          const ext = innerMsg.audioMessage ? '.mp3' : innerMsg.videoMessage ? '.mp4' : innerMsg.imageMessage ? '.jpg' : '.bin';
          const fileName = `downloaded_${Date.now()}${ext}`;
          fs.writeFileSync(fileName, buffer);
          await sock.sendMessage(from, { text: `Média téléchargé sous ${fileName} !` });
        } catch (err) {
          await sock.sendMessage(from, { text: 'Erreur téléchargement média !' });
        }
      }
    });

    res.json({ pairingCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la génération du code' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Serveur démarré'));
