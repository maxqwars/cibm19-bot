import { $Enums, PrismaClient, Volunteer } from "@prisma/client";
import { Cache } from "./Cache";
import logger from "../logger";

type VolunteerCreateDataDto = {
  fio: string;
  telegramId: number;
  telegramUsername: string;
  telegramName: string;
  role?: $Enums.ROLE;
};

const VOLUNTEER_DATA_LIFETIME = 1000 * 60 * 60 * 3; // Total 3 hours
const TG_ID_TO_VOLUNTEER_BIND_LIFETIME = 1000 * 60 * 60 * 12; // Total 12 hours

export class Volunteers {
  private readonly _client: PrismaClient;
  private readonly _cache: Cache;

  constructor(prisma: PrismaClient, cache: Cache) {
    this._client = prisma;
    this._cache = cache;
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

  private async _getVolunteerData(id: number) {
    const serializedVolunteerData = (await this._cache.get(`volunteer_data_${id}`)).toString();

    if (serializedVolunteerData) {
      return JSON.parse(serializedVolunteerData);
    }

    const volunteerData = await this._client.volunteer.findFirst({
      where: {
        id,
      },
    });

    await this._cache.set(`volunteer_data_${id}`, JSON.stringify(volunteerData), VOLUNTEER_DATA_LIFETIME);
    return volunteerData;
  }

  async findVolunteerUnderTelegramId(telegramId: number) {
    const volunteerId = await this._cache.get(`volunteer_system_id_${telegramId}`);

    if (volunteerId) {
      const serializedVolunteerData = await this._cache.get(`volunteer_data_${volunteerId}`);
      return JSON.parse(serializedVolunteerData.toString()) as Volunteer;
    }

    const volunteerData = await this._client.volunteer.findUnique({
      where: { telegramId },
    });

    await this._cache.set(
      `volunteer_system_id_${telegramId}`,
      String(volunteerData.id),
      TG_ID_TO_VOLUNTEER_BIND_LIFETIME,
    );
    return volunteerData;
  }

  async findVolunteerUnderId(id: number) {
    try {
      return await this._getVolunteerData(id);
    } catch (err) {
      logger.error(`Failed find volunteer (under ID) record, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async updateVolunteerFio(id: number, fio: string) {
    try {
      await this._cache.clean(`volunteer_data_${id}`);
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
      await this._cache.clean(`volunteer_data_${id}`);
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
    await this._cache.clean(`volunteer_data_${id}`);
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
    const serializedVolunteerData = await this._cache.get(`volunteer_data_${id}`);

    if (serializedVolunteerData) {
      return JSON.parse(serializedVolunteerData.toString());
    }

    const volunteerData = await this._getVolunteerData(id);
    return volunteerData;
  }

  async addOrganization(id: number, organizationId: number) {
    await this._cache.clean(`volunteer_data_${id}`);
    return await this._client.volunteer.update({
      where: {
        id,
      },
      data: {
        organizationId,
      },
    });
  }

  async memberOf2(id: number) {
    const serializedVolunteerData = await this._cache.get(`volunteer_data_${id}`);

    if (serializedVolunteerData) {
      const { organizationId } = JSON.parse(serializedVolunteerData.toString());
      return organizationId;
    }

    const { organizationId } = await this._getVolunteerData(id);
    return organizationId;
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
