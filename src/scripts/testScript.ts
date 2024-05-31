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
    context.reply(`Continue seq... 1`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 2`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 3`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 4`);
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 5`);
  });

  return testScript;
}
