import { PrismaClient } from "@prisma/client";
import { calcMd5 } from "../functions/calcMd5";

type CreateReportDto = {
  payload: string;
  volunteerId: number;
};

export class Reports {
  private readonly _client: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._client = prisma;
  }

  async create(data: CreateReportDto) {
    return await this._client.report.create({
      data: {
        payload: data.payload,
        hash: calcMd5(data.payload),
        volunteerId: data.volunteerId,
      },
    });
  }

  async retrieveOutstandingReports() {
    return await this._client.report.findMany({
      where: {
        confirmed: null,
      },
      take: 10,
    });
  }

  async getById(id: number) {
    return await this._client.report.findFirst({
      where: {
        id,
      },
    });
  }

  async getManyByPayload(payload: string) {
    return await this._client.report.findMany({
      where: {
        payload,
      },
    });
  }

  async getManyByHash(hash: string) {
    return await this._client.report.findMany({
      where: {
        hash,
      },
    });
  }

  async getManyByVolunteer(volunteerId: number) {
    return await this._client.report.findMany({
      where: {
        volunteerId: volunteerId,
      },
    });
  }

  async updateConfirmedStatusForMany(hash: string, confirmed: boolean) {
    return await this._client.report.updateMany({
      where: {
        hash,
      },
      data: {
        confirmed,
      },
    });
  }

  async findReportFromVolunteerContainsPayload(
    volunteerId: number,
    payload: string,
  ) {
    return await this._client.report.findFirst({
      where: {
        volunteerId: volunteerId,
        payload,
      },
    });
  }

  async hashReportsCount(hash: string) {
    return await this._client.report.count({
      where: {
        hash,
      },
    });
  }
}
