const mongoose = require('mongoose')
const Schema = mongoose.Schema

const patchSchema = new Schema({
    lastVersion: {
        type: String,
        default: null
    },
    currentVersion: Array,
    log: {
        type: String,
        default: null
    }
}, { timestamps: true })

const PatchLog = mongoose.model('PatchLogs', patchSchema, 'PatchLogs')

module.exports = PatchLog