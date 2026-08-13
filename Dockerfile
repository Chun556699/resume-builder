# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

# 先复制依赖清单，利用缓存
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
# 运行时环境变量（构建期无需真实密钥，这里用占位符即可）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# 只复制 standalone 产物与静态资源（字体、worker）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
