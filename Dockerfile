# Timeweb Cloud App Platform - Frontend
FROM node:22

WORKDIR /app

# Копирование зависимостей и установка
COPY package.json package-lock.json ./
RUN npm ci

# Копирование кода и сборка
COPY . .
RUN npm run build

# Экспорт порта
EXPOSE 3000

# Запуск через preview (или установить serve)
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
