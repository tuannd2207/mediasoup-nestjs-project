# Dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN apt-get update && apt-get install -y python3 build-essential
EXPOSE $PORT
CMD ["npm", "run", "start"]