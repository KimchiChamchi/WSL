// 도구적인 기능을 하는 함수를 포함

// package.json에 들어있는 버전 가져오는 함수
function getVersion() {
  const package = fs.readFileSync("package.json");
  return JSON.parse(package).version;
}

// 내 블록체인 불러오는 함수
function getBlocks() {
  return blockchain;
}

// 내 블록체인의 마지막(최신) 블록 불러오는 함수
function getLastBlock() {
  return blockchain[blockchain.length - 1];
}

// 해시 만들어주는 함수
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
  // 클래스에 들어있는 것들을 다 더해서 SHA256를 통해 암호화하여 나온
  // 16진수 64자리 임의의 문자열의 값을 hash에 담아 반환한다
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

// 다음 블록 채굴을 위해 해시 계산하는 함수
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

// 현재시간 만드는 함수
function getCurrentTimestamp() {
  // 날짜(Date)에서 시간(getTime)을 초단위로 만들어(/1000) 반올림한(round) 값을 반환
  return Math.round(new Date().getTime() / 1000);
}

// 내가 가지고 있는 블록 중 마지막 블록 메시지에 담기
function responseLatestMsg() {
  const { getLastBlock } = require("./chainedBlock2");
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([getLastBlock()]),
  };
}

// 내가 가진 블록체인 담아서 반환
function responseAllChainMsg() {
  const { getBlocks } = require("./chainedBlock2");
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(getBlocks()),
  };
}

// function getCurrentVersion() {}

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

  // 16진수를 하나씩 넣어서 (예를 들면 "48E2F19"같은 )
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

module.exports = {
  getVersion,
  getBlocks,
  getLastBlock,
  createHash,
  calculateHash,
  getCurrentTimestamp,
  responseLatestMsg,
  responseAllChainMsg,
  hexToBinary,
};
