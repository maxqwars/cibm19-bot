import { Scriptor } from "../helpers/Scriptor";

export default function () {
  const testScript = new Scriptor({
    name: "test_script",
    entryPoint: {
      command: "test",
      async cb(context, core) {
        context.reply(`Seq started....`);
        return true;
      },
    },
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 1`);
    return true;
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 2`);
    return true;
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 3`);
    return true;
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 4`);
    return true;
  });

  testScript.addStage(async (context, core) => {
    context.reply(`Continue seq... 5`);
    return true;
  });

  return testScript;
}
