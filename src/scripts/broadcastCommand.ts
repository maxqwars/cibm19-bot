import { Scriptor } from "../helpers/Scriptor";

const broadcast = new Scriptor({
  name: "broadcast-command",
  entryPoint: {
    command: "broadcast",
    cb: async (context, core) => {
      return true;
    },
  },
});

export const broadcastCommand = broadcast;
