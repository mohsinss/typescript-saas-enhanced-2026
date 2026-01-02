import { NextRequest } from "next/server";
import connectMongo from "@/lib/db/mongoose";
import Project from "@/models/Project";
import { createProtectedHandler } from "@/lib/api/handler";
import { createProjectSchema, paginationSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/infrastructure/logger";
// @ts-ignore - Mongoose types issue
import mongoose from "mongoose";
const { Types } = mongoose;

/**
 * Create a new project
 * POST /api/v1/project
 */
export const POST = createProtectedHandler(
  async (req: NextRequest, context, data) => {
    await connectMongo();
    
    const { _id, ...projectData } = data || {};
    
    logger.info("Creating project", { 
      userId: context.session.user.id,
      projectId: _id 
    });
    
    const newProject = new Project({
      _id: _id || new Types.ObjectId().toString(),
      ...projectData,
      userId: context.session.user.id,
      status: "draft",
      createdAt: new Date(),
    });
    
    const savedProject = await newProject.save();
    
    logger.info("Project created", { 
      projectId: savedProject._id,
      userId: context.session.user.id 
    });
    
    return {
      success: true,
      data: savedProject.toJSON(),
      meta: { version: "v1" },
    };
  },
  {
    schema: createProjectSchema,
    rateLimit: { requests: 20, window: "1h" },
  }
);

/**
 * Get all projects for the authenticated user
 * GET /api/v1/project
 */
export const GET = createProtectedHandler(
  async (req: NextRequest, context) => {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const pagination = paginationSchema.parse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
      sort: searchParams.get("sort") || "createdAt",
      order: searchParams.get("order") || "desc",
    });
    
    const skip = (pagination.page - 1) * pagination.limit;
    
    logger.dbQuery("find", "Project", { 
      userId: context.session.user.id,
      pagination 
    });
    
    // Get projects with pagination
    const [projects, total] = await Promise.all([
      Project.find({ userId: context.session.user.id })
        .sort({ [pagination.sort as string]: pagination.order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean()
        .exec(),
      Project.countDocuments({ userId: context.session.user.id }),
    ]);
    
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      success: true,
      data: projects,
      meta: {
        version: "v1",
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      },
    };
  },
  {
    rateLimit: { requests: 100, window: "1h" },
  }
);

