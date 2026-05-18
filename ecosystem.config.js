module.exports = {
  apps: [
    {
      name: "aiesec-link-bot",
      script: "src/index.js",
      interpreter: "/usr/bin/xvfb-run",
      interpreter_args: "--auto-servernum --server-args='-screen 0 1280x1024x24' /usr/bin/node",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
