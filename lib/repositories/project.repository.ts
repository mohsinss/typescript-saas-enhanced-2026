import Project, { IProject } from "@/models/Project";
import { BaseRepository } from "./base.repository";

export class ProjectRepository extends BaseRepository<any> {
  constructor() {
    super(Project);
  }

  /**
   * Find all projects for a user
   */
  async findByUserId(userId: string): Promise<IProject[]> {
    return this.find({ userId });
  }

  /**
   * Find projects by status
   */
  async findByStatus(
    userId: string,
    status: IProject["status"]
  ): Promise<IProject[]> {
    return this.find({ userId, status });
  }

  /**
   * Update project status
   */
  async updateStatus(
    projectId: string,
    status: IProject["status"]
  ): Promise<IProject | null> {
    return this.update(projectId, { status, updatedAt: new Date() });
  }

  /**
   * Add analysis to project
   */
  async addAnalysis(
    projectId: string,
    analysis: {
      score: number;
      risks: string[];
      recommendations: string[];
    }
  ): Promise<IProject | null> {
    return this.update(projectId, {
      analysis,
      status: "in-review",
      updatedAt: new Date(),
    });
  }

  /**
   * Get projects within budget range
   */
  async findByBudgetRange(
    userId: string,
    minBudget: number,
    maxBudget: number
  ): Promise<IProject[]> {
    return this.find({
      userId,
      budget: { $gte: minBudget, $lte: maxBudget },
    });
  }

  /**
   * Get recent projects
   */
  async findRecent(userId: string, limit = 10): Promise<IProject[]> {
    const projects = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    
    return projects as unknown as IProject[];
  }
}

