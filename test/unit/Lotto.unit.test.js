const { developmentChains, networkConfig } = require("../../helper-hardhat.config")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lotto unit tests", () => {
          let lotto, VRFCoordinatorV2Mock, deployer, interval
          const chainId = network.config.chainId
          const entranceFee = ethers.utils.parseEther("0.1")

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "lotto"])
              lotto = await ethers.getContract("lotto", deployer)
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              interval = await lotto.getInterval()
          })
          describe("constructor", () => {
              it("Initialized the lotto correctly", async () => {
                  // ideally we make one assert per it
                  const lottoState = await lotto.getLottoState()
                  const interval = await lotto.getInterval()
                  assert.equal(lottoState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
              })
          })
          describe("enterLotto", () => {
              it("Reverts when not enough ether is entered", async () => {
                  await expect(lotto.enterLotto()).to.be.revertedWith("Lotto__NotEnoughEthEntered")
              })
              it("records player when entered", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  const player = await lotto.getPlayer(0)
                  assert.equal(player, deployer)
              })
              it("checking if event is emitted", async () => {
                  await expect(lotto.enterLotto({ value: entranceFee })).to.emit(
                      lotto,
                      "LottoEnter"
                  )
              })
              it("doesn't allow entrance when lotto is in calculating state", async () => {
                  await lotto.enterLotto({ value: entranceFee })

                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  // can alos do
                  // await network.provider.request({method:"evm_mine",params:[]})

                  // now, we are pretending to be a chainlink keeper by calling permformUpKeep by ourself

                  await lotto.performUpkeep([])
                  await expect(lotto.enterLotto({ value: entranceFee })).to.be.revertedWith(
                      "Lotto__NotOpen"
                  )
              })
          })
          describe("checkUpKeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lotto.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns false if lotto isn't open", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await lotto.performUpkeep([])
                  const { upkeepNeeded } = await lotto.callStatic.checkUpkeep("0x")
                  const lottoState = await lotto.getLottoState()

                  assert.equal(lottoState, 1)
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lotto.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has player, eth and is open", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lotto.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  console.log(upkeepNeeded)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("can only run when checkupkeep is true", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await lotto.performUpkeep([])
                  assert(tx)
              })
              it("reverts when changeupkeep is false", async () => {
                  await expect(lotto.performUpkeep([])).to.be.revertedWith("Lotto__UpkeedNotNeeded")
              })

              it("Updates the lotto state, emits event, and calls the vrf coordinator", async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await lotto.performUpkeep([])
                  const txRecipt = await txResponse.wait(1)
                  const requestId = txRecipt.events[1].args.requestId
                  const lottoState = await lotto.getLottoState()
                  assert(requestId.toNumber() > 0)
                  assert(lottoState.toString() == "1")
              })
          })
          describe("fullfillRandomWords", () => {
              beforeEach(async () => {
                  await lotto.enterLotto({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpKeep", async () => {
                  // here the fulfillrandomwords, can only be called when there is a request on flight (15:50:12)
                  // so here were are passing a random requestId , to make sure we get reverted
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, lotto.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(1, lotto.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner , resets the lottery, and sends the money", async () => {
                  const additionalEntrants = 3
                  const startingEntrantIndex = 1 // as deployer is gonna be one
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingEntrantIndex;
                      i < startingEntrantIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectRaffle = await lotto.connect(accounts[i])
                      await accountConnectRaffle.enterLotto({ value: entranceFee })
                  }
                  const startingTimeStamp = await lotto.getLatestTimeStamp()
                  // performUpKeep (mock being the chainlink keeper)
                  // fulfillRandomWords (mock being the chainlink vrf)
                  //  wait for fulfillRandomWords to be called

                  // wrapping it in a promise as we have to wait till the event is emitted
                  await new Promise(async (resolve, reject) => {
                      // settint up the listener for the event
                      lotto.once("WinnerPicked", async () => {
                          console.log("Event found")
                          try {
                              const recentWinner = await lotto.getRecentWinner()
                              const lottoState = await lotto.getLottoState()
                              const endingTimeStamp = await lotto.getLatestTimeStamp()
                              const numPlayers = await lotto.getNumberOfPlayers()
                              const winnerEndingBalance = await accounts[1].getBalance()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(lottoState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      entranceFee
                                          .mul(additionalEntrants)
                                          .add(entranceFee)
                                          .toString()
                                  )
                              )
                              resolve()
                          } catch (err) {
                              reject()
                          }
                      })

                      // firing the the event and the above listener will pick it up
                      const tx = await lotto.performUpkeep([])
                      const txRecipt = await tx.wait(1)
                      const winnerStartingBalance = await accounts[1].getBalance()
                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          txRecipt.events[1].args.requestId,
                          lotto.address
                      )
                  })
              })
          })
      })
