const jwt = require('jsonwebtoken');
const crypto = require('crypto')

function parseVersion(version) {
  if (Array.isArray(version)) return version; // If already an array, return as is
  if (typeof version === 'string') return version.split('.').map(num => parseInt(num, 10));
  throw new Error('Invalid version format');
}

function compareVersions(a, b) {
  const [a1 = 0, a2 = 0, a3 = 0] = parseVersion(a);
  const [b1 = 0, b2 = 0, b3 = 0] = parseVersion(b);

  if (a1 !== b1) return b1 - a1; // Descending
  if (a2 !== b2) return b2 - a2;
  return b3 - a3;
}

const verifyToken = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded);
        });
    });
};

function generateAccessToken(user){
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
}

function generateRefreshToken(user){
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

function generateCode() {
  // 5 bytes = 40 bits → enough for 6 Base64 chars (since 6 * 6 = 36 bits)
  const bytes = crypto.randomBytes(5);
  
  // Convert to Base64
  let code = bytes.toString('base64');
  
  // Strip padding (=) and slice first 6 chars
  code = code.replace(/=/g, '').slice(0, 6);

  return code;
}

module.exports = {
    compareVersions,
    generateAccessToken,
    generateRefreshToken,
    generateCode,
    verifyToken
}