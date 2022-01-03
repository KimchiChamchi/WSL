const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js");

class Block {
  constructor(header, body) {
    this.header = header;
    this.body = body;
  }
}

class BlockHeader {
  constructor(version, index, previousHash, timestamp, merkleRoot, bit, nonce) {
    this.version = version;
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.merkleRoot = merkleRoot;
    this.bit = bit;
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
  const timestamp = parseInt(Date.now() / 1000);
  const body = ["kimchi block"];
  const tree = merkle("sha256").sync(body);
  const merkleRoot = tree.root() || "0".repeat(64);
  const bit = 0;
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
    bit,
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
  const { version, index, previousHash, timestamp, merkleRoot, bit, nonce } =
    data.header;
  const blockString =
    version + index + previousHash + timestamp + merkleRoot + bit + nonce;
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
  const bit = 0;
  const nonce = 0;

  const header = new BlockHeader(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    bit,
    nonce
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

module.exports = {
  Blocks,
  createHash,
  getLastBlock,
  nextBlock,
  getVersion,
  getBlocks,
  addBlock,
};
