import { PrismaClient } from "@prisma/client";
import { calculateHash } from "../helpers/calculateHash";
import logger from "../logger";
import { Cache } from "../modules/Cache";
import dayjs from "dayjs";

type ReportCollectionItem = {
  payload: string;
  hash: string;
  count: number;
};

export class ReportsModel {
  private readonly _prismaClient: PrismaClient;
  private readonly _cache: Cache;

  constructor(prismaClient: PrismaClient, cache: Cache) {
    this._prismaClient = prismaClient;
    this._cache = cache;
  }

  async findReportsByPayloadHash(hash: string) {
    try {
      return await this._prismaClient.report.findMany({
        where: {
          hash,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async findReportByPayloadHashAndVolonteerId(
    volonteerId: number,
    hash: string,
  ) {
    try {
      return await this._prismaClient.report.findFirst({
        where: {
          hash,
          volonteerId,
        },
      });
    } catch (err) {
      logger.error(
        `Failed find report hash <${hash}>, volonteer ID <${volonteerId}>`,
      );
      return null;
    }
  }

  async getLastDayReports() {
    const reports: ReportCollectionItem[] = [];
    const endDate = dayjs().subtract(1, "day");
    const startDate = dayjs(endDate).toISOString();

    const reportsAll = await this._prismaClient.report.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const hashes = new Set();

    reportsAll.map((report) => {
      hashes.add(report.hash);
    });

    for (const hash of Array.from(hashes) as string[]) {
      const count = (await this._prismaClient.report.count({
        where: { hash },
      })) as number;
      const { payload } = await this._prismaClient.report.findFirst({
        where: { hash },
      });

      reports.push({
        hash,
        count,
        payload,
      });
    }

    return reports;
  }

  async orgLastDayReports(organizationId: number) {
    const reports: ReportCollectionItem[] = [];
    const endDate = dayjs().subtract(1, "day");
    const startDate = dayjs(endDate).toISOString();

    const reportsAll = await this._prismaClient.report.findMany({
      where: {
        volonteer: {
          organizationId,
        },
        createdAt: {
          gte: startDate,
        },
      },
    });

    const hashes = new Set();

    reportsAll.map((report) => {
      hashes.add(report.hash);
    });

    for (const hash of Array.from(hashes) as string[]) {
      const count = (await this._prismaClient.report.count({
        where: { hash },
      })) as number;
      const { payload } = await this._prismaClient.report.findFirst({
        where: { hash },
      });

      reports.push({
        hash,
        count,
        payload,
      });
    }

    return reports;
  }

  async createReport(volonteerId, payload) {
    try {
      const hash = calculateHash(payload);

      const candidate = await this.findReportByPayloadHashAndVolonteerId(
        volonteerId,
        hash,
      );

      if (candidate) {
        logger.info(
          `Report creation error, report already exist. Volonteer ID <${volonteerId}>, payload <${payload}>`,
        );
        return null;
      }

      const report = await this._prismaClient.report.create({
        data: {
          payload,
          hash,
          volonteerId,
        },
      });

      return report;
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }
}
