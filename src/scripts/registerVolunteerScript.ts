import { $Enums } from "@prisma/client";
import { Claims } from "../components/Claims";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Organizations } from "../components/Organizations";

function getAge(birthday: string) {
  const today = new Date();
  const birth = new Date(birthday);
  const age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  return m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
}

const registerVolunteer = new Scriptor({
  name: "register-volunteer-script",
  entryPoint: {
    command: "register",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;
      const claims = core.getModule("claims") as Claims;
      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role === $Enums.ROLE.VOLUNTEER) {
        const replyMessage = await render.render("you_already_registered.txt", {});
        context.reply(replyMessage);
        return true;
      }

      const volunteerClaims = await claims.volunteerClaims(currentVolunteer.id);

      if (volunteerClaims.length > 0) {
        const replyMessage = await render.render("claim-already-created.txt", {});
        context.reply(replyMessage);
        return;
      }

      const replyMessage = await render.render("enter-you-fio-for-curator.txt", {});
      context.reply(replyMessage);
      return true;
    },
  },
});

registerVolunteer.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;

  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const fio = context.text;
  const updatedVolunteer = volunteers.updateVolunteerFio(currentVolunteer.id, fio);

  if (!updatedVolunteer) {
    const replyMessage = await render.render("error-while-script-proc.txt", {});
    context.reply(replyMessage);
    return false;
  }

  const replyMessage = await render.render("enter-birthday-date.txt", {});
  context.reply(replyMessage);
  return true;
});

registerVolunteer.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  const birthday = context.text;
  const volunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const isAdult = getAge(birthday) >= 18;
  await volunteers.updateVolunteerAdultStatus(volunteer.id, isAdult);

  const openOrganizations = await organizations.getUnlocked();
  let formattedOrganizations = "";

  openOrganizations.map((org) => {
    formattedOrganizations = `${formattedOrganizations} ИД:${org.id} ${org.name}`;
  });

  const replyMessage = await render.render("select-organization-for-join.txt", {
    organizations: formattedOrganizations,
  });

  context.reply(replyMessage);
  return true;
});

registerVolunteer.addStage(async (context, core) => {
  const claims = core.getModule("claims") as Claims;
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;

  const organizationId = Number(context.text.trim());
  const curentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const createdClaim = await claims.create({
    volunteerId: curentVolunteer.id,
    organizationId,
  });

  if (!createdClaim) {
    const replyContent = await render.render("error-while-script-proc.txt", {});
    context.reply(replyContent);
    return true;
  }

  const replyContent = await render.render("claim-n-created.txt", {
    claimId: createdClaim.id,
  });

  context.reply(replyContent);
  return true;
});

export const registerVolunteerScript = registerVolunteer;
