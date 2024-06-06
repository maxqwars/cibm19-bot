import { $Enums } from "@prisma/client";
import { Claims } from "../components/Claims";
import { Render } from "../components/Render";
import { Volonteers } from "../components/Volonteers";
import { Scriptor } from "../helpers/Scriptor";
import dayjs from "dayjs";
import logger from "../logger";
import { Organizations } from "../components/Organizations";

const registerVolonteer = new Scriptor({
  name: "register-volonteer-script",
  entryPoint: {
    command: "register",
    cb: async (context, core) => {
      const volonteers = core.getModule("volonteers") as Volonteers;
      const render = core.getModule("render") as Render;
      const claims = core.getModule("claims") as Claims;

      const volonteer = await volonteers.findVolonteerUnderTelegramId(
        context.from.id,
      );

      if (volonteer.role === $Enums.ROLE.VOLONTEER) {
        const replyMessage = await render.render(
          "you_already_registered.txt",
          {},
        );
        context.reply(replyMessage);
        return true;
      }

      const volonteerClaims = await claims.volonteerClaims(volonteer.id);

      if (volonteerClaims) {
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
registerVolonteer.addStage(async (context, core) => {
  const volonteers = core.getModule("volonteers") as Volonteers;
  const render = core.getModule("render") as Render;

  const volonteer = await volonteers.findVolonteerUnderTelegramId(
    context.from.id,
  );
  const fio = context.text;

  const updatedVolonteer = volonteers.updateVolonteerFio(volonteer.id, fio);
  if (!updatedVolonteer) {
    const replyMessage = await render.render("error-while-script-proc.txt", {});
    context.reply(replyMessage);
    return false;
  }

  const replyMessage = await render.render("error-while-script-proc.txt", {});
  context.reply(replyMessage);
  return true;
});

registerVolonteer.addStage(async (context, core) => {
  const volonteers = core.getModule("volonteers") as Volonteers;
  const render = core.getModule("render") as Render;
  const organizations = core.getModule("organizations") as Organizations;

  function getAge(birthdate: string) {
    const today = new Date();
    const birth = new Date(birthdate);

    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    return m < 0 || (m === 0 && today.getDate() < birth.getDate())
      ? age - 1
      : age;
  }

  const birthday = context.text;
  const volonteer = await volonteers.findVolonteerUnderTelegramId(
    context.from.id,
  );
  const isAdult = getAge(birthday) >= 18;

  logger.info(`isAdult: ${isAdult}`);

  const updatedVolonteer = await volonteers.updateVolonteerAdultStatus(
    volonteer.id,
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

registerVolonteer.addStage(async (context, core) => {
  const organizations = core.getModule("organizations") as Organizations;
  const claims = core.getModule("claims") as Claims;
  const volonteers = core.getModule("volonteers") as Volonteers;
  const render = core.getModule("render") as Render;

  const organizationId = Number(context.from.id);
  const volonteer = await volonteers.findVolonteerUnderTelegramId(
    context.from.id,
  );

  const createdClaim = await claims.create({
    volonteerId: volonteer.id,
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

export const registerVolonteerScript = registerVolonteer;
