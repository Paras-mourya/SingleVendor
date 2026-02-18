import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import AdminController from '../../src/controllers/admin.controller.js';
import AdminService from '../../src/services/admin.service.js';

// Mock the service
jest.mock('../../src/services/admin.service.js');

describe('Admin Controller Unit Tests', () => {
  let adminController;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    adminController = new AdminController();
    
    // Mock request and response objects
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAdminById', () => {
    test('should return admin data with 200 status when admin is found', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockAdminData = {
        _id: mockAdminId,
        username: 'testadmin',
        email: 'admin@test.com',
        role: 'superadmin'
      };
      
      mockRequest.params = { id: mockAdminId };
      AdminService.prototype.getAdminById = jest.fn().mockResolvedValue(mockAdminData);

      // Act
      await adminController.getAdminById(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.getAdminById).toHaveBeenCalledWith(mockAdminId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdminData,
        message: 'Admin retrieved successfully'
      });
    });

    test('should return 404 when admin is not found', async () => {
      // Arrange
      const mockAdminId = 'nonexistent123';
      mockRequest.params = { id: mockAdminId };
      AdminService.prototype.getAdminById = jest.fn().mockResolvedValue(null);

      // Act
      await adminController.getAdminById(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.getAdminById).toHaveBeenCalledWith(mockAdminId);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin not found'
      });
    });

    test('should return 500 when service throws error', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockError = new Error('Database connection failed');
      mockRequest.params = { id: mockAdminId };
      AdminService.prototype.getAdminById = jest.fn().mockRejectedValue(mockError);

      // Act
      await adminController.getAdminById(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.getAdminById).toHaveBeenCalledWith(mockAdminId);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error retrieving admin',
        error: mockError.message
      });
    });
  });

  describe('createAdmin', () => {
    test('should create admin and return 201 status', async () => {
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
      
      mockRequest.body = adminData;
      AdminService.prototype.createAdmin = jest.fn().mockResolvedValue(mockCreatedAdmin);

      // Act
      await adminController.createAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.createAdmin).toHaveBeenCalledWith(adminData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedAdmin,
        message: 'Admin created successfully'
      });
    });

    test('should return 400 when validation fails', async () => {
      // Arrange
      const invalidData = {
        username: '',
        email: 'invalid-email'
      };
      
      mockRequest.body = invalidData;
      AdminService.prototype.createAdmin = jest.fn().mockRejectedValue(new Error('Validation failed'));

      // Act
      await adminController.createAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.createAdmin).toHaveBeenCalledWith(invalidData);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error creating admin',
        error: 'Validation failed'
      });
    });
  });

  describe('updateAdmin', () => {
    test('should update admin and return 200 status', async () => {
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
      
      mockRequest.params = { id: adminId };
      mockRequest.body = updateData;
      AdminService.prototype.updateAdmin = jest.fn().mockResolvedValue(mockUpdatedAdmin);

      // Act
      await adminController.updateAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.updateAdmin).toHaveBeenCalledWith(adminId, updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedAdmin,
        message: 'Admin updated successfully'
      });
    });

    test('should return 404 when updating non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      const updateData = { username: 'updated' };
      
      mockRequest.params = { id: adminId };
      mockRequest.body = updateData;
      AdminService.prototype.updateAdmin = jest.fn().mockResolvedValue(null);

      // Act
      await adminController.updateAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.updateAdmin).toHaveBeenCalledWith(adminId, updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin not found'
      });
    });
  });

  describe('deleteAdmin', () => {
    test('should delete admin and return 200 status', async () => {
      // Arrange
      const adminId = 'admin123';
      const mockDeletedAdmin = {
        _id: adminId,
        username: 'deletedadmin',
        email: 'deleted@test.com'
      };
      
      mockRequest.params = { id: adminId };
      AdminService.prototype.deleteAdmin = jest.fn().mockResolvedValue(mockDeletedAdmin);

      // Act
      await adminController.deleteAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.deleteAdmin).toHaveBeenCalledWith(adminId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeletedAdmin,
        message: 'Admin deleted successfully'
      });
    });

    test('should return 404 when deleting non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      mockRequest.params = { id: adminId };
      AdminService.prototype.deleteAdmin = jest.fn().mockResolvedValue(null);

      // Act
      await adminController.deleteAdmin(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.deleteAdmin).toHaveBeenCalledWith(adminId);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin not found'
      });
    });
  });

  describe('getAllAdmins', () => {
    test('should return all admins with 200 status', async () => {
      // Arrange
      const mockAdmins = [
        { _id: 'admin1', username: 'admin1', email: 'admin1@test.com' },
        { _id: 'admin2', username: 'admin2', email: 'admin2@test.com' }
      ];
      
      const expectedResult = {
        admins: mockAdmins,
        total: 2,
        page: 1,
        pages: 1
      };
      
      mockRequest.query = { page: 1, limit: 10 };
      AdminService.prototype.getAllAdmins = jest.fn().mockResolvedValue(expectedResult);

      // Act
      await adminController.getAllAdmins(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.getAllAdmins).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResult,
        message: 'Admins retrieved successfully'
      });
    });

    test('should handle empty admin list', async () => {
      // Arrange
      const expectedResult = {
        admins: [],
        total: 0,
        page: 1,
        pages: 0
      };
      
      mockRequest.query = { page: 1, limit: 10 };
      AdminService.prototype.getAllAdmins = jest.fn().mockResolvedValue(expectedResult);

      // Act
      await adminController.getAllAdmins(mockRequest, mockResponse);

      // Assert
      expect(AdminService.prototype.getAllAdmins).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expectedResult,
        message: 'Admins retrieved successfully'
      });
    });
  });
});
