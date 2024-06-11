import { report } from "process";
import { Render } from "../components/Render";
import { Reports } from "../components/Reports";
import { Volunteers } from "../components/Volunteers";
import { Impact } from "../helpers/Impact";
import logger from "../logger";

export const reportCallback = new Impact({
  name: "report_query_callback",
  signature: new RegExp(/(confirm|reject)_report(=\d*)/gm),
  callback: async (context, core) => {
    const volunteers = core.getModule("volunteers") as Volunteers;
    const reports = core.getModule("reports") as Reports;
    const render = core.getModule("render") as Render;

    const [action, reportHash] = context.callbackQuery["data"].split("=");
    const {
      chat: { id: chatId },
      callbackQuery: {
        inline_message_id,
        message: { message_id },
      },
    } = context;

    logger.info(`claimCallback action: ${action}, payload: ${reportHash}`);

    if (action === "reject_report") {
      await reports.rejectReportsWithHash(reportHash);
      return;
    }

    await reports.confirmReportsWithHash(reportHash);
    return;
  },
});
