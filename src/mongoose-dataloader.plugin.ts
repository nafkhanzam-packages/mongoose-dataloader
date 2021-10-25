import DataLoader from "dataloader";
import { Model, Schema } from "mongoose";

export interface IPluginOptions {
  // intervalMs?: number;
}

const createDataLoader = <T>(
  model: Model<T, any, { _dataLoader: DataLoader<string, T> }>,
) =>
  new DataLoader<string, T | null>(async (ids) => {
    const result = await model.find().where({
      _id: {
        $in: ids,
      },
    });
    const results = new Array<T | null>(ids.length);
    let ir = 0;
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      if (id === result[ir]?._id?.toString()) {
        results[i] = result[ir];
        ++ir;
      } else {
        results[i] = null;
      }
    }
    return results;
  });

export function mongooseDataLoaderPlugin<T>(
  schema: Schema<T, any, { _dataLoader: DataLoader<string, T> }>,
  pluginOptions?: IPluginOptions,
) {
  schema.statics.loadId = async function (id: string): Promise<T | null> {
    if (!this._dataLoader) {
      this._dataLoader = createDataLoader(this);
    }
    return await this._dataLoader.load(id);
  };
  schema.statics.loadIds = async function (
    ids: string[],
  ): Promise<(T | null)[]> {
    if (!this._dataLoader) {
      this._dataLoader = createDataLoader(this);
    }
    const resultsOrErrors = await this._dataLoader.loadMany(ids);
    const results: (T | null)[] = resultsOrErrors;
    return results;
  };
}

export interface IDataLoaderModel<T> {
  loadId: (id: string) => Promise<T | null>;
  loadIds: (ids: string[]) => Promise<(T | null)[]>;
}
