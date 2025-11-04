const mongoose = require('mongoose')
const Schema = mongoose.Schema

const levelSchema = new Schema({
    levelNum: Number,
    content: String
}, { timestamps: true })

const Level = mongoose.model('Levels', levelSchema, 'Levels')

module.exports = Level