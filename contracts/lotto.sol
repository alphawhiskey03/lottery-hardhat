// Contract

// Enter the lottery (paying some amount)

// Pick a random number winner (verifiably raondom number)

// Winner to be selected every X minutes -> completely automerted

// chainlink oracles - Randomness , Automated execution(chainlink keepers)

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// below we can use both KeeperCompatible.sol and KeeperCompatibleInterface.sol
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lotto__NotEnoughEthEntered();
error Lotto__TransferFailer();
error Lotto__NotOpen();
error Lotto__UpkeedNotNeeded(uint256, uint256, uint256);

/**
 * @title Lotto Contract
 * @author Vignesh S
 * @notice creating an untamperable decentralized smart contract
 * @dev implements Chainlink VRF v2 and chainlink keepers
 */

contract lotto is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type declaration */

    enum LottoState {
        OPEN,
        CALCULATING
    }
    // returns 0=OPEN, 1=CALCULATING

    // State variables
    uint256 private immutable i_entranceFee;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    // Lotto variable
    address private s_recentWinner;
    address payable[] private s_players;
    LottoState private s_lottoState; // to pending, open, closed, calculating
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Events
    event LottoEnter(address indexed player);
    event RequestedLottoWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // functions

    constructor(
        address VRFCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 interval,
        uint256 entranceFee,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(VRFCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(VRFCoordinatorV2);
        i_gasLane = gasLane;
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        s_lottoState = LottoState.OPEN; // CAN ALSO USE LottoState(0)
        s_lastTimeStamp = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterLotto() public payable {
        if (msg.value < i_entranceFee) {
            revert Lotto__NotEnoughEthEntered();
        }
        if (s_lottoState != LottoState.OPEN) {
            revert Lotto__NotOpen();
        }
        s_players.push(payable(msg.sender));

        // Emit event when we update a dynamic array or mapping
        // Named events with the function name reversed
        emit LottoEnter(msg.sender);
    }

    /**
     @dev This is the function that the chainlink keepers call
    * They look for the 'upkeepNeeded' to return true.
    * The following should be true in order to return true
    *  1. Our timme interval should have passed
    *  2. There should be atleast 1 player in the lottery and have some Eth
    *  3. Our subscription should be funded with ETH.
    *  4. The lottery should be in "open" state . 
    *       (ie) we shouldnt be waiting for random number or anything at that time
     */

    // in the below function ,checkUpKeep(bytes calldata checkData) wouldve been mention
    // changin it to memory as we are just gonna pass string , calldata doesnt work with string
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData */
        )
    {
        bool isOpen = (LottoState.OPEN == s_lottoState);
        bool hasPlayers = (s_players.length > 0);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(
        bytes calldata /*performdData*/
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lotto__UpkeedNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lottoState)
            );
        }
        s_lottoState = LottoState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, /* metioned as keyHash in docs, This determines the gas we are willing to spend to get a Random word */
            i_subscriptionId,
            REQUEST_CONFIRMATIONS, /* Request confirmations */
            i_callbackGasLimit, /* this determines the amount of gas we are willing to spend to get back the randomWord */
            NUM_WORDS
        );
        // The requestId is emitted in the mock by an event RandomWordsRequested
        //so the event below is reduntant

        emit RequestedLottoWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        // as usual the modulo operator gives the remainder
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_lottoState = LottoState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool sent, ) = s_recentWinner.call{value: address(this).balance}("");
        if (!sent) {
            revert Lotto__TransferFailer();
        }
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFree() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLottoState() public view returns (LottoState) {
        return s_lottoState;
    }

    // left here 14:52:10
    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
