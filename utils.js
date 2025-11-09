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
  const bytes = crypto.randomBytes(6);
  
  // Convert to Base64
  let code = bytes.toString('base64');
  
  // Strip padding (=) and slice first 8 chars
  code = code.replace(/=/g, '').slice(0, 8);

  return code;
}

// Build RFC-5322 raw message and base64url encode it
const makeRawMessage = (from, to, subject, html) => {
    const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html
    ];
    const message = messageParts.join('\n');
    return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

module.exports = {
    compareVersions,
    generateAccessToken,
    generateRefreshToken,
    generateCode,
    verifyToken,
    makeRawMessage
}