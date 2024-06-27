import { Render } from "../components/Render";
import { Reports } from "../components/Reports";
import { Scriptor } from "../helpers/Scriptor";
import { Volunteers } from "../components/Volunteers";
import { $Enums } from "@prisma/client";
import { Markup } from "telegraf";

export const reportsCommand = new Scriptor({
  name: "today-reports-cmd",
  entryPoint: {
    command: "reports",
    cb: async (context, core) => {
      const render = (await core.getModule("render")) as Render;
      const reports = (await core.getModule("reports")) as Reports;
      const volunteers = (await core.getModule("volunteers")) as Volunteers;
      const volunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);

      // Read environment
      const SMALL_REWARD = process.env["SMALL_REWARD"] || 0;
      const MEDIUM_REWARD = process.env["MEDIUM_REWARD"] || 0;
      const BIG_REWARD = process.env["BIG_REWARD"] || 0;

      if (volunteer.role !== $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render("no-access-to-operation.txt", {});
        context.reply(replyMessage);
        return true;
      }

      const outstandingReports = await reports.retrieveOutstandingReports();

      if (outstandingReports.length === 0) {
        const replyMessage = await render.render("no-reports.txt", {});
        context.reply(replyMessage);
        return true;
      }

      console.log(outstandingReports);

      for (const report of outstandingReports) {
        const count = await reports.hashReportsCount(report.hash);

        const replyMessage = await render.render("report-template.txt", {
          count,
          url: report.payload,
        });

        const REWARD_BUTTONS = [
          Markup.button.callback(`✅ / ${SMALL_REWARD} 💰`, `confirm_report_small=${report.hash}`),
          Markup.button.callback(`✅ / ${MEDIUM_REWARD} 💰`, `confirm_report_medium=${report.hash}`),
          Markup.button.callback(`✅ / ${BIG_REWARD} 💰`, `confirm_report_big=${report.hash}`),
        ];

        context.telegram.sendMessage(
          context.from.id,
          replyMessage,
          Markup.inlineKeyboard([...REWARD_BUTTONS, Markup.button.callback("❌", `reject_report=${report.hash}`)]),
        );
      }

      return true;
    },
  },
});
