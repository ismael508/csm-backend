const mongoose = require('mongoose')
const Schema = mongoose.Schema

const playerDataSchema = new Schema({
    username: String,
    playtime: Number,
    totalBalanceCollected: Number,
    currencySpent: Number,
    purchases: Number,
    balance: Number,
    gamesPlayed: Number,
    jumps: Number,
    scores: Number,
    coloursOwned: Array,
    designsOwned: Array,
    customSkinsOwned: Array,
    primaryColour: Array,
    secondaryColour: {
        type: Array,
        default: null
    },
    equippedDesign: String,
    equippedCustomSkin: String,
    jump: Number,
    jumpKey: String,
    gameSpeedMultiplier: Number,
    stripeWidth: Number,
    outlineSize: Number,
    radiusLength: Number,
    colourChangeInterval: Number,
    showHitboxes: Boolean,
    autosave: Boolean,
    spins: Number,
    spinsSpun: Number,
    levelsCompleted: Number,
    showLevelProgress: Boolean,
    progressPrecision: Number,
    levelAttempts: Array, // e.g. [[2, 89], [7, 41]] first lvl: 2 attempts highest 89%
}, { timestamps: true })

const PlayerData = mongoose.model('PlayerData', playerDataSchema, 'PlayerData')

module.exports = PlayerData