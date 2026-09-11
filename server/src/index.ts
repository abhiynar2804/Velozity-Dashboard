import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', message: 'Server is healthy and DB is connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
