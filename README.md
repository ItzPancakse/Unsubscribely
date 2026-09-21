# Unsubscribely
my emails are too cluttered bro.

**Test it [here!](https://unsubscribely.pancakse.dev/)**

## Da problem.

Most inboxes are cluttered with newsletters, promotional emails, and other unwanted subscriptions. It can be overwhelming to manage and keep track of all these emails, leading to a less productive email experience.

## What Unsubscribely does.

Unsubscribely is a tool that helps users easily manage their email subscriptions. It allows users to quickly identify and unsubscribe from unwanted emails, helping to declutter their inbox and improve their email experience. With Unsubscribely, users can regain control over their inbox and focus on the emails that matter most to them.

## Supported email providers
- Gmail
- Outlook
- iCloud Mail
- Yahoo Mail

### Not Supported
- ProtonMail
Proton's zero-access encryption requires a local decryption proxy (Bridge) that only works when both the app and Bridge are run on the same machine which is incompatible with a hosted website.

## Setup guide (self host or local hosting)

### 1. Pre-requisites
- Node.js 20+ installed
- A Google account
- A Microsoft account

### 2. Clone the repository

```bash
git clone https://github.com/ItzPancakse/Unsubscribely.git && cd Unsubscribely
```

### 3. Install dependencies

```bash
npm install
```

### 3. Setup Gmail OAuth
1. google to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Gmail API** (API & Services > Library > Gmail API > Enable).
3. Configure the OAuth consent screen (API & Services > OAuth consent screen > Configure).
4. Add scopes for Gmail API (https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.modify).
5. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.
6. Copy the **Client ID** and **Client Secret** from the credentials page and add them to a `.env` file in the root of the project:

> **Note:** Gmail's scopes here are classified as "restricted," which requires a paid third-party security audit and multi-week review to fully publish for the public. This project runs in Testing mode instead so anyone added as a testing user can use Gmail.

### 4. Setup Outlook OAuth
1. Go to [Microsoft Azure Portal](https://portal.azure.com/) and create a new application registration.
2. Supported account types: "Any Entra ID Tenant + Personal Microsoft Account".
3. Platform: **Web**
4. Add the following redirect URI: `http://localhost:3000/auth/outlook/callback`.
5. Copy the client id from Overview and add it to your `.env` file.
6. Add the following API permissions:
   - Microsoft Graph > Delegated Permissions > `Mail.Read`.
7. Go to **Certificates & secrets** and create a new client secret. Copy the value and add it to your `.env` file.

### 5. Create the .env file

```bash
mv .env.example .env
```

### 6. Generate the session secret key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 7. Run the application

```bash
npm run prod
```

Then open in your browser `http://localhost:5173`

For iCloud or Yahoo no setup is needed just follow the guide in the getting started page!

## Limitations
- Outlook and Gmail are stuck in "testing mode" due to the OAuth scopes being classified as "restricted" and requiring a paid third-party security audit and multi-week review to fully publish for the public. This means that only users added as testing users can use Gmail and Outlook.
- ProtonMail is not supported due to its zero-access encryption requiring a local decryption proxy (Bridge) that only works when both the app and Bridge are run on the same machine which is incompatible with a hosted website.
- IMAP scans are capped at the ~150-200 most recent emails to keep the scan time reasonable. This means that if you have a lot of emails, some older emails may not be scanned for subscriptions.
- The app is currently in beta and may have bugs or issues. Please report any issues on the GitHub repository.

## Deployment notes

This app is a **persistent Express server**, not a serverless app. It need to be run on a server that can handle long-running processes. E.g Linode, DigitalOcean or pretty much any VPS provider. It can also be run on a local machine for personal use.
**Do not deploy this to Netlify or Vercel as-is!** Both platforms run code as short-lived serverless functions, which will not work for this app. If you want to deploy to Vercel or Netlify, you will need to modify the code to work with their serverless architecture.


## License
This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
