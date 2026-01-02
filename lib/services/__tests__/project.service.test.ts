import { ProjectService } from '../project.service';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { IProject } from '@/models/Project';
import { AuthorizationError, BusinessRuleError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/repositories/project.repository');
jest.mock('@/lib/ai/gpt');
jest.mock('@/lib/infrastructure/logger');

describe('ProjectService', () => {
  let service: ProjectService;
  let mockRepo: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    service = new ProjectService();
    mockRepo = (service as any).projectRepo;
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const userId = 'user123';
      const projectData = {
        projectName: 'Test Project',
        budget: 50000,
        timeline: 90,
        description: 'A test project description',
      };

      const mockProject: IProject = {
        _id: 'project123',
        userId,
        ...projectData,
        status: 'draft',
        createdAt: new Date(),
      };

      (mockRepo as any).create = jest.fn().mockResolvedValue(mockProject);

      const result = await service.createProject(userId, projectData);

      expect(result).toEqual(mockProject);
      expect((mockRepo as any).create).toHaveBeenCalled();
    });
  });

  describe('getProjectWithOwnershipCheck', () => {
    it('should return project if user owns it', async () => {
      const userId = 'user123';
      const projectId = 'project123';
      const mockProject: IProject = {
        _id: projectId,
        userId,
        projectName: 'Test',
        budget: 1000,
        timeline: 30,
        description: 'Test',
        status: 'draft',
        createdAt: new Date(),
      };

      (mockRepo as any).findById = jest.fn().mockResolvedValue(mockProject);

      const result = await service.getProjectWithOwnershipCheck(projectId, userId);

      expect(result).toEqual(mockProject);
    });

    it('should throw AuthorizationError if user does not own project', async () => {
      const userId = 'user123';
      const projectId = 'project123';
      const mockProject: IProject = {
        _id: projectId,
        userId: 'differentUser',
        projectName: 'Test',
        budget: 1000,
        timeline: 30,
        description: 'Test',
        status: 'draft',
        createdAt: new Date(),
      };

      (mockRepo as any).findById = jest.fn().mockResolvedValue(mockProject);

      await expect(
        service.getProjectWithOwnershipCheck(projectId, userId)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('analyzeProject', () => {
    it('should throw BusinessRuleError if project already analyzed', async () => {
      const userId = 'user123';
      const projectId = 'project123';
      const mockProject: IProject = {
        _id: projectId,
        userId,
        projectName: 'Test',
        budget: 1000,
        timeline: 30,
        description: 'Test',
        status: 'in-review',
        createdAt: new Date(),
      };

      (mockRepo as any).findById = jest.fn().mockResolvedValue(mockProject);

      await expect(
        service.analyzeProject(projectId, userId)
      ).rejects.toThrow(BusinessRuleError);
    });
  });
});

