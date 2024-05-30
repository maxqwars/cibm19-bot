import { Scriptor } from "../helpers/Scriptor";

export default function () {
  const testScript = new Scriptor({
    name: "test_script",
    flowKeys: ["string"],
    entryPoint: {
      command: "test",
      async cb(context, core) {
        context.reply(`Seq started....`);
      },
    },
  });

  testScript.addStage(
    "string",
    async (context, core) => {
      context.reply(`Continue seq...`);
    },
    "string",
  );

  return testScript;
}
