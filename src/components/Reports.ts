import { PrismaClient } from "@prisma/client";
import { calcMd5 } from "../functions/calcMd5";

type CreateReportDto = {
  payload: string;
  volonteerId: number;
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
        volonteerId: data.volonteerId,
      },
    });
  }

  async retrieveOutstandingReports() {
    return await this._client.report.findMany({
      where: {
        confirmed: null,
      },
      skip: 0,
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

  async getManyByVolonteer(volonteerId: number) {
    return await this._client.report.findMany({
      where: {
        volonteerId,
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

  async findReportFromVolonteerContainsPayload(
    volonteerId: number,
    payload: string,
  ) {
    return await this._client.report.findFirst({
      where: {
        volonteerId,
        payload,
      },
    });
  }

  async hashReportsCount(hash: string) {
    return await this._client.report.count({
      where: {
        hash
      }
    })
  }
}
