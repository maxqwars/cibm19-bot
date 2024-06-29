// Build-in node modules
import { env, cwd, report } from "node:process";
import { join } from "node:path";

// Third party modules
import { config } from "dotenv";
import { $Enums, PrismaClient } from "@prisma/client";
import memjs from "memjs";
import { BotCore } from "./modules/BotCore";
import { createLogger } from "./logger";
import { Telegraf } from "telegraf";

// Import Query callbacks
import { claimCallback } from "./lambdas/claimCallback";
import { reportCallback } from "./lambdas/reportCallback";

// Import scripts
import { helpCommand } from "./scripts/helpCommand";
import createOrganizationScript from "./scripts/createOrganization";
import { viewOrganizationsCommand } from "./scripts/viewOrganizationsCommand";
import { registerVolunteerScript as registerVolunteerScript } from "./scripts/registerVolunteerScript";
import { claimsCommand } from "./scripts/claimsCommand";
import { privacyCommand } from "./scripts/privacyCommand";
import { reportsCommand } from "./scripts/reportsCommand";
import { startCommand } from "./scripts/startCommand";
import { leaderboardCommand } from "./scripts/leaderboardCommand";
import { lockdownCommand } from "./scripts/lockdownCommand";
import { teamCommand } from "./scripts/teamCommand";
import { profileCommand } from "./scripts/profileCommand";
import { feedbackCommand } from "./scripts/feedbackCommand";
import { setCuratorCommand } from "./scripts/setCuratorCommand";
import { broadcastCommand } from "./scripts/broadcastCommand";
import { globalBroadcastCommand } from "./scripts/globalBroadcastCommand";
import { rmVolunteerCommand } from "./scripts/rmVolunteerCommand";
import { setAdminCommand } from "./scripts/setAdminCommand";
import { rmOrganizationCommand } from "./scripts/rmOrganizationCommand";

// Import additional components
import { Render } from "./components/Render";
import { Cache } from "./components/Cache";
import { Volunteers } from "./components/Volunteers";
import { Organizations } from "./components/Organizations";
import { Claims } from "./components/Claims";
import { Reports } from "./components/Reports";

// Import functions
import { isSocialUrl } from "./functions/isSocialUrl";

config();

/*
 * Read environment variables
 */
const TELEGRAM_BOT_TOKEN = env["TELEGRAM_BOT_TOKEN"];
const PRE_DEFINED_ADMINS = env["PRE_DEFINED_ADMINS"];
const MODE = env["MODE"] || "development";
const MEMCACHED_HOSTS = env["MEMCACHED_HOSTS"];

// Init external modules
const prisma = new PrismaClient();
const memClient = memjs.Client.create(MEMCACHED_HOSTS, {});
const logger = createLogger(MODE as "development" | "production");

// Init components
const cache = new Cache(memClient, logger);
const render = new Render(join(cwd(), "./src/views"), cache, logger);
const volunteers = new Volunteers(prisma, cache, logger);
const organizations = new Organizations(prisma, cache, logger);
const claims = new Claims(prisma, logger);
const reports = new Reports(prisma);

/*
 * Define used scripts
 */
const SCRIPTS = [
  helpCommand,
  createOrganizationScript,
  viewOrganizationsCommand,
  registerVolunteerScript,
  claimsCommand,
  privacyCommand,
  reportsCommand,
  startCommand,
  leaderboardCommand,
  lockdownCommand,
  teamCommand,
  profileCommand,
  feedbackCommand,
  setCuratorCommand,
  broadcastCommand,
  globalBroadcastCommand,
  rmVolunteerCommand,
  setAdminCommand,
  rmOrganizationCommand,
];

/*
 * Define used callback`s
 */
const CALLBACKS = [claimCallback, reportCallback];

/*
 * Define used components (modules)
 */
const COMPONENTS = [
  {
    name: "cache",
    component: cache,
  },
  {
    name: "render",
    component: render,
  },
  {
    name: "volunteers",
    component: volunteers,
  },
  {
    name: "organizations",
    component: organizations,
  },
  {
    name: "claims",
    component: claims,
  },
  {
    name: "reports",
    component: reports,
  },
];

// Create blaze-bot
const core = new BotCore(
  logger,
  {
    scripts: SCRIPTS,
    callbacks: CALLBACKS,
    preDefinedAdmins: PRE_DEFINED_ADMINS.split(",").map((id) => Number(id)),
  },
  COMPONENTS,
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
    const volunteers = core.getModule("volunteers") as Volunteers;
    const candidate = await volunteers.findVolunteerUnderTelegramId(ctx.from.id);

    if (!candidate) {
      const predefinedIds = PRE_DEFINED_ADMINS.split(",").map((str) => Number(str));

      try {
        await volunteers.createWithData({
          fio: "",
          telegramId: ctx.from.id,
          telegramUsername: `${ctx.from.username}`,
          telegramName: `${ctx.from.first_name} ${ctx.from.last_name}`,
          role: predefinedIds.find((id) => id === ctx.from.id) ? $Enums.ROLE.ADMIN : null,
        });
      } catch (err) {
        logger.error(`[top-level middleware] Failed create empty volunteer record, reason:`);
        logger.error(err.message);
        return;
      }
    }

    return;
  })
  .generateStageToScriptorMap()
  .bindScriptsCommands(bot)
  .bindOnMessageEvent(
    bot,
    async (ctx, core) => {
      const reports = core.getModule("reports") as Reports;
      const render = core.getModule("render") as Render;
      const volunteers = core.getModule("volunteers") as Volunteers;

      const volunteer = await volunteers.findVolunteerUnderTelegramId(ctx.from.id);

      logger.info(`[NO SCRIPT] Is social link: ${isSocialUrl(ctx.text.trim())}`);

      if (isSocialUrl(ctx.text.trim())) {
        const candidate = await reports.findReportFromVolunteerContainsPayload(volunteer.id, ctx.text.trim());

        if (candidate) {
          const replyContent = await render.render("report-already-created.txt", {});
          ctx.reply(replyContent);
          return;
        }

        await reports.create({
          payload: ctx.text.trim(),
          volunteerId: volunteer.id,
        });

        const replyMessage = await render.render("report-created.txt", {});
        ctx.reply(replyMessage);
        return;
      }

      const contentMessage = await render.render("no-script-err.txt", {});
      ctx.reply(contentMessage);
    },
    async (ctx, core) => {
      const render = core.getModule("render") as Render;
      const contentMessage = await render.render("error-while-script-proc.txt", {});
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
