import mongoose from 'mongoose';

import env from './env.js';
import logger from './logger.js';

class Database {
  private connection: typeof mongoose | null = null;

  async connect(): Promise<typeof mongoose> {
    if (this.connection && mongoose.connection.readyState === 1) {
      return this.connection;
    }

    this.connection = await mongoose.connect(env.MONGODB_URI);
    logger.info({ host: mongoose.connection.host }, 'MongoDB connected');

    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.connection = null;
    }
  }
}

const database = new Database();

export { Database };
export default database;
