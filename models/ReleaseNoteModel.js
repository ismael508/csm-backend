const mongoose = require('mongoose')
const Schema = mongoose.Schema

const releaseSchema = new Schema({
    version: Array,
    text: String
}, { timestamps: true })

const ReleaseNote = mongoose.model('ReleaseNotes', releaseSchema, 'ReleaseNotes')

module.exports = ReleaseNote