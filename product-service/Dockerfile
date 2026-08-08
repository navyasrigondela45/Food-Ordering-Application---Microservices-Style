FROM node:alpine
WORKDIR /myproduct .
COPY package*.json .
RUN npm install
COPY . .
CMD ["node", "server.js"]

