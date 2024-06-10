import { Scriptor } from "../helpers/Scriptor";

const lockdownCmd = new Scriptor({
  name: "lockdown-command",
  entryPoint: {
    command: "lockdown",
    cb: async (context, core) => {
      return true;
    },
  },
});

lockdownCmd.addStage(async (context, core) => true);

export const lockdownCommand = lockdownCmd;
