// 블록 구조가 유효한지
// 현재 블록의 인덱스가 이전 블록의 인덱스보다 1만큼 큰지
// 이전 블록의 해시값과 현재 블록의 이전 해시가 같은지
// 데이터 필드로부터 계산한 머클루트와 블록 헤더의 머클루트가 동일한지
const merkle = require("merkle");
const {
  Blocks,
  getLastBlock,
  createHash,
  nextBlock,
} = require("./chainedBlockasdf");

function isValidBlockStructure(block) {
  return (
    typeof block.header.version === "string" &&
    typeof block.header.index === "number" &&
    typeof block.header.previousHash === "string" &&
    typeof block.header.timestamp === "number" &&
    typeof block.header.merkleRoot === "string" &&
    typeof block.body === "object"
  );
}

// 새 블록 검증하기
function isValidNewBlock(newBlock, previousBlock) {
  if (isValidBlockStructure(newBlock) === false) {
    console.log("새 블록이 구조체의 조건에 맞지 않습니다");
    return false;
  } else if (newBlock.header.index !== previousBlock.header.index + 1) {
    console.log("새 블록 인덱스랑 이전블록 인덱스+1이 다릅니다");
    return false;
  } else if (createHash(previousBlock) !== newBlock.header.previousHash) {
    console.log("새 블록의 이전해시값이랑 이전 블록의 해시값이 다름");
    return false;
  } else if (
    (newBlock.body.length === 0 &&
      "0".repeat(64) !== newBlock.header.merkleRoot) ||
    (newBlock.body.length !== 0 &&
      merkle("sha256").sync(newBlock.body).root() !==
        newBlock.header.merkleRoot)
  ) {
    console.log("머클루트 잘못됨");
    return false;
  }
  return true;
}

// 블록 추가하기
function addBlock(newBlock) {
  if (isValidNewBlock(newBlock, getLastBlock())) {
    Blocks.push(newBlock);
    return true;
  }
  return false;
}

// const block = nextBlock(["kimchi"]);
// addBlock(block);
// addBlock(block);
// addBlock(["melchi1"]);

module.exports = {
  Blocks,
  createHash,
  getLastBlock,
  nextBlock,

  addBlock,
};
