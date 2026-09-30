FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock* ./
RUN npm install --include=dev --legacy-peer-deps
COPY . .
RUN python3 -m pip install --no-cache-dir --break-system-packages -r backend/requirements.txt
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
