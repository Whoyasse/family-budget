# Семейный бюджет

Современное мобильное приложение для учёта семейного бюджета на React, Vite и PWA.

## Что реализовано

- Первый запуск с вводом начального баланса и сохранением в localStorage
- Главный экран с балансом, выбором месяца, доходами/расходами и последними операциями
- Экран добавления операции с выбором человека, типа, категории и суммой
- Экран статистики с ежемесячными итогами и разбивкой по категориям
- PWA-совместимость с manifest и service worker
- Авторизация и данные семьи через Supabase с RLS-изоляцией

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

## Сборка

```bash
npm run build
```

## Деплой на GitHub Pages

1. Установите пакет gh-pages:

```bash
npm install --save-dev gh-pages
```

2. Добавьте в package.json:

```json
"homepage": "https://YOUR_USERNAME.github.io/YOUR_REPOSITORY",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Запустите:

```bash
npm run deploy
```

## Примечание

Для запуска укажите `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` в `.env.local`.
