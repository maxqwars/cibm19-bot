import { Scriptor } from "../helpers/Scriptor";

export default function () {
  const testScript = new Scriptor({
    name: "test_script",
    entryPoint: {
      command: "test",
      async cb(context, core) {
        context.reply(`Seq started....`);
      },
    },
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq...`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq...`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq...`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq...`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq...`);
  });

  return testScript;
}
