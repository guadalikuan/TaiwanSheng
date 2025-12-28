# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装构建工具（用于编译原生模块如 usb）
# 注意：前端项目在浏览器中运行，实际不需要原生 USB 模块（使用 WebUSB API）
# 但为了通过构建，需要安装这些依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    build-base \
    linux-headers \
    eudev-dev \
    libusb-dev

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production=false

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

