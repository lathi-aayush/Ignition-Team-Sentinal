const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
// Key string should be exactly 32 bytes (64 hex characters if hex, or use Buffer.from directly if properly formatted)
// The prompt uses an `ENCRYPTION_KEY` env var. We will use it to derive a 32-bye buffer.
const getEncryptionKey = () => {
    let key = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
    if (key.length !== 32) {
        // Just pad or truncate to 32 chars for safety
        key = key.padEnd(32, '0').substring(0, 32);
    }
    return Buffer.from(key, 'utf8');
};

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
