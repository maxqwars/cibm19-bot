// Build-in node modules
import { env, cwd } from "node:process";
import { join } from "node:path";

// Third party modules
import { config } from "dotenv";
import { $Enums, PrismaClient } from "@prisma/client";
import memjs from "memjs";
import { BotCore } from "./modules/BotCore";
import logger from "./logger";
import { Telegraf } from "telegraf";

// import callback (for callbackQuery)
import testQueryCallback from "./lambdas/testQueryCallback";

// Import scripts
import helpCommand from "./scripts/helpCommand";
import createOrganizationScript from "./scripts/createOrganization";
import { viewOrganizationsCommand } from "./scripts/viewOrganizationsCommand";
import { registerVolonteerScript } from "./scripts/registerVolonteerScript";
import { claimsCommand } from "./scripts/claimsCommand";
import { privacyCommand } from "./scripts/privacyCommand";

// Import additionals components
import { Render } from "./components/Render";
import { Cache } from "./components/Cache";
import { Cryptography } from "./components/Cryptography";
import { Volonteers } from "./components/Volonteers";
import { Organizations } from "./components/Organizations";
import { Claims } from "./components/Claims";

import { calcMd5 } from "./functions/calcMd5";

config();

/* Get environment variables */
const TELEGRAM_BOT_TOKEN = env["TELEGRAM_BOT_TOKEN"];
const PRE_DEFINED_ADMINS = env["PRE_DEFINED_ADMINS"];
const DATA_ENCRYPTION_KEY = env["DATA_ENCRYPTION_KEY"];
const MODE = env["MODE"] || "development";
const MEMCACHED_HOSTS = env["MEMCACHED_HOSTS"];

// Init external modules
const prisma = new PrismaClient();
const memClient = memjs.Client.create(MEMCACHED_HOSTS, {});

// Init components
const cache = new Cache(memClient);
const render = new Render(join(cwd(), "./src/views"), cache);
const cryptography = new Cryptography(DATA_ENCRYPTION_KEY, cache);
const volonteers = new Volonteers(prisma);
const organizations = new Organizations(prisma);
const claims = new Claims(prisma);

const SCRIPTS = [
  helpCommand,
  createOrganizationScript,
  viewOrganizationsCommand,
  registerVolonteerScript,
  claimsCommand,
  privacyCommand,
];

const CALLBACKS = [testQueryCallback];

// Create blaze-bot
const core = new BotCore(
  {
    scripts: SCRIPTS,
    callbacks: CALLBACKS,
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
    {
      name: "volonteers",
      component: volonteers,
    },
    {
      name: "organizations",
      component: organizations,
    },
    {
      name: "calculateMd5",
      component: calcMd5,
    },
    {
      name: "claims",
      component: claims,
    },
  ],
);

// Create telegram bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Configure blaze-bot core
core
  .init(bot)
  .addMiddleware(bot, async (ctx, core) => {
    logger.info(
      `[Message logging] @${ctx.from.username}, <${ctx.text}>, stage <${core.getSession(ctx.from.id).stage}>`,
    );
  })
  .addMiddleware(bot, async (ctx, core) => {
    const volonteers = core.getModule("volonteers") as Volonteers;
    const candidate = await volonteers.findVolonteerUnderTelegramId(
      ctx.from.id,
    );

    if (!candidate) {
      const predefinedIds = PRE_DEFINED_ADMINS.split(",").map((str) =>
        Number(str),
      );

      await volonteers.createWithData({
        fio: "",
        telegramId: ctx.from.id,
        telegramUsername: `${ctx.from.username}`,
        telegramName: `${ctx.from.first_name} ${ctx.from.last_name}`,
        role: predefinedIds.find((id) => id === ctx.from.id)
          ? $Enums.ROLE.ADMIN
          : null,
      });
    }

    return;
  })
  .generateStageToScriptorMap()
  .bindScriptsCommands(bot)
  .bindOnMessageEvent(
    bot,
    async (ctx, core) => {
      const render = core.getModule("render") as Render;
      const contentMessage = await render.render("no-script-err.txt", {});
      ctx.reply(contentMessage);
    },
    async (ctx, core) => {
      const render = core.getModule("render") as Render;
      const contentMessage = await render.render(
        "error-while-script-proc.txt",
        {},
      );
      ctx.reply(contentMessage);
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
