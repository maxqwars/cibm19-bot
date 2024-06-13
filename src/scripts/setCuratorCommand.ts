import { Scriptor } from "../helpers/Scriptor";

export const setCurator = new Scriptor({
  name: "set-curator-script",
  entryPoint: {
    command: "set_curator",
    cb: async (context, core) => {
      return true;
    },
  },
});

export const setCuratorCommand = setCurator;
