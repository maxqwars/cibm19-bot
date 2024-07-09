import { Scriptor } from "../helpers/Scriptor";

export const rmOrganizationCommand = new Scriptor({
  name: "rm-organization",
  entryPoint: {
    command: "rm_org",
    cb: async (context, core) => {
      return true;
    },
  },
});
