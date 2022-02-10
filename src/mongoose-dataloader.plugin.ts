import DataLoader from "dataloader";
import { Model, Schema } from "mongoose";
import { DocumentType } from "@typegoose/typegoose";

export interface IPluginOptions {
  // intervalMs?: number;
}

const createDataLoader = <T>(
  model: Model<T, any, { _dataLoader: DataLoader<string, T> }>,
) =>
  new DataLoader<string, DocumentType<T> | null>(async (ids: any) => {
    const result = await model.find().where({
      _id: {
        $in: ids,
      },
    });
    const results = new Array<DocumentType<T> | null>(ids.length);
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      results[i] =
        result.filter((v: any) => v?._id?.toString() === id)[0] ?? null;
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
  ): Promise<(DocumentType<T> | null)[]> {
    if (!this._dataLoader) {
      this._dataLoader = createDataLoader(this);
    }
    const resultsOrErrors = await this._dataLoader.loadMany(ids);
    const results: (DocumentType<T> | null)[] = resultsOrErrors;
    return results;
  };
}

export interface IDataLoaderModel<T> {
  loadId: (id: string) => Promise<DocumentType<T> | null>;
  loadIds: (ids: string[]) => Promise<(DocumentType<T> | null)[]>;
}
