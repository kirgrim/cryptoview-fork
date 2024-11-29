const express = require("express");
const {
    getLatestTransactionsByAddress,
    getTransactionsForAddress,
} = require("../controllers/cryptoTransactionsController.js");

const router = express.Router();

router.get("/:address/latest", getLatestTransactionsByAddress);

router.get("/:address", getTransactionsForAddress);

module.exports = router;
