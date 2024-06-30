import { readdirSync, readFile } from "node:fs";
import { join } from "node:path";
import { Cache } from "./Cache";
import { Logger } from "simple-node-logger";

type TemplatePayloadData = {
  [key: string]: string | number | boolean;
};

export class Render {
  private _templates: string[];
  private readonly _cache: Cache;
  private readonly _viewsDirPath: string;
  private readonly _logger: Logger;

  constructor(viewsDir: string, cache: Cache, logger: Logger) {
    this._viewsDirPath = viewsDir;
    this._templates = this._searchTempsInViews(viewsDir);
    this._cache = cache;
    this._logger = logger;
  }

  private _searchTempsInViews(viewsDir: string) {
    const dirContent = readdirSync(viewsDir);
    return dirContent.filter((item) => /.txt/.exec(item));
  }

  private async _readTempFromFs(template: string): Promise<string | void> {
    const cachedTemp = await this._cache.get(`render_temp_${template}`);

    if (cachedTemp) {
      return cachedTemp.toString();
    }

    const readFilePromise: Promise<string | void> = new Promise((resolve, reject) => {
      readFile(join(this._viewsDirPath, template), (err, data) => {
        if (err) reject(err);
        resolve(data.toString());
      });
    });

    const result = await readFilePromise;

    if (result) {
      await this._cache.set(`render_temp_${template}`, result, 5);
      return result;
    }

    return;
  }

  // FIXME: Syntax {{ value1 }} not working, syntax {{value1}} working
  private _getRepExpression(key: string) {
    // /{{\s?[a-z|\d]+\s?}}/gm
    return new RegExp(`{{\s?${key}\s?}}`);
  }

  async render(temp: string, data: TemplatePayloadData) {
    let content = (await this._readTempFromFs(temp)) as string;
    let buff = content;

    if (!content) {
      this._logger.info(`Templates:\n${this._templates.map((temp) => `${temp}\n`)}`);
      return null;
    }

    if (Object.keys(data).length === 0) {
      this._logger.info(`Render result for ${temp}: ${buff}`);
      return content;
    }

    for (const key in data) {
      console.log(buff);
      const searchValue = this._getRepExpression(key);
      buff = buff.replace(searchValue, String(data[key]));
    }

    this._logger.info(`Render result for ${temp}: ${buff}`);

    return buff;
  }
}
