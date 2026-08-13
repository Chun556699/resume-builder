# PM2 部署配置（传统云服务器 / VPS 直接跑 Node）
# 用法：pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "resume-builder",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
