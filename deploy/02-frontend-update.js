const { ethers } = require("hardhat")
const fs = require("fs")
module.exports = async () => {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating frontend...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Updated frontend succesfully!")
    }
}
const FRONTEND_ADDRESS_FILE = "../nextjs-lottery/constants/contractAddress.json"
const FRONTEND_ABI_FILE = "../nextjs-lottery/constants/abi.json"

async function updateContractAddresses() {
    const lotto = await ethers.getContract("lotto")
    const fds = await fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf8")
    console.log(fds)
    const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf8"))
    const chainId = network.config.chainId.toString()
    console.log(chainId)
    if (chainId in currentAddresses) {
        console.log(lotto.address)
        if (!currentAddresses[chainId].includes(lotto.address)) {
            currentAddresses[chainId].push(lotto.address)
        }
    } else {
        currentAddresses[chainId] = [lotto.address]
    }

    fs.writeFileSync(FRONTEND_ADDRESS_FILE, JSON.stringify(currentAddresses))
}

async function updateAbi() {
    const lotto = await ethers.getContract("lotto")
    fs.writeFileSync(FRONTEND_ABI_FILE, lotto.interface.format(ethers.utils.FormatTypes.json))
}

module.exports.tags = ["all", "frontend"]
