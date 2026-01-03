# 使用 Node.js 20 Slim 版本作为基础镜像
# File API 在 Node 18 中是实验性的或不完全支持，升级到 Node 20 可解决 ReferenceError: File is not defined
FROM node:20-slim

# 安装构建依赖
# RocksDB 是 C++ 编写的，npm install 时需要编译原生模块
# python3, make, g++ 是 node-gyp 编译所需的标准工具链
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
#这是关键：这决定了代码运行的根目录
# 配合 Zeabur 的 Mount Directory: /app/data 使用
WORKDIR /app

# 优先复制依赖定义文件
# 利用 Docker 缓存机制：只要 package.json 没变，就不用重新 npm install
COPY package*.json ./

# 安装生产环境依赖
# --production 标志会跳过 devDependencies，减少镜像体积
RUN npm install --production

# 复制所有源代码到工作目录
COPY . .

# 暴露服务端口
EXPOSE 3001

# 启动命令
CMD ["node", "server.js"]
