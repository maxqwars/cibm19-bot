import { Organization, PrismaClient } from "@prisma/client";
import { Cache } from "./Cache";
import { Logger } from "simple-node-logger";

type OrganizationCreateDataDto = {
  name: string;
  domain: string;
};

const ORG_CACHE_LIFETIME = 1000 * 60 * 60 * 5;

export class Organizations {
  private readonly _client: PrismaClient;
  private readonly _cache: Cache;
  private readonly _logger: Logger;

  constructor(prisma: PrismaClient, cache: Cache, logger: Logger) {
    this._client = prisma;
    this._cache = cache;
    this._logger = logger;
  }

  async create(dto: OrganizationCreateDataDto) {
    try {
      return await this._client.organization.create({
        data: dto,
      });
    } catch (err) {
      this._logger.error(`Failed create organization "${dto.name}", reason:`);
      this._logger.error(err.message);
      return;
    }
  }

  async findById(id: number) {
    try {
      const orgData = this._client.organization.findUnique({
        where: {
          id,
        },
      });
      return orgData;
    } catch (err) {
      this._logger.error(`[Organizations.findById] Failed get organization by ID, reason ⬇️`);
      this._logger.error(err.message);
      return null;
    }
  }

  async getAll() {
    return await this._client.organization.findMany({
      skip: 0,
    });
  }

  async getUnlocked() {
    return await this._client.organization.findMany({
      where: {
        closed: false,
      },
      skip: 0,
    });
  }

  async getLocked() {
    return await this._client.organization.findMany({
      where: {
        closed: true,
      },
      take: 0,
    });
  }

  async members(id: number) {
    return await this._client.organization.findFirst({
      where: { id },
      select: {
        members: true,
      },
    });
  }
}
