import { $Enums, ROLE } from "@prisma/client";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import logger from "../logger";

const PER_ITERATION_COUNT = 100;

const globalBroadcast = new Scriptor({
  name: "global-broadcast-command",
  entryPoint: {
    command: "g_broadcast",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;

      const volunteer = await volunteers.findVolunteerUnderTelegramId(
        context.from.id,
      );

      if (volunteer.role !== $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render(
          "no-access-to-operation.txt",
          {},
        );
        context.reply(replyMessage);
        return true;
      }

      const replyMessage = await render.render(
        "send-text-for-broadcast-message.txt",
        {},
      );
      context.reply(replyMessage);
      return true;
    },
  },
});

globalBroadcast.addStage(async (context, core) => {
  const render = core.getModule("render") as Render;
  const volunteers = core.getModule("volunteers") as Volunteers;

  const volunteer = await volunteers.findVolunteerUnderTelegramId(
    context.from.id,
  );
  const broadcastMessage = context.text.trim();
  const volunteersCount = await volunteers.volunteersCount();

  const broadcastMessageContent = await render.render("broadcast-message.txt", {
    broadcastMessage,
    authorSignature: volunteer.telegramUsername,
    authorRole: volunteer.role,
  });

  let skip = 0;
  let index = 0;
  let pages = volunteersCount / PER_ITERATION_COUNT;
  pages = volunteersCount % PER_ITERATION_COUNT === 0 ? 0 : 1;

  logger.info(
    `[globalBroadcastCommand] Volunteers count -> ${volunteersCount}`,
  );
  logger.info(`[globalBroadcastCommand] Pages count -> ${pages}`);

  while (index <= pages) {
    const volunteersData = await volunteers.paginatedRead(
      PER_ITERATION_COUNT,
      skip,
    );

    for (const volunteer of volunteersData) {
      if (volunteer.role === $Enums.ROLE.ADMIN) continue;

      context.telegram.sendMessage(
        Number(volunteer.telegramId),
        broadcastMessageContent,
      );
    }

    index = index + 1;
    skip = skip + PER_ITERATION_COUNT;

    logger.info(`[globalBroadcastCommand] index val -> ${index}`);
    logger.info(`[globalBroadcastCommand] skip val -> ${skip}`);
  }

  return true;
});

export const globalBroadcastCommand = globalBroadcast;
