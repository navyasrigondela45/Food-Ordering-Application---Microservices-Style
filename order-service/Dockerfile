FROM node:alpine
WORKDIR /myorder
COPY package*.json .
RUN npm install
COPY . .
CMD ["node", "server.js"]

