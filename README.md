# Семейный бюджет

Современное мобильное приложение для учёта семейного бюджета на React, Vite и PWA.

## Что реализовано

- Первый запуск с вводом начального баланса и сохранением в localStorage
- Главный экран с балансом, выбором месяца, доходами/расходами и последними операциями
- Экран добавления операции с выбором человека, типа, категории и суммой
- Экран статистики с ежемесячными итогами и разбивкой по категориям
- PWA-совместимость с manifest и service worker
- Интеграция с Google Apps Script API через JSONP для GET и fetch для POST

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

Приложение использует Google Apps Script API по адресу:

https://script.google.com/macros/s/AKfycbwrEtsTaCzgaF0OGDEApNa1WJd-Yof0Rx9vYQHXrd0CKMyQ7AeO/exec

Для корректной работы нужен доступ к API и корректная обработка ответа от Google Apps Script.
