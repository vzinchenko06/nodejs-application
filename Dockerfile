FROM node:14-alpine

RUN mkdir /app && chown -R node:node /app
WORKDIR /app
COPY . .
RUN npm i
USER node
EXPOSE 8000

CMD [ "node", "index.js"]
