import { $Enums, PrismaClient, Volunteer } from "@prisma/client";
import { Cache } from "./Cache";
import { IBuildInLogger } from "./BuildInLogger";

type VolunteerCreateDataDto = {
  fio: string;
  telegramId: number;
  telegramUsername: string;
  telegramName: string;
  role?: $Enums.ROLE;
};

const VOLUNTEER_DATA_LIFETIME = 1000 * 60 * 60 * 3; // Total 3 hours
const TG_ID_TO_SYS_ID_BIND_LIFETIME = 1000 * 60 * 60 * 12; // Total 12 hours

export class Volunteers {
  private readonly _client: PrismaClient;
  private readonly _cache: Cache;
  private readonly _logger: IBuildInLogger;

  constructor(prisma: PrismaClient, cache: Cache, logger: IBuildInLogger) {
    this._client = prisma;
    this._cache = cache;
    this._logger = logger;
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
      this._logger.error(`Failed create new volunteer record, reason:`);
      this._logger.error(err.message);
      return;
    }
  }

  private async _getVolunteerDataWithCache(id: number) {
    if (id === 0) return null;

    const cache = await this._cache.get(`volunteer_data_${id}`);

    console.log(`volunteer_data_${id} cache`, cache);

    if (!cache) {
      this._logger.info(
        `[Volonteers._getVolunteerDataWithCache] Cache for volonteer ${id} not found, generate cache...`,
      );

      const volunteerData = await this._client.volunteer.findFirst({ where: { id } });
      if (!volunteerData) return null;

      const createdCache = await this._cache.set(
        `volunteer_data_${id}`,
        JSON.stringify({ ...volunteerData, telegramId: Number(volunteerData.telegramId) }),
        VOLUNTEER_DATA_LIFETIME,
      );

      this._logger.info(
        `[Volonteers._getVolunteerDataWithCache] Cache for volonteer ${id} created, result ${createdCache}`,
      );

      return volunteerData;
    }

    const volunteerData = JSON.parse(cache);
    return volunteerData as Volunteer;
  }

  private async _findVolunteerSystemIdUsingTelegramId(telegramId: number) {
    const cache = await this._cache.get(`system_to_telegram_id=${telegramId}`);

    this._logger.info(
      `[Volunteers._findVolunteerSystemIdUsingTelegramId] cache value for key system_to_telegram_id=${telegramId} -> ${cache}`,
    );

    if (!cache) {
      this._logger.info(
        `[Volonteers._findVolunteerSystemIdUsingTelegramId] Cache for volonteer ${telegramId} not found, generate cache...`,
      );

      const volunteerData = await this._client.volunteer.findUnique({
        where: { telegramId },
        select: {
          id: true,
        },
      });

      if (!volunteerData) return 0;

      const createdCache = await this._cache.set(
        `system_to_telegram_id=${telegramId}`,
        String(volunteerData.id),
        TG_ID_TO_SYS_ID_BIND_LIFETIME,
      );

      console.log("createdCache", createdCache);

      this._logger.info(
        `[Volonteers._findVolunteerSystemIdUsingTelegramId] Cache for volonteer ${telegramId} created, result ${createdCache}`,
      );

      return volunteerData.id;
    }

    return Number(cache);
  }

  async findVolunteerUnderTelegramId(telegramId: number) {
    const volonteerSystemId = await this._findVolunteerSystemIdUsingTelegramId(telegramId);

    console.log("volonteerSystemId", volonteerSystemId);

    const volunteerData = await this._getVolunteerDataWithCache(volonteerSystemId);
    return volunteerData;
  }

  async findVolunteerUnderId(id: number) {
    try {
      return await this._getVolunteerDataWithCache(id);
    } catch (err) {
      this._logger.error(`Failed find volunteer (under ID) record, reason:`);
      this._logger.error(err.message);
      return;
    }
  }

  async updateBalance(id: number, balance: number) {
    const updated = await this._client.volunteer.update({
      where: {
        id,
      },
      data: {
        balance,
      },
    });

    await this._cache.clean(`volunteer_data_${id}`);
    return updated;
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
      this._logger.error(`Failed update volunteer [${id}] fio  field, reason:`);
      this._logger.error(err.message);
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
      this._logger.error(`Failed update volunteer [${id}] role field, reason:`);
      this._logger.error(err.message);
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

    const volunteerData = await this._getVolunteerDataWithCache(id);
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

    const { organizationId } = await this._getVolunteerDataWithCache(id);
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
