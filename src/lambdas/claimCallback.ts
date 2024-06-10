import { Update } from "telegraf/typings/core/types/typegram";
import { Claims } from "../components/Claims";
import { Volunteers } from "../components/Volunteers";
import { Impact } from "../helpers/Impact";
import { IBotCore } from "../modules/BotCore";
import { Context } from "telegraf";
import { $Enums } from "@prisma/client";
import { Render } from "../components/Render";

export const claimCallback = new Impact({
  name: "claim_query_callback",
  signature: new RegExp(/(accept|reject)_claim(=\d*)/gm),
  callback: async (
    context: Context<Update.CallbackQueryUpdate>,
    core: IBotCore,
  ) => {
    // Get components from core
    const volunteers = core.getModule("volunteers") as Volunteers;
    const claims = core.getModule("claims") as Claims;
    const render = core.getModule("render") as Render;

    const [action, claimId] = context["callback_query"].data.split("=");
    const {
      chat: { id: chatId },
      callbackQuery: {
        inline_message_id,
        message: { message_id },
      },
    } = context;

    const { id, volunteerId, organizationId } = await claims.claimDetails(
      Number(claimId),
    );

    const initiatorData = await volunteers.findVolunteerUnderId(volunteerId);

    if (action === "reject") {
      await claims.delete(id);

      const messageContent = await render.render("processed-claim.txt", {
        telegramUsername: initiatorData.telegramUsername,
        volunteerFio: initiatorData.fio,
        telegramName: initiatorData.telegramName,
        claimStatus: "❎",
      });

      context.telegram.editMessageText(
        chatId,
        message_id,
        inline_message_id,
        messageContent,
      );

      return;
    }

    // Add volunter to organization
    await volunteers.addOrganization(volunteerId, organizationId);
    await volunteers.updateVolunteerRole(volunteerId, $Enums.ROLE.VOLUNTEER);
    await claims.delete(id);

    // Update claim message content
    const messageContent = await render.render("processed-claim.txt", {
      telegramUsername: initiatorData.telegramUsername,
      volunteerFio: initiatorData.fio,
      telegramName: initiatorData.telegramName,
      claimStatus: "✅",
    });

    context.telegram.editMessageText(
      chatId,
      message_id,
      inline_message_id,
      messageContent,
    );

    // Send volunteer message
    const initiatorMessageContent = await render.render(
      "volunteer-welcome-message.txt",
      { claimId: id },
    );
    context.telegram.sendMessage(
      Number(initiatorData.telegramId),
      initiatorMessageContent,
    );

    return;
  },
});
