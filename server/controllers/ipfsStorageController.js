const { PinataSDK } = require("pinata-web3");
const {v4: uuid} = require("uuid");
const IPFSFilesModel = require("../models/ipfsModel");


const getPinataSDKHandler = () => {
    return new PinataSDK({
        pinataJwt: process.env.PINATA_JWT_TOKEN,
        pinataGateway: process.env.PINATA_GATEWAY,
    });
}

const addFileToIPFS = async (req, res) => {

    const { data } = req?.body;
    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    const file = new File([data], uuid(), { type: "text/plain" });
    const upload = await getPinataSDKHandler().upload.file(file);

    const uploadedFileHash = upload.IpfsHash

    await IPFSFilesModel.create(
        {
            hash: uploadedFileHash
        }
    )

    return res.status(200).json({ hash: uploadedFileHash });
}

const getIPFSFileByHash = async (req, res) => {
    const fileHash = req.params?.fileHash;

    if (!fileHash) {
        return res.status(400).json({ error: 'No file hash to lookup' });
    }

    const matchingEntry = await IPFSFilesModel.findOne(
        {hash: fileHash}
    )
    if (!matchingEntry) {
        return res.status(400).json({ error: 'No file matching provided hash' });
    }

    const { data, contentType } = await getPinataSDKHandler().gateways.get(
        fileHash
    )
    if (!data){
        console.error(`File with ${fileHash} exists in db but not found in IPFS storage`)
        return res.status(400).json({ error: 'No file matching provided hash' });
    }

    return res.status(200).json({ data: data });
}

module.exports = { addFileToIPFS, getIPFSFileByHash };
