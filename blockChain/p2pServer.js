// const p2p_port = process.env.P2P_PORT || 6001;

const WebSocket = require("ws");
// 옆동네 JS에서 export 해놓은 함수 가져오기
const { getLastBlock, replaceChain } = require("./chainedBlock");
const { addBlock } = require("./checkValidBlock");

// P2P 서버 초기화 함수
function initP2PServer(portNum) {
  // portNum를 인자로 받아 그 포트번호로 웹 소켓 서버를 새로 만드는 server 변수 생성
  const server = new WebSocket.Server({ port: portNum });
  // 해당 서버가 연결되면
  server.on("connection", (ws) => {
    // 연결 초기화 함수 실행
    initConnection(ws);
  });
  console.log("웹 소켓 서버 " + portNum + "포트 초기화햇듬");
}
initP2PServer(6001);
initP2PServer(6002);
initP2PServer(6003);

// 소켓목록 배열 저장할 변수
let sockets = [];

// 연결 초기화 함수
function initConnection(ws) {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryLatestMsg());
}

// 소켓목록 받아오는 함수
function getSockets() {
  return sockets;
}

// 제이슨 형식으로 변환해주는 함수
function write(ws, message) {
  // 받은 인자(메시지)를 제이슨 형식으로 변환해서 보내줌
  ws.send(JSON.stringify(message));
}

// 받은 인자(메시지)를 제이슨으로 변환하는 함수
function broadcast(message) {
  // sockets를 forEach로 돌리기
  sockets.forEach((socket) => {
    write(socket, message);
  });
  // 위 화살표 함수와 같은것
  // sockets.forEach(function (socket) {
  //   write(socket, message);
  // });
}

// Peers(다른이들)에 연결하는 함수
// httpServer.js 에서 웹 소켓 열어달란 요청(ws://localhost:6002 과 같은..)을 받아
function connectToPeers(newPeers) {
  // forEach로 요청받은 주소들 하나씩 열어주기
  newPeers.forEach((peer) => {
    // 요청받은 주소에 새로 연 웹 소켓을 ws 변수에 저장
    const ws = new WebSocket(peer);
    // 해당 웹 소켓이 열리면 연결 초기화 해주기
    ws.on("open", () => {
      console.log(peer + " 이 열렸어요!");
      initConnection(ws);
    });
    // 오류는 에러
    ws.on("error", () => {
      console.log("웹소켓 여는데 무언가 문제가 잇다고 말할 수 있어요");
    });
  });
}

// 다른이와 내 블록을 비교하기 위해 오가는 메시지의 타입을 분류
const MessageType = {
  // 상대의 마지막 블록 내놔라 하고싶으면 0
  QUERY_LATEST: 0,
  // 상대의 블록 전부 내놔라 하고싶으면 1
  QUERY_ALL: 1,
  // 내 블록체인 상대한테 숑숑 하려면 2
  RESPONSE_BLOCKCHAIN: 2,
};

// 메시지 핸들러 초기화 함수
function initMessageHandler(ws) {
  ws.on("message", (data) => {
    // 메시지 제이슨 형식으로 바꿔서 저장
    const message = JSON.parse(data);
    // 메시지 타입 따라 분기
    switch (message.type) {
      // 마지막 블록 내놓으라 그러면
      case MessageType.QUERY_LATEST:
        //
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseAllChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        handleBlockChainResponse(message);
        break;
    }
  });
}

//내가 가지고있는 블록중에 최신블록
function responseLatestMsg() {
  return {
    type: RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([getLastBlock()]),
  };
}
function responseAllChainMsg() {
  return {
    type: RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(getBlocks()),
  };
}
function responseBlockMsg() {
  return {
    type: MessageAction.RESPONSE_BLOCK,
    data: JSON.stringify(bc.getBlocks()),
    // getBlock() 에서 가져오는 건 배열이어서 굳이 []로 감싸지않아도 된다.
  };
}
//블록을 받았을때 한개인지 여러개인지
//여러개라면 내 전체 블록이랑 비교해서 최신블록인지 아닌지?
function RESPONSE_BLOCKCHAIN() {}
///////////////////////////////////////////////////////////////////////
//메세지를 다른 노드에게 요청을 보내는 함수만들기

function handleBlockChainResponse() {
  const receiveBlocks = JSON.parse(message.data);
  const latestReceiveBlock = receiveBlocks[receiveBlocks.length - 1];
  const latesMyBlock = getLastBlock();

  // 데이터로 받은 블록 중 마지막 블록의 인덱스가
  // 내가 보유중인 마지막 블록의 인덱스보다 클 때 / 작을 때 분기
  if (latestReceiveBlock.header.index > latesMyBlock.header.index) {
    // 받은 마지막 블록의 이전 해시값이 내 마지막 블록일 때
    if (createHash(latesMyBlock) === latestReceiveBlock.header.previousHash) {
      if (addBlock(latestReceiveBlock)) {
        broadcast(responseLatestMsg());
      } else {
        console.log("블록이 유효하지 않아여");
      }
    }
    // 받은 블록의 전체 크기가 1일 때
    else if (receiveBlocks.length === 1) {
      broadcast(queryAllMsg());
    } else {
      // 다른이에게 전달받은 블록으로 교체하기
      replaceChain(receiveBlocks);
    }
  } else {
    console.log("아무것도 아님");
  }
}

function queryAllMsg() {
  return {
    type: MessageType.QUERY_ALL,
    data: null,
  };
}

function queryLatestMsg() {
  return {
    type: MessageType.QUERY_LATEST,
    data: null,
  };
}

// 연결 초기화 오류 핸들러
function initErrorHandler(ws) {
  // 연결이 닫혀도
  ws.on("close", () => {
    // 꺼버려
    closeConnection(ws);
    console.log("연결 초기화 오류1");
  });
  // 연결에 오류가 나도
  ws.on("error", () => {
    // 꺼버려
    closeConnection(ws);
    console.log("연결 초기화 오류2");
  });
}

// 연결 꺼버리는 함수
function closeConnection(ws) {
  console.log(`연결 끄기 ${ws.url}`);

  sockets.splice(sockets.indexOf(ws), 1);
}

module.exports = {
  initP2PServer,
  connectToPeers,
  getSockets,
  broadcast,
  responseLatestMsg,
};
