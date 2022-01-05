const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js");
const random = require("random");
const { broadcast } = require("./p2pServer.js");

const BLOCK_GENERATION_INTERVAL = 10; // second 블록 생성 간격(10초마다)
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10; // in blocks 난이도 조정 간격(블록 10개마다)

class Block {
  constructor(header, body) {
    this.header = header;
    this.body = body;
  }
}

class BlockHeader {
  constructor(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  ) {
    this.version = version;
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.merkleRoot = merkleRoot;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
}

// 블록들 담을 그릇에 최초 블록(genesisBlock) 만들어서 첫번째 배열로 저장
let Blocks = [createGenesisBlock()];

// package.json에 들어있는 버전 가져옴
function getVersion() {
  const package = fs.readFileSync("package.json");
  // console.log(JSON.parse(package).version);
  return JSON.parse(package).version;
}
// getVersion();

// 최초블록 만드는 함수
function createGenesisBlock() {
  const index = 0;
  const version = getVersion();
  const previousHash = "0".repeat(64);
  const timestamp = 1231006505; // 2009/01/03 6:15pm (UTC) // parseInt(Date.now() / 1000);
  const body = [
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
  ];
  const tree = merkle("sha256").sync(body);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = 0;
  const nonce = 0;

  // console.log(
  //   "version : %s, timestamp : %d, body : %s",
  //   version,
  //   timestamp,
  //   body
  // );
  // console.log("previousHash : %d", previousHash);
  // console.log("tree : ", tree);
  // console.log("merkleRoot : %d", merkleRoot);

  const header = new BlockHeader(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  );
  return new Block(header, body);
}
// const block = createGenesisBlock();
// console.log(block);

function getBlocks() {
  return Blocks;
}

function getLastBlock() {
  return Blocks[Blocks.length - 1];
}

// 블록이 들어오면 해시값을 만듦
function createHash(data) {
  const {
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce,
  } = data.header;
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce;
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

function calculateHash(
  version,
  index,
  previousHash,
  timestamp,
  merkleRoot,
  difficulty,
  nonce
) {
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce;
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

const genesisBlock = createGenesisBlock();
// const testHash = createHash(block);
console.log(genesisBlock);

function nextBlock(bodyData) {
  //
  const prevBlock = getLastBlock();
  const version = getVersion();
  const index = prevBlock.header.index + 1;
  const previousHash = createHash(prevBlock);
  const timestamp = parseInt(Date.now() / 1000);
  const tree = merkle("sha256").sync(bodyData);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = 0; //getDifficulty();
  // const nonce = 0;

  const header = findBlock(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty
  );
  return new Block(header, bodyData);
}

// const block1 = nextBlock(["chamchi"]);
// console.log(block1);

// 블록 추가하는 함수
function addBlock(bodyData) {
  // 들어온 인자(bodyData)로 새 블록을 만들고
  const newBlock = nextBlock([bodyData]);
  // push로 Blocks에 배열 젤 뒤에 넣는다
  Blocks.push(newBlock);
}

function replaceChain(newBlocks) {
  if (isValidChain(newBlocks)) {
    if (
      newBlocks.length > Blocks.length ||
      (newBlocks.length === Blocks.length && random.boolean())
    ) {
      Blocks = newBlocks;
      broadcast(responseLatestMsg());
    }
  } else {
    console.log("받은 원장에 문제가 잇음");
  }
}

function hexToBinary(s) {
  const lookupTable = {
    0: "0000",
    1: "0001",
    2: "0010",
    3: "0011",
    4: "0100",
    5: "0101",
    6: "0110",
    7: "0111",
    8: "1000",
    9: "1001",
    A: "1010",
    B: "1011",
    C: "1100",
    D: "1101",
    E: "1110",
    F: "1111",
  };
  let ret = "";
  for (let i = 0; i < s.length; i++) {
    if (lookupTable[s[i]]) {
      ret += lookupTable[s[i]];
    } else {
      return null;
    }
  }
  return ret;
}

// 난이도에 따라 찾을 해시값 바꿔주는 함수
function hashMatchesDifficulty(hash, difficulty) {
  const hashBinary = hexToBinary(hash.toUpperCase());
  const requirePrefix = "0".repeat(difficulty);
  // hashBinary와 requirePrefix의 시작부분이 같으면 true 아니면 false
  return hashBinary.startsWith(requirePrefix);
}

// 다음 블록 찾기(정답 nonce 찾기)
function findBlock(
  currentVersion,
  nextIndex,
  previousHash,
  nextTimestamp,
  merkleRoot,
  difficulty
) {
  let nonce = 0;
  while (true) {
    let hash = calculateHash(
      currentVersion,
      nextIndex,
      previousHash,
      nextTimestamp,
      merkleRoot,
      difficulty,
      nonce
    );
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new BlockHeader(
        currentVersion,
        nextIndex,
        previousHash,
        nextTimestamp,
        merkleRoot,
        difficulty,
        nonce
      );
    }
    nonce++;
  }
}

// 난이도
function getDifficulty(blocks) {
  const lastBlock = blocks[blocks.length - 1];
  if (
    // 제네시스 블록이 아니고,
    lastBlock.header.index !== 0 &&
    // 블록이 10번째 때 마다
    lastBlock.header.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0
  ) {
    // 난이도 조절
    return getAdjustDifficulty(lastBlock, blocks);
  }
  return lastBlock.header.difficulty;
}

// 난이도 조정
function getAdjustDifficulty(lastBlock, blocks) {
  // 이전 조정 블록?
  const prevAdjustmentBlock =
    blocks[blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  // 실제 경과 시간
  const elapsedTime =
    lastBlock.header.timestamp - prevAdjustmentBlock.header.timestamp;
  // 예상 시간
  const expectedTime =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;

  // 예상시간/2 가 실제경과시간보다 크면
  if (expectedTime / 2 > elapsedTime) {
    return prevAdjustmentBlock.header.difficulty + 1;
    // 예상시간*2 가 실제경과시간보다 작으면
  } else if (expectedTime * 2 < elapsedTime) {
    return prevAdjustmentBlock.header.difficulty - 1;
  } else {
    return prevAdjustmentBlock.header.difficulty;
  }
}

// 시간 만드는 함수
function getCurrentTimestamp() {
  return math.round(Date().getTime() / 1000);
}

function isValidTimestamp(newBlock, prevBlock) {
  if (newBlock.header.timestamp - prevBlock.header.timestamp > 60) {
    return false;
  }
  if (getCurrentTimestamp() - newBlock.header.timestamp > 60) {
    return false;
  }
  return true;
}

module.exports = {
  Blocks,
  createHash,
  getLastBlock,
  nextBlock,
  getVersion,
  getBlocks,
  addBlock,
  isValidTimestamp,
  hashMatchesDifficulty,
};
