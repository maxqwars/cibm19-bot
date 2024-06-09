import { PrismaClient } from "@prisma/client";
import logger from "../logger";

type ClaimCreateDataDto = {
  volunteerId: number;
  organizationId: number;
};

export class Claims {
  private readonly _client: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._client = prisma;
  }

  async create(dto: ClaimCreateDataDto) {
    return await this._client.claim.create({
      data: dto,
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
}
