import { Organizations } from "../components/Organizations";
import { Volunteers } from "../components/Volunteers";
import { Scriptor } from "../helpers/Scriptor";
import { Cache } from "../components/Cache";
import { Reports } from "../components/Reports";
import { Render } from "../components/Render";

type OrganizationMetrics = {
  name: string;
  reportsCount: number;
  confirmedCount: number;
  rejectedCount: number;
  accuracy: number;
};

const LEADERBOARD_CACHE = "LEADERBOARD_CACHE";
const LEADERBOARD_CACHE_LIFETIME = 1000 * 60 * 60 * 24;

function formatAccuracyMetrics(metrics: OrganizationMetrics[]): string[] {
  return metrics.map((d) => `"${d.name}" (${d.accuracy}%)`);
}

function formatReportsMetrics(metrics: OrganizationMetrics[]): string[] {
  return metrics.map((d) => `"${d.name}" (${d.reportsCount})`);
}

function formatConfirmedMetrics(metrics: OrganizationMetrics[]): string[] {
  return metrics.map((d) => `"${d.name}" (${d.confirmedCount})`);
}

export const leaderboardCommand = new Scriptor({
  name: "leaderboard-command",
  entryPoint: {
    command: "leaderboard",
    cb: async (context, core) => {
      const volunteers = core.getModule("volunteers") as Volunteers;
      const organizations = core.getModule("organizations") as Organizations;
      const cache = core.getModule("cache") as Cache;
      const reports = core.getModule("reports") as Reports;
      const render = core.getModule("render") as Render;

      const currentVolunteer = await volunteers.findVolunteerUnderTelegramId(context.from.id);
      const cached = await cache.get(LEADERBOARD_CACHE);

      if (!currentVolunteer.role) {
        return;
      }

      if (cache !== null) {
      }

      const orgs = await organizations.getAll();
      const metrics: OrganizationMetrics[] = [];

      for (const org of orgs) {
        let reportsCount = 0;
        let confirmedCount = 0;
        let rejectedCount = 0;
        let membersAccuracy: number[] = [];

        const { members } = await organizations.members(org.id);

        if (members.length === 0) continue;

        for (const member of members) {
          const memberReportCount = await reports.getVolunteerAllReportsCount(member.id);
          const memberConfirmedCount = await reports.getVolunteerConfirmedReportsCount(member.id);
          const memberRejectedCount = await reports.getVolunteerNotConfirmedReportsCount(member.id);
          const memberAccuracy =
            memberConfirmedCount > 0 ? Math.round((memberConfirmedCount / memberReportCount) * 100) : 0;

          reportsCount += memberReportCount;
          confirmedCount += memberConfirmedCount;
          rejectedCount += memberRejectedCount;
          membersAccuracy.push(memberAccuracy);
        }

        const accuracy = membersAccuracy.reduce((acc, value) => acc + value) / membersAccuracy.length;

        metrics.push({
          name: org.name,
          reportsCount,
          confirmedCount,
          rejectedCount,
          accuracy,
        });
      }

      await cache.set(LEADERBOARD_CACHE, JSON.stringify(metrics), LEADERBOARD_CACHE_LIFETIME);

      const orderedByAccuracy = metrics.sort((a, b) => a.accuracy - b.accuracy);
      const orderedByReportsCount = metrics.sort((a, b) => a.reportsCount - b.reportsCount);
      const orderedByConfirmedReports = metrics.sort((a, b) => a.confirmedCount - b.confirmedCount);

      const replyMsg = await render.render("leaderboard-msg.txt", {
        accuracyTop: formatAccuracyMetrics(orderedByAccuracy).join("\n"),
        reportsTop: formatReportsMetrics(orderedByReportsCount).join("\n"),
        confirmedReportsTop: formatConfirmedMetrics(orderedByConfirmedReports).join("\n"),
      });

      context.reply(replyMsg);
      return true;
    },
  },
});
