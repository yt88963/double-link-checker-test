const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');

const app = express();
app.use(bodyParser.json());

// ===== LINE設定 =====
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});

// ===== リンク保存 =====
const LINKS_FILE = 'links.json';
let sentLinks = [];

if (fs.existsSync(LINKS_FILE)) {
  try {
    sentLinks = JSON.parse(fs.readFileSync(LINKS_FILE));
  } catch {
    sentLinks = [];
  }
}

// ===== Webhook =====
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const text = event.message.text;
    const regex =
      /(https?:\/\/(?:www\.)?(instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com)[^\s]*)/gi;

    const matches = text.match(regex);
    if (!matches) continue;

    const duplicated = [];

    for (const url of matches) {
      if (sentLinks.includes(url)) {
        duplicated.push(url);
      } else {
        sentLinks.push(url);
      }
    }

    fs.writeFileSync(LINKS_FILE, JSON.stringify(sentLinks, null, 2));

    if (duplicated.length > 0) {
      const message =
        '⚠️ すでに送られているリンクがあります\n\n' +
        duplicated.map(u => `・${u}`).join('\n');

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: message,
      });
    }
  }
});

// ===== 起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
