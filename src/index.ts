import { Telegraf } from 'telegraf';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Можно переопределить модель через .env, если у выбранной закончится бесплатная квота
// (например, поставить gemini-2.5-flash-lite).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');
}
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY не задан в .env');
}

const bot = new Telegraf(BOT_TOKEN);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Простая история диалогов в памяти: chatId -> сообщения
type Role = 'user' | 'model';
interface HistoryMessage {
  role: Role;
  content: string;
}
const history = new Map<number, HistoryMessage[]>();
const MAX_HISTORY = 20;

function getHistory(chatId: number): HistoryMessage[] {
  if (!history.has(chatId)) {
    history.set(chatId, []);
  }
  return history.get(chatId)!;
}

function pushHistory(chatId: number, message: HistoryMessage) {
  const h = getHistory(chatId);
  h.push(message);
  while (h.length > MAX_HISTORY) {
    h.shift();
  }
}

bot.start((ctx) => {
  history.delete(ctx.chat.id);
  ctx.reply(
    'Привет! Я бот на базе Gemini. Просто напиши мне сообщение, и я отвечу.\n\n' +
      'Команды:\n' +
      '/reset — очистить историю диалога\n' +
      '/help — помощь'
  );
});

bot.command('reset', (ctx) => {
  history.delete(ctx.chat.id);
  ctx.reply('История диалога очищена.');
});

bot.help((ctx) => {
  ctx.reply(
    'Напишите любое сообщение, и я отвечу с помощью Gemini API.\n' +
      'Я запоминаю последние сообщения в рамках чата (используйте /reset, чтобы начать заново).'
  );
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userText = ctx.message.text;

  pushHistory(chatId, { role: 'user', content: userText });

  await ctx.sendChatAction('typing');

  try {
    const contents = getHistory(chatId).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });

    const replyText = response.text?.trim() || 'Извините, не удалось получить ответ.';

    pushHistory(chatId, { role: 'model', content: replyText });

    await ctx.reply(replyText);
  } catch (err) {
    console.error('Ошибка при обращении к Gemini API:', err);
    await ctx.reply(
      'Произошла ошибка при обращении к Gemini API. Попробуйте позже или используйте /reset.'
    );
  }
});

bot.catch((err, ctx) => {
  console.error(`Необработанная ошибка для ${ctx.updateType}:`, err);
});

bot.launch();
console.log('Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
