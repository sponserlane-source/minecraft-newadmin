FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p minecraft/client/versions/1.20.1 minecraft/client/libraries minecraft/client/assets minecraft/forge minecraft/mods minecraft/config minecraft/logs && chmod +x scripts/start-forge-client.sh
ENV JAVA_PATH=java MINECRAFT_HOME=minecraft MINECRAFT_CLIENT_HOME=minecraft/client FORGE_HOME=minecraft/forge MOD_DIRECTORY=minecraft/mods
EXPOSE 3000 3001
CMD ["npm", "start"]
