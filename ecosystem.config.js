const path = require('path');

module.exports = {
  apps: [
    // ==============================
    // NEXT.JS APP
    // ==============================
    {
      name: "gaspoll",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: '1G',
      out_file: "logs/next-out.log",
      error_file: "logs/next-error.log",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    }
  ]
};
