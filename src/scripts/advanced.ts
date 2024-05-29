import { BotCore, BotCoreContextType } from "../modules/BotCore";
import { Context } from "telegraf";
import logger from "../logger";

export const ADVANCED_SCRIPT_STAGES = {
    ADV_SC_STAGE_1: "ADV_SC_STAGE_1",
    ADV_SC_STAGE_2: "ADV_SC_STAGE_2",
    ADV_SC_STAGE_3: "ADV_SC_STAGE_3",
};

export function advancedScript(
    context: Context,
    coreCtx: BotCoreContextType,
    core: BotCore,
) {
    return function (context: Context,
        coreCtx: BotCoreContextType,
        core: BotCore,) {

        logger.info(`advanced script log`)

        return (async (context: Context, coreCtx: BotCoreContextType, core: BotCore) => {
            if (
                coreCtx.flowNextHandlerKey !== ADVANCED_SCRIPT_STAGES.ADV_SC_STAGE_1
            ) {
                return {
                    context,
                    coreCtx,
                    core,
                };
            }

            core.volonteers.updateVolonteerFlowNextHandlerKey(
                coreCtx.id,
                ADVANCED_SCRIPT_STAGES.ADV_SC_STAGE_2,
            );

            context.reply(`advanced stage 1, passed`);

            return null;
        })(context, coreCtx, core)
            .then(async (flow) => {
                if (flow === null) {
                    return null;
                }

                const { context, coreCtx, core } = flow;

                if (
                    coreCtx.flowNextHandlerKey !== ADVANCED_SCRIPT_STAGES.ADV_SC_STAGE_2
                ) {
                    return null;
                }

                await core.volonteers.updateVolonteerFlowNextHandlerKey(
                    coreCtx.id,
                    ADVANCED_SCRIPT_STAGES.ADV_SC_STAGE_3,
                );

                context.reply(`advanced stage 2, passed`);

                return {
                    context,
                    coreCtx,
                    core,
                };
            })
            .then(async (flow) => {
                if (flow === null) {
                    return null;
                }

                const { context, coreCtx, core } = flow;

                if (
                    coreCtx.flowNextHandlerKey !== ADVANCED_SCRIPT_STAGES.ADV_SC_STAGE_3
                ) {
                    return null;
                }

                await core.volonteers.updateVolonteerFlowNextHandlerKey(coreCtx.id, "");

                context.reply(`advanced stage 3, passed`);

                return null;
            })
            .catch((err) => {
                logger.error(err.message)
                return null;
            });
    };
}
