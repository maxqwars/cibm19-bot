import { Render } from "../components/Render";
import { Scriptor } from "../helpers/Scriptor";

export const helpCommand = new Scriptor({
  name: "help-cmd",
  entryPoint: {
    command: "help",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const replyContent = await render.render("common_help.txt", {});
      context.reply(replyContent);
      return true;
    },
  },
});
