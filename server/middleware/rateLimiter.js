const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // no custom keyGenerator — let express-rate-limit handle IPv6 itself
});

module.exports = rateLimiter;
