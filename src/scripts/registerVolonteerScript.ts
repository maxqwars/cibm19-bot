import { $Enums } from "@prisma/client";
import { Claims } from "../components/Claims";
import { Render } from "../components/Render";
import { Volonteers } from "../components/Volonteers";
import { Scriptor } from "../helpers/Scriptor";

export const registerVolonteerScript = new Scriptor({
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
