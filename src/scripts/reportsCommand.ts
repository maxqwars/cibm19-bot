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

      for (const report of outstandingReports) {
        const count = await reports.hashReportsCount(report.hash);

        const replyMessage = await render.render("report-template.txt", {
          count,
          url: report.payload,
        });

        context.telegram.sendMessage(
          context.from.id,
          replyMessage,
          Markup.inlineKeyboard([
            Markup.button.callback("✅", `confirm_report=${report.hash}`),
            Markup.button.callback("❌", `reject_report=${report.hash}`),
          ]),
        );
        return true;
      }

      return true;
    },
  },
});
