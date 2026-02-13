import SupportTicketService from '../services/supportTicket.service.js';
import AuditLogger from '../utils/audit.js';
import { submitTicketSchema, replyToTicketSchema } from '../validations/supportTicket.validation.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import { jsonToCsv } from '../utils/csvGenerator.js';

/**
 * @desc    Submit new support ticket
 * @route   POST /api/v1/support-tickets/submit
 * @access  Private (Customer)
 */
export const submitTicket = catchAsync(async (req, res) => {
  const ticket = await SupportTicketService.submitTicket(req.user._id, req.body, req.file);

  await AuditLogger.log(
    'SUPPORT_TICKET_SUBMITTED',
    `Ticket ${ticket.ticketId} submitted by customer ${req.user.name}`,
    { ticketId: ticket.ticketId, customerId: req.user._id }
  );

  res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, ticket, 'Ticket submitted successfully'));
});

/**
 * @desc    Get current customer's tickets
 * @route   GET /api/v1/support-tickets/my-tickets
 * @access  Private (Customer)
 */
export const getMyTickets = catchAsync(async (req, res) => {
  const result = await SupportTicketService.getCustomerTickets(req.user._id, req.query);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {
    tickets: result.tickets,
    nextCursor: result.nextCursor,
    limit: result.limit
  }, 'Tickets fetched successfully'));
});

/**
 * @desc    Get all support tickets
 * @route   GET /api/v1/support-tickets
 * @access  Private (Admin)
 */
export const getAllTickets = catchAsync(async (req, res) => {
  const result = await SupportTicketService.getAllTickets(req.query);
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {
    tickets: result.tickets,
    nextCursor: result.nextCursor,
    limit: result.limit
  }, 'All tickets fetched successfully'));
});

/**
 * @desc    Get Detailed Ticket Stats
 * @route   GET /api/v1/support-tickets/admin/stats
 * @access  Private (Admin)
 */
export const getStats = catchAsync(async (req, res) => {
  const stats = await SupportTicketService.getDetailedStats();
  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, stats));
});

/**
 * @desc    Export Support Tickets to CSV
 * @route   GET /api/v1/support-tickets/admin/export
 * @access  Private (Admin)
 */
export const exportTickets = catchAsync(async (req, res) => {
  const tickets = await SupportTicketService.getTicketsForExport();

  const headers = [
    'Ticket ID',
    'Customer Name',
    'Customer Email',
    'Subject',
    'Priority',
    'Status',
    'Created At',
    'Resolved At',
  ];

  const fields = [
    'ticketId',
    'customer.name',
    'customer.email',
    'subject',
    'priority',
    'status',
    'createdAt',
    'replyDate',
  ];

  const csv = jsonToCsv(tickets, headers, fields);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
  res.status(200).send(csv);
});

/**
 * @desc    Reply and Resolve ticket
 * @route   PATCH /api/v1/support-tickets/:ticketId/reply
 * @access  Private (Admin)
 */
export const replyToTicket = catchAsync(async (req, res) => {
  const { adminReply } = req.body;
  const ticket = await SupportTicketService.replyToTicket(req.params.ticketId, adminReply);

  await AuditLogger.log(
    'SUPPORT_TICKET_REPLIED',
    `Admin replied to ticket ${ticket.ticketId}`,
    { ticketId: ticket.ticketId, adminId: req.user._id }
  );

  res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, ticket, 'Reply sent and ticket marked as resolved'));
});

export default {
  submitTicket,
  getMyTickets,
  getAllTickets,
  getStats,
  exportTickets,
  replyToTicket,
};