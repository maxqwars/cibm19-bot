import { PrismaClient } from "@prisma/client";
import { Cache } from "../modules/Cache";
import logger from "../logger";
import { CACHE_POLICY } from "../constants/CACHE_POLICY";

type TelegramVolonteerCreateDataDto = {
  role: string;
  telegramUsername: string;
  telegramName: string;
  telegramId: number;
};

export class VolonteersModel {
  private readonly _prismaClient: PrismaClient;
  private readonly _cache: Cache;

  constructor(prismaClient: PrismaClient, cache: Cache) {
    this._prismaClient = prismaClient;
    this._cache = cache;
  }

  async findVolonteerByTelegramUsername(telegramUsername: string) {
    try {
      return await this._prismaClient.volonteer.findFirst({
        where: {
          telegramUsername,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async findVolonteerByTelegramId(telegramId: number) {
    try {
      const volonteer = await this._prismaClient.volonteer.findFirst({
        where: {
          telegramId,
        },
      });

      return volonteer;
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async createVolonteerUsingTelegramData(dto: TelegramVolonteerCreateDataDto) {
    try {
      const candidate = await this.findVolonteerByTelegramId(dto.telegramId);
      if (candidate) return null;

      return await this._prismaClient.volonteer.create({
        data: {
          role: dto.role,
          name: "",
          telegramId: dto.telegramId,
          telegramName: dto.telegramName,
          telegramUsername: dto.telegramUsername,
          flowNextHandlerKey: "NONE",
          latestMessage: "",
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerTelegramUsername(id: number, telegramUsername: string) {
    try {
      return await this._prismaClient.volonteer.update({
        where: {
          id,
        },
        data: {
          telegramUsername,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerTelegramName(id: number, telegramName: string) {
    try {
      return await this._prismaClient.volonteer.update({
        where: {
          id,
        },
        data: {
          telegramName,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerFlowNextHandlerKey(
    id: number,
    flowNextHandlerKey: string,
  ) {
    try {
      return await this._prismaClient.volonteer.update({
        where: { id },
        data: {
          flowNextHandlerKey,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerLatestMessage(id: number, latestMessage: string) {
    try {
      return await this._prismaClient.volonteer.update({
        where: { id },
        data: {
          latestMessage,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerName(id: number, name: string) {
    try {
      return this._prismaClient.volonteer.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async updateVolonteerRole(id: number, role: string) {
    try {
      return await this._prismaClient.volonteer.update({
        where: { id },
        data: { role },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async findVolonteerById(id: number) {
    try {
      return await this._prismaClient.volonteer.findFirst({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }
}
