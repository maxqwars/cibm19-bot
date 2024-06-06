import { Organizations } from "../components/Organizations";
import { Render } from "../components/Render";
import { Scriptor } from "../helpers/Scriptor";
import { calcMd5 } from "../functions/calcMd5";
import { Volonteers } from "../components/Volonteers";
import { $Enums } from "@prisma/client";

const createOrganizationScript = new Scriptor({
  name: "create-org",
  entryPoint: {
    command: "create_org",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const volonteers = core.getModule("volonteers") as Volonteers;

      const volonteer = await volonteers.findVolonteerUnderTelegramId(
        context.from.id,
      );

      if (volonteer.role !== $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render(
          "no-access-to-operation.txt",
          {},
        );
        context.reply(replyMessage);
        return;
      }

      const replyMessage = await render.render(
        "enter-new-organization-name.txt",
        {},
      );
      context.reply(replyMessage);
      return true;
    },
  },
});

createOrganizationScript.addStage(async (context, core) => {
  const text = context.text;
  const organizations = core.getModule("organizations") as Organizations;
  const render = core.getModule("render") as Render;
  const volonteers = core.getModule("volonteers") as Volonteers;

  const volonteer = await volonteers.findVolonteerUnderTelegramId(
    context.from.id,
  );

  if (volonteer.role !== $Enums.ROLE.ADMIN) {
    const replyMessage = await render.render("no-access-to-operation.txt", {});
    context.reply(replyMessage);
    return;
  }

  const data = {
    name: text,
    domain: calcMd5(text),
  };

  const createdOrg = await organizations.create(data);

  if (!createdOrg) {
    const replyMessage = await render.render("error-while-script-proc.txt", {});
    context.reply(replyMessage);
    return false;
  }

  const replyMessage = await render.render("org-with-name-created.txt", {
    organizationName: createdOrg.name,
  });
  context.reply(replyMessage);
  return true;
});

export default createOrganizationScript;
