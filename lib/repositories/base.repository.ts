import { Model, Document, FilterQuery } from "mongoose";
import { logger } from "@/lib/infrastructure/logger";

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Base repository class with common database operations
 */
export abstract class BaseRepository<T extends Document> {
  constructor(protected model: Model<T>) {}

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<T | null> {
    logger.dbQuery("findById", this.model.modelName, { id });
    return this.model.findById(id).lean().exec() as Promise<T | null>;
  }

  /**
   * Find a single document matching the filter
   */
  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    logger.dbQuery("findOne", this.model.modelName, { filter });
    return this.model.findOne(filter).lean().exec() as Promise<T | null>;
  }

  /**
   * Find all documents matching the filter
   */
  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    logger.dbQuery("find", this.model.modelName, { filter });
    return this.model.find(filter).lean().exec() as Promise<T[]>;
  }

  /**
   * Find documents with pagination
   */
  async findPaginated(
    filter: FilterQuery<T>,
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sort = "createdAt", order = "desc" } = options;
    const skip = (page - 1) * limit;

    logger.dbQuery("findPaginated", this.model.modelName, { 
      filter, 
      options 
    });

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ [sort]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<T[]>,
      this.model.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    logger.dbQuery("create", this.model.modelName, { data });
    const doc = new this.model(data);
    return doc.save();
  }

  /**
   * Update a document by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    logger.dbQuery("update", this.model.modelName, { id, data });
    return this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<boolean> {
    logger.dbQuery("delete", this.model.modelName, { id });
    const result = await this.model.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  /**
   * Count documents matching the filter
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    logger.dbQuery("count", this.model.modelName, { filter });
    return this.model.countDocuments(filter);
  }

  /**
   * Check if a document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    logger.dbQuery("exists", this.model.modelName, { filter });
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }
}
