// index.js
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

// ===== リンク永続化用ファイル =====
const LINKS_FILE = 'links.json';
let sentLinks = [];

// links.json があれば読み込む
if (fs.existsSync(LINKS_FILE)) {
  try {
    sentLinks = JSON.parse(fs.readFileSync(LINKS_FILE));
  } catch (e) {
    console.error('links.json 読み込み失敗', e);
    sentLinks = [];
  }
}

// ===== Webhook受信 =====
app.post('/webhook', (req, res) => {
  res.sendStatus(200);

  const events = req.body.events || [];
  events.forEach(async (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') return;

    const text = event.message.text;
    // 対象SNSリンクかチェック
    const regex = /(https?:\/\/(?:www\.)?(instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com)[^\s]*)/gi;
    const matches = text.match(regex);
    if (!matches) return;

    for (const url of matches) {
      if (sentLinks.includes(url)) {
        // 既出リンクなら警告
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ このリンクはすでに送られています',
        });
      } else {
        // 新規リンクなら保存
        sentLinks.push(url);
        fs.writeFileSync(LINKS_FILE, JSON.stringify(sentLinks, null, 2));
      }
    }
  });
});

// ===== Render対応ポートで起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
