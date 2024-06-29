import { report } from "process";
import { Render } from "../components/Render";
import { Reports } from "../components/Reports";
import { Volunteers } from "../components/Volunteers";
import { Impact } from "../helpers/Impact";

export const reportCallback = new Impact({
  name: "report_query_callback",
  signature: new RegExp(/(confirm|reject)_report_?(small|medium|big)?=(...+)/gm),
  callback: async (context, core) => {
    // Read environment
    const SMALL_REWARD = Number(process.env["SMALL_REWARD"]) || 0;
    const MEDIUM_REWARD = Number(process.env["MEDIUM_REWARD"]) || 0;
    const BIG_REWARD = Number(process.env["BIG_REWARD"]) || 0;

    // Load component
    const volunteers = core.getModule("volunteers") as Volunteers;
    const reports = core.getModule("reports") as Reports;
    const render = core.getModule("render") as Render;

    const [action, hash] = context.callbackQuery["data"].split("=");
    const reportData = await reports.findFirstUsingHash(hash);
    let confirmed = false;

    const {
      chat: { id: chatId },
      callbackQuery: {
        inline_message_id,
        message: { message_id },
      },
      text,
    } = context;

    async function reject(hash: string) {
      const witnesses = await reports.findWitnessesVolunteers(hash);
      const message = await render.render("rejected-report.txt", { link: reportData.payload });

      for (const volunteer of witnesses) {
        const { volunteerId } = volunteer;
        const { telegramId } = await volunteers.findVolunteerUnderId(volunteerId);
        context.telegram.sendMessage(Number(telegramId), message);
      }

      await reports.rejectReportsWithHash(hash);
    }

    async function confirm(hash: string, reward: number) {
      const witnesses = await reports.findWitnessesVolunteers(hash);
      const message = await render.render("confirmed-report.txt", { link: reportData.payload, reward });

      for (const volunteer of witnesses) {
        const { volunteerId } = volunteer;
        const { telegramId, balance, id } = await volunteers.findVolunteerUnderId(volunteerId);
        await volunteers.updateBalance(id, balance + reward)
        context.telegram.sendMessage(Number(telegramId), message);
      }

      await reports.confirmReportsWithHash(hash);
    }

    switch (action) {
      case "confirm_report_small": {
        await confirm(hash, SMALL_REWARD);
        confirmed = true;
        break;
      }

      case "confirm_report_medium": {
        await confirm(hash, MEDIUM_REWARD);
        confirmed = true;
        break;
      }

      case "configm_report_big": {
        await confirm(hash, BIG_REWARD);
        confirmed = true;
        break;
      }

      default: {
        await reject(hash);
        break;
      }
    }

    context.telegram.editMessageText(
      chatId,
      message_id,
      inline_message_id,
      `${reportData.hash}➡️${confirmed ? "✔️" : "❌"}`,
    );
    return;
  },
});
