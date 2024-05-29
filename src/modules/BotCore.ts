// External modules
import { Context, Markup } from "telegraf";

// Build-in node modules
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";

// Etc
import logger from "../logger";

// Helpers
import { calculateHash } from "../helpers/calculateHash";
import { isWebLink } from "../helpers/isWebLink";
import { HandlerType, Scriptor } from "../helpers/Scriptor";

// Models
import { OrganizationsModel } from "../models/OrganizationsModel";

// Modules
import { Render } from "../modules/Render";
import { ReportsModel } from "../models/ReportsModel";
import { Cache } from "../modules/Cache";
import { Cryptography } from "../modules/Cryptography";
import { VolonteersModel } from "../models/VolonteersModel";
import { advancedScript2 } from "../scripts/advanced2";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const CONTENT_TO_HELP_COMMAND_MAP = {
  admin: "bot_help_message_for_admin.txt",
  curator: "bot_help_message_for_curator.txt",
  member: "bot_help_message_for_member.txt",
  unknown: "bot_help_message_for_unknown.txt",
  start: "bot_start_message.txt",
  privacy: "bot_privacy_message.txt",
};

/* -------------------------------------------------------------------------- */
/*                                    ENUMS                                   */
/* -------------------------------------------------------------------------- */

enum FLOW_HANDLERS {
  // default, clear state
  NONE = "NONE",

  // registration flow
  REG_SEND_REAL_NAME = "REG_SEND_REAL_NAME",
  REG_SELECT_ORG = "REG_SELECT_ORG",

  // set curator flow
  SET_CUR_SEND_USERNAME = "SET_CUR_SEND_USERNAME",
  SET_CUR_SELECT_ORG = "SET_CUR_SELECT_ORG",

  // create org flow
  CREATE_ORG_ORG_NAME = "CREATE_ORG_ORG_NAME",
}

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type BotCoreContextType = {
  id: number;
  role: string;
  name: string;
  tgId: number;
  tgUsername: string;
  tgName: string;
  flowNextHandlerKey: FLOW_HANDLERS;
  latestMessage: string;
  memberOf: number | null;
};

type RawMessageHandlerType = {
  (ctx: Context, coreContext: BotCoreContextType): Promise<void>;
};

type HandlersCollectionType = {
  [key: string]: RawMessageHandlerType;
};

type CallbackQueryHandlerType = {
  (ctx: Context, coreContext: BotCoreContextType): Promise<void>;
};

type CallbackQueryHandlersCollectionType = {
  [key: string]: CallbackQueryHandlerType;
};

/* -------------------------------------------------------------------------- */
/*                           Bot Core implmentation                           */
/* -------------------------------------------------------------------------- */

type BotCoreDependencies = {
  volonteers: VolonteersModel;
  organizations: OrganizationsModel;
  cryptography: Cryptography;
  cache: Cache;
  reports: ReportsModel;
  render: Render;
};

type BotCoreOptions = {
  superAdminId: number[];
  scripts: Scriptor[];
};

export class BotCore {
  private readonly _superAdminId: number[];
  private readonly _scripts: Scriptor[];

  private readonly _volonteers: VolonteersModel;
  private readonly _organizations: OrganizationsModel;
  private readonly _cryptography: Cryptography;
  private readonly _cache: Cache;
  private readonly _reports: ReportsModel;
  private readonly _render: Render;

  /* -------------------------- Raw message handlers -------------------------- */
  private readonly _unknownHandlers: HandlersCollectionType = {};
  private readonly _adminHandlers: HandlersCollectionType = {};
  private readonly _memberHandlers: HandlersCollectionType = {};
  private readonly _curatorHandlers: HandlersCollectionType = {};
  private readonly _rawHandlers: { [key: string]: HandlersCollectionType };

  /* ------------------------- Callback query handlers ------------------------ */
  private readonly _curatorCbQueryHandlers: CallbackQueryHandlersCollectionType;
  private readonly _cbQueryHandlers: {
    [key: string]: CallbackQueryHandlersCollectionType;
  };

  constructor(deps: BotCoreDependencies, options: BotCoreOptions) {
    this._superAdminId = options.superAdminId;
    this._scripts = options.scripts;

    // Set dependencies modules
    this._volonteers = deps.volonteers;
    this._organizations = deps.organizations;
    this._cryptography = deps.cryptography;
    this._cache = deps.cache;
    this._reports = deps.reports;
    this._render = deps.render;

    this._adminHandlers = {
      [FLOW_HANDLERS.CREATE_ORG_ORG_NAME]:
        this._createOrganizationUsingName.bind(this),
      [FLOW_HANDLERS.SET_CUR_SEND_USERNAME]:
        this._setCuratorEnterUsernameStage.bind(this),
      [FLOW_HANDLERS.SET_CUR_SELECT_ORG]:
        this._setCuratorSelectOrganizationStage.bind(this),
    };

    this._unknownHandlers = {
      [FLOW_HANDLERS.REG_SEND_REAL_NAME]: this._registerSendName.bind(this),
      [FLOW_HANDLERS.REG_SELECT_ORG]: this._registerSelectOrg.bind(this),
    };

    this._memberHandlers = {
      [FLOW_HANDLERS.NONE]: this._sendReport.bind(this),
    };

    this._curatorHandlers = {
      [FLOW_HANDLERS.NONE]: this._sendReport.bind(this),
    };

    this._rawHandlers = {
      unknown: this._unknownHandlers,
      admin: this._adminHandlers,
      member: this._memberHandlers,
      curator: this._curatorHandlers,
    };

    this._curatorCbQueryHandlers = {
      ["accept_claim"]: this._updateClaimStatus.bind(this),
      ["reject_claim"]: this._updateClaimStatus.bind(this),
    };

    this._cbQueryHandlers = {
      curator: this._curatorCbQueryHandlers,
    };
  }

  // Getters
  get volonteers() {
    return this._volonteers;
  }

  get organizations() {
    return this._organizations;
  }

  get scripts() {
    return this._scripts;
  }

  private async _readFileFromContentDir(filename) {
    const contentDir = join(cwd(), "./src/content");
    const cached = await this._cache.get(filename);

    if (cached) return cached.toString();

    const content = await readFile(join(contentDir, filename), {
      encoding: "utf-8",
    });

    await this._cache.set(filename, content, 30);
    return content;
  }

  async getCoreContext(telegramId: number): Promise<BotCoreContextType | null> {
    const volonteer =
      await this._volonteers.findVolonteerByTelegramId(telegramId);

    if (volonteer) {
      return {
        id: volonteer.id,
        role: volonteer.role,
        name: volonteer.name,
        tgId: volonteer.telegramId as unknown as number,
        tgUsername: volonteer.telegramUsername,
        tgName: volonteer.telegramName,
        flowNextHandlerKey:
          volonteer.flowNextHandlerKey as unknown as FLOW_HANDLERS,
        latestMessage: volonteer.latestMessage,
        memberOf: volonteer.organizationId,
      };
    }

    return null;
  }

  async flush(telegramId: number): Promise<void> {
    logger.info(`Flush dynamic parameters for ${telegramId}`);
    const { id } = await this._volonteers.findVolonteerByTelegramId(telegramId);
    await this._volonteers.updateVolonteerLatestMessage(id, "");
    await this._volonteers.updateVolonteerFlowNextHandlerKey(
      id,
      String(FLOW_HANDLERS.NONE),
    );
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                               Common commands                              */
  /* -------------------------------------------------------------------------- */

  async help(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);
    const content = await this._readFileFromContentDir(
      CONTENT_TO_HELP_COMMAND_MAP[coreContext.role],
    );
    context.reply(content);
  }

  async start(context: Context) {
    const content = await this._readFileFromContentDir(
      CONTENT_TO_HELP_COMMAND_MAP.start,
    );
    context.reply(content);
  }

  async privacy(context: Context) {
    const content = await this._readFileFromContentDir(
      CONTENT_TO_HELP_COMMAND_MAP.privacy,
    );
    context.reply(content);
  }

  async cancel(context: Context) {
    await this.flush(context.from.id);
    const content = await this._render.render("flush_complete.txt", {});
    context.reply(content);
  }

  async initVolonteerData(context: Context) {
    const targetIdIsAdmin = this._superAdminId.find(
      (id) => context.from.id === id,
    );

    await this._volonteers.createVolonteerUsingTelegramData({
      role: targetIdIsAdmin ? "admin" : "unknown",
      telegramUsername: context.from.username,
      telegramName: context.from.first_name + " " + context.from.last_name,
      telegramId: context.from.id,
    });

    return;
  }

  async updateVolonteerData(context: Context) {
    const { telegramName, telegramUsername, id } =
      await this._volonteers.findVolonteerByTelegramId(context.from.id);

    const targetIdIsAdmin = this._superAdminId.find(
      (id) => context.from.id === id,
    );

    if (targetIdIsAdmin) {
      await this._volonteers.updateVolonteerRole(id, "admin");
    }

    const {
      from: { username, first_name, last_name },
    } = context;

    if (telegramName !== `${first_name} ${last_name}`) {
      await this._volonteers.updateVolonteerTelegramName(
        id,
        `${first_name} ${last_name}`,
      );
    }

    if (telegramUsername !== username) {
      await this._volonteers.updateVolonteerTelegramUsername(id, username);
    }
  }

  async onMessageEventHandler(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);
    const handlersCollection = this._rawHandlers[coreContext.role] || null;
    const handler = handlersCollection[coreContext.flowNextHandlerKey];

    try {
      await handler(context, coreContext);
      return;
    } catch (err) {
      logger.error(
        `Error in ${coreContext.flowNextHandlerKey} message context:`,
      );
      logger.error(err.message);
      const replyContent = await this._render.render("unknown_error.txt", {});
      context.reply(replyContent);
      return;
    }
  }

  async onMessageEventHandlerBasedOnScriptor(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);
    const scripts = [advancedScript2];
    const mapping: { [key: string]: HandlerType } = {};

    //  { [key: string]: HandlerType }

    for (const script of scripts) {
      const { stages } = script;

      for (const stage of stages) {
        mapping[stage] = script.handler;
      }
    }

    try {
      const scriptHandler = mapping[coreContext.flowNextHandlerKey];
      await scriptHandler(context, coreContext, this);
      return;
    } catch (err) {
      logger.error(
        `Failed complete script stage '${coreContext.flowNextHandlerKey}', reason:`,
      );
      logger.error(err.message);
      const replyContent = await this._render.render("unknown_error.txt", {});
      context.reply(replyContent);
      return;
    }
  }

  async onCallbackQueryEventHandler(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);
    const collection = this._cbQueryHandlers[coreContext.role] || null;
    const data = context.callbackQuery["data"];
    const [key, payload] = data.split("=");
    const handler = collection[key];

    logger.info(`Processing callback query, key: ${key}, payload: ${payload}`);

    try {
      await handler(context, coreContext);
      return;
    } catch (err) {
      logger.error(`Error while processing callbackQuery: ${key}`);
      logger.error(err.message);
      return;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                Raw handlers                                */
  /* -------------------------------------------------------------------------- */

  private async _createOrganizationUsingName(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "admin") {
      const replyMessageContent = await this._render.render(
        "no_access.txt",
        {},
      );
      context.reply(replyMessageContent);
      return;
    }

    const candidate = await this._organizations.findOrgByName(context.text);

    if (candidate) {
      const replyContent = await this._render.render(
        "org_name_already_register.txt",
        { orgName: candidate.name },
      );
      context.reply(replyContent);
      return;
    }

    const newOrg = await this._organizations.createOrganization(context.text);

    const replyContent = await this._render.render("org_created.txt", {
      orgName: newOrg.name,
    });
    context.reply(replyContent);

    await this.flush(context.from.id);
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                       Administrator specific commands                      */
  /* -------------------------------------------------------------------------- */

  async listOfOrgs(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "admin") {
      const replyContent = await this._render.render("no_access.txt", {});
      context.reply(replyContent);
      return;
    }

    let formattedOrgsList = "👻";
    const orgs = await this._organizations.getAllOrgs();

    if (orgs.length > 0) {
      formattedOrgsList = "";
      for (const org of orgs) {
        formattedOrgsList += `[${org.id}] [${org.name}] [${org.closed ? "🔒" : "🔓"}]\n`;
      }
    }

    const replyContent = await this._render.render("list_of_orgs.txt", {
      formattedOrgsList,
    });
    context.reply(replyContent);
    return;
  }

  async createOrganization(context: Context) {
    const botCoreContext = await this.getCoreContext(context.from.id);

    if (botCoreContext.role !== "admin") {
      const replyMessageContent = await this._render.render(
        "no_access.txt",
        {},
      );
      context.reply(replyMessageContent);
      return;
    }

    this._volonteers.updateVolonteerFlowNextHandlerKey(
      botCoreContext.id,
      String(FLOW_HANDLERS.CREATE_ORG_ORG_NAME),
    );

    const replyMessageContent = await this._render.render(
      "enter_new_org_name.txt",
      {},
    );

    context.reply(replyMessageContent);
    return;
  }

  private async _updateClaimStatus(
    context: Context,
    coreContext: BotCoreContextType,
  ) {
    const data = context.callbackQuery["data"];
    const [key, payload] = data.split("=");
    const claim = await this._organizations.getFullClaimInfo(Number(payload));

    const {
      chat: { id },
      callbackQuery: {
        inline_message_id,
        message: { message_id },
      },
    } = context;

    if (key === "accept_claim") {
      await this._volonteers.updateVolonteerRole(claim.volonteer.id, "member");
      await this._organizations.removeClaim(claim.id);
      await this._organizations.addMember(
        claim.volonteer.id,
        claim.organization.id,
      );

      const acceptContent = await this._render.render(
        "you_claim_accepted.txt",
        {
          claimId: claim.id,
          curatorUsername: coreContext.tgUsername,
        },
      );

      context.telegram.sendMessage(
        Number(claim.volonteer.telegramId),
        acceptContent,
      );

      const replaceContent = await this._render.render(
        "updated_claim_info.txt",
        {
          name: claim.volonteer.name,
          name2: claim.volonteer.telegramName,
          username: claim.volonteer.telegramUsername,
          status: "✔",
        },
      );

      // Change inline message text
      context.telegram.editMessageText(
        id,
        message_id,
        inline_message_id,
        replaceContent,
      );

      return;
    } else {
      const replaceContent = await this._render.render(
        "updated_claim_info.txt",
        {
          name: claim.volonteer.name,
          name2: claim.volonteer.telegramName,
          username: claim.volonteer.telegramUsername,
          status: "❌",
        },
      );

      await this._organizations.removeClaim(claim.id);

      const rejectContent = await this._render.render(
        "you_claim_rejected.txt",
        {
          claimId: claim.id,
          curatorUsername: coreContext.tgUsername,
        },
      );

      context.telegram.sendMessage(
        Number(claim.volonteer.telegramId),
        rejectContent,
      );

      context.telegram.editMessageText(
        id,
        message_id,
        inline_message_id,
        replaceContent,
      );
      return;
    }
  }

  private async _setCuratorEnterUsernameStage(
    context: Context,
    coreContext: BotCoreContextType,
  ) {
    const volonteer = await this._volonteers.findVolonteerByTelegramUsername(
      context.text,
    );

    if (!volonteer) {
      const replyContent = await this._render.render(
        "volonteer_under_username_not_found.txt",
        { username: volonteer.telegramUsername },
      );
      context.reply(replyContent);
      return;
    }

    let formattedOrgsList = "👻";
    const orgs = await this._organizations.getAllOrgs();

    if (orgs.length > 0) {
      formattedOrgsList = "";
      for (const org of orgs) {
        formattedOrgsList += `${org.id} -> ${org.name}\n`;
      }
    }

    const replyContent = await this._render.render(
      "volonteer_under_username_found_select_org.txt",
      { username: volonteer.telegramUsername, orgsList: formattedOrgsList },
    );

    context.reply(replyContent);
    await this._volonteers.updateVolonteerFlowNextHandlerKey(
      coreContext.id,
      FLOW_HANDLERS.SET_CUR_SELECT_ORG,
    );
    await this._volonteers.updateVolonteerLatestMessage(
      coreContext.id,
      context.text,
    );
    return;
  }

  private async _setCuratorSelectOrganizationStage(
    context: Context,
    coreContext: BotCoreContextType,
  ) {
    console.log("coreContext.latestMessage", coreContext.latestMessage);
    console.log("context.text", context.text);

    const organization = await this._organizations.findOrgById(
      Number(context.text),
    );

    const volonteer = await this._volonteers.findVolonteerByTelegramUsername(
      coreContext.latestMessage,
    );

    const isMember = await this._organizations.memberOf(
      volonteer.id,
      organization.id,
    );

    if (isMember) {
      context.reply("is member");
      return;
    }

    // Add volonteer to organization members list
    await this._organizations.addMember(volonteer.id, organization.id);

    // Change volonteer role
    await this._volonteers.updateVolonteerRole(volonteer.id, "curator");

    // Send new curator notify message
    const messageContent = await this._render.render(
      "you_now_curator_notify.txt",
      {
        adminUsername: coreContext.tgUsername,
        orgName: organization.name,
      },
    );

    context.telegram.sendMessage(Number(volonteer.telegramId), messageContent);

    const replyContent = await this._render.render("set_curator_success.txt", {
      volonteerUsername: volonteer.telegramUsername,
      orgName: organization.name,
    });

    context.reply(replyContent);

    await this.flush(coreContext.tgId);
    return;
  }

  async setCuratorForOrganization(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "admin") {
      const replyMessageContent = await this._render.render(
        "no_access.txt",
        {},
      );
      context.reply(replyMessageContent);
      return;
    }

    await this._volonteers.updateVolonteerFlowNextHandlerKey(
      coreContext.id,
      String(FLOW_HANDLERS.SET_CUR_SEND_USERNAME),
    );

    const replyContent = await this._render.render(
      "send_curator_username.txt",
      {},
    );

    context.reply(replyContent);
    return;
  }

  async addAdmin(context: Context) {}

  async statistic(context: Context) {}

  /* -------------------------------------------------------------------------- */
  /*                          Curator specific commands                         */
  /* -------------------------------------------------------------------------- */

  async claims(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "curator") {
      const replyContent = await this._render.render("no_access.txt", {});
      context.reply(replyContent);
      return;
    }

    const claims = await this._organizations.getClaims(coreContext.memberOf);

    if (claims.length === 0 || claims === null) {
      const replyContent = "No claims";
      context.reply(replyContent);
      return;
    }

    for (const claim of claims) {
      const volonteerData = await this._volonteers.findVolonteerById(
        claim.volonteerId,
      );

      const messageContent = await this._render.render("claim_info.txt", {
        name: volonteerData.name,
        name2: volonteerData.telegramName,
        username: volonteerData.telegramUsername,
      });

      context.telegram.sendMessage(
        Number(coreContext.tgId),
        messageContent,
        Markup.inlineKeyboard([
          Markup.button.callback("✅", `accept_claim=${claim.id}`),
          Markup.button.callback("❌", `reject_claim=${claim.id}`),
        ]),
      );
    }

    context.reply("Use inline buttons for accept or reject claim");
    return;
  }

  async members(context: Context) {}

  /* -------------------------------------------------------------------------- */
  /*                          Member specific commands                          */
  /* -------------------------------------------------------------------------- */

  async sendCuratorMessage() {}

  /* -------------------------------------------------------------------------- */
  /*                      Context specific common commands                      */
  /* -------------------------------------------------------------------------- */

  async profile(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    switch (coreContext.role) {
      case "unknown": {
        const replyMessage = await this._render.render(
          "you_not_registered.txt",
          {},
        );
        context.reply(replyMessage);
        break;
      }

      case "admin": {
        const replyMessage = await this._render.render("you_admin.txt", {});
        context.reply(replyMessage);
        break;
      }

      case "member": {
        const replyMessage = await this._render.render(
          "member_profile.txt",
          {},
        );
        context.reply(replyMessage);
        break;
      }

      case "curator": {
        const replyMessage = await this._render.render(
          "cuator_profile.txt",
          {},
        );
        context.reply(replyMessage);
        break;
      }

      default: {
        const replyMessage = await this._render.render("unknown_error.txt", {});
        context.reply(replyMessage);
        return;
      }
    }

    return;
  }

  async organization(context: Context) {}

  async sendMessageToAdmin(context: Context) {}

  async announcement(context: Context) {}

  /* -------------------------------------------------------------------------- */
  /*                          Unknown specific commands                         */
  /* -------------------------------------------------------------------------- */

  async register(context: Context) {
    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "unknown") {
      const replyContent = await this._render.render(
        "registration_not_required.txt",
        {},
      );
      context.reply(replyContent);
      return;
    }

    const claim = await this._organizations.getVolonteerClaims(coreContext.id);

    if (claim !== null) {
      const replyContent = await this._render.render(
        "claim_already_pending.txt",
        { claimId: claim.id },
      );
      context.reply(replyContent);
      await this.flush(context.from.id);
      return;
    }

    const replyContent = await this._render.render("enter_real_name.txt", {});
    context.reply(replyContent);

    await this._volonteers.updateVolonteerFlowNextHandlerKey(
      coreContext.id,
      FLOW_HANDLERS.REG_SEND_REAL_NAME,
    );

    return;
  }

  private async _registerSelectOrg(
    context: Context,
    coreContext: BotCoreContextType,
  ) {
    const org = await this._organizations.findOrgById(
      Number(context.text.trim()),
    );

    if (!org) {
      let formattedOrgsList = "👻";
      const orgs = await this._organizations.getOpenOrgs();

      if (orgs.length > 0) {
        formattedOrgsList = "";
        for (const org of orgs) {
          formattedOrgsList += `${org.id} -> ${org.name}\n`;
        }
      }

      const replyContent = await this._render.render(
        "org_not_found_retry.txt",
        { openOrgsList: formattedOrgsList },
      );
      context.reply(replyContent);
      return;
    }

    const createdClaim = await this._organizations.createClaim(
      coreContext.id,
      org.id,
    );

    const replyContent = await this._render.render(
      "claim_created_wait_response.txt",
      { claimId: createdClaim.id },
    );

    context.reply(replyContent);
    await this.flush(context.from.id);
  }

  private async _registerSendName(
    context: Context,
    coreContext: BotCoreContextType,
  ) {
    await this._volonteers.updateVolonteerName(
      coreContext.id,
      context.text.trim(),
    );

    let formattedOrgsList = "👻";
    const orgs = await this._organizations.getOpenOrgs();

    if (orgs.length > 0) {
      formattedOrgsList = "";
      for (const org of orgs) {
        formattedOrgsList += `${org.id} -> ${org.name}\n`;
      }
    }

    const replyContent = await this._render.render("select_open_org.txt", {
      openOrgsList: formattedOrgsList,
    });
    context.reply(replyContent);

    await this._volonteers.updateVolonteerFlowNextHandlerKey(
      coreContext.id,
      FLOW_HANDLERS.REG_SELECT_ORG,
    );
    return;
  }

  private async _sendReport(context: Context, coreContext: BotCoreContextType) {
    const isLink = isWebLink(context.text.trim());

    if (!isLink) {
      const replyContent = await this._render.render(
        "no_support_link_format.txt",
        {},
      );
      context.reply(replyContent);
      return;
    }

    const payloadHash = calculateHash(context.text.trim());

    const candidate = await this._reports.findReportByPayloadHashAndVolonteerId(
      coreContext.id,
      payloadHash,
    );

    if (candidate) {
      const replyContent = await this._render.render(
        "link_already_registered.txt",
        {},
      );
      context.reply(replyContent);
      return;
    }

    const newReport = await this._reports.createReport(
      coreContext.id,
      context.text.trim(),
    );

    const replyContent = await this._render.render("report_created.txt", {});
    context.reply(replyContent);

    await this.flush(context.from.id);
    return;
  }

  async lastReports(context: Context) {
    // TODO: Change responses to render based content

    const coreContext = await this.getCoreContext(context.from.id);

    if (coreContext.role !== "admin" && coreContext.role !== "curator") {
      const replyContent = await this._render.render("no_access.txt", {});
      context.reply(replyContent);
      return;
    }

    if (coreContext.role === "admin") {
      const reports = await this._reports.getLastDayReports();

      let reply = "Отчеты за сегодня\n\n";
      reply += reports.map((rep) => `[🔥: ${rep.count}] ${rep.payload} \n`);
      reply += "\n";

      context.reply(reply, {});
      return;
    }

    if (coreContext.role === "curator") {
      const { organizationId } = await this._organizations.getCuratorOrg(
        coreContext.id,
      );
      const reports = await this._reports.orgLastDayReports(organizationId);

      let reply = "Отчеты за сегодня\n\n";
      reply += reports.map((rep) => `[🔥: ${rep.count}] ${rep.payload} \n`);
      reply += "\n";

      context.reply(reply, {});
      return;
    }
  }
}
