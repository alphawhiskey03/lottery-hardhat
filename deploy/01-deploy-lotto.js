const { ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat.config")
const { verify } = require("../utils/verify")
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")
module.exports = async ({ getNamedAccounts, deployments, network }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    console.log(`chain id : ${chainId}`)

    let vrfCoordinatorAddress, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorAddress = vrfCoordinatorV2Mock.address
        // creating subscriptionId programmatically
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionRecipt = await transactionResponse.wait(1)
        // console.log(transactionRecipt)
        subscriptionId = transactionRecipt.events[0].args.subId
        // funding the subscription
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["keepersUpdateInterval"]
    const args = [
        vrfCoordinatorAddress,
        subscriptionId,
        gasLane,
        interval,
        entranceFee,
        callbackGasLimit,
    ]
    console.log(args)
    const lotto = await deploy("lotto", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmation || 1,
    })
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        verify(lotto.address, args)
    }
    log("----------------")
}

module.exports.tags = ["all", "lotto"]
