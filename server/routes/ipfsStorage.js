const express = require("express");
const {
    addFileToIPFS,
    getIPFSFileByHash,
} = require("../controllers/ipfsStorageController");

const router = express.Router();

router.post("/add-file", addFileToIPFS);

router.get("/get-file/:fileHash", getIPFSFileByHash);

module.exports = router;
