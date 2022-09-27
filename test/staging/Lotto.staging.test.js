const { developmentChains, networkConfig } = require("../../helper-hardhat.config")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lotto Staging Tests", () => {
          let deployer, lotto, lottoEntranceFee

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              lotto = await ethers.getContract("lotto", deployer)
              lottoEntranceFee = await lotto.getEntranceFree()
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
                  // enter the lotto
                  console.log("Setting up test...")
                  const startingTimeStamp = await lotto.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      lotto.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired")
                          try {
                              const recentWinner = await lotto.getRecentWinner()
                              const lottoState = await lotto.getLottoState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await lotto.getLatestTimeStamp()
                              await expect(lotto.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(lottoState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(lottoEntranceFee).toString()
                              )
                              assert.equal(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (err) {
                              reject(err)
                          }
                      })
                      console.log("Entering the lotto")
                      const tx = await lotto.enterLotto({ value: lottoEntranceFee })
                      await tx.wait(1)
                      console.log("Waiting for WinnerPicked event...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      console.log(winnerStartingBalance)
                  })
              })
          })
      })
