# 多阶段构建 - 构建阶段
# 使用 Node 20 以满足 Solana 包的要求（需要 >= 20.18.0）
FROM node:20-alpine AS builder

WORKDIR /app

# 添加缓存破坏层，确保使用最新的基础镜像
ARG CACHE_BUST=1
RUN echo "Build cache bust: $CACHE_BUST"

# 安装构建工具（虽然我们会跳过脚本，但保留以防万一）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    build-base \
    linux-headers \
    eudev-dev \
    libusb-dev

# 设置 npm 配置，全局忽略脚本
RUN npm config set ignore-scripts true

# 复制依赖文件
COPY package*.json ./

# 安装依赖
# 使用 --ignore-scripts 跳过原生模块编译（前端项目不需要）
# 这样可以避免 USB 包的编译错误，同时不影响功能
RUN npm ci --only=production=false --ignore-scripts

# 接收构建参数
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段 - 使用 Nginx
FROM nginx:alpine

# 复制构建产物到 Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

