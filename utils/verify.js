const { run } = require("hardhat")
const verify = async (contractAddress, args) => {
    console.log("Verifying contract....")
    try {
        const res = await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
        console.log(res)
    } catch (err) {
        console.log(err)
    }
}

module.exports = { verify }
