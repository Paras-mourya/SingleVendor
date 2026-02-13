import CustomerService from '../services/customer.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import { jsonToCsv } from '../utils/csvGenerator.js';
import AuditLogger from '../utils/audit.js';

/**
 * @desc    Get all customers with pagination and search
 * @route   GET /api/v1/admin/customers
 * @access  Private (Admin)
 */
export const getAllCustomers = catchAsync(async (req, res) => {
  const result = await CustomerService.getAllCustomers(req.query);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {
    customers: result.customers,
    total: result.total,
    nextCursor: result.nextCursor,
    limit: result.limit
  }, 'Customers fetched successfully'));
});

/**
 * @desc    Get single customer details
 * @route   GET /api/v1/admin/customers/:id
 * @access  Private (Admin)
 */
export const getCustomerById = catchAsync(async (req, res) => {
  const customer = await CustomerService.getProfile(req.params.id);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, customer));
});

/**
 * @desc    Update customer status (Block/Unblock)
 * @route   PATCH /api/v1/admin/customers/:id/status
 * @access  Private (Admin)
 */
export const updateCustomerStatus = catchAsync(async (req, res) => {
  const { isActive } = req.body;
  const customer = await CustomerService.updateStatus(req.params.id, isActive);

  await AuditLogger.log(
    `CUSTOMER_${isActive ? 'UNBLOCKED' : 'BLOCKED'}`,
    `Admin ${req.user.name} ${isActive ? 'unblocked' : 'blocked'} customer ${customer.email}`,
    { customerId: customer._id, adminId: req.user._id }
  );

  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, customer, `Customer ${isActive ? 'unblocked' : 'blocked'} successfully`));
});

/**
 * @desc    Export customers to CSV
 * @route   GET /api/v1/admin/customers/export
 * @access  Private (Admin)
 */
export const exportCustomers = catchAsync(async (req, res) => {
  const { search, status } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (status !== undefined && status !== '') {
    filter.isActive = status === 'active';
  }

  const customers = await CustomerService.getCustomersForExport(filter);

  const headers = ['Name', 'Email', 'Phone', 'Status', 'Verified', 'Created At', 'Last Login'];
  const fields = ['name', 'email', 'phoneNumber', 'isActive', 'isVerified', 'createdAt', 'lastLogin'];

  const csv = jsonToCsv(customers, headers, fields);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=customers_${new Date().toISOString().split('T')[0]}.csv`);
  res.status(HTTP_STATUS.OK).send(csv);
});

export default {
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
  exportCustomers
};
