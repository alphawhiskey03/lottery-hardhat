require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "https://eth-GOERLI"
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY || "0xkey"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "etherkey"
const COINMARKET_API_KEY = process.env.COINMARKET_API_KEY || "coinmarketkey"
console.log(`goerli rpc ${GOERLI_RPC_URL}`)
console.log(`goerli private key ${GOERLI_PRIVATE_KEY}`)
console.log(`Ether scan api ${ETHERSCAN_API_KEY}`)

module.exports = {
    defaultNetword: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmation: 1,
        },
        goerli: {
            chainId: 5,
            blockConfirmation: 1,
            url: GOERLI_RPC_URL,
            accounts: [GOERLI_PRIVATE_KEY],
            saveDeployments: true,
        },
    },
    etherscan: {
        apiKey: {
            goerli: ETHERSCAN_API_KEY,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.7",
            },
            {
                version: "0.4.24",
            },
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
            // chainId: //account number
            // 1:0
            //above line means in network w chainId take 0th account as deployer
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 500000,
    },
}
