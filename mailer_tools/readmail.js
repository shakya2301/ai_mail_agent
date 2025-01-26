import { google } from 'googleapis';
import { authenticateGmail } from '../auth.js';
import parseEmailBody from '../utils/mailparser.js'; // Import the parser function

export async function fetchAndParseEmails(n) {
  const auth = await authenticateGmail();
  const gmail = google.gmail({ version: 'v1', auth });

  const dateNdaysAgo = new Date();
  dateNdaysAgo.setDate(dateNdaysAgo.getDate() - n);
  const queryDate = dateNdaysAgo.toISOString();

  // Get your email address to filter out sent emails
  const me = await gmail.users.getProfile({ userId: 'me' });
  const myEmail = me.data.emailAddress;

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox after:${Math.floor(new Date(queryDate).getTime() / 1000)} -from:${myEmail}`,
    maxResults: 10,
  });

  const messages = response.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No messages found.');
    return {};
  }

  const emailContent = {};

  for (const message of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });

    const headers = msg.data.payload.headers;
    const from = headers.find((header) => header.name === 'From')?.value || 'Unknown';
    const subject = headers.find((header) => header.name === 'Subject')?.value || 'No Subject';

    const body = parseEmailBody(msg.data);

    // Filter out emails with body length > 3000 characters
    if (body.length > 4000) {
      // console.log(`Skipping email with body length > 3000 characters.`);
      continue;
    }

    const senderEmail = from.match(/<(.+?)>/)?.[1] || from;

    emailContent[senderEmail] = emailContent[senderEmail] || [];
    emailContent[senderEmail].push({
      subject,
      body,
      date: headers.find((header) => header.name === 'Date')?.value,
    });
  }

  return emailContent;
}

// (async () => {
//   const n = 2; // Last 7 days
//   const emailData = await fetchAndParseEmails(n);
//   console.log(JSON.stringify(emailData, null, 2));
// })();
