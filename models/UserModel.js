const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    email: String,
    username: String,
    password: String,
    pfp: {
        type: Buffer,
        default: null
    },
    reviewsLiked: {
        type: Object,
        default: null
    }
}, { timestamps: true })

const User = mongoose.model('User', userSchema, 'Users')

module.exports = User