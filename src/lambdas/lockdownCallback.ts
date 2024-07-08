import { Update } from "telegraf/typings/core/types/typegram";
import { Impact } from "../helpers/Impact";
import { Context, Markup } from "telegraf";
import { IBotCore } from "../modules/BotCore";
import { Volunteers } from "../components/Volunteers";
import { Organizations } from "../components/Organizations";
import { Render } from "../components/Render";
import { $Enums } from "@prisma/client";

export const lockdownCallback = new Impact({
  name: "lockdown_query_callback",
  signature: new RegExp(/(enable|disable)_lockdown(=\d)/gm),
  callback: async (context: Context<Update.CallbackQueryUpdate>, core: IBotCore) => {
    const volunteers = core.getModule("volunteers") as Volunteers;
    const organizations = core.getModule("organizations") as Organizations;
    const render = core.getModule("render") as Render;
    const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

    if (currentVolunteer.role === $Enums.ROLE.VOLUNTEER || currentVolunteer.role === null) {
      return;
    }

    const [action, orgId] = context.callbackQuery["data"].split("=");

    console.log("orgId", orgId);
    console.log("action", action);
    console.log("context.callbackQuery", context.callbackQuery["data"]);

    const {
      chat: { id: chatId },
      callbackQuery: {
        inline_message_id: inlineMessageId,
        message: { message_id: messageId },
      },
    } = context;

    const orgData = await organizations.findById(Number(orgId));

    if (action === "enable_lockdown") {
      core.logger.debug(`[lockdownCallback] Enable lockdown for "${orgData.name}"`);

      await organizations.updateLockdownStatus(Number(orgId), true);
      const newMessageContent = await render.render("common-org-info.txt", {
        orgName: orgData.name,
        lockdownIsTrue: !orgData.closed ? "🔒" : "🔓",
      });

      const buttonLabel = !orgData.closed ? "🔒" : "🔓";
      const buttonValue = !orgData.closed ? `enable_lockdown=${orgData.id}` : `disable_lockdown=${orgData.id}`;

      context.telegram.editMessageText(chatId, messageId, inlineMessageId, newMessageContent);
      //   context.telegram.editMessageReplyMarkup(
      //     chatId,
      //     messageId,
      //     inlineMessageId,
      //     Markup.inlineKeyboard([Markup.button.callback(buttonLabel, buttonValue)]),
      //   );

      return;
    }

    if (action === "disable_lockdown") {
      await organizations.updateLockdownStatus(Number(orgId), false);

      core.logger.debug(`[lockdownCallback] Enable lockdown for "${orgData.name}"`);

      const newMessageContent = await render.render("common-org-info.txt", {
        orgName: orgData.name,
        lockdownIsTrue: !orgData.closed ? "🔒" : "🔓",
      });

      const buttonLabel = !orgData.closed ? "🔒" : "🔓";
      const buttonValue = !orgData.closed ? `enable_lockdown=${orgData.id}` : `disable_lockdown=${orgData.id}`;

      context.telegram.editMessageText(chatId, messageId, inlineMessageId, newMessageContent);

      // context.telegram.editMessageReplyMarkup(
      //   chatId,
      //   messageId,
      //   inlineMessageId,
      //   Markup.inlineKeyboard([Markup.button.callback(buttonLabel, buttonValue)]),
      // );

      return;
    }

    return;
  },
});
