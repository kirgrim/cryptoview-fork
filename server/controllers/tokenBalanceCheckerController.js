const { Web3 } = require('web3');
const tokenABI = require('../internal-assets/ERC20ABI.json'); //(with path)


/**
 * Retrieves balance of provided wallet address with respect to provided token contract
 * @param req - Request object that receives following params:
 * `query.walletAddress` - ERC20 address of wallet
 * `query.walletAddress` - ERC20 address of token contract
 * @param res - Response Object
 * @returns
 * Possible error callbacks:
 * 400 BAD REQUEST: Invalid wallet address (e.g. not ERC20 format)
 * 400 BAD REQUEST: Invalid token contract address (e.g. not ERC20 format)
 * 500 INTERNAL SERVER ERROR: Error during communication with Infura API
 */
const getTokenBalanceForAddress = async (req, res) => {

    try {
        const walletAddress = req.query?.walletAddress;
        const tokenContractAddress = req.query?.tokenContractAddress;

        const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);

        if (!web3.utils.isAddress(walletAddress)) {
            return res.status(400).json({error: 'Invalid wallet address'});
        }
        if (!web3.utils.isAddress(tokenContractAddress)) {
            return res.status(400).json({error: 'Invalid token contract address'});
        }

        const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);

        const balance = await tokenContract.methods.balanceOf(walletAddress).call();
        const decimals = await tokenContract.methods.decimals().call();

        const formattedBalance = (balance / BigInt(10 ** parseInt(decimals))).toString();

        return res.status(200).json({balance: formattedBalance});
    }catch (e) {
        console.error('Error fetching token balance:', e);
        return res.status(500).json({error: 'Failed to fetch token balance'});
    }
}

module.exports = { getTokenBalanceForAddress };
