const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

// ===== LINE設定 =====
const client = new Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});

// ===== Supabase設定 =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ===== Webhook =====
app.post('/webhook', async (req, res) => {
  console.log('📩 Webhook received');
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    // ===== chatId 判定 =====
    const chatId =
      event.source.groupId ||
      event.source.roomId ||
      event.source.userId;

    // ===== chat_groups 参照 =====
    let { data: chatData } = await supabase
      .from('chat_groups')
      .select('db_group')
      .eq('chat_id', chatId)
      .maybeSingle();

    // なければ新規作成
    if (!chatData) {
      const newDbGroup = `group_${chatId.slice(0, 8)}`;

      await supabase.from('chat_groups').insert([
        {
          chat_id: chatId,
          db_group: newDbGroup,
        },
      ]);

      chatData = { db_group: newDbGroup };
    }

    const DB_GROUP = chatData.db_group;

    // ===== URL抽出 =====
    const text = event.message.text;
    const regex =
      /(https?:\/\/(?:www\.)?(instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com)[^\s]*)/gi;

    const matches = text.match(regex);
    if (!matches) continue;

    for (const url of matches) {
      // 既存チェック
      const { data } = await supabase
        .from('links')
        .select('url')
        .eq('url', url)
        .eq('db_group', DB_GROUP)
        .maybeSingle();

      if (data) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `⚠️ このリンクはすでに送られています\n${url}`,
        });
      } else {
        await supabase.from('links').insert([
          {
            url,
            db_group: DB_GROUP,
          },
        ]);
      }
    }
  }
});

// ===== Render対応 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

