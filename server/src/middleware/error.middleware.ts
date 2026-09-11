import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(
    ApiResponse.error(message, statusCode)
  );
};
