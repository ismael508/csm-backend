const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { google } = require('googleapis')

const User = require('../models/UserModel');
const PlayerData = require('../models/PlayerDataModel')
const Review = require('../models/ReviewModel');
const Code = require('../models/CodeModel');

const bcrypt = require('bcrypt');
const PatchLog = require('../models/PatchLogModel');
const RefreshToken = require('../models/RefreshTokenModel');
const ReleaseNote = require('../models/ReleaseNoteModel');

const { generateAccessToken, generateRefreshToken, generateCode } = require('../utils');

// Update Gmail API scope
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Configure OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);

// Initialize OAuth2 client with error handling
try {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
        throw new Error('Missing OAuth2 client credentials');
    }
    
    if (!process.env.REFRESH_TOKEN) {
        throw new Error('Missing refresh token');
    }

    oAuth2Client.setCredentials({ 
        refresh_token: process.env.REFRESH_TOKEN,
        scope: GMAIL_SCOPE  // Use the new scope
    });

} catch (err) {
    console.error('OAuth2 Setup Error:', err);
}

// Modify send-code route with proper error handling
router.post('/send-code', async (req, res) => {
    const { email } = req.body;
    let generatedCode;

    try {
        // Verify all required credentials
        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN || !process.env.EMAIL_AUTH) {
            throw new Error('Missing required OAuth2 credentials');
        }

        // Generate verification code first
        generatedCode = generateCode();
        
        // Get fresh access token
        const { token: accessToken } = await oAuth2Client.getAccessToken()
            .catch(error => {
                console.error('Token Error:', {
                    message: error.message,
                    response: error.response?.data,
                    code: error.code
                });
                throw new Error(`OAuth2 authorization failed: ${error.message}`);
            });

        // Create verification code record
        const newCode = new Code({
            email,
            code: generatedCode
        });

        // Save code to database
        await newCode.save();

        // Configure email transport
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_AUTH,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken
            }
        });

        // Verify transport configuration
        await transporter.verify();

        // Send email
        await transporter.sendMail({
            from: `"Cosmic Ascension" <${process.env.EMAIL_AUTH}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `
                <p>Your verification code for Cosmic Ascension is <strong>${generatedCode}</strong>.</p>
                <p>If this wasn't you, please ignore this email.</p>
            `
        });

        return res.status(201).json({ 
            message: "Code sent successfully!",
            code: process.env.NODE_ENV === 'development' ? generatedCode : undefined
        });

    } catch (err) {
        console.error('Email Send Error:', err);
        
        // Clean up saved code if it exists
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
    const { userId, content, rating } = req.body;

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