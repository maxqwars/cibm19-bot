import { $Enums } from "@prisma/client";
import { Claims } from "../components/Claims";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import dayjs from "dayjs";
import logger from "../logger";
import { Organizations } from "../components/Organizations";

const registerVolunteer = new Scriptor({
  name: "register-volunteer-script",
  entryPoint: {
    command: "register",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;
      const claims = core.getModule("claims") as Claims;

      const volunteer = await volunteers.findVolunteerUnderTelegramId(
        context.from.id,
      );

      if (volunteer.role === $Enums.ROLE.VOLUNTEER) {
        const replyMessage = await render.render(
          "you_already_registered.txt",
          {},
        );
        context.reply(replyMessage);
        return true;
      }

      const volunteerClaims = await claims.volunteerClaims(volunteer.id);

      if (volunteerClaims) {
        const replyMessage = await render.render(
          "claim-already-created.txt",
          {},
        );
        context.reply(replyMessage);
        return;
      }

      const replyMessage = await render.render(
        "enter-you-fio-for-curator.txt",
        {},
      );
      context.reply(replyMessage);
      return true;
    },
  },
});

// Enter birthday date
registerVolunteer.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;

  const volunteer = await volunteers.findVolunteerUnderTelegramId(
    context.from.id,
  );
  const fio = context.text;

  const updatedVolunteer = volunteers.updateVolunteerFio(volunteer.id, fio);
  if (!updatedVolunteer) {
    const replyMessage = await render.render("error-while-script-proc.txt", {});
    context.reply(replyMessage);
    return false;
  }

  const replyMessage = await render.render("error-while-script-proc.txt", {});
  context.reply(replyMessage);
  return true;
});

registerVolunteer.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  function getAge(birthday: string) {
    const today = new Date();
    const birth = new Date(birthday);

    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    return m < 0 || (m === 0 && today.getDate() < birth.getDate())
      ? age - 1
      : age;
  }

  const birthday = context.text;
  const volunteer = await volunteers.findVolunteerUnderTelegramId(
    context.from.id,
  );
  const isAdult = getAge(birthday) >= 18;

  logger.info(`isAdult: ${isAdult}`);

  const updatedVolunteer = await volunteers.updateVolunteerAdultStatus(
    volunteer.id,
    false,
  );
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
  const organizations = core.getModule("organizations") as Organizations;
  const claims = core.getModule("claims") as Claims;
  const volunteers = core.getModule("volunteers") as Volunteers;
  const render = core.getModule("render") as Render;

  const organizationId = Number(context.from.id);
  const volunteer = await volunteers.findVolunteerUnderTelegramId(
    context.from.id,
  );

  const createdClaim = await claims.create({
    volunteerId: volunteer.id,
    organizationId,
  });

  if (createdClaim) {
    const replyContent = await render.render("error-while-script-proc", {});
    context.reply(replyContent);
    return true;
  }

  const replyContent = await render.render("claim-n-created", {
    claimId: createdClaim.id,
  });
  context.reply(replyContent);
  return true;
});

export const registerVolunteerScript = registerVolunteer;
