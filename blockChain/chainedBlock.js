const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js");
const random = require("random");
// const { broadcast } = require("./p2pServer.js");

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
  const difficulty = 0; // 난이도 0으로 시작
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
  // console.log(blockString);
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

// 해시 계산 함수 ()
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
// console.log(genesisBlock);

// 다음 블록을 만들 때
function nextBlock(bodyData) {
  //
  const prevBlock = getLastBlock();
  const version = getVersion();
  const index = prevBlock.header.index + 1;
  const previousHash = createHash(prevBlock);
  const timestamp = parseInt(Date.now() / 1000);
  const tree = merkle("sha256").sync(bodyData);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = getDifficulty(getBlocks());
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
// function addBlock(bodyData) {
//   // 들어온 인자(bodyData)로 새 블록을 만들고
//   // const newBlock = nextBlock([bodyData]);
//   // push로 Blocks에 배열 젤 뒤에 넣는다
//   Blocks.push(newBlock);
// }
function addBlock(newBlock) {
  Blocks.push(newBlock);
}

// 체인 교체
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

// 받은 16진수 인자를 2진수로 휘리릭
function hexToBinary(Hexadecimal) {
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
  // 2진수 문자열을 담을 변수
  let binary = "";

  // 16진수를 하나씩 넣어서 (예를 들면 48E2F19같은,)
  for (let i = 0; i < Hexadecimal.length; i++) {
    // 16진수를 2진수로 변환할 값이 일치하는 녀석을 찾아
    if (lookupTable[Hexadecimal[i]]) {
      // binary변수에 차곡차곡
      binary += lookupTable[Hexadecimal[i]];
      // 0~F 외의 인자가 들어오면 null (암것도 안나옴)
    } else {
      return null;
    }
  }
  return binary;
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

// 난이도 가조왕
function getDifficulty(blocks) {
  // 마지막 블록 변수
  const lastBlock = blocks[blocks.length - 1];
  if (
    // (처음 생성된)제네시스 블록이 아니고,
    lastBlock.header.index !== 0 &&
    // 블록이 10번째 때 마다
    lastBlock.header.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0
  ) {
    // 난이도 조정 함수로 난이도를 조정하고
    return getAdjustDifficulty(lastBlock, blocks);
  }
  // (조정된)난이도를 반환
  return lastBlock.header.difficulty;
}

// 난이도 조정
function getAdjustDifficulty(lastBlock, blocks) {
  // 이전에 난이도가 조정된 블록
  const prevAdjustmentBlock =
    // = 현재 마지막 블록의 10번째 전
    blocks[blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  // 경과 시간
  const elapsedTime =
    // = 10번째 전에 블록이 만들어지고부터 마지막 블록이 만들어질 때 까지
    lastBlock.header.timestamp - prevAdjustmentBlock.header.timestamp;
  // 예상 시간
  const expectedTime =
    // = 10개 만드는
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;

  // 예상시간/2 가 실제경과시간보다 크면
  if (expectedTime / 2 > elapsedTime) {
    // 난이도를 1 올림
    return prevAdjustmentBlock.header.difficulty + 1;
    // 예상시간*2 가 실제경과시간보다 작으면
  } else if (expectedTime * 2 < elapsedTime) {
    // 난이도를 1 내림
    return prevAdjustmentBlock.header.difficulty - 1;
  } else {
    return prevAdjustmentBlock.header.difficulty;
  }
}

// 현재시간 만드는 함수
function getCurrentTimestamp() {
  // 날짜(Date)에서 시간(getTime)을 초단위로 만들어(/1000) 반올림한(round) 값을 반환
  return Math.round(new Date().getTime() / 1000);
}

function isValidTimestamp(newBlock, prevBlock) {
  // console.log("이건 이전블록 시간");
  // console.log(prevBlock.header.timestamp);
  // console.log("이건 다음블록 시간");
  // console.log(newBlock.header.timestamp);
  // console.log("이건 빼기한 시간");
  // console.log(newBlock.header.timestamp - prevBlock.header.timestamp);
  // 새로 만들 블록의 시간에서 이전블록이 만들어진 시간이 60초보다 크면
  if (newBlock.header.timestamp - prevBlock.header.timestamp < 5) {
    console.log("이전 블록 만들고부터 쿨타임이 아직 안지났음");
    console.log(
      "쿨타임 :",
      60 - (newBlock.header.timestamp - prevBlock.header.timestamp)
    );
    return false;
  }
  // 새로 만든 블록이 만들어진 시간부터 검증하기까지 시간이 초과되면 무효화
  // 유통기한 지난 식품 같은 느낌
  if (getCurrentTimestamp() - newBlock.header.timestamp > 60) {
    console.log("블록이 만들어진지 좀 됐는데 검증을 너무 늦게 하셨네여");
    return false;
  }
  // console.log(newBlock.header.timestamp);
  // console.log(Math.round(Date().getTime() / 1000));
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
  replaceChain,
};
