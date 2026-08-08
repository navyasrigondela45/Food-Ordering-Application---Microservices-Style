FROM node:alpine as build
WORKDIR /myapp
COPY package*.json .
RUN npm install
COPY . .

FROM node:alpine as final
WORKDIR /myapp
COPY --from=build /myapp/server.js ./server.js
COPY --from=build /myapp/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "server.js"]
