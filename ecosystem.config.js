module.exports = {
  apps: [
    {
      name: "aiesec-link-bot",
      script: "start.sh",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
