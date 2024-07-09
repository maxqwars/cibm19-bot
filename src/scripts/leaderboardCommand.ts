import { Scriptor } from "../helpers/Scriptor";

export const leaderboardCommand = new Scriptor({
  name: "leaderboard-command",
  entryPoint: {
    command: "leaderboard",
    cb: async (context, core) => {
      return true;
    },
  },
});
