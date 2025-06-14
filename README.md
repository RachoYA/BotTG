# BotTG

Это проект для работы с Telegram и OpenAI. Ниже приведены подробные шаги, которые помогут запустить систему даже без опыта программирования.

## Требования

- **Node.js 20**
- **PostgreSQL 16**
- **Python 3.11** (нужен для некоторых дополнительных инструментов)

Установите указанные программы заранее. В Replit все нужные версии уже указаны в файле `.replit`.

## Установка зависимостей

1. Склонируйте репозиторий:
   ```bash
   git clone <адрес репозитория>
   cd BotTG
   ```
2. Установите пакеты Node.js:
   ```bash
   npm install
   ```

## Файл `.env`

Скопируйте файл `.env.example` и заполните значения переменных окружения:

```bash
cp .env.example .env
```

После заполнения **не** размещайте этот файл в репозитории.
=======
Создайте в корне проекта файл `.env` и добавьте туда значения переменных окружения:
ё

```bash
DATABASE_URL=postgres://user:password@host:port/dbname
OPENAI_API_KEY=your_openai_key
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_PHONE_NUMBER=+71234567890
# не обязательно, будет создан автоматически после входа
TELEGRAM_SESSION_STRING=
```

Эти переменные используются в серверных файлах: `server/db.ts`, `server/ai.ts`, `server/telegram.ts` и других.

## Инициализация базы данных


Сначала создайте базу данных, указанную в `DATABASE_URL`. Например:
```bash
createdb your_db_name
```
После этого выполните команду:
=======
Выполните команду:

```bash
npm run db:push
```
Она создаст таблицы в вашей базе PostgreSQL с помощью Drizzle ORM.

## Запуск в режиме разработки

Команда
```bash
npm run dev
```
запустит сервер на порту **5000**. При первом запуске нужно авторизоваться в Telegram:
1. Отправьте номер телефона запросом POST на `/api/telegram/connect`.
2. Введите код подтверждения через `/api/telegram/verify`.

После успешной авторизации строка сессии сохранится в файл `.telegram_session` и переменную `TELEGRAM_SESSION_STRING`.

Этот файл содержит чувствительные данные, поэтому убедитесь, что он добавлен в `.gitignore` и не попадает в репозиторий.
=======


## Сборка и запуск в продакшене

Для сборки и старта выполните:
```bash
npm run build
npm run start
```

Это создаст папку `dist` и запустит приложение в режиме production.

---
Теперь проект полностью готов к запуску. Вам достаточно настроить переменные окружения и выполнить указанные команды. Сервер будет доступен на `http://localhost:5000`.
