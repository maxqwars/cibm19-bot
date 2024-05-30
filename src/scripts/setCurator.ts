import { Scriptor, FlowContextType } from "../helpers/Scriptor";
import { BotCore, BotCoreContextType } from "../modules/BotCore";
import { Context } from "telegraf";
import logger from "../logger";

const SET_CURATOR_SCPT_STAGES = {
  SET_CURATOR_START: "SET_CURATOR_START",
  SET_CURATOR_SEND_USERNAME: "SET_CURATOR_SEND_USERNAME",
};

const setCuratorScript = (
  context: Context,
  coreContext: BotCoreContextType,
  core: BotCore,
) => {
  return new Promise((resolve, reject) => {
    (async function (
      context: Context,
      coreContext: BotCoreContextType,
      core: BotCore,
    ): Promise<FlowContextType> {
      const volonteer = await core.volonteers.findVolonteerByTelegramUsername(
        context.text.trim(),
      );

      if (!volonteer) {
        const replyContent = await core.render.render(
          "volonteer_under_username_not_found.txt",
          { username: volonteer.telegramUsername },
        );
        context.reply(replyContent);

        await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );

        return {
          scriptEnd: true,
        };
      }

      let formattedOrganizationsList = "";
      const organizations = await core.organizations.getAllOrgs();

      if (organizations.length > 0) {
        for (const org of organizations) {
          formattedOrganizationsList += `${org.id} / ${org.name}\n`;
        }
      }

      await core.volonteers.updateVolonteerFlowNextHandlerKey(
        coreContext.id,
        SET_CURATOR_SCPT_STAGES.SET_CURATOR_SEND_USERNAME,
      );

      await core.volonteers.updateVolonteerLatestMessage(
        coreContext.id,
        context.text.trim(),
      );

      const replyContent = await core.render.render(
        "volonteer_under_username_found_select_org.txt",
        {
          username: volonteer.telegramUsername,
          orgsList: formattedOrganizationsList,
        },
      );
      context.reply(replyContent);

      return {
        scriptEnd: false,
        core,
        coreContext,
        context,
      };
    })(context, coreContext, core)
      .then(async (flowCtx: FlowContextType): Promise<FlowContextType> => {
        if (
          flowCtx.scriptEnd ||
          flowCtx.coreContext.flowNextHandlerKey !==
            SET_CURATOR_SCPT_STAGES.SET_CURATOR_SEND_USERNAME
        ) {
          return {
            scriptEnd: true,
          };
        }

        const organization = await core.organizations.findOrgById(
          Number(context.text.trim()),
        );
        const volonteer = await core.volonteers.findVolonteerByTelegramUsername(
          coreContext.latestMessage,
        );
        const isMember = await core.organizations.memberOf(
          volonteer.id,
          organization.id,
        );

        if (isMember) {
          // Change to render module
          context.reply("is member");
          return {
            scriptEnd: true,
          };
        }

        await core.organizations.addMember(volonteer.id, organization.id);
        await core.volonteers.updateVolonteerRole(volonteer.id, "curator");

        const newCuratorDirectMessageContent = await core.render.render(
          "you_now_curator_notify.txt",
          {
            adminUsername: coreContext.tgUsername,
            orgName: organization.name,
          },
        );

        context.telegram.sendMessage(
          Number(volonteer.telegramId),
          newCuratorDirectMessageContent,
        );

        const replyContent = await core.render.render(
          "set_curator_success.txt",
          {
            volonteerUsername: volonteer.telegramUsername,
            orgName: organization.name,
          },
        );

        context.reply(replyContent);
        await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );

        return {
          scriptEnd: true,
        };
      })
      .then(() => resolve(true))
      .catch((err) => {
        logger.error(`Error in setCurator script, reason:`);
        logger.error(err.message);
        reject(err);
      });
  });
};

export const setCuratorScriptData = new Scriptor({
  stages: Object.keys(SET_CURATOR_SCPT_STAGES),
  handler: setCuratorScript,
  initialCommand: {
    command: "set_curator",
    callback: async (context: Context, core: BotCore) => {
      const coreContext = await core.getCoreContext(context.from.id);

      if (coreContext.role !== "admin") {
        const replyContent = await core.render.render("no_access.txt", {});
        context.reply(replyContent);
        return;
      }

      await core.volonteers.updateVolonteerFlowNextHandlerKey(
        coreContext.id,
        SET_CURATOR_SCPT_STAGES.SET_CURATOR_START,
      );

      const replyContent = await core.render.render(
        "send_curator_username.txt",
        {},
      );
      context.reply(replyContent);
      return;
    },
  },
});
