import { Scriptor, FlowContextType } from "../helpers/Scriptor";
import { BotCore, BotCoreContextType } from "../modules/BotCore";
import { Context } from "telegraf";
import logger from "../logger";

const REGISTRATION_SCRPT_STAGES = {
  REGISTRATION_START: "REGISTRATION_START",
  REGISTRATION_SEND_REALNAME: "REGISTRATION_SEND_REALNAME",
};

const registrationScript = (
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
      if (coreContext.role !== "unknown") {
        const updated = await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );
        const replyContent = await core.render.render(
          "registration_not_required.txt",
          {},
        );

        if (updated === null)
          logger.error(
            `Failed update flow prop for volonteer @${coreContext.tgUsername}`,
          );

        context.reply(replyContent);
        return {
          scriptEnd: true,
        };
      }

      const claims = await core.organizations.getVolonteerClaims(
        coreContext.id,
      );

      if (claims !== null) {
        await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );

        const replyContent = await core.render.render(
          "claim_already_pending.txt",
          { claimId: claims.id },
        );

        context.reply(replyContent);
        return {
          scriptEnd: true,
        };
      }

      const replyContent = await core.render.render("enter_real_name.txt", {});
      context.reply(replyContent);

      await this._volonteers.updateVolonteerFlowNextHandlerKey(
        coreContext.id,
        REGISTRATION_SCRPT_STAGES.REGISTRATION_START,
      );

      return {
        scriptEnd: false,
        context,
        core,
        coreContext,
      };
    })(context, coreContext, core)
      .then(async (flowCtx: FlowContextType): Promise<FlowContextType> => {
        if (
          flowCtx.scriptEnd ||
          flowCtx.coreContext.flowNextHandlerKey !==
            REGISTRATION_SCRPT_STAGES.REGISTRATION_START
        ) {
          return flowCtx;
        }

        const updated = await core.volonteers.updateVolonteerName(
          coreContext.id,
          context.text.trim(),
        );

        let openOrgsList = "";
        const openOrgs = await core.organizations.getOpenOrgs();

        if (openOrgs.length > 0) {
          for (const org of openOrgs) {
            openOrgsList += `${org.id}: ${org.name}\n`;
          }
        }

        const replyContent = await core.render.render("select_open_org.txt", {
          openOrgsList,
        });
        context.reply(replyContent);

        await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          REGISTRATION_SCRPT_STAGES.REGISTRATION_SEND_REALNAME,
        );

        return flowCtx;
      })
      .then(async (flowCtx: FlowContextType): Promise<FlowContextType> => {
        if (
          flowCtx.scriptEnd ||
          flowCtx.coreContext.flowNextHandlerKey !==
            REGISTRATION_SCRPT_STAGES.REGISTRATION_SEND_REALNAME
        ) {
          return flowCtx;
        }

        const selectedOrg = await core.organizations.findOrgById(
          Number(context.text.trim()),
        );

        if (!selectedOrg) {
          let formattedOrgsList = "👻";
          const orgs = await core.organizations.getOpenOrgs();

          if (orgs.length > 0) {
            formattedOrgsList = "";
            for (const org of orgs) {
              formattedOrgsList += `${org.id} -> ${org.name}\n`;
            }
          }

          const replyContent = await core.render.render(
            "org_not_found_retry.txt",
            { openOrgsList: formattedOrgsList },
          );
          context.reply(replyContent);

          return flowCtx;
        }

        const createdClaim = await core.organizations.createClaim(
          coreContext.id,
          selectedOrg.id,
        );

        const replyContent = await core.render.render(
          "claim_created_wait_response.txt",
          { claimId: createdClaim.id },
        );

        context.reply(replyContent);

        const updated = await core.volonteers.updateVolonteerFlowNextHandlerKey(
          coreContext.id,
          "",
        );

        return {
          scriptEnd: true,
        };
      })
      .then(() => resolve(true))
      .catch((err) => {
        logger.error(`Failed complete registration script, reason:`);
        logger.error(err.message);
        reject(err);
      });
  });
};

export const registrationScriptData = new Scriptor({
  stages: Object.keys(REGISTRATION_SCRPT_STAGES),
  handler: registrationScript,
  initialCommand: {
    command: "register",
    callback: async (context: Context, core: BotCore) => {
      const { id } = await core.getCoreContext(context.from.id);
      await core.volonteers.updateVolonteerFlowNextHandlerKey(
        id,
        Object.keys(REGISTRATION_SCRPT_STAGES)[0],
      );
      context.reply(`Sequence started...`);
      return;
    },
  },
});
