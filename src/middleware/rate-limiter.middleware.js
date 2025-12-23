const rateLimit = require('express-rate-limit');

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau 1 giờ'
  },
  standardHeaders: true,
  legacyHeaders: false
});

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Quá nhiều requests. Vui lòng thử lại sau'
  },
  standardHeaders: true,
  legacyHeaders: false,
  /**
   * Bỏ qua rate limit cho GET /api/sensors/latest
   * vì frontend cần auto-refresh dữ liệu môi trường thường xuyên.
   */
  skip: (req) => {
    return req.method === 'GET' && req.baseUrl === '/api/sensors' && req.path === '/latest';
  },
});
