import { $Enums, PrismaClient } from "@prisma/client";
import logger from "../logger";

type VolunteerCreateDataDto = {
  fio: string;
  telegramId: number;
  telegramUsername: string;
  telegramName: string;
  role?: $Enums.ROLE;
};

export class Volunteers {
  private readonly _client: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._client = prisma;
  }

  async createWithData(dto: VolunteerCreateDataDto) {
    try {
      return await this._client.volunteer.create({
        data: {
          ...dto,
          balance: 0,
        },
      });
    } catch (err) {
      logger.error(`Failed create new volunteer record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async findVolunteerUnderTelegramId(telegramId: number) {
    try {
      return await this._client.volunteer.findUnique({
        where: {
          telegramId,
        },
      });
    } catch (err) {
      logger.error(`Failed find volunteer record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async findVolunteerUnderId(id: number) {
    try {
      return await this._client.volunteer.findFirst({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(`Failed find volunteer (under ID) record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolunteerFio(id: number, fio: string) {
    try {
      return await this._client.volunteer.update({
        where: {
          id,
        },
        data: {
          fio,
        },
      });
    } catch (err) {
      logger.error(`Failed update volunteer [${id}] fio  field, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolunteerRole(id: number, role: $Enums.ROLE) {
    try {
      return await this._client.volunteer.update({
        where: {
          id,
        },
        data: {
          role,
        },
      });
    } catch (err) {
      logger.error(`Failed update volunteer [${id}] role field, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolunteerAdultStatus(id: number, isAdult: boolean) {
    return await this._client.volunteer.update({
      where: {
        id,
      },
      data: {
        isAdult,
      },
    });
  }

  async memberOf(id: number) {
    return await this._client.volunteer.findFirst({
      where: {
        id,
        organizationId: { not: null },
      },
    });
  }

  async addOrganization(id: number, organizationId: number) {
    return await this._client.volunteer.update({
      where: {
        id,
      },
      data: {
        organizationId,
      },
    });
  }

  async volunteersCount() {
    return await this._client.volunteer.count({
      where: {
        role: {
          not: null,
        },
      },
    });
  }

  async paginatedRead(take: number, skip: number) {
    return await this._client.volunteer.findMany({
      where: {
        role: {
          not: null,
        },
      },
      take,
      skip,
      select: {
        telegramId: true,
        role: true,
      },
    });
  }

  async findUsingUsername(telegramUsername: string) {
    return await this._client.volunteer.findFirst({
      where: {
        telegramUsername,
      },
    });
  }

  async administrators() {
    return await this._client.volunteer.findMany({
      where: {
        role: "ADMIN",
      },
    });
  }
}
