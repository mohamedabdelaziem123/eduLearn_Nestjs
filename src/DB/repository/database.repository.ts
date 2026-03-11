import {
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  MongooseUpdateQueryOptions,
  ProjectionType,
  QueryOptions,
  RootFilterQuery, // Added this
  SessionOption,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
} from 'mongoose';

export type Lean<T> = FlattenMaps<HydratedDocument<T>>;

export abstract class DatabaseRepository<
  TRawDocument = any,
  TDocument = HydratedDocument<TRawDocument>,
> {
  constructor(protected readonly model: Model<TDocument>) { }

  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: RootFilterQuery<TRawDocument>;
    projection?: ProjectionType<TRawDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<TDocument | null> {
    return await this.model.findOne(filter, projection, options || {});
  }

  async find({
    filter,
    projection,
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<(HydratedDocument<TDocument> | Lean<TDocument>)[]> {
    return await this.model.find(filter, projection, options);
  }

  async paginate({
    filter,
    projection,
    options = {},
    size = 5,
    page = 'all',
  }: {
    filter: RootFilterQuery<TDocument>;
    projection?: ProjectionType<TDocument>;
    options?: QueryOptions<TDocument>;
    size?: number | undefined;
    page?: number | 'all' | undefined;
  }): Promise<{
    DocCount: number | undefined;
    pages: number | undefined;
    currentPage: number | undefined | 'all';
    limit: number | undefined;
    Result: TDocument[] | Lean<TDocument>;
  }> {
    let DocCount: number | undefined = undefined;
    let pages: number | undefined = undefined;
    if (page !== 'all') {
      const pageNum = Math.floor(page < 1 ? 1 : page);
      options.limit = Math.floor(size < 1 ? 5 : size);

      DocCount = await this.model.countDocuments(filter);
      pages = Math.ceil(DocCount / options.limit);

      const finalPage = pageNum > pages ? (pages < 1 ? 1 : pages) : pageNum;
      options.skip = (finalPage - 1) * options.limit;
      page = finalPage;
    }

    const Result = await this.model.find(filter, projection, options);
    return {
      DocCount,
      pages,
      currentPage: page !== 'all' ? page : undefined,
      limit: options?.limit,
      Result,
    };
  }

  async deleteOne({
    filter,
    options,
  }: {
    filter: RootFilterQuery<TRawDocument>;
    options?: QueryOptions<TDocument>;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter, options as any);
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    update: UpdateQuery<TDocument | UpdateWithAggregationPipeline>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<UpdateWriteOpResult> {
    if (Array.isArray(update)) {
      return this.model.updateOne(filter, update, options as any);
    }
    return this.model.updateOne(
      filter,
      { $inc: { __v: 1 }, ...update } as any,
      options as any,
    );
  }

  async create({
    data,
    options,
  }: {
    data: Partial<TRawDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<TDocument[]> {
    return await this.model.create(data, options);
  }

  async findOneAndUpdate({
    filter = {},
    update,
    options = { new: true },
  }: {
    filter?: RootFilterQuery<TRawDocument>;
    update?: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument> | undefined;
  }): Promise<TDocument | null> {
    if (Array.isArray(update)) {
      return this.model.findOneAndUpdate(filter, update, options);
    }
    return this.model.findOneAndUpdate(
      filter,
      { $inc: { __v: 1 }, ...update } as any,
      options,
    );
  }

  async findOneAndDelete({
    filter = {},
    options = {},
  }: {
    filter?: RootFilterQuery<TRawDocument>;
    options?: QueryOptions<TRawDocument>;
  }): Promise<TDocument | null> {
    return await this.model.findOneAndDelete(filter, options);
  }

  /** Run a raw aggregation pipeline */
  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline);
  }

  /** Count documents matching a filter */
  async countDocuments(filter: RootFilterQuery<TRawDocument> = {} as any): Promise<number> {
    return this.model.countDocuments(filter);
  }
}
