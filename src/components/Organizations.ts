import { PrismaClient } from "@prisma/client";
import logger from "../logger";

type OrganizationCreateDataDto = {
  name: string;
  domain: string;
};

export class Organizations {
  private readonly _client: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._client = prisma;
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
    return await this._client.organization.findFirst({
      where: {
        id
      }
    })
  }

  async getAll() {
    return await this._client.organization.findMany({
      skip: 0
    })
  }

  async getUnlocked() {
    return await this._client.organization.findMany({
      where: {
        closed: false,
      },
      skip: 0
    })
  }

  async getLocked() {
    return await this._client.organization.findMany({
      where: {
        closed: true
      },
      take: 0
    })
  }
}
