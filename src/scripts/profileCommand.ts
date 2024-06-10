import { Scriptor } from "../helpers/Scriptor";

export const profileCommand = new Scriptor({
  name: "profile-command",
  entryPoint: {
    command: "profile",
    cb: async (context, core) => {
      return true;
    },
  },
});
