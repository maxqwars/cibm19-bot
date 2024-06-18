import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";

export const helpCommand = new Scriptor({
  name: "help-cmd",
  entryPoint: {
    command: "help",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const volunteers = core.getModule("volunteers") as Volunteers;

      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(
        context.from.id,
      );

      switch (currentVolunteer.role) {
        case "ADMIN": {
          const reply = await render.render("help-for-admin.txt", {});
          context.reply(reply);
          return true;
        }

        case "CURATOR": {
          const reply = await render.render("help-for-curator.txt", {});
          context.reply(reply);
          return true;
        }

        case "VOLUNTEER": {
          const reply = await render.render("help-for-volunteer.txt", {});
          context.reply(reply);
          return true;
        }

        default: {
          const reply = await render.render("help-for-undefined.txt", {});
          context.reply(reply);
          return true;
        }
      }
    },
  },
});
