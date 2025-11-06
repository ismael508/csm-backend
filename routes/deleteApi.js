const express = require('express');
const router = express.Router();

const RefreshToken = require('../models/RefreshTokenModel');

router.delete('/logout', async (req, res) => {
    // accept token from cookie, body, or Authorization header
    const cookieToken = req.cookies && req.cookies.refreshToken;
    const bodyToken = req.body && req.body.refreshToken;
    const header = req.headers['authorization'];
    const headerToken = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;

    const refreshToken = cookieToken || bodyToken || headerToken;

    // always clear the cookie on the response (match options used when setting)
    res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });

    if (!refreshToken) {
        // nothing to delete in DB but client cookies are cleared
        return res.status(200).json({ message: 'Logged out (no token provided).' });
    }

    try {
        const result = await RefreshToken.deleteOne({ refreshToken });
        if (result.deletedCount === 0) {
            return res.status(200).json({ message: 'Logged out (token not found in DB).' });
        }
        res.json({ message: 'Logged out successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

module.exports = router;