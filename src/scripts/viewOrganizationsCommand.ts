import { $Enums } from "@prisma/client";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Organizations } from "../components/Organizations";

export const viewOrganizationsCommand = new Scriptor({
  name: "view-organizations",
  entryPoint: {
    command: "view_orgs",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const volunteers = core.getModule("volunteers") as Volunteers;
      const organizations = core.getModule("organizations") as Organizations;

      const { role } = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      if (role !== $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render("no-access-to-operation.txt", {});
        context.reply(replyMessage);
        return false;
      }

      const orgs = await organizations.getAll();
      let formattedOrgsList = "";

      orgs.map((org) => {
        formattedOrgsList = `${formattedOrgsList}${org.name} ${org.closed ? "🔒" : "🔓"}\n`;
      });

      const replyContent = await render.render("orgs.txt", {
        organizations: formattedOrgsList,
      });

      context.reply(replyContent);
      return true;
    },
  },
});
