const fs = require('fs')
const assert = require('assert')
const snarkjs = require('snarkjs')
const crypto = require('crypto')
const circomlib = require('circomlib')
const bigInt = snarkjs.bigInt
const merkleTree = require('./lib/MerkleTree')
const Web3 = require('web3')
const buildGroth16 = require('websnark/src/groth16')
const websnarkUtils = require('websnark/src/utils')
const { toWei, fromWei, toBN, BN } = require('web3-utils')


let web3, tornado, voting, circuit, proving_key, groth16, erc20, senderAccount, ownerAccount, netId
let MERKLE_TREE_HEIGHT, ETH_AMOUNT, TOKEN_AMOUNT, PRIVATE_KEY, OWNER_PRIVATE_KEY

let isLocalRPC = false

/** Generate random number of specified byte length */
const rbigint = nbytes => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))
const getVotingId = (votingId) => snarkjs.bigInt.leBuff2int( toBN(votingId).toBuffer() )

/** Compute pedersen hash */
const pedersenHash = data => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0]

/** BigNumber to hex string of specified length */
function toHex(number, length = 32) {
  const str = number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16)
  return '0x' + str.padStart(length * 2, '0')
}

/** Display ETH account balance */
async function printETHBalance({ address, name }) {
  console.log(`${name} ETH balance is`, web3.utils.fromWei(await web3.eth.getBalance(address)))
}


/**
 * Display accounts information
 */
async function getAccounts() {
    const accounts = await web3.eth.getAccounts()
    for(let a in accounts){
      console.log(`Account #${a} Address ${accounts[a]}`);
    }
    return accounts
}


function createDeposit({ nullifier, secret, votingId }) {
    const deposit = { nullifier, secret, votingId }
    deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31), deposit.votingId.leInt2Buff(31)])
    deposit.commitment = pedersenHash(deposit.preimage)
    deposit.commitmentHex = toHex(deposit.commitment)
    deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31))
    deposit.nullifierHex = toHex(deposit.nullifierHash)
    return deposit
}

async function init({ rpc, noteNetId}) {
    let contractJson, votingContractJson, tornadoAddress, votingAddress
      // Initialize from local node
    web3 = new Web3(rpc, null, { transactionConfirmationBlocks: 1 })
    contractJson = require('./build/contracts/VotingTornado.json')
    circuit = require('./build/circuits/withdraw.json')
    const provingfile = require('./build/circuits/withdraw_proving_key.bin')

    proving_key = await (await fetch(provingfile)).arrayBuffer()

    //console.log("Init", circuit, contractJson.toString(), proving_key)    

    MERKLE_TREE_HEIGHT = 20

    OWNER_PRIVATE_KEY = null
    if (OWNER_PRIVATE_KEY) {
      const owner_account = web3.eth.accounts.privateKeyToAccount(OWNER_PRIVATE_KEY)
      web3.eth.accounts.wallet.add(OWNER_PRIVATE_KEY)
      //web3.eth.defaultAccount = owner_account.address
      ownerAccount = owner_account.address
    } 
  
  
    PRIVATE_KEY = null
    if (PRIVATE_KEY) {
      const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
      web3.eth.accounts.wallet.add(PRIVATE_KEY)
      web3.eth.defaultAccount = account.address
      senderAccount = account.address
    } else {
      console.log('Warning! PRIVATE_KEY not found. Please provide PRIVATE_KEY in .env file if you deposit')
    }
    votingContractJson = require('./build/contracts/Voting.json')
  
    // groth16 initialises a lot of Promises that will never be resolved, that's why we need to use process.exit to terminate the CLI
    groth16 = await buildGroth16()
    netId = await web3.eth.net.getId()
    if (noteNetId && Number(noteNetId) !== netId) {
      throw new Error('This note is for a different network. Specify the --rpc option explicitly')
    }
    isLocalRPC = netId > 42
  
    if (isLocalRPC) {
      tornadoAddress = contractJson.networks[netId].address
      votingAddress = votingContractJson.networks[netId].address
      senderAccount = (await web3.eth.getAccounts())[0]
    } 
    tornado = new web3.eth.Contract(contractJson.abi, tornadoAddress)
    voting = new web3.eth.Contract(votingContractJson.abi, votingAddress) 
    console.log("Voting contract", voting);
  }
  
/**
 * Connect Tornado to voting contract
 */
async function getVotingInfo(votingId) {
    console.log("Getting voting info. ID : ", votingId)
    const votingEntry = await voting.methods.votings(votingId).call()
    console.log('\n=============Voting=================')
    console.log('Creator               :', votingEntry.creator)
    console.log('Number of options     :', votingEntry.optionsNumber)
    console.log('Nomination            :', votingEntry.nomination)
    console.log('Total votes           :', votingEntry.totalVotes)
    console.log('=============Options================')
    let results = {} 
    for( let i = 0 ; i < votingEntry.optionsNumber; i ++ ){
      let r = await voting.methods.getResult(votingId, i).call()
      console.log(`Option ${i} votes        :`, r)
      results[i]=parseInt(r);
    }
    console.log('====================================')
    return(
        {votingId : parseInt(votingId), creator : votingEntry.creator, optionsNumber : parseInt(votingEntry.optionsNumber), nomination : parseInt(votingEntry.nomination), totalVotes : parseInt(votingEntry.totalVotes),
            results
        }
    )
  }
  

  function getCurrentNetworkName() {
    switch (netId) {
    case 1:
      return ''
    case 42:
      return 'kovan.'
    }
  
  }


  async function getVotes(votingId, address ) {
    const ret = await voting.methods.getVotes(votingId, address).call()
    return(parseInt(ret))
  }
  
    
/**
 * Make a deposit
 * @param currency Сurrency
 * @param amount Deposit amount
 */
async function getBallot({ votingId, address }) {
    const deposit = createDeposit({ nullifier: rbigint(31), secret: rbigint(31), votingId: getVotingId(votingId) })
    const note = toHex(deposit.preimage, 93)
    const noteString = `tornado-${votingId}-${netId}-${note}`
    console.log(`Your ballot: ${noteString}`)
    console.log('Submitting deposit transaction')
    await tornado.methods.getBallot(toHex(deposit.commitment), votingId).send({ from: address ? address : senderAccount, gas: 2e6 })      .on('transactionHash', function (txHash) {
      if (netId === 1 || netId === 42) {
        console.log(`View transaction on etherscan https://${getCurrentNetworkName()}etherscan.io/tx/${txHash}`)
      } else {
        console.log(`The transaction hash is ${txHash}`)
        web3.eth.getTransactionReceipt(txHash).then((receipt)=>{
          console.log(`The transaction receipt is ${JSON.stringify(receipt)}`)
        });
  
      }
    }).on('error', function (e) {
      console.error('on transactionHash error', e.message)
    })
  
    
    return noteString
  }
  




  /**
 * Waits for transaction to be mined
 * @param txHash Hash of transaction
 * @param attempts
 * @param delay
 */
function waitForTxReceipt({ txHash, attempts = 60, delay = 1000 }) {
    return new Promise((resolve, reject) => {
      const checkForTx = async (txHash, retryAttempt = 0) => {
        const result = await web3.eth.getTransactionReceipt(txHash)
        if (!result || !result.blockNumber) {
          if (retryAttempt <= attempts) {
            setTimeout(() => checkForTx(txHash, retryAttempt + 1), delay)
          } else {
            reject(new Error('tx was not mined'))
          }
        } else {
          resolve(result)
        }
      }
      checkForTx(txHash)
    })
  }


  function parseNote(noteString) {
    //const noteRegex = /tornado-(?<voteId>\d+)-(?<netId>\d+)-0x(?<note>[0-9a-fA-F]{186})/g
  
    const noteRegex = new RegExp('tornado-(?<voteId>\\d+)-(?<netId>\\d+)-0x(?<note>[0-9a-fA-F]{186})', "g");
    console.log(noteRegex)
    const match = noteRegex.exec(noteString)
    if (!match){
      console.log("Doesn't match")
        return;
        //throw new Error('The note has invalid format')
    }
  
    const buf = Buffer.from(match.groups.note, 'hex')
    //console.log("Parsed buf", buf)
    const nullifier = bigInt.leBuff2int(buf.slice(0, 31))
    const secret = bigInt.leBuff2int(buf.slice(31, 62))
    const votingId = bigInt.leBuff2int(buf.slice(62, 93))
    //console.log("Parsed votingId", votingId, buf.slice(62, 93))
    const deposit = createDeposit({ nullifier, secret, votingId })
    const netId = Number(match.groups.netId)
  
    return { netId, votingId, deposit }
  }

/**
 * Generate merkle tree for a deposit.
 * Download deposit events from the tornado, reconstructs merkle tree, finds our deposit leaf
 * in it and generates merkle proof
 * @param deposit Deposit object
 */
async function generateMerkleProof(deposit) {
    // Get all deposit events from smart contract and assemble merkle tree from them
    console.log('Getting current state from tornado contract')
    const events = await tornado.getPastEvents('Ballot', { fromBlock: 0, toBlock: 'latest' })
    
    const leaves = events
      .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex) // Sort events in chronological order
      .map(e => e.returnValues.commitment)
    const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves)
  
    // Find current commitment in the tree
    const depositEvent = events.find(e => e.returnValues.commitment === toHex(deposit.commitment))
    const leafIndex = depositEvent ? depositEvent.returnValues.leafIndex : -1
  
    // Validate that our data is correct
    const root = await tree.root()
    const isValidRoot = await tornado.methods.isKnownRoot(toHex(root)).call()
    const isSpent = await tornado.methods.isSpent(toHex(deposit.nullifierHash)).call()
    assert(isValidRoot === true, 'Merkle tree is corrupted')
    assert(isSpent === false, 'The note is already spent')
    assert(leafIndex >= 0, 'The deposit is not found in the tree')
  
    // Compute merkle proof of our commitment
    return tree.path(leafIndex)
  }


/**
 * Generate SNARK proof for withdrawal
 * @param deposit Deposit object
 * @param recipient Funds recipient
 * @param relayer Relayer address
 * @param fee Relayer fee
 * @param refund Receive ether for exchanged tokens
 */
async function generateProof({ deposit, votingId, relayerAddress = 0, fee = 0, refund = 0 }) {
  // Compute merkle proof of our commitment
  const { root, path_elements, path_index } = await generateMerkleProof(deposit)

  // Prepare circuit input
  const input = {
    // Public snark inputs
    root: root,
    nullifierHash: deposit.nullifierHash,
    recipient: bigInt(votingId),
    relayer: bigInt(relayerAddress),
    fee: bigInt(fee),
    refund: bigInt(refund),

    // Private snark inputs
    nullifier: deposit.nullifier,
    secret: deposit.secret,
    pathElements: path_elements,
    pathIndices: path_index,
  }

  console.log('Generating SNARK proof')
  console.time('Proof time')
  console.log(groth16, input, circuit, proving_key );
  const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key)
  const { proof } = websnarkUtils.toSolidityInput(proofData)
  console.timeEnd('Proof time')

  const args = [
    toHex(input.root),
    toHex(input.nullifierHash),
    toHex(input.recipient, 31),
  ]

  return { proof, args }
}
  /**
 * Do an ETH withdrawal
 * @param noteString Note to withdraw
 * @param recipient Recipient address
 */
async function sendVote({ deposit, votingId, optionNumber, address, relayerURL = null}) {
      console.log("using private key", votingId)
      const { proof, args } = await generateProof({ deposit, votingId })
  
      console.log('Submitting withdraw transaction', optionNumber)
      await tornado.methods.vote(proof, ...args, optionNumber).send({ from: address, gas: 1e6 })
        .on('transactionHash', function (txHash) {
          if (netId === 1 || netId === 42) {
            console.log(`View transaction on etherscan https://${getCurrentNetworkName()}etherscan.io/tx/${txHash}`)
          } else {
            console.log(`The transaction hash is ${txHash}`)
          }
        }).on('error', function (e) {
          console.error('on transactionHash error', e.message)
        })
    console.log('Done')
  }
  
  function fromDecimals({ amount, decimals }) {
    amount = amount.toString()
    let ether = amount.toString()
    const base = new BN('10').pow(new BN(decimals))
    const baseLength = base.toString(10).length - 1 || 1
  
    const negative = ether.substring(0, 1) === '-'
    if (negative) {
      ether = ether.substring(1)
    }
  
    if (ether === '.') {
      throw new Error('[ethjs-unit] while converting number ' + amount + ' to wei, invalid value')
    }
  
    // Split it into a whole and fractional part
    const comps = ether.split('.')
    if (comps.length > 2) {
      throw new Error(
        '[ethjs-unit] while converting number ' + amount + ' to wei,  too many decimal points'
      )
    }
  
    let whole = comps[0]
    let fraction = comps[1]
  
    if (!whole) {
      whole = '0'
    }
    if (!fraction) {
      fraction = '0'
    }
    if (fraction.length > baseLength) {
      throw new Error(
        '[ethjs-unit] while converting number ' + amount + ' to wei, too many decimal places'
      )
    }
  
    while (fraction.length < baseLength) {
      fraction += '0'
    }
  
    whole = new BN(whole)
    fraction = new BN(fraction)
    let wei = whole.mul(base).add(fraction)
  
    if (negative) {
      wei = wei.mul(negative)
    }
  
    return new BN(wei.toString(10), 10)
  }

  async function loadBallotData({ deposit }) {
    try {
      const eventWhenHappened = await tornado.getPastEvents('Ballot', {
        filter: {
          commitment: deposit.commitmentHex
        },
        fromBlock: 0,
        toBlock: 'latest'
      })
      if (eventWhenHappened.length === 0) {
        throw new Error('There is no related deposit, the note is invalid')
      }
  
      const { timestamp } = eventWhenHappened[0].returnValues
      const txHash = eventWhenHappened[0].transactionHash
      const isSpent = await tornado.methods.isSpent(deposit.nullifierHex).call()
      const receipt = await web3.eth.getTransactionReceipt(txHash)
  
      return { timestamp, txHash, isSpent, from: receipt.from, commitment: deposit.commitmentHex }
    } catch (e) {
      console.error('loadBallotData', e)
    }
    return {}
  }
  async function loadVoteData({ deposit }) {
    try {
      const events = await await tornado.getPastEvents('Vote', {
        fromBlock: 0,
        toBlock: 'latest'
      })
  
      const withdrawEvent = events.filter((event) => {
        return event.returnValues.nullifierHash === deposit.nullifierHex
      })[0]
  
      if( withdrawEvent == null ) {
        return null
      }
      const receipt = await web3.eth.getTransactionReceipt(withdrawEvent.transactionHash)
  
      //const fee = withdrawEvent.returnValues.fee
      //const decimals = config.deployments[`netId${netId}`][currency].decimals
      const votingId = withdrawEvent.returnValues.votingId
      const { timestamp } = await web3.eth.getBlock(withdrawEvent.blockHash)
      return {
        votingId : votingId,
        //amount: toDecimals(withdrawalAmount, decimals, 9),
        txHash: withdrawEvent.transactionHash,
        from: receipt.from,
        to: withdrawEvent.returnValues.to,
        timestamp,
        nullifier: deposit.nullifierHex,
      }
    } catch (e) {
      console.error('loadVoteData', e)
    }
  }


  async function getBallotInfo (noteString){
    const { netId, votingId, deposit } = parseNote(noteString)
    const ballotInfo = await loadBallotData({ deposit })
    const depositDate = new Date(ballotInfo.timestamp * 1000)
    console.log('\n=============Ballot==================')
    console.log('Date        :', depositDate.toLocaleDateString(), depositDate.toLocaleTimeString())
    console.log('From        :', `${getCurrentNetworkName() ? "https://"+getCurrentNetworkName() + "etherscan.io/address/" + ballotInfo.from : ballotInfo.from}`)
    console.log('Transaction :', `${getCurrentNetworkName() ? "https://"+getCurrentNetworkName() + "etherscan.io/tx/" + ballotInfo.txHash : ballotInfo.txHash}`)
    console.log('Commitment  :', ballotInfo.commitment)
    if (deposit.isSpent) {
      console.log('The note was not spent')
    }


    const votingInfo = await loadVoteData({ deposit })
    let withdrawalDate = null;
    console.log('\n=============Vote====================')
    if( votingInfo != null ){
      withdrawalDate = new Date(votingInfo.timestamp * 1000)
      console.log('VotingId    :', votingInfo.votingId)
      console.log('Date        :', withdrawalDate.toLocaleDateString(), withdrawalDate.toLocaleTimeString())
      console.log('From        :', `${getCurrentNetworkName() ? "https://" + getCurrentNetworkName() + "etherscan.io/address/" + votingInfo.from : votingInfo.from}`)
      console.log('Transaction :', `${getCurrentNetworkName() ? "https://" + getCurrentNetworkName() +  "etherscan.io/tx/"+votingInfo.txHash : votingInfo.txHash}`)
      console.log('Nullifier   :', votingInfo.nullifier)
    } else{
      console.log('Ballot is unspent')
    }
    console.log('\n=====================================')


    return {
        ballotDate : depositDate.toLocaleDateString(), 
        ballotTime : depositDate.toLocaleTimeString(), 
        ballotFrom : ballotInfo.from, 
        ballotTxHash : ballotInfo.txHash,
        ballotTxCommitment : ballotInfo.commitment,
        isVoted : ballotInfo.isSpent,
        votingId :  votingInfo.votingId,
        votingDate : withdrawalDate.toLocaleDateString(), 
        votingTime : withdrawalDate.toLocaleTimeString(),
        votingFrom : votingInfo.from,
        votingTxHash : votingInfo.txHash,
        votingNullifier :  votingInfo.nullifier
    }
  }

  async function addNewAccount(){
    const newAccount = await web3.eth.accounts.create()
    web3.eth.accounts.wallet.add(newAccount)
    return newAccount.address;
  }
  
  async function topupAccount(from, to, value){
    await web3.eth.sendTransaction({from: from ? from : ownerAccount, to, value, gas : 2e6 })
  }


module.exports = {
    init,
    getAccounts, 
    getVotingInfo,
    getVotes,
    getBallot,
    parseNote,
    sendVote,
    getBallotInfo,
    addNewAccount,
    topupAccount
}