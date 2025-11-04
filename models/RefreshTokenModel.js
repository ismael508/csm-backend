const mongoose = require('mongoose')
const Schema = mongoose.Schema

const refreshSchema = new Schema({
    refreshToken: String,
    userId: String
}, { timestamps: true })

const RefreshToken = mongoose.model('RefreshToken', refreshSchema, 'RefreshTokens')

module.exports = RefreshToken