import { Scriptor } from "../helpers/Scriptor";

export const setAdminCommand = new Scriptor({
  name: "set-admin-command",
  entryPoint: {
    command: "set_admin",
    cb: async (context, core) => {
      return true;
    },
  },
});
