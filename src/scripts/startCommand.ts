import { Render } from "../components/Render";
import { Scriptor } from "../helpers/Scriptor";

export const startCommand = new Scriptor({
  name: "start-cmd",
  entryPoint: {
    command: "start",
    cb: async (context, core) => {
      const render = (await core.getModule("render")) as Render;
      const replyMessage = await render.render("welcome-message.txt", {});
      context.reply(replyMessage);
      return true;
    },
  },
});
