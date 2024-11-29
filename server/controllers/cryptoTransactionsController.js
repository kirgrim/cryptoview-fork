const url = require('url');
const CryptoTransactionsModel = require("../models/cryptoTransactionModel");

const MAX_TRANSACTIONS_PER_FETCH = 100;
const DATE_RANGE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Retrieves N-latest confirmed crypto transactions from the provided address
 * @param req - Request object that receives following params:
 * - `params.address` - target address for query
 * - `query.limit` - limit number of latest transactions to fetch (defaults to 5, up to 100)
 * @param res - Response object
 * @returns {Promise<void>}
 */
const getLatestTransactionsByAddress = async (req, res) => {
    const walletAddress = req.params.address;

    const limit = req.query.limit ?? 5;

    if (limit > MAX_TRANSACTIONS_PER_FETCH){
        return res.status(400).json({ error: `Up to ${MAX_TRANSACTIONS_PER_FETCH} is allowed` });
    }

    const urlObject = {
        protocol: 'https',
        hostname: 'api.etherscan.io',
        pathname: '/api',
        query: {
            module: 'account',
            action: 'txlist',
            address: walletAddress,
            startBlock: 0,
            endBlock: 99999999,
            page: 1,
            offset: limit,
            sort: "desc",
            apikey: process.env.ETHERSCAN_API_KEY,
        },
    };

    const etherscanResponseJson = await fetch(url.format(urlObject))
        .then(async (response) => await response.json())
        .catch((error) => {
            console.log(error)
            res.status(522).json({ error: "API is temporary unavailable" });
        });
    if (etherscanResponseJson?.status === "1") {
        let recentTransactionsData = [];
        let bulkUpsertData = [];
        etherscanResponseJson.result.forEach((rawTransactionData) => {
            if (rawTransactionData?.isError === "0") {
                const transactionData = {
                    hash: rawTransactionData.hash,
                    blockNumber: rawTransactionData.blockNumber,
                    sender: rawTransactionData.from,
                    receiver: rawTransactionData?.to,
                    contractAddress: rawTransactionData?.contractAddress,
                    value: parseInt(rawTransactionData.value) ?? 0,
                    gasUsed: parseInt(rawTransactionData.gasUsed),
                    createdTS: parseInt(rawTransactionData.timeStamp),
                }
                recentTransactionsData.push(transactionData);
                bulkUpsertData.push(
                    {
                        'updateOne': {
                            'filter': { 'hash': transactionData.hash },
                            'update': { '$set': transactionData },
                            'upsert': true,
                        }
                    }
                )
            }
        })
        if (recentTransactionsData.length > 0) {
            await CryptoTransactionsModel.bulkWrite(bulkUpsertData);
        }
        return res.status(200).json({transactions: recentTransactionsData});
    }else{
        return res.status(400).json({ error: etherscanResponseJson.result })
    }
}

/**
 * Retrieves matching transactions for the provided sender address based on date interval
 * @param req - Request object that receives following params:
 * - `params.address` - target sender address for lookup
 * - `query.dateFrom` - date string of format YYYY-MM-DD since which to fetch transactions
 * - `query.dateTo` - date string of format YYYY-MM-DD up to which to fetch transactions
 * @param res - Response object
 * @returns {Promise<void>}
 * Possible error callbacks:
 * Error 400 - BAD REQUEST: if none of date range query tokens are specified
 * Error 400 - BAD REQUEST: if parsing of any date range query token fails
 * Error 400 - BAD REQUEST: if date ranges mismatch
 * ERROR 522 - SERVICE UNAVAILABLE: if database query failed
 *
 * Success case
 * Returns a response of format {transactions: [
 *     {
 *
 *     }
 * ]}
 */
const getTransactionsForAddress = async (req, res) => {
    const senderAddress = req.params.address;

    const dateFrom = req.query?.dateFrom;
    const dateTo = req.query?.dateTo;

    if (!(dateFrom || dateTo)) {
        return res.status(400).json({ error: `At least one of date ranges must be set` });
    }

    const queryFilters = {
        "sender": senderAddress,
        "createdTS": {}
    }

    const {result: dateFromTS=null, error: errorDateFrom=null} = convertDateStringToTimestamp(dateFrom);
    if (errorDateFrom){
        return res.status(400).json({ error: `Failed to parse dateFrom: ${errorDateFrom}` });
    }else if (dateFromTS){
        queryFilters["createdTS"]["$gte"] = dateFromTS;
    }

    const {result: dateToTS=null, error: errorDateTo=null} = convertDateStringToTimestamp(dateTo);
    if (errorDateTo){
        return res.status(400).json({ error: `Failed to parse dateTo: ${errorDateTo}` });
    }else if (dateToTS){
        queryFilters["createdTS"]["$lte"] = dateToTS;
    }

    if (dateFromTS && dateToTS && dateToTS <= dateFromTS){
        return res.status(400).json({ error: `dateFrom must be lower than dateTo` });
    }
    try{
        const dbTransactions = await CryptoTransactionsModel
            .find(queryFilters)
            .select({ _id: 0, hash: 1, blockNumber: 1, receiver: 1, contractAddress: 1, value: 1, gasUsed: 1, createdTS: 1 })
            .sort({ createdTS: -1 })
        return res.status(200).json({transactions: dbTransactions});
    } catch (error) {
        console.error("Database query error:", error);
        return res.status(522).json({ error: "An error occurred while fetching transactions." });
    }
}

/**
 *
 * @param dateString - date string of format YYYY-MM-DD
 * @returns {{result: number| null}|{error: string}} -
 * `error` if date failed to be parsed correctly,
 * `result` containing converted timestamp, result === null if provided `dateString` is empty
 */
const convertDateStringToTimestamp = (dateString) => {
    if (dateString){
        if (!DATE_RANGE_REGEX.test(dateString)){
            return { error: `Invalid pattern provided: must be YYYY-MM-DD` }
        }
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        ) {
            return { result: Math.floor(date.getTime() / 1000)};
        } else {
            return { error: `Invalid date value provided`};
        }
    }else{
        return { result: null };
    }
}

module.exports = { getLatestTransactionsByAddress, getTransactionsForAddress };
