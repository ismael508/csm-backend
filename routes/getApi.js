const express = require('express');
const Review = require('../models/ReviewModel');
const User = require('../models/UserModel');
const PlayerData = require('../models/PlayerDataModel');
const PatchLog = require('../models/PatchLogModel');
const ReleaseNote = require('../models/ReleaseNoteModel');
const { verifyToken, generateAccessToken, compareVersions } = require('../utils');
const RefreshToken = require('../models/RefreshTokenModel');

const router = express.Router();

router.get('/verify-tokens', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.status(403).json({ "message": "Unauthorised!" });

    try {
        const data = await RefreshToken.findOne({ refreshToken });
        if (!data) return res.status(403).json({ "message": "Unauthorised!" });

        let user;
        try {
            user = await verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                await RefreshToken.deleteOne({ refreshToken });
            }
            return res.status(403).json({ "message": "Unauthorised!" });
        }

        const userEmail = user.email;

        const accessToken = req.cookies.accessToken;
        if (!accessToken){
            const newAccessToken = generateAccessToken({
                email: userEmail
            });
            res.cookie('accessToken', newAccessToken, {
                maxAge: 5 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
        }

        res.json({ "message": "Tokens verified successfully!", "id": data.userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "message": "Internal Server Error" });
    }
});

router.get('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId).select('-password -__v -reviewsVoted -updatedAt -_id');
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }
        const playerData = await PlayerData.findOne({ username: user.username }).select('-__v -username -createdAt');
        res.status(200).json({...user.toObject(), ...playerData.toObject()});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
})

router.get('/oauth2callback', (req, res) => {
    console.log(req.query.code);
    res.status(200).send('Code received!');
})

router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().populate('user', 'username pfp');
        for (let i = 0; i < reviews.length; i++){
            if (!reviews[i].user){
                await Review.deleteOne({ _id: reviews[i]._id });
                reviews.splice(i, 1);
                i--;
            }
        }
        res.json(reviews)
    } catch (err) {
        console.error(err);
        res.status(500).json({ "message": "Internal server error!" });
    }
})

router.get('/patchlog/latest', async (req, res) => {
    try {
        const all = await PatchLog.find(); // get all patch logs
        if (all.length === 0) return res.json(null); // return null if none

        all.sort((a, b) => compareVersions(a.currentVersion, b.currentVersion)); // sort latest first
        return res.json(all[0]); // first one is now the latest
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Internal server error!" })
    }
})

router.get('/release-note/latest', async (req, res) => {
    try {
        const all = await ReleaseNote.find(); // get all release notes
        if (all.length === 0) return res.json(null); // return null if none

        all.sort((a, b) => compareVersions(a.version, b.version)); // sort latest first
        return res.json(all[0]); // first one is now the latest
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Internal server error!" })
    }
})

router.get('/patchlog/:mode/:version', async (req, res) => {
    try {
        let patchLog;
        const arr = req.params.version.split('.').map(Number);
        if (req.params.mode === 'currentVersion'){
            patchLog = await PatchLog.findOne({ currentVersion: arr });
        } else {
            patchLog = await PatchLog.findOne({ lastVersion: arr });
        }
        if (!patchLog){
            return res.status(404).json({ message: "Couldn't find patchlog." })
        }
        res.json(patchLog)
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Internal server error!' })
    }
})

router.get('/release-note/:version', async (req, res) => {
    try {
        const arr = req.params.version.split('.').map(Number);
        const releaseNote = await ReleaseNote.findOne({ version: arr });
        if (!releaseNote) {
            return res.status(404).json({ message: "Couldn't find release note." });
        }
        res.json(releaseNote);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error!' });
    }
})

router.get('/release-notes', async (req, res) => {
    try {
        const releaseNotes = await ReleaseNote.find().sort({ 'version.0': 1, 'version.1': 1, 'version.2': 1 });
        res.json(releaseNotes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error!' });
    }
})

module.exports = router