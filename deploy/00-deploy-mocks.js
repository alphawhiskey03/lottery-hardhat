const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat.config")

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium cost. it consts 0.25 LINK per request
const GAS_PRICE_LINK = 1e9 // calculated value based on the chain
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Mock deployer${deployer}`)
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })

        log("Mocks Deployed")
        log("-------")
    }
}

module.exports.tags = ["all", "mocks"]
