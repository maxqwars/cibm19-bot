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
}
