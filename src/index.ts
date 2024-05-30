import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import memjs from "memjs";
import { env } from "node:process";
import { BotCore } from "./modules/BotCore";
import logger from "./logger";
import { Telegraf } from "telegraf";

config();

const TELEGRAM_BOT_TOKEN = env["TELEGRAM_BOT_TOKEN"];
const PRE_DEFINED_ADMINS = env["PRE_DEFINED_ADMINS"];
const DATA_ENCRYPTION_KEY = env["DATA_ENCRYPTION_KEY"];
const MODE = env["MODE"] || "development";
const MEMCACHED_HOSTS = env["MEMCACHED_HOSTS"];

const prisma = new PrismaClient();
const memClient = memjs.Client.create(MEMCACHED_HOSTS, {});

const core = new BotCore(
  {
    scripts: [],
    preDefinedAdmins: PRE_DEFINED_ADMINS.split(",").map((id) => Number(id)),
  },
  {},
);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

core
  .bindOnMessageEvent(bot)
  .bindOnCallbackQueryEvent(bot)
  .bindEntryPoints(bot)
  .generateFlowToScriptMap();

async function runInDevelopment() {
  bot.launch(() => {
    logger.info(`[CBIM19] bot started...`);
  });
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

MODE === "production" ? runInDevelopment() : runInDevelopment();
