import { Render } from "../components/Render";
import { Reports } from "../components/Reports";
import { Scriptor } from "../helpers/Scriptor";
import { Volonteers } from "../components/Volonteers";
import { $Enums } from "@prisma/client";
import dayjs from "dayjs";
import { Markup } from "telegraf";

export const reportsCommand = new Scriptor({
  name: "today-reports-cmd",
  entryPoint: {
    command: "reports",
    cb: async (context, core) => {
      const {
        reply,
        from: { id },
        telegram: { sendMessage },
      } = context;

      const render = (await core.getModule("render")) as Render;
      const reports = (await core.getModule("reports")) as Reports;
      const volonteers = (await core.getModule("volonteers")) as Volonteers;

      const volonteer = await volonteers.findVolonteerUnderTelegramId(id);

      if (volonteer.role !== $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render(
          "no-access-to-operation.txt",
          {},
        );
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
          id,
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
