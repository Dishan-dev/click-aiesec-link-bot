module.exports = {
  apps: [
    {
      name: "aiesec-link-bot",
      script: "npm",
      args: "run start:xvfb",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
