// 블록의 생성, 검증, 합의 알고리즘을 포함 / 프로토콜을 담당

const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js");
const random = require("random");
const P2P_SERVER = require("./p2pServer2");

// 블록 클래스 정의
class Block {
  constructor(header, body) {
    this.header = header;
    this.body = body;
  }
}

// 블록의 헤더부분에 들어갈 클래스 정의
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

// 내 블록체인이 담길 곳
// 최초 블록(genesisBlock) 만들어서 첫번째 블록으로 저장
const blockchain = [createGenesisBlock()];

// 최초블록 만드는 함수 (최초블록은 컴퓨터가 찾는게 아니라 사람이 임의로 정의함)
function createGenesisBlock() {
  const index = 0; // 인덱스
  const version = getVersion(); // 버전
  const previousHash = "0".repeat(64); // 이전 해시
  // 비트코인의 최초블록이 만들어진 시간
  // 이후엔 만들어진 시간을 1초단위로 표시할거임 parseInt(Date.now() / 1000);
  const timestamp = 1231006505; // 2009/01/03 6:15pm (UTC)
  const body = [
    // 블록 이름
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
  ];
  const tree = merkle("sha256").sync(body);
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = 0; // 난이도. 새로 만들 블록의 해시값에 제한을 주는 녀석
  const nonce = 0; // 삽질 수. 해시찾으면서 삽질할 때마다 늘려나갈것

  // 생성자로 헤더 구성하여
  const header = new BlockHeader(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  ); // 블록으로 만들어 반환
  return new Block(header, body);
}

// 다음 블록을 만들 때
function nextBlock(bodyData) {
  const prevBlock = getLastBlock(); // 이전블록은 가장 마지막 블록
  const version = getVersion(); // 버전
  const index = prevBlock.header.index + 1; // 이전블록의 인덱스에 +1
  const previousHash = createHash(prevBlock); //
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
//   // push로 blockchain에 배열 젤 뒤에 넣는다
//   blockchain.push(newBlock);
// }
// function addBlock(newBlock) {
//   blockchain.push(newBlock);
// }

// 블록 구조가 맞는지 검증해주는 함수
function isValidBlockStructure(block) {
  return (
    typeof block.header.version === "string" &&
    typeof block.header.index === "number" &&
    typeof block.header.previousHash === "string" &&
    typeof block.header.timestamp === "number" &&
    typeof block.header.merkleRoot === "string" &&
    typeof block.header.difficulty === "number" &&
    typeof block.header.nonce === "number" &&
    typeof block.body === "object"
  );
}

// 새 블록 검증하기
function isValidNewBlock(newBlock, previousBlock) {
  console.log(newBlock.body);

  // 블록 구조가 맞는지
  if (isValidBlockStructure(newBlock) === false) {
    console.log(newBlock.body, "블록이 구조체의 조건에 맞지 않습니다");
    return false;
    // 해당 블록의 인덱스가 이전 블록의 인덱스보다 1만큼 큰지
  } else if (newBlock.header.index !== previousBlock.header.index + 1) {
    console.log(newBlock.body, "블록 인덱스랑 이전블록 인덱스+1이 다릅니다");
    return false;
    // 이전 블록의 해시값과 현재 블록의 이전 해시가 같은지
  } else if (createHash(previousBlock) !== newBlock.header.previousHash) {
    console.log(
      newBlock.body,
      "블록의 이전해시값이랑 이전 블록의 해시값이 다름"
    );
    return false;
    // 데이터 필드로부터 계산한 머클루트와 블록 헤더의 머클루트가 동일한지
  } else if (
    (newBlock.body.length === 0 &&
      "0".repeat(64) !== newBlock.header.merkleRoot) ||
    (newBlock.body.length !== 0 &&
      merkle("sha256").sync(newBlock.body).root() !==
        newBlock.header.merkleRoot)
  ) {
    console.log(newBlock.body, "블록의 머클루트가 잘못됨");
    return false;
  } else if (!isValidTimestamp(newBlock, previousBlock)) {
    console.log(newBlock.body, "블록의 타임스탬프가 잘못됐음");
    return false;
  } else if (
    // 새 블록의 해시값의 앞부분은 난이도만큼 0으로 채워져있어야 한다.
    // 새로 만든 블록으로 난이도가 정상인지 검증
    !hashMatchesDifficulty(createHash(newBlock), newBlock.header.difficulty)
  ) {
    console.log(newBlock, "블록의 난이도와 해시머리값이 안맞음");
    return false;
  }
  console.log(newBlock, "블록 검증완료");
  return true;
}

// 블록 추가하기
function addBlock(newBlock) {
  if (isValidNewBlock(newBlock, getLastBlock())) {
    blockchain.push(newBlock);
    return true;
  }
  return false;
}

// 체인 검증하기
function isValidChain(newBlocks) {
  if (JSON.stringify(newBlocks[0]) !== JSON.stringify(blockchain[0])) {
    return false;
  }

  var tempBlocks = [newBlocks[0]];
  for (let i = 1; i < newBlocks.length; i++) {
    if (isValidNewBlock(newBlocks[i], tempBlocks[i - 1])) {
      tempBlocks.push(newBlocks[i]);
    } else {
      return false;
    }
  }
  return true;
}

// 내 블록체인 다른이에게 전달받은 블록체인으로 교체해주는 함수
function replaceChain(newBlocks) {
  // 다른이에게 받은 블록체인이 검증 됐으면
  if (isValidChain(newBlocks)) {
    if (
      // 그 블록체인이 내 블록체인보다 길면 ||(또는)
      newBlocks.length > blockchain.length ||
      // 양 블록체인이 길이가 같을때 && 그냥 복불복 random.boolean()
      (newBlocks.length === blockchain.length && random.boolean())
    ) {
      // 내 블록체인을 전달받은 블록체인으로 교체하고
      blockchain = newBlocks;
      // 이 새로운 블록체인의 마지막 블록을 널리 알리기
      P2P_SERVER.broadcast(P2P_SERVER.responseLatestMsg());
    }
  } else {
    // 애초에 이 함수에 들어오는 조건이 내 블록체인보다 전달받은 블록체인이 길어야하는데
    // (handleBlockChainResponse에서 인덱스 크기로 비교했었음)
    // 전달받은 블록체인이 내것보다 인덱스는 큰데 길이가 짧으면 뭔가 잘못된 블록체인인것.
    console.log("받은 원장에 문제가 잇음");
  }
}

// 난이도에 따라 찾을 해시값 바꿔주는 함수
function hashMatchesDifficulty(hash, difficulty) {
  // 16진수로 된 해시를 2진수로 바꿔서 hashBinary에 담기
  // (10~15에 해당하는 a~f는 toUpperCase로 대문자로 변경)
  const hashBinary = hexToBinary(hash.toUpperCase());
  // 난이도만큼 해시의 앞글자에 0을 붙이기 위한 변수
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

const BLOCK_GENERATION_INTERVAL = 10; // second 예상 블록 생성 간격(10초마다)
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10; // block 난이도 조정 간격(블록 10개마다)
// 난이도 가조왕
function getDifficulty(blocks) {
  // 마지막 블록 변수에 담기
  const lastBlock = blocks[blocks.length - 1];
  if (
    // (처음 생성된)마지막 블록이 제네시스 블록이 아니고,
    lastBlock.header.index !== 0 &&
    // 마지막블록 인덱스가 10으로 나눠떨어지면 (블록이 10번째 때 마다)
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

// 네트워크 시간의 오차 허용 범위
function isValidTimestamp(newBlock, prevBlock) {
  // 나보다 느린시간 60초까지 온것만 허용
  if (prevBlock.header.timestamp - newBlock.header.timestamp > 60) return false;
  // 나보다 빠른시간 60초까지 허용
  if (newBlock.header.timestamp - getCurrentTimestamp() > 60) return false;
  return true;
}

// 타임스탬프 검증 잘못 이해한것 ...
// function isValidTimestamp(newBlock, prevBlock) {
//   //
//   if ((newBlock.header.timestamp - prevBlock.header.timestamp) > 60) {
//     console.log("");
//     console.log(
//       "쿨타임 :",
//       60 - (newBlock.header.timestamp - prevBlock.header.timestamp)
//     );
//     return false;
//   }
//   // 새로 만든 블록이 만들어진 시간부터 검증하기까지 시간이 초과되면 무효화
//   // (예시 - 케익을 만들었는데 케익이 상하기 전에 품질검사 받고 냉동고에 넣어야한다)
//   if (getCurrentTimestamp() - newBlock.header.timestamp > 60) {
//     console.log("블록이 만들어진지 좀 됐는데 검증을 너무 늦게 하셨네여");
//     return false;
//   }
//   return true;
// }

module.exports = {
  blockchain,
  createHash,
  getLastBlock,
  nextBlock,
  getVersion,
  getBlocks,
  addBlock,
  isValidTimestamp,
  isValidBlockStructure,
  hashMatchesDifficulty,
  replaceChain,
};

// 기존 chainedBlock.js
