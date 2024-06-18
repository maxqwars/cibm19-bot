import { $Enums } from "@prisma/client";
import { Organizations } from "../components/Organizations";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";

export const setCurator = new Scriptor({
  name: "set-curator-script",
  entryPoint: {
    command: "set_curator",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;

      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role !== $Enums.ROLE.ADMIN) {
        const replyPayload = await render.render("no-access-to-operation.txt", {});
        context.reply(replyPayload);
        return true;
      }

      const replyPayload = await render.render("enter-new-curator-username.txt", {});
      context.reply(replyPayload);
      return true;
    },
  },
});

setCurator.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  const curatorCandidateData = volunteers.findUsingUsername(context.text.trim());

  if (!curatorCandidateData) {
    const replyPayload = await render.render("volunteer-not-found.txt", {});
    context.reply(replyPayload);
    return false;
  }

  const registeredOrganizations = await organizations.getAll();
  const formattedOrganizationsData = registeredOrganizations.map((data) => `[${data.id}] ${data.name}`).join("\n");

  const replyPayload = await render.render("organizations-list.txt", {
    organizations: formattedOrganizationsData,
  });

  context.reply(replyPayload);
  return true;
});

setCurator.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const selectedOrganizationId = Number(context.text.trim());
  const curatorCandidateUsername = core.getSession(context.from.id).lastMessage;
  const candidateData = await volunteers.findUsingUsername(curatorCandidateUsername);
  const organizationData = await organizations.findById(selectedOrganizationId);

  if (candidateData.organizationId === selectedOrganizationId) {
    await volunteers.updateVolunteerRole(candidateData.id, $Enums.ROLE.CURATOR);

    const notifyPayload = await render.render("", {
      adminUsername: currentVolunteer.telegramUsername,
      organizationName: organizationData.name,
    });

    context.telegram.sendMessage(candidateData.id, notifyPayload);

    const replyPayload = await render.render("curator-seated.txt", {
      curatorUsername: candidateData.telegramUsername,
      organizationName: organizationData.name,
    });
    context.reply(replyPayload);
    return true;
  }

  await volunteers.addOrganization(candidateData.id, selectedOrganizationId);
  await volunteers.updateVolunteerRole(candidateData.id, $Enums.ROLE.CURATOR);

  const notifyPayload = await render.render("", {
    adminUsername: currentVolunteer.telegramUsername,
    organizationName: organizationData.name,
  });

  context.telegram.sendMessage(candidateData.id, notifyPayload);

  const replyPayload = await render.render("curator-seated.txt", {
    curatorUsername: candidateData.telegramUsername,
    organizationName: organizationData.name,
  });
  context.reply(replyPayload);
  return true;
});

export const setCuratorCommand = setCurator;
