const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    rating: Number,
    relates: {
        type: Number,
        default: 0
    },
    ownerReply: String
}, { timestamps: true })

const Review = mongoose.model('Reviews', reviewSchema, 'Reviews')

module.exports = Review