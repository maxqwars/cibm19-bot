import { Scriptor } from "../helpers/Scriptor";

export const teamCommand = new Scriptor({
  name: "team-command",
  entryPoint: {
    command: "team",
    cb: async (context, core) => {
      return true;
    },
  },
});
