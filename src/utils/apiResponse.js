/**
 * Standardized API Response
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  static success(res, statusCode, message, data) {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }
}

export { ApiResponse };
export default ApiResponse;
