import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import memjs from "memjs";
import { env, cwd } from "node:process";
import { join } from "node:path";
import { BotCore } from "./modules/BotCore";
import logger from "./logger";
import { Telegraf } from "telegraf";
import testScript from "./scripts/testScript";
import justScript from "./scripts/justCommand";

import { Render } from "./components/Render";
import { Cache } from "./components/Cache";
import { Cryptography } from "./components/Cryptography";

config();

const TELEGRAM_BOT_TOKEN = env["TELEGRAM_BOT_TOKEN"];
const PRE_DEFINED_ADMINS = env["PRE_DEFINED_ADMINS"];
const DATA_ENCRYPTION_KEY = env["DATA_ENCRYPTION_KEY"];
const MODE = env["MODE"] || "development";
const MEMCACHED_HOSTS = env["MEMCACHED_HOSTS"];

const prisma = new PrismaClient();
const memClient = memjs.Client.create(MEMCACHED_HOSTS, {});
const cache = new Cache(memClient);
const render = new Render(join(cwd(), "./src/views"), cache);
const cryptography = new Cryptography(DATA_ENCRYPTION_KEY, cache);

const core = new BotCore(
  {
    scripts: [testScript(), justScript()],
    preDefinedAdmins: PRE_DEFINED_ADMINS.split(",").map((id) => Number(id)),
  },
  [
    {
      name: "cryptography",
      component: cryptography,
    },
    {
      name: "cache",
      component: cache,
    },
    {
      name: "render",
      component: render,
    },
  ],
);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

core
  .init(bot)
  .addMiddleware(bot, async (ctx, core) => {
    console.log(
      `Processing request from ${ctx.from.username}, stage: ${core.getSession(ctx.from.id).stage}`,
    );
  })
  .generateStageToScriptorMap()
  .bindScriptsCommands(bot)
  .bindOnMessageEvent(
    bot,
    async (ctx, core) => {
      ctx.reply(`no script`);
    },
    async (ctx, core) => {
      ctx.reply(`Error while execution`);
    },
  )
  .bindOnCallbackQueryEvent(bot);

async function runInDevelopment() {
  bot.launch(() => {
    logger.info(`[CBIM19] bot started...`);
  });
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

MODE === "production" ? runInDevelopment() : runInDevelopment();
