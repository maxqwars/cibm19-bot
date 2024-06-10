import { Impact } from "../helpers/Impact";

export const reportCallback = new Impact({
  name: "report_query_callback",
  signature: new RegExp(/()/gm),
  callback: async (context, core) => {
    return;
  },
});
