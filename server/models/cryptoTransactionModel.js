const mongoose = require("mongoose");
const { Schema } = mongoose;

const CryptoTransactionsSchema = new Schema({
    hash: {
        type: String,
        unique: true,
        required: true,
    },
    blockNumber: {
        type: String,
        required: true,
    },
    sender: {
        type: String,
        required: true,
    },
    receiver: {
        type: String,
    },
    contractAddress: {
        type: String,
    },
    value: {
        type: Number,
        required: true,
    },
    gasUsed: {
        type: Number,
        required: true,
    },
    createdTS: {
        type: Number,
        required: true,
    }
})


module.exports = mongoose.model("CryptoTransactions", CryptoTransactionsSchema);
