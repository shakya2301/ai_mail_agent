import fs from 'fs';
import { google } from 'googleapis';
import express from 'express';

const app = express();

// Scopes define the API access your app needs
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = 'token.json';

export async function authenticateGmail() {
  const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if token already exists
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } else {
    // Generate the authentication URL
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this URL:', authUrl);

    // Set up the Express server
    app.get('/', async (req, res) => {
      const code = req.query.code;

      if (!code) {
        res.send('Authorization code not found in the URL.');
        return;
      }

      console.log('Authorization code received:', code);

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Save the token to disk for future use
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);

        res.send('Authentication successful! You can close this window.');
      } catch (error) {
        console.error('Error retrieving access token', error);
        res.send('Error during authentication.');
      }

      // Shut down the server after processing
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    const PORT = 3000; // Ensure your redirect URI in credentials.json is set to http://localhost:3000
    app.listen(PORT, () => {
      console.log(`Server is listening on http://localhost:${PORT}`);
    });

    // Return a promise that resolves when the process exits
    return new Promise(() => {
      console.log('Waiting for authentication...');
    });
  }
}

authenticateGmail();
