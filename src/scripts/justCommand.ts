import { Scriptor } from "../helpers/Scriptor";

export default function () {
  const testScript = new Scriptor({
    name: "just_cmd",
    entryPoint: {
      command: "just",
      async cb(context, core) {
        context.reply(`Its just command`);
      },
    },
  });

  return testScript;
}
