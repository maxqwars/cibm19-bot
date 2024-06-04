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
            Markup.button.callback("✅", `test_query_success=${1}`),
            Markup.button.callback("❌", `test_query_failure=${1}`),
            Markup.button.callback("👌", `error=${1}`),
          ]),
        );

        return true;
      },
    },
  });

  return cbQueryDebug;
}
