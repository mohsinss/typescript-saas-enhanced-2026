import { BaseRepository } from "@/lib/repositories/base.repository";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";

/**
 * Base service class with common business logic
 */
export abstract class BaseService<T> {
  constructor(
    protected repository: BaseRepository<any>,
    protected serviceName: string
  ) {}

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T> {
    const entity = await this.repository.findById(id);
    
    if (!entity) {
      throw new NotFoundError(this.serviceName, id);
    }
    
    return entity as T;
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<T[]> {
    return this.repository.find() as Promise<T[]>;
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    logger.info(`Creating ${this.serviceName}`, { data });
    
    const entity = await this.repository.create(data);
    
    logger.info(`${this.serviceName} created`, { 
      id: (entity as any)._id 
    });
    
    return entity as T;
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    logger.info(`Updating ${this.serviceName}`, { id, data });
    
    const entity = await this.repository.update(id, data);
    
    if (!entity) {
      throw new NotFoundError(this.serviceName, id);
    }
    
    logger.info(`${this.serviceName} updated`, { id });
    
    return entity as T;
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    logger.info(`Deleting ${this.serviceName}`, { id });
    
    const deleted = await this.repository.delete(id);
    
    if (!deleted) {
      throw new NotFoundError(this.serviceName, id);
    }
    
    logger.info(`${this.serviceName} deleted`, { id });
  }

  /**
   * Check if entity exists
   */
  async exists(filter: any): Promise<boolean> {
    return this.repository.exists(filter);
  }
}
