import { Scriptor } from "../helpers/Scriptor";

export const globalBroadcastCommand = new Scriptor({
  name: "global-broadcast-command",
  entryPoint: {
    command: "g_broadcast",
    cb: async (context, core) => {
      return true;
    },
  },
});
