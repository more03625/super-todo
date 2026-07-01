FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=3003
EXPOSE 3003

CMD ["npm", "run", "dev"]
