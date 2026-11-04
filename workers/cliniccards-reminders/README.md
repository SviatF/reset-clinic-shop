# Cliniccards → Telegram: нагадування лікарям

Окремий Cloudflare Worker для Reset Clinic. Магазин на Next.js та його Worker не змінюються.

## Що робить

- Кожні **5 хв** отримує актуальні прийоми з `GET https://cliniccards.com/api/visits?from=YYYY-MM-DD&to=YYYY-MM-DD` з HTTP-заголовком `Token`. Запитує сьогодні та завтра за часом **Europe/Kyiv**, щоб не пропускати прийоми поблизу опівночі.
- Якщо до прийому **25–30 хв**, надсилає нагадування в Telegram-групу зі згадкою лікаря. Цей інтервал компенсує крок cron у 5 хв.
- Щодня в часовому вікні **09:00–09:29 за Києвом** надсилає **одну** зводку: загальна кількість і записи за лікарями з часом прийомів. Додаткове вікно дозволяє надолужити затриманий cron.
- Не надсилає скасовані/завершені прийоми: обробляє тільки дозволені статуси. Після перенесення запису нагадування прив'язане до нового часу.
- Зберігає в D1 тільки хеш-ключі повідомлень, стан доставки і час; не зберігає ПІБ, телефонів чи інших даних пацієнтів. Не надсилає персональні дані пацієнтів у Telegram.
- У разі помилки Cliniccards **не** робить хибної зводки «0 записів», а зупиняє виконання та пише безпечну помилку в журнал.

## Підготовка

1. У Cliniccards: **Налаштування → Інше → Налаштування клініки → Ключ API → Створити та показати**. Не вставляйте ключ у GitHub або публічне листування.
2. Створіть Telegram-бота через @BotFather, додайте його до **закритої** групи співробітників, дайте йому право писати повідомлення та визначте ID цієї групи (зазвичай `-100...`).
3. Зіставте кожному `doctor_id` у Cliniccards `telegram_id` користувача (надійна згадка) або `username`. Для згадки за `telegram_id` лікар повинен бути учасником групи, а Telegram може додатково обмежувати згадки залежно від налаштувань приватності. Зазвичай згадка через `@username` теж працює.
4. Потрібні Cloudflare Workers + D1 і права на розгортання.

### Розгортання

Виконуйте з кореня репозиторію:

```bash
npm install
npx wrangler login
npx wrangler d1 create reset-clinic-appointments-notifier
```

Скопіюйте створений `database_id` у `workers/cliniccards-reminders/wrangler.jsonc` замість `REPLACE_WITH_CREATED_D1_DATABASE_ID` (цей UUID не є секретом). Потім:

```bash
npx wrangler d1 execute reset-clinic-appointments-notifier --remote --file workers/cliniccards-reminders/schema.sql --config workers/cliniccards-reminders/wrangler.jsonc
npx wrangler secret put CLINICCARDS_API_KEY --config workers/cliniccards-reminders/wrangler.jsonc
npx wrangler secret put TELEGRAM_BOT_TOKEN --config workers/cliniccards-reminders/wrangler.jsonc
npx wrangler secret put TELEGRAM_CHAT_ID --config workers/cliniccards-reminders/wrangler.jsonc
npx wrangler secret put DOCTOR_TELEGRAM_MAP --config workers/cliniccards-reminders/wrangler.jsonc
npx wrangler deploy --config workers/cliniccards-reminders/wrangler.jsonc
```

Формат секрету `DOCTOR_TELEGRAM_MAP` (приклад, **не реальні ID**):

```json
{
  "101": { "name": "Лікарка Анна", "telegram_id": "123456789" },
  "102": { "name": "Лікар Олег", "username": "doctor_oleh" }
}
```

`101`/`102` — `doctor_id` із Cliniccards, **не** Telegram ID. Для визначення справжніх ID потрібна відповідь API клініки. Якщо лікар відсутній у мапі, Worker повідомить про запис із текстом `Лікар #<id>`, але **не зможе його тегнути** та запише попередження в лог.

Для нестандартних значень статусів в API додайте до `vars` конфігурації `CLINICCARDS_ACTIVE_STATUSES` як перелік через кому (за замовчуванням: `BOOKING,SCHEDULED,PLANNED,CONFIRMED,APPROVED`). Усі інші статуси пропускаються, включно зі скасованими. **Потрібно звірити фактичні статуси й форму відповіді API клініки до запуску в production**: Cliniccards може повертати різні поля залежно від налаштувань.

### Перевірки

```bash
node --experimental-strip-types --test workers/cliniccards-reminders/core.test.mjs
npx wrangler tail reset-clinic-appointments-notifier
```

У Cloudflare Worker → Triggers має бути `*/5 * * * *` (UTC). Код сам визначає **09:00 за Києвом** з урахуванням літнього/зимового часу.

## Обмеження та безпека

- Cliniccards має офіційну API-документацію на https://cliniccards.com/api; точний контракт **конкретного акаунта** треба перевірити після підключення API-ключа. GET `/visits`, `Token` і поля `visit_start`/`doctor_id` підтверджені прикладом незалежного інтегратора 4WP Booking: https://github.com/4wpdev/4wp-booking/blob/main/src/Providers/ClinicCards_Provider.php.
- Система працює лише **після** створення D1, додавання справжніх секретів та розгортання окремого Worker; коміт у репозиторій не вмикає нагадування автоматично.
- D1 блокує паралельні дублікати. Якщо Telegram прийняв повідомлення, а Worker перервався *до* запису успіху в D1, рідкісна повторна доставка можлива (стандартна межа at-least-once delivery).
- Відсутній публічний HTTP-ендпоінт. Перевіряйте доступ до Telegram-групи: туди не повинні потрапляти сторонні особи.
