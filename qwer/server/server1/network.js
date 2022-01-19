const p2p_port = process.env.P2P_PORT || 6001; //포트설정
const WebSocket = require("ws"); //websocket패키지 불러옴
const {
  checkAddBlock,
  replaceChain,
  getLastBlock,
  getBlocks,
  createHash,
} = require("./chainedBlock");

function initP2PServer() {
  //처음접속함수
  const server = new WebSocket.Server({ port: p2p_port }); //서버열어주고
  server.on("connection", (ws) => {
    initConnection(ws);
  }); //나한테 접속한 클라이언트 통신할수있게 sockets에 넣어줌
  console.log("Listening webSocket port :" + p2p_port);
}

initP2PServer();
// initP2PServer(6001) //서버실행
// initP2PServer(6002) //서버실행
// initP2PServer(6003) //서버실행

let sockets = []; //소켓에 연결된 사용자(peer)들을 모아놓은 list
function getSockets() {
  return sockets;
}
function initConnection(ws) {
  //socket에 배열 넣어주는 함수
  sockets.push(ws); //배열에넣어주고
  initErrorHandler(ws); //에러처리함수
  initMessageHandler(ws); //메세지 type맞춰서 작업

  // ws.send(JSON.stringify({ type: MessageType.QUERY_LATEST, data: null }))
  write(ws, queryLatesmsg()); //.위에꺼 간편하게 쓰기위해서 write함수 사용
}

function write(ws, message) {
  //message객체를 글자로 바꿔서 보내준다.
  ws.send(JSON.stringify(message));
}

function broadcast(message) {
  //내가 연결된 모든 소켓한테 메세지를 보내는 함수이다.
  sockets.forEach((socket) => {
    write(socket, message);
  });
}

// function connectToPeers(newPeers) {             //newPeers는 httpServer에서 배열로받음
//     // new WebSocket.Server()서버를 여는거고 new WebSocket()열려있는서버를 사용하는거
//     const ws = new WebSocket(newPeers)
//     ws.on("open", () => { initConnection(ws); })    //열려있는서버에client sockets추가
//     ws.on("error", (errorType) => { console.log("connectiion Faled!" + errorType);  })    //에러함수
// }

//Message Handler
const MessageType = {
  QUERY_LATEST: 0, //블럭마지막 내용  :  0 or "0" string도 상관X
  QUERY_ALL: 1, //모든 블록의 노드
  RESPONSE_BLOCKCHAIN: 2, //실질적으로 추가할지 말지 결정하는 msg
};

function initMessageHandler(ws) {
  //type에따라 처리 하는함수
  ws.on("message", (data) => {
    //ws 는 바꿔주는 기능이 없어서 JSON.parse(data)로
    const message = JSON.parse(data); //string => 객체, json으로 변환해 주어야한다 !
    switch (message.type) {
      case MessageType.QUERY_LATEST: //보낸쪽에서 내용없으면
        write(ws, responseLatestMsg()); //블럭마지막 내용보내  이게 첫 통신에서 이루어짐
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseAllChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN: //블럭마지막 내용 받으면 비교
        handleBolckChainResponse(message);
        break;
    }
  });
}

function responseLatestMsg() {
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([getLastBlock()]), //마지막블럭을 stirng형태로 변환해서 배열형태로 보냄
  };
}
function responseAllChainMsg() {
  return {
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(getBlocks()), //블럭모음 불러옴
  };
}

function handleBolckChainResponse(message) {
  const receiveBlocks = JSON.parse(message.data); //남의 블럭받고 목록
  const latestReceiveBlock = receiveBlocks[receiveBlocks.length - 1]; //남의블럭 마지막꺼 불러옴
  const latesMyBlock = getLastBlock(); //내꺼블럭 마지막블럭

  if (latestReceiveBlock.header.index > latesMyBlock.header.index) {
    //가져온게 내꺼보다많을때 여기실행
    console.log(
      "!!.start.!! 블록의 총 갯수 \n" +
        `넘겨받은 블록의 index 값 ${latestReceiveBlock.header.index}\n` +
        `내가 가지고있는 블럭의 index 값 ${latesMyBlock.header.index}\n`
    );

    //내꺼블럭 마지막 해시값이랑 === 남의브럭 이전 블럭에해시값이 같을때
    if (createHash(latesMyBlock) === latestReceiveBlock.header.previousHash) {
      console.log(
        `1.내꺼마지막해시값==남의꺼 이전해시값이 같을때 //남이 먼저생성완료한상황`
      );

      if (checkAddBlock(latestReceiveBlock)) {
        //남이만든 블럭을 내 블럭창고에 넣고 완료하면 ture
        broadcast(responseLatestMsg()); //내꺼 최신화블록 ws뿌려주세요
        console.log("남이 생성블록 내 목록에 추가 !!.end.!!\n");
      } else {
        console.log("invalid Block!//error"); //에러
      }
    } else if (receiveBlocks.length === 1) {
      //받은 블럭의 전체 크기가 1일 때
      console.log(`2.피어로부터 블록을 연결해야합니다!!.end!!\n`);
      broadcast(queryAllmsg()); //위에꺼는 다르니깐 전체목록 비교해봐야되겠다.
    } else {
      console.log(`3.블럭을 최신화를 진행합니다.`);
      replaceChain(receiveBlocks); //전체를 삭다 바꿔주는 함수
    }
  } else {
    console.log("블럭이 이미 최신화입니다. end"); //내꺼블럭이 더길어요~할게없어요
  }
}

function queryAllmsg() {
  return {
    type: MessageType.QUERY_ALL,
    data: null,
  };
}
function queryLatesmsg() {
  return {
    type: MessageType.QUERY_LATEST,
    data: null,
  };
}

////에러처리
function initErrorHandler(ws) {
  //오류거나 클로즈 일때 닫아주는 함수
  ws.on("close", () => {
    closeConnection(ws);
  }); //닫아주는 함수 호출
  ws.on("error", () => {
    closeConnection(ws);
  });
}
function closeConnection(ws) {
  //닫아주는 함수
  console.log(`connection close ${ws.url}`);
  sockets.splice(sockets.indexOf(ws), 1); //소켓을 배열을 초기화해주면서 끝냄
}

module.exports = {
  initConnection,
  write,
  getSockets,
  broadcast,
  responseLatestMsg,
  sockets,
  queryLatesmsg,
}; //소켓 목록일아 소켓데이터 함수 export
