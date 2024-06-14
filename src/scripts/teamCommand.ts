import { $Enums } from "@prisma/client";
import { Organizations } from "../components/Organizations";
import { Render } from "../components/Render";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Reports } from "../components/Reports";
import logger from "../logger";

export const teamCommand = new Scriptor({
  name: "team-command",
  entryPoint: {
    command: "team",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const render = core.getModule("render") as Render;
      const organizations = core.getModule("organizations") as Organizations;
      const reports = core.getModule("reports") as Reports;

      const volunteer = await volunteers.findVolunteerUnderTelegramId(
        context.from.id,
      );
      const targetOrganizationId = volunteer.organizationId;

      const { name } = await organizations.findById(targetOrganizationId);
      const orgAllMembers = await organizations.members(targetOrganizationId);
      const orgMembersCount = orgAllMembers.members.length;
      const members = orgAllMembers.members.filter(
        (member) => member.role === $Enums.ROLE.VOLUNTEER,
      );
      const curators = orgAllMembers.members.filter(
        (member) => member.role === $Enums.ROLE.CURATOR,
      );

      // Metrics
      let summaryReportsCount = 0;
      let confirmedReportsCount = 0;
      let rejectedReportsCount = 0;
      let summaryBalance = 0;
      let accuracyTop = [];

      /* Calculate summary reports count */
      for (const member of orgAllMembers.members) {
        const reportsCount = await reports.getVolunteerAllReportsCount(
          member.id,
        );
        summaryReportsCount += reportsCount;
      }

      /* Calculate confirmed reports count */
      for (const member of orgAllMembers.members) {
        const reportsCount = await reports.getVolunteerConfirmedReportsCount(
          member.id,
        );
        confirmedReportsCount += reportsCount;
      }

      /* Calculate rejected report count */
      for (const member of orgAllMembers.members) {
        const reportsCount = await reports.getVolunteerNotConfirmedReportsCount(
          member.id,
        );
        rejectedReportsCount += reportsCount;
      }

      /* Calculate accuracy top */
      const acc = [];

      for (const member of orgAllMembers.members) {
        const all = (await reports.getVolunteerAllReportsCount(member.id)) || 0;
        const confirm =
          (await reports.getVolunteerConfirmedReportsCount(member.id)) || 0;

        logger.info(`${member.telegramName} ${confirm} ${all}`);

        const percent = (confirm / all) * 100;

        acc.push({
          name: member.fio,
          percent: percent === Infinity ? 0 : percent,
        });
      }

      accuracyTop = acc.sort((a, b) => {
        console.log(a, b);
        return 1;
      });

      const replyMessage = await render.render("team-message.txt", {
        name,
        membersCount: orgMembersCount,
        allReports: summaryReportsCount,
        confirmedReports: confirmedReportsCount,
        rejectedReports: rejectedReportsCount,
        top: accuracyTop.map((d) => d.name).join(`\n`),
      });
      context.reply(replyMessage);
      return true;
    },
  },
});
