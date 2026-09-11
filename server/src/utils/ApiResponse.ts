export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;

  private constructor(success: boolean, message: string, statusCode: number, data?: T) {
    this.success = success;
    this.message = message;
    this.statusCode = statusCode;
    if (data !== undefined) {
      this.data = data;
    }
  }

  static success<T>(message: string, data?: T, statusCode = 200): ApiResponse<T> {
    return new ApiResponse<T>(true, message, statusCode, data);
  }

  static error<T>(message: string, statusCode = 500, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(false, message, statusCode, data);
  }
}
