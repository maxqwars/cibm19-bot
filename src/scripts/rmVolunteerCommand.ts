import { Scriptor } from "../helpers/Scriptor";

export const rmVolunteerCommand = new Scriptor({
  name: "rm-volunteer-command",
  entryPoint: {
    command: "rm_volunteer",
    cb: async (context, core) => {
      return true;
    },
  },
});
