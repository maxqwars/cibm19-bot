module.exports = {
  apps: [
    {
      name: "cibm19bot",
      script: "./build/index.cjs",
      autorestart: true,
    },
  ],
};
