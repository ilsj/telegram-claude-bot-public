# Telegram Claude Bot

Telegram-бот на TypeScript (Telegraf), который отвечает пользователю с помощью Claude API. Хранит короткую историю диалога в памяти процесса (последние 20 сообщений на чат).

## Возможности

- `/start` — приветствие, сброс истории
- `/reset` — очистить историю диалога текущего чата
- `/help` — краткая справка
- Обычные текстовые сообщения обрабатываются через Claude API с учётом истории переписки

## Установка

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

- `TELEGRAM_BOT_TOKEN` — получите у [@BotFather](https://t.me/BotFather) в Telegram (команда `/newbot`)
- `ANTHROPIC_API_KEY` — создайте в [Anthropic Console](https://console.anthropic.com/)

## Запуск в режиме разработки

```bash
npm run dev
```

## Сборка и запуск в production

```bash
npm run build
npm start
```

## Структура проекта

```
src/
  index.ts       — вся логика бота
.env.example     — шаблон переменных окружения
tsconfig.json    — конфигурация TypeScript
```

## Идеи для развития

- Персистентная история диалогов (Redis, SQLite, Postgres) вместо хранения в памяти
- Стриминг ответов Claude (частичный вывод по мере генерации)
- Системный промпт с настройкой поведения/персоны бота
- Деплой на сервер (PM2, Docker) или serverless (webhook вместо long polling)
- Rate limiting и защита от спама
- Логирование и метрики использования
