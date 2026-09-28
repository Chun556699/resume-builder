// PM2 部署配置（standalone 产物运行）
//
// 本项目 `next.config.mjs` 使用 output: "standalone"，因此不能用 `next start`
// （Next 会警告 "next start does not work with output: standalone"），
// 应直接运行 standalone 产物里的 server.js。
//
// 用法（在部署目录内执行，目录需包含 server.js / .next / public / node_modules）：
//   pm2 start ecosystem.config.js
//
// 部署目录生成方式（本地构建后打包上传）：
//   npx next build
//   cp -a .next/standalone/. <部署目录>/
//   cp -r .next/static <部署目录>/.next/static
//   cp -r public <部署目录>/public
//   # 并将本文件与 .env.local 一并放入部署目录
//
// 若 3000 端口被占用，通过环境变量覆盖：PORT=3001 pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "resume-builder",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
