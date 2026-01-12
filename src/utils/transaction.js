import mongoose from 'mongoose';
import Logger from './logger.js';

class TransactionManager {
  static async execute(callback) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      Logger.error('Transaction Aborted', { error: error.message, stack: error.stack });
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default TransactionManager;
