import { Scriptor } from "../helpers/Scriptor";

export const myOrganizationCommand = new Scriptor({
  name: "my-organization",
  entryPoint: {
    command: "my_org",
    cb: async (context, core) => {
      return true;
    },
  },
});
