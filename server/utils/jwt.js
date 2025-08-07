const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Generate email verification token
const generateEmailVerificationToken = (email) => {
  return jwt.sign({ email, type: 'email_verification' }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// Verify email verification token
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid email verification token');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid email verification token');
  }
};

// Generate password reset token
const generatePasswordResetToken = (id) => {
  return jwt.sign({ id, type: 'password_reset' }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// Verify password reset token
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid password reset token');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid password reset token');
  }
};

// Set JWT cookie options
const getCookieOptions = () => {
  return {
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
};

// Send token response (cookie and JSON)
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  // Create token
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  const options = getCookieOptions();
  
  // Set cookies
  res.cookie('token', token, options);
  res.cookie('refreshToken', refreshToken, {
    ...options,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for refresh token
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    refreshToken,
    user: user.getPublicProfile ? user.getPublicProfile() : user
  });
};

// Clear authentication cookies
const clearAuthCookies = (res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
};

// Decode token without verification (for expired tokens)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

// Generate API key (for third-party integrations)
const generateApiKey = (userId, permissions = []) => {
  return jwt.sign(
    { 
      userId, 
      type: 'api_key',
      permissions,
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '1y' }
  );
};

// Verify API key
const verifyApiKey = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'api_key') {
      throw new Error('Invalid API key');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid API key');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  getCookieOptions,
  sendTokenResponse,
  clearAuthCookies,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  generateApiKey,
  verifyApiKey
};