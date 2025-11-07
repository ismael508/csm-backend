const mongoose = require('mongoose')
const Schema = mongoose.Schema

const codeSchema = new Schema({
    email: String,
    code: String,
    createdAt: { type: Date, expires: 600, default: Date.now }
})

const Code = mongoose.model('Codes', codeSchema, 'Codes')

module.exports = Code