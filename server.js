// Anyways for you idiots who need to know this is the backend yea nothing special

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { google } from 'googleapis';

const app = express();
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

function getOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

app.get('/api/gmail/connect', (req, res) => {
    const oAuth2Client = getOAuthClient();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
        ]
    });
    res.redirect(authUrl);
});

app.get('/api/gmail/callback', async (req, res) => {
    const oAuth2Client = getOAuthClient();
    try {
        const { tokens } = await oAuth2Client.getToken(req.query.code);
        req.session.gmailTokens = tokens;
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error during Gmail OAuth callback');
    }
});

app.get('/api/gmail/scan', async (req, res) => {
    if (!req.session.gmailTokens) {
        return res.status(401).send('Not authenticated with Gmail');
    }
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials(req.session.gmailTokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    try {
        const list = await gmail.users.messages.list({ userId: 'me', maxResults: 100 });
        const messages = list.data.messages || [];
        const senderMap = {};

        for (const message of messages) {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'metadata',
                metadataHeaders: ['From', 'List-Unsubscribe'],
            });
            const headers = detail.data.payload?.headers || [];
            const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'unknown';
            const listUnsub = headers.find((h) => h.name === 'List-Unsubscribe')?.value || '';
            const urlMatch = listUnsub.match(/<((?:https?):[^>]+)>/i);
            const mailtoMatch = listUnsub.match(/<(mailto:[^>]+)>/i);

            if (!senderMap[from]) {
                senderMap[from] = {
                    sender: from,
                    count: 0,
                    unsubscribeUrl: urlMatch ? urlMatch[1] : null,
                    unsubscribeMailto: mailtoMatch ? mailtoMatch[1] : null,
                };
            }
            senderMap[from].count++;
        }

        res.json(Object.values(senderMap).sort((a, b) => b.count - a.count));
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching emails from Gmail');
    }
});

app.post('/api/unsubscribe', async (req, res) => {
    const { url, mailto } = req.body;
    if (url) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded'  },
                body: 'List-Unsubscribe=One Click',
            });
            return res.json({ success: true });
        } catch {
            return res.json({ success: false });
        }
    }
    if (mailto) {
        return res.json({ success: true, note: 'mailto', mailto });;
    }
    res.json({ success: false });
});

app.use(express.static('.'));

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
