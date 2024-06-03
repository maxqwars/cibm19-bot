import { Scriptor } from "../helpers/Scriptor";
import { Markup } from "telegraf";

export default function () {
  const cbQueryDebug = new Scriptor({
    name: "cb_query",
    entryPoint: {
      command: "cb_query",
      async cb(context, core) {
        context.reply(
          `Its just command`,
          Markup.inlineKeyboard([
            Markup.button.callback("✅", `accept_claim=${1}`),
            Markup.button.callback("❌", `reject_claim=${1}`),
          ]),
        );
      },
    },
  });

  return cbQueryDebug;
}
