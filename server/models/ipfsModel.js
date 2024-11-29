const mongoose = require("mongoose");
const { Schema } = mongoose;


const IPFSFiles = new Schema({
    hash: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
});


module.exports = mongoose.model("IPFSFiles", IPFSFiles);
