import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = '7694363257:AAEkADLlXjLcP2hgNSEeS6ZJc5t3rHWz4oE';
const SUPABASE_URL = 'https://kafvtdszpzoxschezoqc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZnZ0ZHN6cHpveHNjaGV6b3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzYxMzUsImV4cCI6MjA2NzkxMjEzNX0.wcP_N1j5dKXbnvskcYdx2e-OW2m7M1mVZafhk9HBXgs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function checkTelegramAuth(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return hmac === hash;
}

const app = express();
app.use(express.json());

app.post('/api/auth/telegram', async (req, res) => {
  const { initData, initDataUnsafe } = req.body;
  if (!checkTelegramAuth(initData, TELEGRAM_BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid Telegram signature' });
  }
  const tgUser = initDataUnsafe.user;
  const email = `tg_${tgUser.id}@telegram.local`;

  // Check if user exists
  let { data: user, error } = await supabase.auth.admin.getUserByEmail(email);
  if (!user) {
    // Create user if not exists
    ({ data: user, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        telegram_id: tgUser.id,
        photo_url: tgUser.photo_url,
        username: tgUser.username,
      },
    }));
  }
  if (error) return res.status(500).json({ error: error.message });

  // You can now send a magic link or just return success
  res.json({ success: true, user });
});

app.listen(4000, () => console.log('Server running on http://localhost:4000')); 