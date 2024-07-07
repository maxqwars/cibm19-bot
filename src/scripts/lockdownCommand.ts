import { $Enums } from "@prisma/client";
import { Organizations } from "../components/Organizations";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Render } from "../components/Render";
import { Markup } from "telegraf";

const lockdownCmd = new Scriptor({
  name: "lockdown-command",
  entryPoint: {
    command: "lockdown",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const organizations = core.getModule("organizations") as Organizations;
      const render = core.getModule("render") as Render;
      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (currentVolunteer.role === $Enums.ROLE.VOLUNTEER || currentVolunteer.role === null) {
        context.reply(await render.render("no-access-to-operation.txt", {}));
        return true;
      }

      if (currentVolunteer.role === $Enums.ROLE.ADMIN) {
        const orgsData = (await organizations.getAll()).map((data) => `[${data.id}] "${data.name}" \n`);
        const replyMsg = await render.render("organizations-list.txt", { organizations: orgsData.join("") });
        context.reply(replyMsg);
        return true;
      }

      const targetOrgId = await volunteers.memberOf2(currentVolunteer.id);
      const orgData = await organizations.findById(targetOrgId);

      const replyMsgText = await render.render("common-org-info.txt", {
        orgName: orgData.name,
        lockdownIsTrue: orgData.closed ? "❌" : "✔️",
      });

      const buttonLabel = orgData.closed ? "🔒" : "🔓";
      const buttonValue = orgData.closed ? `enable_lockdown=${orgData.id}` : `disable_lockdown=${orgData.id}`;
      context.reply(replyMsgText, Markup.inlineKeyboard([Markup.button.callback(buttonLabel, buttonValue)]));

      return true;
    },
  },
});

lockdownCmd.addStage(async (context, core) => {
  const volunteers = core.getModule("volunteers") as Volunteers;
  const organizations = core.getModule("organizations") as Organizations;
  const render = core.getModule("render") as Render;
  const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
  const orgId = Number(context.text);

  if (currentVolunteer.role !== $Enums.ROLE.ADMIN) {
    context.reply(await render.render("no-access-to-operation.txt", {}));
    return true;
  }

  const orgData = await organizations.findById(orgId);
  const replyMsgText = await render.render("common-org-info.txt", {
    orgName: orgData.name,
    lockdownIsTrue: orgData.closed ? "🔒" : "🔓",
  });

  const buttonLabel = orgData.closed ? "🔓" : "🔒";
  const buttonValue = orgData.closed ? `enable_lockdown=${orgData.id}` : `disable_lockdown=${orgData.id}`;

  context.reply(replyMsgText, Markup.inlineKeyboard([Markup.button.callback(buttonLabel, buttonValue)]));

  return true;
});

export const lockdownCommand = lockdownCmd;
