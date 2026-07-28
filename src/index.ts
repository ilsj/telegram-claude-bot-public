import { Telegraf } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');
}
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY не задан в .env');
}

const bot = new Telegraf(BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Простая история диалогов в памяти: chatId -> сообщения
type Role = 'user' | 'assistant';
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
    'Привет! Я бот на базе Claude. Просто напиши мне сообщение, и я отвечу.\n\n' +
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
    'Напишите любое сообщение, и я отвечу с помощью Claude API.\n' +
      'Я запоминаю последние сообщения в рамках чата (используйте /reset, чтобы начать заново).'
  );
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userText = ctx.message.text;

  pushHistory(chatId, { role: 'user', content: userText });

  await ctx.sendChatAction('typing');

  try {
    const messages = getHistory(chatId).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const replyText =
      textBlock && 'text' in textBlock
        ? textBlock.text
        : 'Извините, не удалось получить ответ.';

    pushHistory(chatId, { role: 'assistant', content: replyText });

    await ctx.reply(replyText);
  } catch (err) {
    console.error('Ошибка при обращении к Claude API:', err);
    await ctx.reply(
      'Произошла ошибка при обращении к Claude API. Попробуйте позже или используйте /reset.'
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
