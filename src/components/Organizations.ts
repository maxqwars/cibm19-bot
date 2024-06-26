import { Organization, PrismaClient } from "@prisma/client";
import logger from "../logger";
import { Cache } from "./Cache";

type OrganizationCreateDataDto = {
  name: string;
  domain: string;
};

const ORG_CACHE_LIFETIME = 1000 * 60 * 60 * 5;

export class Organizations {
  private readonly _client: PrismaClient;
  private readonly _cache: Cache;

  constructor(prisma: PrismaClient, cache: Cache) {
    this._client = prisma;
    this._cache = cache;
  }

  async create(dto: OrganizationCreateDataDto) {
    try {
      return await this._client.organization.create({
        data: dto,
      });
    } catch (err) {
      logger.error(`Failed create organization "${dto.name}", reason:`);
      logger.error(err.message);
      return;
    }
  }

  async findById(id: number) {
    const orgData = this._client.organization.findUnique({
      where: {
        id,
      },
    });
    return orgData;
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
