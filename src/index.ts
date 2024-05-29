// External modules from `node_modules/`
import { config } from "dotenv"; // Parse .env files
import { Context, Telegraf } from "telegraf"; // Telegram Bot framework
import { PrismaClient } from "@prisma/client"; // Database ORM tool
import memjs from "memjs";
import crypto from "node:crypto";

// Build-in node modules
import { cwd } from "node:process";
import { join } from "node:path";

// Bot modules
import { BotCore } from "./modules/BotCore"; // Main bot class, core functionality class

// Modules
import { Cryptography } from "./modules/Cryptography";
import { Cache } from "./modules/Cache";
import { Render } from "./modules/Render";

// Models
import { VolonteersModel } from "./models/VolonteersModel";
import { OrganizationsModel } from "./models/OrganizationsModel";
import { ReportsModel } from "./models/ReportsModel";

// Additional modules
import logger from "./logger"; // Built-in logger

// Read variables from environment
config(); // Read .env file if exist

/* ------------------------ Get environment variables ----------------------- */
const TG_BOT_TOKEN = process.env["TG_BOT_TOKEN"];
const ADMINISTRATORS_TG_IDS = process.env["ADMINISTRATORS_TG_IDS"];
const DATA_ENCRIPTION_KEY = process.env["DATA_ENCRIPTION_KEY"];
const TG_WEBHOOK_DOMAIN = process.env["TG_WEBHOOK_DOMAIN"];
const TG_WEBHOOK_PORT = process.env["TG_WEBHOOK_PORT"];
const MODE = process.env["MODE"] || "development";
const MEMCACHED_HOSTS = process.env["MEMCACHED_HOSTS"];

// for (const key in process.env) {
//   logger.info(`Env key: ${key}, value: ${process.env[key]}`);
// }

// Init external packages
const prisma = new PrismaClient(); // ORM tool
const memClient = memjs.Client.create(MEMCACHED_HOSTS, {}); // Memcached client

// Init modules
const cache = new Cache(memClient); // Get and set variables in RAM
const cryptography = new Cryptography(DATA_ENCRIPTION_KEY, cache); // Cryptographic operations module
const render = new Render(join(cwd(), "src/views"), cache); // Text templates modules

// Init models
const volonteers = new VolonteersModel(prisma, cache); // Volonteers data manipulations
const organizations = new OrganizationsModel(prisma, cache); // Organizations data manipulations
const reports = new ReportsModel(prisma, cache); // Reports data manipulations

// Init bot core functionality
const core = new BotCore(
  {
    volonteers,
    organizations,
    cryptography,
    cache,
    reports,
    render,
  },
  { superAdminId: ADMINISTRATORS_TG_IDS.split(",").map((id) => Number(id)) },
);

// Create telegraf bot
const bot = new Telegraf(TG_BOT_TOKEN);

// Create bot startup function
async function runInDevelopment() {
  bot.launch(() => {
    logger.info(`[CBIM19] bot started...`);
  });
}

async function runInProduction() {
  bot.launch({
    webhook: {
      domain: TG_WEBHOOK_DOMAIN,
      port: Number(TG_WEBHOOK_PORT),
      secretToken: crypto.randomBytes(64).toString("hex"),
    },
  });
}

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Add middleware
bot.use(async (ctx: Context, next) => {
  logger.info(
    `Processing message from @${ctx.from.username}, ID: ${ctx.from.id}`,
  );
  await core.initVolonteerData(ctx);
  await core.updateVolonteerData(ctx);
  await next();
});

/* ----------------------------- Common commands ---------------------------- */
bot.command("start", (context: Context) => core.start(context));
bot.command("help", (context: Context) => core.help(context));
bot.command("privacy", (context: Context) => core.privacy(context));
bot.command("cancel", (context) => core.cancel(context));
bot.command("profile", (context) => core.profile(context));

/* -------------------------- Adminstrator commands ------------------------- */
bot.command("create_org", (context: Context) =>
  core.createOrganization(context),
);

bot.command("set_curator", (context: Context) =>
  core.setCuratorForOrganization(context),
);

bot.command("orgs", (context: Context) => {
  core.listOfOrgs(context);
});

bot.command("reports", (context: Context) => core.lastReports(context));

/* -------------------------------------------------------------------------- */
/*                              Curator commands                              */
/* -------------------------------------------------------------------------- */

bot.command("claims", (context: Context) => core.claims(context));

/* ---------------------------- Unknown commands ---------------------------- */
bot.command("register", (context: Context) => {
  core.register(context);
});

// Bind raw message handler
bot.on(
  "message",
  async (ctx: Context) => await core.onMessageEventHandlerBasedOnScriptor(ctx),
);

// Bind callback_query handler
bot.on(
  "callback_query",
  async (ctx: Context) => await core.onCallbackQueryEventHandler(ctx),
);

// Statup bot
MODE === "production" ? runInProduction() : runInDevelopment();
