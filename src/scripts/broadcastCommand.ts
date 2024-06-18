import { $Enums } from "@prisma/client";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Organizations } from "../components/Organizations";

// TODO: Add admin role support

const PER_ITERATION_COUNT = 100;

const broadcast = new Scriptor({
  name: "broadcast-command",
  entryPoint: {
    command: "broadcast",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;
      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role === $Enums.ROLE.VOLUNTEER || !currentVolunteer.role) {
        const replyMsgText = await render.render("no-access-to-operation.txt", {});
        context.reply(replyMsgText);
        return true;
      }

      // Admin support add an feature...
      if (currentVolunteer.role === $Enums.ROLE.ADMIN) {
        context.reply(`Not implemented`);
        return true;
      }

      const replyMsgText = await render.render("send-text-for-broadcast-message.txt", {});
      context.reply(replyMsgText);
      return true;
    },
  },
});

broadcast.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;
  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

  if (currentVolunteer.role === $Enums.ROLE.ADMIN) {
    context.reply(`Not implemented`);
    return true;
  }

  const organizationMembers = await organizations.members(currentVolunteer.organizationId);
  const volunteersCount = organizationMembers.members.length;
  const broadcastMsgText = await render.render("broadcast-message.txt", {
    broadcastMessage: context.text.trim(),
    authorSignature: currentVolunteer.telegramUsername,
    authorRole: currentVolunteer.role,
  });

  let skip = 0;
  let index = 0;
  let pages = volunteersCount / PER_ITERATION_COUNT;
  pages = volunteersCount % PER_ITERATION_COUNT === 0 ? 0 : 1;

  while (index <= pages) {
    const volunteersData = await volunteers.paginatedRead(PER_ITERATION_COUNT, skip);

    for (const volunteer of volunteersData) {
      if (volunteer.role === $Enums.ROLE.ADMIN) continue;

      context.telegram.sendMessage(Number(volunteer.telegramId), broadcastMsgText);
    }

    index = index + 1;
    skip = skip + PER_ITERATION_COUNT;
  }

  return true;
});

export const broadcastCommand = broadcast;
