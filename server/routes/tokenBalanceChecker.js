const express = require("express");
const {
    getTokenBalanceForAddress
} = require("../controllers/tokenBalanceCheckerController.js");

const router = express.Router();

router.get("/", getTokenBalanceForAddress);

module.exports = router;
