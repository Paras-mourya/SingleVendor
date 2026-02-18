import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminService from '../../src/services/admin.service.js';
import AdminRepository from '../../src/repositories/admin.repository.js';

// Mock the repository
jest.mock('../../src/repositories/admin.repository.js');

describe('Admin Service Unit Tests', () => {
  let adminService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    adminService = new AdminService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAdminById', () => {
    test('should return admin data when valid ID is provided', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockAdminData = {
        _id: mockAdminId,
        username: 'testadmin',
        email: 'admin@test.com',
        role: 'superadmin'
      };
      
      AdminRepository.findById.mockResolvedValue(mockAdminData);

      // Act
      const result = await adminService.getAdminById(mockAdminId);

      // Assert
      expect(AdminRepository.findById).toHaveBeenCalledWith(mockAdminId);
      expect(result).toEqual(mockAdminData);
    });

    test('should return null when admin is not found', async () => {
      // Arrange
      const mockAdminId = 'nonexistent123';
      AdminRepository.findById.mockResolvedValue(null);

      // Act
      const result = await adminService.getAdminById(mockAdminId);

      // Assert
      expect(AdminRepository.findById).toHaveBeenCalledWith(mockAdminId);
      expect(result).toBeNull();
    });

    test('should throw error when repository fails', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockError = new Error('Database connection failed');
      AdminRepository.findById.mockRejectedValue(mockError);

      // Act & Assert
      await expect(adminService.getAdminById(mockAdminId)).rejects.toThrow('Database connection failed');
      expect(AdminRepository.findById).toHaveBeenCalledWith(mockAdminId);
    });
  });

  describe('createAdmin', () => {
    test('should create admin successfully with valid data', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        email: 'newadmin@test.com',
        password: 'password123',
        role: 'admin'
      };
      
      const mockCreatedAdmin = {
        _id: 'newadmin123',
        ...adminData,
        createdAt: new Date()
      };
      
      AdminRepository.create.mockResolvedValue(mockCreatedAdmin);

      // Act
      const result = await adminService.createAdmin(adminData);

      // Assert
      expect(AdminRepository.create).toHaveBeenCalledWith(adminData);
      expect(result).toEqual(mockCreatedAdmin);
    });

    test('should throw error when creating admin with duplicate email', async () => {
      // Arrange
      const adminData = {
        username: 'duplicateadmin',
        email: 'existing@test.com',
        password: 'password123',
        role: 'admin'
      };
      
      const mockError = new Error('Email already exists');
      AdminRepository.create.mockRejectedValue(mockError);

      // Act & Assert
      await expect(adminService.createAdmin(adminData)).rejects.toThrow('Email already exists');
      expect(AdminRepository.create).toHaveBeenCalledWith(adminData);
    });
  });

  describe('updateAdmin', () => {
    test('should update admin successfully with valid data', async () => {
      // Arrange
      const adminId = 'admin123';
      const updateData = {
        username: 'updatedadmin',
        email: 'updated@test.com'
      };
      
      const mockUpdatedAdmin = {
        _id: adminId,
        ...updateData,
        updatedAt: new Date()
      };
      
      AdminRepository.update.mockResolvedValue(mockUpdatedAdmin);

      // Act
      const result = await adminService.updateAdmin(adminId, updateData);

      // Assert
      expect(AdminRepository.update).toHaveBeenCalledWith(adminId, updateData);
      expect(result).toEqual(mockUpdatedAdmin);
    });

    test('should return null when updating non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      const updateData = { username: 'updated' };
      AdminRepository.update.mockResolvedValue(null);

      // Act
      const result = await adminService.updateAdmin(adminId, updateData);

      // Assert
      expect(AdminRepository.update).toHaveBeenCalledWith(adminId, updateData);
      expect(result).toBeNull();
    });
  });

  describe('deleteAdmin', () => {
    test('should delete admin successfully with valid ID', async () => {
      // Arrange
      const adminId = 'admin123';
      const mockDeletedAdmin = {
        _id: adminId,
        username: 'deletedadmin',
        email: 'deleted@test.com'
      };
      
      AdminRepository.delete.mockResolvedValue(mockDeletedAdmin);

      // Act
      const result = await adminService.deleteAdmin(adminId);

      // Assert
      expect(AdminRepository.delete).toHaveBeenCalledWith(adminId);
      expect(result).toEqual(mockDeletedAdmin);
    });

    test('should return null when deleting non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      AdminRepository.delete.mockResolvedValue(null);

      // Act
      const result = await adminService.deleteAdmin(adminId);

      // Assert
      expect(AdminRepository.delete).toHaveBeenCalledWith(adminId);
      expect(result).toBeNull();
    });
  });

  describe('getAllAdmins', () => {
    test('should return all admins with pagination', async () => {
      // Arrange
      const mockAdmins = [
        { _id: 'admin1', username: 'admin1', email: 'admin1@test.com' },
        { _id: 'admin2', username: 'admin2', email: 'admin2@test.com' }
      ];
      
      const paginationOptions = {
        page: 1,
        limit: 10,
        sort: { createdAt: -1 }
      };
      
      AdminRepository.findAll.mockResolvedValue({
        admins: mockAdmins,
        total: 2,
        page: 1,
        pages: 1
      });

      // Act
      const result = await adminService.getAllAdmins(paginationOptions);

      // Assert
      expect(AdminRepository.findAll).toHaveBeenCalledWith(paginationOptions);
      expect(result.admins).toEqual(mockAdmins);
      expect(result.total).toBe(2);
    });

    test('should return empty array when no admins exist', async () => {
      // Arrange
      const paginationOptions = { page: 1, limit: 10 };
      AdminRepository.findAll.mockResolvedValue({
        admins: [],
        total: 0,
        page: 1,
        pages: 0
      });

      // Act
      const result = await adminService.getAllAdmins(paginationOptions);

      // Assert
      expect(AdminRepository.findAll).toHaveBeenCalledWith(paginationOptions);
      expect(result.admins).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
