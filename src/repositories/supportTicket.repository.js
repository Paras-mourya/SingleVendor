import SupportTicket from '../models/supportTicket.model.js';

class SupportTicketRepository {
  async create(ticketData) {
    return await SupportTicket.create(ticketData);
  }

  async findByCustomer(customerId, limit = 10, nextCursor = null) {
    const query = { customer: customerId };
    if (nextCursor) {
      const [time, id] = nextCursor.split('_');
      query.$or = [
        { createdAt: { $lt: new Date(Number(time)) } },
        { createdAt: new Date(Number(time)), _id: { $lt: id } }
      ];
    }

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasNextPage = tickets.length > limit;
    const items = hasNextPage ? tickets.slice(0, limit) : tickets;
    let last = items[items.length - 1];
    let cursor = hasNextPage ? `${new Date(last.createdAt).getTime()}_${last._id}` : null;

    return { items, nextCursor: cursor, hasNextPage };
  }

  async findAll(filter = {}, limit = 10, nextCursor = null) {
    const query = { ...filter };
    if (nextCursor) {
      const [time, id] = nextCursor.split('_');
      query.$or = [
        { createdAt: { $lt: new Date(Number(time)) } },
        { createdAt: new Date(Number(time)), _id: { $lt: id } }
      ];
    }

    const tickets = await SupportTicket.find(query)
      .populate('customer', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasNextPage = tickets.length > limit;
    const items = hasNextPage ? tickets.slice(0, limit) : tickets;
    let last = items[items.length - 1];
    let cursor = hasNextPage ? `${new Date(last.createdAt).getTime()}_${last._id}` : null;

    return { items, nextCursor: cursor, hasNextPage };
  }

  async findById(id) {
    return await SupportTicket.findById(id).populate('customer', 'name email phoneNumber');
  }

  async updateById(id, updateData) {
    return await SupportTicket.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('customer', 'name email phoneNumber');
  }

  async countByStatus(status) {
    return await SupportTicket.countDocuments({ status }).lean();
  }

  async countTotal() {
    return await SupportTicket.countDocuments({}).lean();
  }
}

export default new SupportTicketRepository();