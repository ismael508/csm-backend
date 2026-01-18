const express = require('express');
const router = express.Router();
const { google } = require('googleapis')

const User = require('../models/UserModel');
const PlayerData = require('../models/PlayerDataModel')
const Review = require('../models/ReviewModel');
const Code = require('../models/CodeModel');

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const PatchLog = require('../models/PatchLogModel');
const RefreshToken = require('../models/RefreshTokenModel');
const ReleaseNote = require('../models/ReleaseNoteModel');

const { generateAccessToken, generateRefreshToken, generateCode, makeRawMessage } = require('../utils');

// Configure OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

router.post('/send-code', async (req, res) => {
    const { email, type } = req.body;
    const accExists = await User.findOne({ email });
    if (!accExists && type == 'rp'){
        return res.status(400).json({ message: "No account found with that email!" });
    }
    let generatedCode;

    try {
        // Verify credentials
        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN || !process.env.EMAIL_AUTH) {
            throw new Error('Missing OAuth2 credentials');
        }

        // Ensure OAuth client has refresh token
        oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

        // Generate and save code first
        generatedCode = generateCode();
        const hashedCode = crypto.createHash('sha256').update(generatedCode).digest('hex');
        const newCode = new Code({ email, code: hashedCode });
        try {
            // find if code exists
            let existingCode = await Code.findOne({ email });
            if (existingCode) {
                await Code.deleteOne({ email });
            }

            await newCode.save();
        } catch (dbErr) {
            console.error('Database Error:', dbErr);
            return res.status(500).json({ message: "Failed to save verification code" });
        }
        // Try sending with Gmail REST API (avoids SMTP blocking)
        const gmailClient = google.gmail({ version: 'v1', auth: oAuth2Client });
        const raw = makeRawMessage(
            `"Cosmic Ascension" <${process.env.EMAIL_AUTH}>`,
            email,
            'Your Verification Code',
            type == 'rp' ? `<p>Your verification code for Cosmic Ascension is: <strong>${generatedCode}</strong>
            If you did not request this code, don't worry. Just don't share it with anyone.
            </p>` : `<p>Welcome to Cosmic Ascension! Your verification code is: <strong>${generatedCode}</strong>
            Please enter this code in the website to verify your email address.
            </p>`
        );

        await gmailClient.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        });

        return res.status(201).json({
            message: "Code sent successfully!",
        });

    } catch (err) {
        console.error('Email Send Error:', {
            message: err.message,
            code: err.code,
            command: err.command,
            stack: err.stack,
            oauthResponse: err.response?.data
        });

        // Cleanup saved code
        if (generatedCode) {
            try {
                await Code.deleteOne({ email, code: generatedCode });
            } catch (deleteErr) {
                console.error('Failed to delete unused code:', deleteErr);
            }
        }

        return res.status(500).json({
            message: "Failed to send verification code",
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
})

router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    try {
        const existingCode = await Code.findOne({ email, code: hashedCode });

        if (!existingCode) {
            return res.status(400).json({ message: "Invalid or expired code!" });
        }
        // Code is valid, delete it to prevent reuse
        await Code.deleteOne({ email, code: hashedCode });

        res.json({ message: "Code verified successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
})

router.post('/users/query', async (req, res) => {
    const { query } = req.body;
    const exists = await User.findOne(query);
    if (exists) {
        return res.status(200).json({ exists: true });
    } else {
        return res.status(200).json({ exists: false });
    }
})

router.post('/users', async (req, res) => {
    const { username, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        email,
        username,
        password: hashedPassword,
    });

    const newPlayerData = new PlayerData({
        username,
        playtime: 0,
        totalBalanceCollected: 0,
        currencySpent: 0,
        purchases: 0,
        balance: 0,
        gamesPlayed: 0,
        jumps: 0,
        scores: 0,
        coloursOwned: [[0, 190, 0]],
        designsOwned: [],
        customSkinsOwned: [],
        primaryColour: [0, 190, 0],
        secondaryColour: null,
        equippedDesign: null,
        equippedCustomSkin: null,
        jump: 32,
        jumpKey: "SPACE",
        gameSpeedMultiplier: 1,
        stripeWidth: 4,
        outlineSize: 4,
        radiusLength: 10,
        colourChangeInterval: 3,
        showHitboxes: false,
        autosave: true,
        spins: 0,
        spinsSpun: 0,
        levelsCompleted: 0,
        showLevelProgress: true,
        progressPrecision: 0,
        levelAttempts: [],
    });

    try {
        await newUser.save();
        await newPlayerData.save()
        res.status(201).json(newUser)
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ "message": "Internal server error!" });
    };
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.findOne({ username: email });
            if (!user) return res.status(401).json({ "message": "Invalid credentials!" });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) return res.status(401).json({ "message": "Invalid credentials!" })
        
        const accessToken = generateAccessToken({
            email: user.email
        });
        const refreshToken = generateRefreshToken({
            email: user.email
        });
        const data = new RefreshToken({
            refreshToken: refreshToken,
            userId: user._id
        });
        await data.save();
        res.cookie('refreshToken', refreshToken, {
            maxAge: 72 * 60 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        })
        res.cookie('accessToken', accessToken, {
            maxAge: 5 * 60 * 1000,
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
        });
        res.json({ "message": "Logged in successfully!" })
    } catch (err) {
        console.error(err);
        res.status(500).json({ "message": "Internal server error!" })
    };
})

router.post('/reviews', async (req, res) => {
    const { userId, content, rating, passKey } = req.body;

    if (passKey === process.env.SECRET_KEY){
        const newReview = new Review({
            user: userId,
            content,
            rating,
            likes: 0,
            dislikes: 0,
            ownerReply: ''
        });

        try {
            await newReview.save();
            res.status(201).json(newReview);
        } catch (err) {
            console.error(err);
            res.status(500).json({ "message": "Internal server error!" });
        }
    } else {
        res.status(401).json({ message: "Unauthorised!" })
    }
})
router.post('/reviews/relate', async (req, res) => {
    const { reviewId, passKey } = req.body;
    if (passKey === process.env.SECRET_KEY){
        try {
            const updatedReview = await Review.findByIdAndUpdate(
                reviewId,
                { $inc: { relates: 1 } },
                { new: true, runValidators: true }
            );
            if (!updatedReview) {
                return res.status(404).json({ message: "Invalid ID!" });
            }
            res.status(200).json({ message: "Success" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ "message": "Internal server error!" });
        }
    } else {
        res.status(401).json({ message: "Unauthorised!" })
    }
})

router.post('/patchlog', async (req, res) => {
    const { lastVersion, currentVersion, log, passKey } = req.body;

    if (passKey === process.env.SECRET_KEY){
        const newLog = new PatchLog({
            lastVersion,
            currentVersion,
            log
        })

        try {
            await newLog.save();
            res.status(201).json(newLog)
        } catch (err) {
            console.error(err);
            res.status(500).json({ "message": "Internal server error!" })
        }
    }
    else {
        res.status(401).json({ message: "Unauthorised!" })
    }
})

router.post('/release-note', async (req, res) => {
    const { version, text, passKey } = req.body;

    if (passKey === process.env.SECRET_KEY){
        const newReleaseNote = new ReleaseNote({
            version,
            text
        })

        try {
            await newReleaseNote.save();
            res.status(201).json(newReleaseNote)
        } catch (err) {
            console.error(err);
            res.status(500).json({ "message": "Internal server error!" })
        }
    }
    else {
        res.status(401).json({ message: "Unauthorised!" })
    }
})

module.exports = router;