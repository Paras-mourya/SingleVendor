import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminRepository from '../../src/repositories/admin.repository.js';
import Admin from '../../src/models/admin.model.js';

// Mock the model
jest.mock('../../src/models/admin.model.js');

describe('Admin Repository Unit Tests', () => {
  let adminRepository;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    adminRepository = new AdminRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    test('should return admin document when valid ID is provided', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockAdminData = {
        _id: mockAdminId,
        username: 'testadmin',
        email: 'admin@test.com',
        role: 'superadmin',
        toObject: jest.fn().mockReturnValue({
          _id: mockAdminId,
          username: 'testadmin',
          email: 'admin@test.com',
          role: 'superadmin'
        })
      };
      
      Admin.findById.mockResolvedValue(mockAdminData);

      // Act
      const result = await adminRepository.findById(mockAdminId);

      // Assert
      expect(Admin.findById).toHaveBeenCalledWith(mockAdminId);
      expect(result).toEqual(mockAdminData.toObject());
    });

    test('should return null when admin is not found', async () => {
      // Arrange
      const mockAdminId = 'nonexistent123';
      Admin.findById.mockResolvedValue(null);

      // Act
      const result = await adminRepository.findById(mockAdminId);

      // Assert
      expect(Admin.findById).toHaveBeenCalledWith(mockAdminId);
      expect(result).toBeNull();
    });

    test('should throw error when database operation fails', async () => {
      // Arrange
      const mockAdminId = 'admin123';
      const mockError = new Error('Database connection failed');
      Admin.findById.mockRejectedValue(mockError);

      // Act & Assert
      await expect(adminRepository.findById(mockAdminId)).rejects.toThrow('Database connection failed');
      expect(Admin.findById).toHaveBeenCalledWith(mockAdminId);
    });
  });

  describe('create', () => {
    test('should create admin document successfully', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        email: 'newadmin@test.com',
        password: 'hashedpassword',
        role: 'admin'
      };
      
      const mockCreatedAdmin = {
        _id: 'newadmin123',
        ...adminData,
        createdAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: 'newadmin123',
          ...adminData,
          createdAt: new Date()
        })
      };
      
      Admin.create.mockResolvedValue(mockCreatedAdmin);

      // Act
      const result = await adminRepository.create(adminData);

      // Assert
      expect(Admin.create).toHaveBeenCalledWith(adminData);
      expect(result).toEqual(mockCreatedAdmin.toObject());
    });

    test('should throw error when create operation fails', async () => {
      // Arrange
      const adminData = {
        username: 'duplicateadmin',
        email: 'existing@test.com',
        password: 'hashedpassword',
        role: 'admin'
      };
      
      const mockError = new Error('Duplicate key error');
      Admin.create.mockRejectedValue(mockError);

      // Act & Assert
      await expect(adminRepository.create(adminData)).rejects.toThrow('Duplicate key error');
      expect(Admin.create).toHaveBeenCalledWith(adminData);
    });
  });

  describe('update', () => {
    test('should update admin document successfully', async () => {
      // Arrange
      const adminId = 'admin123';
      const updateData = {
        username: 'updatedadmin',
        email: 'updated@test.com'
      };
      
      const mockUpdatedAdmin = {
        _id: adminId,
        ...updateData,
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: adminId,
          ...updateData,
          updatedAt: new Date()
        })
      };
      
      Admin.findByIdAndUpdate.mockResolvedValue(mockUpdatedAdmin);

      // Act
      const result = await adminRepository.update(adminId, updateData);

      // Assert
      expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
        adminId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockUpdatedAdmin.toObject());
    });

    test('should return null when updating non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      const updateData = { username: 'updated' };
      Admin.findByIdAndUpdate.mockResolvedValue(null);

      // Act
      const result = await adminRepository.update(adminId, updateData);

      // Assert
      expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
        adminId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete admin document successfully', async () => {
      // Arrange
      const adminId = 'admin123';
      const mockDeletedAdmin = {
        _id: adminId,
        username: 'deletedadmin',
        email: 'deleted@test.com',
        toObject: jest.fn().mockReturnValue({
          _id: adminId,
          username: 'deletedadmin',
          email: 'deleted@test.com'
        })
      };
      
      Admin.findByIdAndDelete.mockResolvedValue(mockDeletedAdmin);

      // Act
      const result = await adminRepository.delete(adminId);

      // Assert
      expect(Admin.findByIdAndDelete).toHaveBeenCalledWith(adminId);
      expect(result).toEqual(mockDeletedAdmin.toObject());
    });

    test('should return null when deleting non-existent admin', async () => {
      // Arrange
      const adminId = 'nonexistent123';
      Admin.findByIdAndDelete.mockResolvedValue(null);

      // Act
      const result = await adminRepository.delete(adminId);

      // Assert
      expect(Admin.findByIdAndDelete).toHaveBeenCalledWith(adminId);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return paginated admin documents', async () => {
      // Arrange
      const mockAdmins = [
        {
          _id: 'admin1',
          username: 'admin1',
          email: 'admin1@test.com',
          toObject: jest.fn().mockReturnValue({
            _id: 'admin1',
            username: 'admin1',
            email: 'admin1@test.com'
          })
        },
        {
          _id: 'admin2',
          username: 'admin2',
          email: 'admin2@test.com',
          toObject: jest.fn().mockReturnValue({
            _id: 'admin2',
            username: 'admin2',
            email: 'admin2@test.com'
          })
        }
      ];
      
      const paginationOptions = {
        page: 1,
        limit: 10,
        sort: { createdAt: -1 }
      };
      
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAdmins)
      };
      
      Admin.countDocuments.mockResolvedValue(2);
      Admin.find.mockReturnValue(mockQuery);

      // Act
      const result = await adminRepository.findAll(paginationOptions);

      // Assert
      expect(Admin.find).toHaveBeenCalled();
      expect(Admin.countDocuments).toHaveBeenCalled();
      expect(result).toEqual({
        admins: mockAdmins.map(admin => admin.toObject()),
        total: 2,
        page: 1,
        pages: 1
      });
    });

    test('should return empty result when no admins exist', async () => {
      // Arrange
      const paginationOptions = { page: 1, limit: 10 };
      
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      
      Admin.countDocuments.mockResolvedValue(0);
      Admin.find.mockReturnValue(mockQuery);

      // Act
      const result = await adminRepository.findAll(paginationOptions);

      // Assert
      expect(Admin.find).toHaveBeenCalled();
      expect(Admin.countDocuments).toHaveBeenCalled();
      expect(result).toEqual({
        admins: [],
        total: 0,
        page: 1,
        pages: 0
      });
    });
  });

  describe('findByEmail', () => {
    test('should return admin document when valid email is provided', async () => {
      // Arrange
      const email = 'admin@test.com';
      const mockAdminData = {
        _id: 'admin123',
        username: 'testadmin',
        email: email,
        role: 'superadmin',
        toObject: jest.fn().mockReturnValue({
          _id: 'admin123',
          username: 'testadmin',
          email: email,
          role: 'superadmin'
        })
      };
      
      Admin.findOne.mockResolvedValue(mockAdminData);

      // Act
      const result = await adminRepository.findByEmail(email);

      // Assert
      expect(Admin.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(mockAdminData.toObject());
    });

    test('should return null when admin with email is not found', async () => {
      // Arrange
      const email = 'nonexistent@test.com';
      Admin.findOne.mockResolvedValue(null);

      // Act
      const result = await adminRepository.findByEmail(email);

      // Assert
      expect(Admin.findOne).toHaveBeenCalledWith({ email });
      expect(result).toBeNull();
    });
  });
});
