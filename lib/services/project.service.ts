import { BaseService } from "./base.service";
import { ProjectRepository } from "@/lib/repositories/project.repository";
import { IProject } from "@/models/Project";
import { AuthorizationError, BusinessRuleError } from "@/lib/errors";
import { getChatCompletion } from "@/lib/ai/gpt";
import { logger } from "@/lib/infrastructure/logger";
// @ts-ignore - Mongoose types issue
import mongoose from "mongoose";
const { Types } = mongoose;

export class ProjectService extends BaseService<IProject> {
  private projectRepo: ProjectRepository;

  constructor() {
    const repo = new ProjectRepository();
    super(repo, "Project");
    this.projectRepo = repo;
  }

  /**
   * Create a new project
   */
  async createProject(
    userId: string,
    data: {
      projectName: string;
      budget: number;
      timeline: number;
      description: string;
    }
  ): Promise<IProject> {
    const project = await this.create({
      _id: new Types.ObjectId().toString(),
      userId,
      ...data,
      status: "draft",
      createdAt: new Date(),
    });

    logger.info("Project created", {
      projectId: project._id,
      userId,
    });

    return project;
  }

  /**
   * Get project by ID with ownership check
   */
  async getProjectWithOwnershipCheck(
    projectId: string,
    userId: string
  ): Promise<IProject> {
    const project = await this.findById(projectId);

    if (project.userId !== userId) {
      throw new AuthorizationError("You don't have access to this project");
    }

    return project;
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<IProject[]> {
    return this.projectRepo.findByUserId(userId);
  }

  /**
   * Analyze project using AI
   */
  async analyzeProject(projectId: string, userId: string): Promise<IProject> {
    const project = await this.getProjectWithOwnershipCheck(projectId, userId);

    if (project.status !== "draft") {
      throw new BusinessRuleError("Project has already been analyzed");
    }

    logger.info("Analyzing project", { projectId });

    // Generate AI analysis
    const analysis = await this.generateAnalysis(project);

    // Update project with analysis
    const updatedProject = await this.projectRepo.addAnalysis(
      projectId,
      analysis
    );

    if (!updatedProject) {
      throw new BusinessRuleError("Failed to update project with analysis");
    }

    logger.info("Project analyzed", {
      projectId,
      score: analysis.score,
    });

    return updatedProject;
  }

  /**
   * Generate AI-powered analysis
   */
  private async generateAnalysis(project: IProject): Promise<{
    score: number;
    risks: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = `
        Analyze this project feasibility:
        Project: ${project.projectName}
        Budget: $${project.budget}
        Timeline: ${project.timeline} days
        Description: ${project.description}
        
        Provide:
        1. Feasibility score (0-100)
        2. Top 3 risks
        3. Top 3 recommendations
        
        Format as JSON: { score, risks[], recommendations[] }
      `;

      const response = await getChatCompletion({
        messages: [
          {
            role: "system",
            content: "You are a project feasibility analyst. Provide realistic assessments.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 500,
      });

      if (!response) {
        // Fallback to basic analysis
        return this.generateBasicAnalysis(project);
      }

      // Parse AI response
      try {
        const analysis = JSON.parse(response);
        return {
          score: Math.min(100, Math.max(0, analysis.score || 50)),
          risks: analysis.risks || ["Insufficient data for risk analysis"],
          recommendations: analysis.recommendations || ["Gather more requirements"],
        };
      } catch {
        return this.generateBasicAnalysis(project);
      }
    } catch (error) {
      logger.error("AI analysis failed, using fallback", error);
      return this.generateBasicAnalysis(project);
    }
  }

  /**
   * Generate basic analysis without AI
   */
  private generateBasicAnalysis(project: IProject) {
    const budgetPerDay = project.budget / project.timeline;
    let score = 50;

    // Basic scoring logic
    if (budgetPerDay > 1000) score += 20;
    else if (budgetPerDay > 500) score += 10;
    else score -= 10;

    if (project.timeline > 180) score += 10;
    else if (project.timeline < 30) score -= 20;

    if (project.description.length > 200) score += 10;

    const risks = [];
    const recommendations = [];

    if (budgetPerDay < 500) {
      risks.push("Budget may be insufficient for timeline");
      recommendations.push("Consider extending timeline or increasing budget");
    }

    if (project.timeline < 30) {
      risks.push("Timeline is very aggressive");
      recommendations.push("Build in buffer time for unexpected delays");
    }

    if (!risks.length) {
      risks.push("Standard project execution risks apply");
    }

    if (!recommendations.length) {
      recommendations.push("Proceed with detailed planning phase");
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      risks: risks.slice(0, 3),
      recommendations: recommendations.slice(0, 3),
    };
  }

  /**
   * Approve a project
   */
  async approveProject(projectId: string, userId: string): Promise<IProject> {
    await this.getProjectWithOwnershipCheck(projectId, userId);
    
    const updated = await this.projectRepo.updateStatus(projectId, "approved");
    
    if (!updated) {
      throw new BusinessRuleError("Failed to approve project");
    }

    logger.info("Project approved", { projectId });
    return updated;
  }

  /**
   * Reject a project
   */
  async rejectProject(projectId: string, userId: string): Promise<IProject> {
    await this.getProjectWithOwnershipCheck(projectId, userId);
    
    const updated = await this.projectRepo.updateStatus(projectId, "rejected");
    
    if (!updated) {
      throw new BusinessRuleError("Failed to reject project");
    }

    logger.info("Project rejected", { projectId });
    return updated;
  }
}

