import { PrismaClient } from "@prisma/client";
import { Cache } from "../modules/Cache";
import { calculateHash } from "../helpers/calculateHash";
import logger from "../logger";
import { CACHE_POLICY } from "../constants/CACHE_POLICY";

export class OrganizationsModel {
  private readonly _prismaClient: PrismaClient;
  private readonly _cache: Cache;

  constructor(prismaClient: PrismaClient, cache: Cache) {
    this._prismaClient = prismaClient;
    this._cache = cache;
  }

  async findOrgByName(name: string) {
    const nameHash = calculateHash(name);

    try {
      const organization = await this._prismaClient.organization.findUnique({
        where: {
          nameHash,
        },
      });

      return organization;
    } catch (err) {
      logger.error(`Failed find organization by name "${name}", reason:`);
      logger.error(err.message);
      return null;
    }
  }

  async createOrganization(name: string) {
    try {
      const nameHash = calculateHash(name);
      const candidate = await this.findOrgByName(name);

      if (candidate) return null;

      return await this._prismaClient.organization.create({
        data: {
          name,
          nameHash,
        },
      });
    } catch (err) {
      logger.error(`Failed create organization under name "${name}", reason:`);
      logger.error(err.message);
      return null;
    }
  }

  async getOpenOrgs() {
    try {
      return await this._prismaClient.organization.findMany({
        where: {
          closed: false,
        },
      });
    } catch (err) {
      logger.error(`Failed get open organizations list, reason:`);
      logger.error(err.message);
      return null;
    }
  }

  async getAllOrgs() {
    try {
      return await this._prismaClient.organization.findMany();
    } catch (err) {
      logger.error(`Failed get all organizations list, reason:`);
      logger.error(err.message);
      return null;
    }
  }

  async updateClosedValue(id: number, closed: boolean) {
    try {
      return await this._prismaClient.organization.update({
        where: {
          id,
        },
        data: {
          closed,
        },
      });
    } catch (err) {
      logger.error(
        `Failed change 'closed' field for organization '${id}', reason:`,
      );
      logger.error(err);
      return null;
    }
  }

  async getMembers(organizationId: number) {
    try {
      return await this._prismaClient.volonteer.findMany({
        where: {
          organizationId,
        },
      });
    } catch (err) {
      logger.error(
        `Failed get members list for organization ${organizationId}, reason:`,
      );
      logger.error(err.message);
      return null;
    }
  }

  async getCuratorOrg(id: number) {
    try {
      return await this._prismaClient.volonteer.findFirst({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(`Failed get organization for curator ${id}, reason:`);
      logger.error(err.message);
      return;
    }
  }

  async getCurators(organizationId: number) {
    try {
      return await this._prismaClient.volonteer.findMany({
        where: {
          organizationId,
          role: "curator",
        },
      });
    } catch (err) {
      logger.error(
        `Failed get curators list for organization ${organizationId}, reason:`,
      );
      logger.error(err.message);
      return null;
    }
  }

  async memberOf(id: number, organizationId: number) {
    try {
      return await this._prismaClient.volonteer.findFirst({
        where: {
          id,
          organizationId,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async getVolonteerClaims(volonteerId: number) {
    try {
      return await this._prismaClient.claim.findFirst({
        where: {
          volonteerId,
        },
      });
    } catch (err) {
      console.error(err.message);
      return null;
    }
  }

  async createClaim(volonteerId: number, organizationId: number) {
    try {
      return await this._prismaClient.claim.create({
        data: {
          volonteerId,
          organizationId,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async findOrgById(id: number) {
    try {
      return await this._prismaClient.organization.findFirst({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async addMember(id: number, organizationId: number) {
    try {
      return await this._prismaClient.volonteer.update({
        where: {
          id,
        },
        data: {
          organizationId,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async getClaims(organizationId: number) {
    try {
      return await this._prismaClient.claim.findMany({
        where: {
          organizationId,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async getFullClaimInfo(id: number) {
    try {
      return await this._prismaClient.claim.findFirst({
        where: {
          id,
        },
        select: {
          id: true,
          volonteer: true,
          organization: true,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }

  async removeClaim(id: number) {
    try {
      return this._prismaClient.claim.delete({
        where: {
          id,
        },
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }
}
