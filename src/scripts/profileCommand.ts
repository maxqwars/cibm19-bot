import { Scriptor } from "../helpers/Scriptor";
import { Volunteers } from "../components/Volunteers";
import { Render } from "../components/Render";
import { Reports } from "../components/Reports";
import { $Enums } from "@prisma/client";
import { Organizations } from "../components/Organizations";

const RANK_MAPPING = {
  "100-100": "🏅",
  "99-80": "🥇",
  "79-60": "🥈",
  "59-30": "🥉",
  "29-0": "💔",
};

export const profileCommand = new Scriptor({
  name: "profile-command",
  entryPoint: {
    command: "profile",
    cb: async (context, core) => {
      const render = core.getModule("render") as Render;
      const volunteers = core.getModule("volunteers") as Volunteers;
      const reports = core.getModule("reports") as Reports;
      const organizations = core.getModule("organizations") as Organizations;

      const volunteer = await volunteers.findVolunteerUnderTelegramId(
        context.from.id,
      );

      const per = 54;

      for (const range in RANK_MAPPING) {
        const [endNum, startNum] = range.split("-");

        if (per >= Number(startNum) && per <= Number(endNum)) {
          console.log(RANK_MAPPING[`${endNum}-${startNum}`]);
        }
      }

      if (volunteer.role === $Enums.ROLE.ADMIN) {
        const replyMessage = await render.render(
          "no-support-for-you-role.txt",
          {},
        );
        context.reply(replyMessage);
        return;
      }

      const organization = await organizations.findById(
        volunteer.organizationId,
      );
      const confirmedReportsCount =
        await reports.getVolunteerConfirmedReportsCount(volunteer.id);
      const notConfirmedReportsCount =
        await reports.getVolunteerNotConfirmedReportsCount(volunteer.id);
      const allReportsCount = confirmedReportsCount + notConfirmedReportsCount;
      const percent = (confirmedReportsCount / allReportsCount) * 100;
      let rank = "none";

      for (const range in RANK_MAPPING) {
        const [endNum, startNum] = range.split("-");

        if (per >= Number(startNum) && per <= Number(endNum)) {
          rank = RANK_MAPPING[`${endNum}-${startNum}`];
        }
      }

      const replyMessage = await render.render("volunteer-profile", {
        fio: volunteer.fio,
        username: volunteer.telegramUsername,
        displayName: volunteer.telegramName,
        joinAt: volunteer.createdAt.toString(),
        role: volunteer.role,
        rank: rank,
        organization: organization.name,
        balance: volunteer.balance,
        reportsCount: allReportsCount,
        confirmedReportsCount: confirmedReportsCount,
        notConfirmedReportCount: notConfirmedReportsCount,
        percent: percent,
      });

      context.reply(replyMessage);

      return true;
    },
  },
});
