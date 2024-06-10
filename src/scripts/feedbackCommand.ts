import { Scriptor } from "../helpers/Scriptor";

export const feedbackCommand = new Scriptor({
  name: "feedback-command",
  entryPoint: {
    command: "feedback",
    cb: async (context, core) => {
      return true;
    },
  },
});
