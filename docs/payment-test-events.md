# RESET Clinic Shop: тестова форма оплати /admin/payment-test

Це окрема адмінсторінка для тесту подій Meta CAPI, а **не** реальний checkout.

## Механіка

Після натискання «Запустити тест» сервер обробляє послідовно:
- `InitiateCheckout` — відкриття сценарію оформлення;
- `AddPaymentInfo` — вибір способу оплати;
- `Purchase` — **лише змодельована** успішна покупка.

Усі три події надсилаються до Meta Conversions API з **обов'язковим**
`test_event_code`. Без нього немає виклику Meta — лише локальна симуляція.
Реальні транзакції Monobank, замовлення в D1, товарні залишки, повідомлення
Telegram, GA4/GTM і бойові browser Pixel events не змінюються.

## Налаштування

Cloudflare Workers & Pages → reset-clinic-shop → Settings → Variables and Secrets:

- `META_PIXEL_ID` — ID Pixel/Dataset, секрет не обов'язковий, але зручно зберігати як Secret.
- `META_CAPI_ACCESS_TOKEN` — **Secret**, токен Meta Conversions API.
- `META_TEST_EVENT_CODE` — необов'язковий **Secret**. Або ввести актуальний
  TEST-код вручну в адмінформі.

Код взяти: Meta Events Manager → потрібний Dataset/Pixel → Test Events.
Задавати токен у UI чи GitHub не потрібно.

## Як тестувати

1. Авторизуватися в /admin.
2. Відкрити /admin/payment-test.
3. Ввести умовну тестову суму та спосіб оплати.
4. За потреби вставити TEST-код Meta Events Manager.
5. Натиснути «Запустити тест».
6. Перевірити журнал, статуси Meta API та вкладку Test Events.
   «META ПРИЙНЯЛА» означає API-прийняття, не факт реальної оплати.

## Безпека

- Тільки адмін-сесія; POST з перевіркою Origin, noindex.
- Секрет доступу Meta не показується браузеру.
- Без тест-коду жоден фіктивний Purchase не відправляється в Meta.
- Ніяких введень номерів банківських карток та персональних даних клієнтів.
- Під час перевірки зовнішньої Meta API передається user-agent браузера
  адміністратора та синтетичний хеш ID тесту, а не контакти покупців.
- Це **не** тест Monobank acquiring і не перевірка реального webhook.
