import { Impact } from "../helpers/Impact";

export const claimCallback = new Impact({
  name: "claim_query_callback",
  signature: new RegExp(/()/gm),
  callback: async (context, core) => {
    return;
  },
});
