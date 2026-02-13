import SupportTicketRepository from '../repositories/supportTicket.repository.js';
import EmailService from './email.service.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import Cache from '../utils/cache.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants.js';
import Logger from '../utils/logger.js';

class SupportTicketService {
  async submitTicket(customerId, ticketData, file) {
    let attachment = {};
    if (file) {
      const result = await uploadToCloudinary(file, 'support-tickets/attachments');
      attachment = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const ticket = await SupportTicketRepository.create({
      customer: customerId,
      ...ticketData,
      attachment,
    });

    // Invalidate Caches
    await Cache.delByPattern(`response:customer:${customerId}:*support-tickets*`);
    await Cache.delByPattern('response:admin:*support-tickets*');

    Logger.info(`Support ticket submitted: ${ticket.ticketId} by Customer: ${customerId}`);
    return ticket;
  }

  async getCustomerTickets(customerId, query = {}) {
    const { limit = 10, cursor = null } = query;
    const result = await SupportTicketRepository.findByCustomer(customerId, parseInt(limit), cursor);
    return {
      tickets: result.items,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };
  }

  async getAllTickets(query = {}) {
    const { limit = 10, cursor = null, ...filter } = query;
    const result = await SupportTicketRepository.findAll(filter, parseInt(limit), cursor);
    return {
      tickets: result.items,
      nextCursor: result.nextCursor,
      limit: parseInt(limit)
    };
  }

  async getDetailedStats() {
    const [totalCount, openCount, inProgressCount, resolvedCount] = await Promise.all([
      SupportTicketRepository.countTotal(),
      SupportTicketRepository.countByStatus('Open'),
      SupportTicketRepository.countByStatus('In Progress'),
      SupportTicketRepository.countByStatus('Resolved'),
    ]);

    // Helper to calculate percentage
    const getPercentage = (count) => (totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : 0);

    return {
      total: {
        count: totalCount,
        label: 'Total Tickets',
        trend: '+12% from last month', // Static for now as requested by UI mockup
        icon: 'support_agent'
      },
      open: {
        count: openCount,
        label: 'Open Tickets',
        percentage: getPercentage(openCount),
        icon: 'schedule'
      },
      inProgress: {
        count: inProgressCount,
        label: 'In Progress',
        percentage: getPercentage(inProgressCount),
        icon: 'report_problem'
      },
      resolved: {
        count: resolvedCount,
        label: 'Resolved',
        percentage: getPercentage(resolvedCount),
        icon: 'check_circle'
      }
    };
  }

  async getTicketsForExport() {
    const result = await SupportTicketRepository.findAll({}, 10000); // High limit for export
    return result.items || [];
  }

  async replyToTicket(ticketId, adminReply) {
    const ticket = await SupportTicketRepository.updateById(ticketId, {
      adminReply,
      status: 'Resolved',
      replyDate: new Date(),
    });

    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND);
    }

    // Send email to customer
    try {
      await EmailService.sendEmailTemplate(
        ticket.customer.email,
        'Support Ticket Reply',
        {
          username: ticket.customer.name,
          ticketId: ticket.ticketId,
          subject: ticket.subject,
          reply: adminReply,
        },
        'customer'
      );
      Logger.info(`Support ticket reply email sent to: ${ticket.customer.email}`);
    } catch (error) {
      Logger.error('Failed to send support ticket reply email', { ticketId, error: error.message });
    }

    // Invalidate Caches
    await Cache.delByPattern(`response:customer:${ticket.customer._id}:*support-tickets*`);
    await Cache.delByPattern('response:admin:*support-tickets*');

    return ticket;
  }
}

export default new SupportTicketService();