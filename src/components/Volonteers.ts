import { $Enums, PrismaClient } from "@prisma/client";
import logger from "../logger";

type VolonteerCreateDataDto = {
  fio: string;
  telegramId: number;
  telegramUsername: string;
  telegramName: string;
  role?: $Enums.ROLE;
};

export class Volonteers {
  private readonly _client: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._client = prisma;
  }

  async createWithData(dto: VolonteerCreateDataDto) {
    try {
      return await this._client.volonteer.create({
        data: {
          ...dto,
          balance: 0,
        },
      });
    } catch (err) {
      logger.error(`Failed create new volonteer record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async findVolonteerUnderTelegramId(telegramId: number) {
    try {
      return await this._client.volonteer.findUnique({
        where: {
          telegramId,
        },
      });
    } catch (err) {
      logger.error(`Failed find volonteer record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async findVolonteerUnderId(id: number) {
    try {
      return await this._client.volonteer.findFirst({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(`Failed find volonteer (under ID) record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolonteerFio(id: number, fio: string) {
    try {
      return await this._client.volonteer.update({
        where: {
          id,
        },
        data: {
          fio,
        },
      });
    } catch (err) {
      logger.error(`Failed update volonteer [${id}] fio  field, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolonteerRole(id: number, role: $Enums.ROLE) {
    try {
      return await this._client.volonteer.update({
        where: {
          id,
        },
        data: {
          role,
        },
      });
    } catch (err) {
      logger.error(`Failed update volonteer [${id}] role field, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolonteerAdultStatus(id: number, isAdult: boolean) {
    return await this._client.volonteer.update({
      where: {
        id,
      },
      data: {
        isAdult,
      },
    });
  }

  async memberOf(id: number) {
    return await this._client.volonteer.findFirst({
      where: {
        id,
        organizationId: { not: null },
      },
    });
  }
}
