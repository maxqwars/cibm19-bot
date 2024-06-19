import { $Enums } from "@prisma/client";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";

const feedbackCommandFeature = new Scriptor({
  name: "feedback-command",
  entryPoint: {
    command: "feedback",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("Render") as Render;

      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role === $Enums.ROLE.CURATOR || currentVolunteer.role === $Enums.ROLE.VOLUNTEER) {
        const replyPayload = await render.render("enter-feedback-message.txt", {});
        context.reply(replyPayload);
        return true;
      }

      const replyPayload = await render.render("no-access-to-operation.txt", {});
      context.reply(replyPayload);
      return true;
    },
  },
});

feedbackCommandFeature.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("Render") as Render;

  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const administrators = await volunteers.administrators();
  const sourceMessage = context.text.trim();

  const messagePayload = await render.render("feedback-message.txt", {
    message: sourceMessage,
    username: currentVolunteer.telegramUsername,
  });

  for (const admin of administrators) {
    context.telegram.sendMessage(Number(admin.telegramId), messagePayload);
  }

  const replyPayload = await render.render("you-feedback-sended.txt", {});
  context.reply(replyPayload);
  return true;
});

export const feedbackCommand = feedbackCommandFeature;
