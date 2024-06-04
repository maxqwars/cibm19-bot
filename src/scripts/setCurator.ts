import { Scriptor } from "../helpers/Scriptor";

export default function () {
  const setCuratorScript = new Scriptor({
    name: "set-curator-script",
    entryPoint: {
      command: "set_curator",
      cb: async (context, core) => {
        return true;
      },
    },
  });

  return setCuratorScript;
}
