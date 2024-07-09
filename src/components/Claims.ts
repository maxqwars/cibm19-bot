import { PrismaClient } from "@prisma/client";
import { Logger } from "simple-node-logger";

type ClaimCreateDataDto = {
  volunteerId: number;
  organizationId: number;
};

export class Claims {
  private readonly _client: PrismaClient;
  private readonly _logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this._client = prisma;
    this._logger = logger;
  }

  async create(dto: ClaimCreateDataDto) {
    return await this._client.claim.create({
      data: dto,
    });
  }

  async create2(volunteerId: number, organizationId: number) {
    return await this._client.claim.create({
      data: {
        volunteerId,
        organizationId,
      },
    });
  }

  async volunteerClaims(volunteerId: number) {
    return await this._client.claim.findMany({
      where: {
        volunteerId: volunteerId,
      },
    });
  }

  async claimDetails(id: number) {
    return await this._client.claim.findFirst({
      where: {
        id,
      },
    });
  }

  async organizationClaims(organizationId: number) {
    return await this._client.claim.findMany({
      where: {
        organizationId,
      },
      skip: 0,
    });
  }

  async delete(id: number) {
    return await this._client.claim.delete({
      where: {
        id,
      },
    });
  }
}
