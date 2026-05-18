module.exports = {
  apps: [
    {
      name: "aiesec-link-bot",
      script: "npm",
      args: "start",
      interpreter: "xvfb-run",
      interpreter_args: "--auto-servernum --server-args='-screen 0 1280x1024x24'",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
