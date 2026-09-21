// Anyways for you idiots who need to know this is the backend yea nothing special

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import { ConfidentialClientApplication, PublicClientApplication } from '@azure/msal-node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';

// Gmail API setup

const app = express();
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false
}));

function createPkcePair() {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

function getOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET || undefined,
        process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:3000/api/gmail/callback'
    );
}

app.get('/api/gmail/connect', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).send('Gmail is not configured in this installation');
    }
    const oAuth2Client = getOAuthClient();
    const pkce = createPkcePair();
    req.session.gmailCodeVerifier = pkce.verifier;
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
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
        if (!req.query.code) {
            return res.status(400).send('Missing Gmail authorization code');
        }
        const { tokens } = await oAuth2Client.getToken({
            code: req.query.code,
            codeVerifier: req.session.gmailCodeVerifier,
        });
        delete req.session.gmailCodeVerifier;
        req.session.gmailTokens = tokens;
        req.session.save((err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Could not save Gmail session');
            }
            res.redirect('/dashboard.html');
        });
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

// Outlook shit

const msalClient = process.env.AZURE_CLIENT_ID
    ? (process.env.AZURE_CLIENT_SECRET
        ? new ConfidentialClientApplication({
            auth: {
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET,
                authority: 'https://login.microsoftonline.com/common',
            },
        })
        : new PublicClientApplication({
        auth: {
            clientId: process.env.AZURE_CLIENT_ID,
            authority: 'https://login.microsoftonline.com/common',
        },
        }))
    : null;

app.get('/api/outlook/connect', async (req, res) => {
    if (!msalClient || !process.env.AZURE_REDIRECT_URI) {
        return res.status(503).send('Outlook is not configured in this installation');
    }
    const pkce = createPkcePair();
    req.session.outlookCodeVerifier = pkce.verifier;
    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: ['Mail.Read'],
        redirectUri: process.env.AZURE_REDIRECT_URI,
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
    });
    res.redirect(authUrl);
});

app.get('/api/outlook/callback', async (req, res) => {
    if (!msalClient || !process.env.AZURE_REDIRECT_URI) {
        return res.status(503).send('Outlook is not configured in this installation');
    }
    try {
        const tokenResponse = await msalClient.acquireTokenByCode({
            code: req.query.code,
            scopes: ['Mail.Read'],
            redirectUri: process.env.AZURE_REDIRECT_URI,
            codeVerifier: req.session.outlookCodeVerifier,
        });
        delete req.session.outlookCodeVerifier;
        req.session.outlookToken = tokenResponse.accessToken;
        res.redirect('/dashboard.html?source=outlook');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error during Outlook OAuth callback');
    }
});

app.get('/api/outlook/scan', async (req, res) => {
    if (!req.session.outlookToken) {
        return res.status(401).send('Not authenticated with Outlook');
    }

    try {
        const response = await fetch (
            'https://graph.microsoft.com/v1.0/me/messages?$top=100&$select=from,internetMessageHeaders',
            { headers: { Authorization: `Bearer ${req.session.outlookToken}` } }
        );
        const data = await response.json();
        const senderMap = {};

        for (const msg of data.value || []) {
            const from = msg.from?.emailAddress?.address || 'unknown';
            const headers = msg.internetMessageHeaders || [];
            const listUnsub = headers.find((h) => h.name === 'list-unsubscribe')?.value || '';

            const urlMatch = listUnsub.match(/<((?:https?):[^>]+)>/i);
            const mailtoMatch = listUnsub.match(/<(mailto:[^>]+)>/i);

            if (!senderMap[from]) {
                senderMap[from]  = {
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
        res.status(500).json({ error: 'Failed to scan Outlook inbox.' });
    }
});

// Yahoo/Icloud/Any generic IMAP email provider setup

app.post('/api/imap/scan', async (req, res) => {
    const { host, user, pass } = req.body;
    if (!host || !user || !pass) {
        return res.status(400).json({ error: 'Host, email, and password are required' });
    }

    const client = new ImapFlow({
        host,
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false,
    });
    const senderMap = {};

    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
            const mailbox = client.mailbox;
            const total = mailbox.exists;
            const start = total > 150 ? total - 150 : 1;

            for await (const msg of client.fetch(`${start}:${total}`, {
                envelope: true,
                headers: ['list-unsubscribe'],
            })) {
                const addr = msg.envelope.from?.[0];
                if (!addr) continue;
                const from = `${addr.name || ''} <${addr.address}>`.trim();

                const rawHeader = msg.headers?.toString() || '';
                const match = rawHeader.match(/List-Unsubscribe:\s*(.*)/i);
                const headerValue = match ? match[1] : '';
                const urlMatch = headerValue.match(/<(https?:[^>]+)>/i);
                const mailtoMatch = headerValue.match(/<(mailto:[^>]+)>/i);

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
        } finally {
                lock.release();
            }

            await client.logout();
            res.json(Object.values(senderMap).sort((a, b) => b.count - a.count));
    } catch (err) {
        console.error(err);
        res.status(401).send('Could not connect. Check your credentials and IMAP settings.');
    }
});

const appRoot = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(appRoot));

app.listen(3000, '127.0.0.1', () => console.log('Server is running on http://127.0.0.1:3000'));
