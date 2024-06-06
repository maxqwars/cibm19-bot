import { $Enums } from "@prisma/client";
import { Claims } from "../components/Claims";
import { Volonteers } from "../components/Volonteers";
import { Scriptor } from "../helpers/Scriptor";
import { Render } from "../components/Render";
import { Markup } from "telegraf";
import { Organizations } from "../components/Organizations";

export const claimsCommand = new Scriptor({
  name: "claims-command",
  entryPoint: {
    command: "claims",
    cb: async (context, core) => {
      const volonteers = core.getModule("volonteers") as Volonteers;
      const claims = core.getModule("claims") as Claims;
      const render = core.getModule("render") as Render;
      const organizations = core.getModule("organizations") as Organizations;

      const volonteer = await volonteers.findVolonteerUnderTelegramId(
        context.from.id,
      );

      // Adminstrator see all claims
      if (volonteer.role === $Enums.ROLE.ADMIN) {
        const allOrgs = await organizations.getAll();
        let formattedOrgs = "";

        for (const org of allOrgs) {
          formattedOrgs = `${formattedOrgs}${org.id} ${org.name}\n`;
        }

        const replyContent = await render.render("orgs.txt", {
          organizations: formattedOrgs,
        });

        context.reply(replyContent);
        return true;
      }

      if (volonteer.role !== $Enums.ROLE.CURATOR) {
        const replyMessage = await render.render(
          "no-access-to-operation.txt",
          {},
        );
        context.reply(replyMessage);
        return true;
      }

      const { organizationId } = await volonteers.memberOf(volonteer.id);
      const claimsList = await claims.organizationClaims(organizationId);

      for (const claim of claimsList) {
        const claimInitiatorData = await volonteers.findVolonteerUnderId(
          claim.volonteerId,
        );

        const messagePayload = await render.render("claim-preview.txt", {
          telegramUsername: claimInitiatorData.telegramUsername,
          volonteerFio: claimInitiatorData.fio,
          telegramName: claimInitiatorData.telegramName,
        });

        context.telegram.sendMessage(
          context.chat.id,
          messagePayload,
          Markup.inlineKeyboard([
            Markup.button.callback("✅", `accept_claim=${claim.id}`),
            Markup.button.callback("❌", `reject_claim=${claim.id}`),
          ]),
        );
      }

      return true;
    },
  },
});
