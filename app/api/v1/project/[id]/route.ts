import { NextRequest } from "next/server";
import connectMongo from "@/lib/db/mongoose";
import Project from "@/models/Project";
import { createProtectedHandler } from "@/lib/api/handler";
import { updateProjectSchema, objectIdSchema } from "@/lib/validation/schemas";
import { NotFoundError, AuthorizationError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";

/**
 * Get a specific project
 * GET /api/v1/project/[id]
 */
export const GET = createProtectedHandler(
  async (req: NextRequest, context) => {
    await connectMongo();
    
    const { id } = context.params;
    
    // Validate ID format
    const validatedId = objectIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new NotFoundError("Project", id);
    }
    
    logger.dbQuery("findById", "Project", { id });
    
    const project = await Project.findById(id).lean() as any;
    
    if (!project) {
      throw new NotFoundError("Project", id);
    }
    
    // Check ownership
    if (project.userId !== context.session.user.id) {
      throw new AuthorizationError("You don't have access to this project");
    }
    
    return {
      success: true,
      data: project,
      meta: { version: "v1" },
    };
  },
  {
    rateLimit: { requests: 100, window: "1h" },
  }
);

/**
 * Update a project
 * PUT /api/v1/project/[id]
 */
export const PUT = createProtectedHandler(
  async (req: NextRequest, context, data) => {
    await connectMongo();
    
    const { id } = context.params;
    
    // Validate ID format
    const validatedId = objectIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new NotFoundError("Project", id);
    }
    
    logger.dbQuery("findById", "Project", { id });
    
    // Check if project exists and user owns it
    const existingProject = await Project.findById(id) as any;
    
    if (!existingProject) {
      throw new NotFoundError("Project", id);
    }
    
    if (existingProject.userId !== context.session.user.id) {
      throw new AuthorizationError("You don't have access to this project");
    }
    
    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();
    
    logger.info("Project updated", { 
      projectId: id,
      userId: context.session.user.id 
    });
    
    return {
      success: true,
      data: updatedProject,
      meta: { version: "v1" },
    };
  },
  {
    schema: updateProjectSchema,
    rateLimit: { requests: 20, window: "1h" },
  }
);

/**
 * Delete a project
 * DELETE /api/v1/project/[id]
 */
export const DELETE = createProtectedHandler(
  async (req: NextRequest, context) => {
    await connectMongo();
    
    const { id } = context.params;
    
    // Validate ID format
    const validatedId = objectIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new NotFoundError("Project", id);
    }
    
    logger.dbQuery("findById", "Project", { id });
    
    // Check if project exists and user owns it
    const existingProject = await Project.findById(id) as any;
    
    if (!existingProject) {
      throw new NotFoundError("Project", id);
    }
    
    if (existingProject.userId !== context.session.user.id) {
      throw new AuthorizationError("You don't have access to this project");
    }
    
    // Delete project
    await Project.findByIdAndDelete(id).exec();
    
    logger.info("Project deleted", { 
      projectId: id,
      userId: context.session.user.id 
    });
    
    return {
      success: true,
      data: { message: "Project deleted successfully" },
      meta: { version: "v1" },
    };
  },
  {
    rateLimit: { requests: 10, window: "1h" },
  }
);

