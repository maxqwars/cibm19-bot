import { Scriptor } from "../helpers/Scriptor";
import { Volunteers } from "../components/Volunteers";
import { Render } from "../components/Render";
import { Organizations } from "../components/Organizations";
import { $Enums } from "@prisma/client";

const rmVolunteer = new Scriptor({
  name: "rm-volunteer-command",
  entryPoint: {
    command: "rm_volunteer",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;
      const organizations = core.getModule("organizations") as Organizations;

      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role === $Enums.ROLE.CURATOR || !currentVolunteer.role) {
        context.reply(`Empty`);
        return true;
      }

      if (currentVolunteer.role === $Enums.ROLE.ADMIN) {
        const organizationsArr = await organizations.getAll();
        const formated = organizationsArr.map((data) => `[${data.id}] "${data.name}"`).join("\n");
        const replyMessage = await render.render("organizations-list.txt", { organizations: formated });
        context.reply(replyMessage);
        return;
      }

      context.reply(`Not implemented`);
      return true;
    },
  },
});

rmVolunteer.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  const selectedId = Number(context.text.trim() || 0);
  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

  if (currentVolunteer.role === $Enums.ROLE.ADMIN) {
    const organization = await organizations.findById(selectedId);
    const { members } = await organizations.members(selectedId);
    const formattedMembers = members.map((data) => `[${data.id}] ${data.fio}: ${data.role}`).join("\n");

    const replyMessage = await render.render("members-view.txt", {
      orgName: organization.name,
      members: formattedMembers,
    });
    context.reply(replyMessage);
    return true;
  }

  return true;
});

// rmVolunteer.addStage()

export const removeVolunteerCommand = rmVolunteer;
