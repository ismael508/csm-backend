const jwt = require('jsonwebtoken');
const RefreshToken = require('./models/RefreshTokenModel');

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


const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function generateAccessToken(user){
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
}

function generateRefreshToken(user){
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

function numberToBase64(num) {
    let base64Str = '';
  
    if (num === 0) {
      return base64Chars[0]; // Handle the case for zero
    }
  
    while (num > 0) {
      const remainder = num % 64; // Get the remainder
      base64Str = base64Chars[remainder] + base64Str; // Prepend the corresponding Base64 character
      num = Math.floor(num / 64); // Divide the number by 64
    }
  
    return base64Str;
}

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePass(){
    return `${numberToBase64(generateRandomNumber(262144, 16777215))}${numberToBase64(new Date().getTime() + 5 * 1000 * 60)}`;
};

module.exports = {
    compareVersions,
    generateAccessToken,
    generateRefreshToken,
    generatePass,
    verifyToken
}