const express = require('express');
const router = express.Router();

const RefreshToken = require('../models/RefreshTokenModel');

router.delete('/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
        res.clearCookie('accessToken');
    }

    if (!refreshToken) {
        return res.status(403).json({ "message": "Unauthorised!" });
    }

    try {
        await RefreshToken.deleteOne({ refreshToken });
        res.clearCookie('refreshToken');
        res.json({ "message": "Logged out successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "message": "Internal Server Error" });
    }
})

module.exports = router;