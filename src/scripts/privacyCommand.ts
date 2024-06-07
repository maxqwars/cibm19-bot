import { Render } from "../components/Render";
import { Scriptor } from "../helpers/Scriptor";

export const privacyCommand = new Scriptor({
  name: "privacy-cmd",
  entryPoint: {
    command: "privacy",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const replyContent = await render.render("privacy.txt", {});
      context.reply(replyContent);
      return true;
    },
  },
});
