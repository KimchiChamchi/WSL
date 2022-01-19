const fs = require("fs");
const merkle = require("merkle");
const cryptojs = require("crypto-js"); //암호화
const { BlcokChainDB } = require("./models");
const random = require("random");

class Block {
  //블럭형태 만들어주자 (header,body)
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
    this.version = version; //버젼
    this.index = index; //몇번째인지
    this.previousHash = previousHash; //이전블록해시
    this.timestamp = timestamp; //블럭만들어진시간
    this.merkleRoot = merkleRoot; //머클해시
    this.difficulty = difficulty; //채굴난이도 아직안쓸꺼임
    this.nonce = nonce; //넌스 아직안쓸꺼임
  }
}
function getVersion() {
  const package = fs.readFileSync("package.json"); //package.json 버전 불로오기
  return JSON.parse(package).version; //버전 값 리턴
}

function creatGenesisBlock() {
  //최초 블럭체인생성
  const version = getVersion(); //npm init했던 버젼 블러오기
  const index = 0; //맨처음이니깐 0
  const previousHash = "0".repeat(64); //sha256 암호가 64자리니깐 0을 64자리로 바꿔줌
  const timestamp = 1231006505; // 2009/01/03 6:15pm(UTC)
  const body = [
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
  ];
  const tree = merkle("sha256").sync(body); //바디값 불러오서 sha256으로 암호화
  const merkleRoot = tree.root() || "0".repeat(64); //루트값이 없다면 ||'0'.repeat(64)출력
  const difficulty = 0; //header 값이지만 아직안쓸꺼여서 0
  const nonce = 0; //header 값이지만 아직안쓸꺼여서 0
  const header = new BlockHeader(
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce
  ); //해더목록에담아서
  return new Block(header, body); // 블럭에 헤더랑 바디 볼수있게 리턴
}
let Blocks = [creatGenesisBlock()]; //블럭 차곡차곡쌓을꺼니깐 Blocks

function getBlocks() {
  //블럭 목록 불러오는 함수
  return Blocks;
}

function getLastBlock() {
  //제일마지막에 만든불럭 불러오기 0,1,2이렇게 배열시작하니깐 마지막 렌스 -1
  return Blocks[Blocks.length - 1];
}

function createHash(data) {
  const {
    version,
    index,
    previousHash,
    timestamp,
    merkleRoot,
    difficulty,
    nonce,
  } = data.header; //인자로받은거중에 헤더를 뽑아내서
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce; //다합쳐서 해시로만들자 그리고 리턴해주셈
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
  //calculateHash: 헤더의 값에 nonce값을 추가해서 모두 더한 string값을 가지고 SHA256 암호화를 한 결과를 내보낸다.
  const blockString =
    version +
    index +
    previousHash +
    timestamp +
    merkleRoot +
    difficulty +
    nonce; //다합쳐서 해시로만들자 그리고 리턴해주셈
  const hash = cryptojs.SHA256(blockString).toString();
  return hash;
}

function nextBlock(bodyData) {
  //다음블럭생성
  const prevBlock = getLastBlock(); //마지막 블럭블러오기

  const version = getVersion(); //버전가져오기
  const index = prevBlock.header.index + 1; //이전블록 +1
  const previousHash = createHash(prevBlock); //이전블록에 해시값
  const timestamp = parseInt(Date.now() / 1000); //시간은 똑같이하고
  const tree = merkle("sha256").sync(bodyData); //body값 암호화
  const merkleRoot = tree.root() || "0".repeat(64);
  const difficulty = getDifficulty(getBlocks()); //난이도 조절 getDifficulty() 추가
  // const nonce = 0

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

function addBlock(bodyData) {
  const newBlock = nextBlock(bodyData); //nextBlock이 블럭형태로 만들어주면
  Blocks.push(newBlock); // push해서 추가하셈
}

function hexToBinary(s) {
  //헤더부분을 SHA256 암호화한 결과(16진수 64자리)를 2진수로 변환하기
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

function hashMatchesDifficulty(hash, difficulty) {
  //difficulty를 이용해 만든 조건을 만족하는지 hash값과 대조해보고 조건에 해당되면 블록을 생성한다.
  const hashBinary = hexToBinary(hash.toUpperCase());
  const requirePrefix = "0".repeat(difficulty); //difficulty 난이도가 높아짐에 따라 0개수가 늘어남
  //높으면 높을수록 조건을 맞추기가 까다로워짐(nonce값과 time값이 바뀌면서 암호화값이 달라진다.)
  return hashBinary.startsWith(requirePrefix);
}

function findBlock(
  currentVersion,
  nextIndex,
  previousHash,
  nextTimestamp,
  merkleRoot,
  difficulty
) {
  //while을 통해서 calculateHash의 값이 조건에 맞을 때까지 무한히 반복한다.
  // 조건문이 반복할 때마다 nonce값이 증가한다.
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
      //우리가 만들 header의 hash값의 앞자리 0이 몇개인가....
      //이곳에서 calculateHash 함수 호출할 것임
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

//예상 채굴 시간과 난이도 조절 단위수를 변수로 설정한다
const BLOCK_GENERATION_INTERVAL = 10; //second
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10; //in blocks

function getDifficulty(blocks) {
  //난이도 조절 단위 수 만큼 나누고 나머지가 0이라면 난이도 조정하는 getAdjustedDifficulty 함수를 실행시킨다.
  const lastBlock = blocks[blocks.length - 1];
  if (
    lastBlock.header.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    lastBlock.header.index != 0
  ) {
    //위에 상수10으로설정해서 10번째에 true가된다
    //자미막 블럭 인덱스 % 10=== 0 && 마지막블럭인덱스 0이 아닌거나
    //난이도 조정 코드
    return getAdjustedDifficulty(lastBlock, blocks);
  }
  return lastBlock.header.difficulty; // 난이도 리턴
}

function getAdjustedDifficulty(lastBlock, blocks) {
  // 지금 블록에서 난이도 조절 단위 수만큼의 전 블록과의 time 즉, 생성시간을 비교해서 자신의 예상 시간보다 느리거나 빠르면 난이도를 조절한다.
  //적당하면 난이도가 유지되고 블럭의 생성시간이 느리면 난이도를 낮추고, 빠르면 난이도를 높인다.
  const preAdjustmentBlock =
    blocks[blocks.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  //시간 관련
  const timeToken =
    lastBlock.header.timestamp - preAdjustmentBlock.header.timestamp; //마지막블럭 시간 - 10번째 만든 블럭시간
  const timeExpected =
    DIFFICULTY_ADJUSTMENT_INTERVAL * BLOCK_GENERATION_INTERVAL; //100

  if (timeExpected / 2 > timeToken) {
    //난이도를 올려
    return preAdjustmentBlock.header.difficulty + 1;
  } else if (timeExpected * 2 < timeToken) {
    //난이도내려
    if (preAdjustmentBlock.header.difficulty > 0) {
      //0이하로 내려가면 오류걸리니깐 걸러주자
      return preAdjustmentBlock.header.difficulty - 1;
    }
    return preAdjustmentBlock.header.difficulty; //0보다 작아지면안되니깐 그냥 리턴
  } else {
    return preAdjustmentBlock.header.difficulty;
  }
}

function getCurrentTimestamp() {
  //검증자의 시간
  return Math.round(new Date().getTime() / 1000); //Math.round 반올림함수써서 정확하게 만들어줌
}

function isValidTimestamp(newBlock, prevBlock) {
  //시간이 너무빠르거나 너무느리게만들어자면 체인에 추가안함
  if (newBlock.header.timestamp < prevBlock.header.timestamp - 60)
    //60초전에 블럭이 생성되면 false
    return true;
  if (getCurrentTimestamp() > newBlock.header.timestamp - 60)
    //지금시간이랑 새로생성된 블럭시간이 1분넘어가면 false
    return true;

  return false;
}

async function replaceChain(newBlocks) {
  //블럭을바꿔줄꺼임
  if (isValidChain(newBlocks)) {
    if (
      newBlocks.length > Blocks.length ||
      (newBlocks.length === Blocks.length && random.boolean())
    ) {
      //받아온 블럭의 길이가 길거나  길이가같을때 램덤값으로 투르가나오면 바꿀꺼임
      console.log(`Blocks 배열을 newBlocks 으로 교체합니다.!!.end.!!`);
      Blocks = newBlocks; //같은파일안에서 치환해야 치환되s는듯
      const nw = require("./p2pServer");
      nw.broadcast(nw.responseLatestMsg());
      //db리셋
      BlcokChainDB.destroy({ where: {}, truncate: true }); //db다지워줌

      for (let i = 0; i < newBlocks.length; i++) {
        await BlcokChainDB.create({ BlockChain: newBlocks[i] });
      }
    }
  } else {
    console.log("받은 원장에 문제가 있음");
  }
}

function isValidChain(newBlocks) {
  console.log(JSON.stringify(newBlocks[0]));
  console.log(JSON.stringify(Blocks[0]));
  // if (JSON.stringify(newBlocks[0]) !== JSON.stringify(Blocks[0])) {   //db에서 불러오면 순서가 바뀌어서 비교가 안되는거같음
  if (
    JSON.stringify(
      newBlocks[0].body &&
        newBlocks[0].header.version &&
        newBlocks[0].header.index &&
        newBlocks[0].header.timestamp &&
        newBlocks[0].header.merkleRoot &&
        newBlocks[0].header.previousHash
    ) !==
    JSON.stringify(
      Blocks[0].body &&
        Blocks[0].header.version &&
        Blocks[0].header.index &&
        Blocks[0].header.timestamp &&
        Blocks[0].header.merkleRoot &&
        Blocks[0].header.previousHash
    )
  ) {
    return false;
  }

  var tempBlocks = [newBlocks[0]];
  const { isValidNewBlock } = require("./blockCheck");

  for (var i = 1; i < newBlocks.length; i++) {
    if (isValidNewBlock(newBlocks[i], tempBlocks[i - 1])) {
      tempBlocks.push(newBlocks[i]);
    } else {
      return false;
    }
  }
  return true;
}

function checkAddBlock(newBlock) {
  //아래에서 방금생성 블럭을 인자로받고
  const { isValidNewBlock } = require("./blockCheck");
  if (isValidNewBlock(newBlock, getLastBlock())) {
    //비교함수에 새로운 블럭이랑 ,라스트 블럭 같이넣어줘서 비교하고
    Blocks.push(newBlock); //배열에 넣어주자
    BlcokChainDB.create({
      //db에도 추가
      BlockChain: newBlock,
    });
    // const ws = require('./p2pServer')
    // ws.write(ws, ws.responseLatestMsg())
    return true;
  }
  return false;
}

///////////////db연결시 체크 함수
function dbBlockCheck(DBBC) {
  let bc = [];
  DBBC.forEach((blocks) => {
    // DB에 있는 제이슨 형식의 블록들을 객체형식으로 가져와서 bc배열에 푸시푸시
    bc.push(JSON.parse(blocks.BlockChain));
  });

  if (bc.length === 0) {
    //0이면 제네시스없는거니깐 넣어주셈
    BlcokChainDB.create({ BlockChain: creatGenesisBlock() });
    bc.push(creatGenesisBlock());
  }
  const DBBlock = bc[bc.length - 1];
  const latesMyBlock = getLastBlock();

  if (DBBlock.header.index < latesMyBlock.header.index) {
    //가져온게 내꺼보다많을때 여기실행
    console.log(
      "db시작전  \n" +
        `DB 블록의 index 값 ${DBBlock.header.index}\n` +
        `내가 가지고있는 블럭의 index 값 ${latesMyBlock.header.index}\n`
    );

    //내꺼블럭 마지막 해시값이랑 === 남의브럭 이전 블럭에해시값이 같을때
    if (createHash(DBBlock) === latesMyBlock.header.previousHash) {
      console.log(`1.db에 다음블럭넣어요`);
      BlcokChainDB.create({
        BlockChain: latesMyBlock,
      }).catch((err) => {
        console.log(err);
        throw err;
      });
    } else {
      console.log(`2.DB을 최신화를 진행합니다.`);
      replaceChain(getBlocks()); //전체를 삭다 바꿔주는 함수
    }
  } else {
    console.log("DB 블럭이 이미 최신화입니다. end");
    Blocks = bc;
  }
}

// addBlock(['2번 인데 달라'])
// addBlock(['2번 인데 달라'])
// addBlock(['2번 인데 달라'])
// addBlock(['2번 인데 달라'])
// addBlock(['2번 인데 달라'])

module.exports = {
  Block,
  checkAddBlock,
  dbBlockCheck,
  replaceChain,
  hashMatchesDifficulty,
  isValidTimestamp,
  getBlocks,
  createHash,
  Blocks,
  getLastBlock,
  nextBlock,
  addBlock,
  getVersion,
  creatGenesisBlock,
}; //내보내주는거
