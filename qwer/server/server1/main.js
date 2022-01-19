const http_port = process.env.HTTP_PORT || 3001; //환경변수에 env포트가 없으면 3001번으로 포트열어주셈
const express = require("express"); //export열어줄때 사용 패키지
const bodyParser = require("body-parser"); //통신할때 JSON형태로 보낼때 편하게 쓰는 패키지
const cors = require("cors");

const {
  getBlocks,
  getVersion,
  checkAddBlock,
  nextBlock,
  dbBlockCheck,
} = require("./chainedBlock"); //전에만든  블럭생성.js
const { getSockets, initConnection } = require("./p2pServer");
const { getPublicKeyFromWallet, initWallet } = require("./encryption");

const { sequelize } = require("./models");
const { BlcokChainDB } = require("./models");

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("db연결되었습니다 퉷");
    BlcokChainDB.findAll().then((bc) => {
      dbBlockCheck(bc);
    }); //db연결할때 check 함수
  })
  .catch((err) => {
    console.error(err);
  });

function initHttpServer() {
  //총관리 함수

  const app = express(); //app express열고
  app.use(cors());
  app.use(express.json()); //express에 bodyparser추가됨
  // body-parser가 해주던 기능을 express.json()으로 미들웨어를 추가합니다.
  // express에 body-parser가 내장되어 있습니다. req.body.xxx 형태로 쉽게 사용할 수 있습니다.

  //////p2p목록
  //curl -H "Content-type:application/json" --data "{\"data\" : [ \"ws://localhost:6002\", \"ws://localhost:6003\" ]}"
  app.post("/addPeers", (req, res) => {
    const WebSocket = require("ws");
    const peers = req.body.peers || [];

    const ws = new WebSocket(peers);
    ws.on("open", () => {
      initConnection(ws), res.send("peer연결에 성공했습니다.");
    }); //열려있는서버에client sockets추가
    ws.on("error", () => {
      res.send("peer연결에 실패했습니다.");
    }); //에러함수

    // connectToPeers(peers)        //데이터를받으면 p2p해주는역활
  });

  app.get("/peers", (req, res) => {
    //sokets목록불러오는거
    let socketinfo = [];
    getSockets().forEach((S) => {
      socketinfo.push(S._socket.remoteAddress + " : " + S._socket.remotePort);
    });
    console.log(socketinfo.length);
    res.send(socketinfo);
  });
  //p2p 연결끝

  app.get("/", async (req, res) => {
    //잘나오는지 테스트하는거

    await BlcokChainDB.findAll()
      .then((bc) => {
        res.send(bc);
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });
  app.get("/1", async (req, res) => {
    //잘나오는지 테스트하는거
    BlcokChainDB.destroy({ where: {}, truncate: true });
    await BlcokChainDB.findAll()
      .then((bc) => {
        res.send(bc);
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });

  app.get("/blocks", (req, res) => {
    //블럭목록 불러오기

    res.send(getBlocks());
  });

  app.get("/version", (req, res) => {
    //버전확인 함수 요청
    res.send(getVersion());
  });

  app.post("/mineBlock", (req, res) => {
    //블럭마이닝
    const data = req.body.data || ["아무것도없어요"]; //아무것도없으면
    const block = nextBlock(data);
    const { sockets, broadcast, responseLatestMsg } = require("./p2pServer");

    if (checkAddBlock(block)) {
      //블록생성(유효성검사도) 참이면 db로넣어줌
      res.send("블록생성에 성공했습니다.");
    } else {
      res.send("블록등록에 실패했습니다");
    }

    if (sockets.length > 0) {
      //연결된소켓이있으면 브로드케스트로 정보넘겨
      console.log("새로생성한블럭 ws한테도 뿌링클1");
      broadcast(responseLatestMsg());
    }
  });

  app.post("/stop", (req, res) => {
    //post나 get이나 다를게없는데
    // const data = req.body.data          //data받아서
    // if (data == "stop") {              //data 값이 stop일때
    //     res.send("서버를 중지합니다")
    //     process.exit()                  //서버 종료시켜
    // }
    // res.send({ "msg": "정지안합니다. 제대로된 data값주세요" }) //아니면 계속돌려
    res.send("서버가 종료되었습니다.");
    process.exit(); //서버 종료시켜
  });

  app.get("/address", (req, res) => {
    initWallet(); //혹시 지갑없으면 생성해야되니깐
    const address = getPublicKeyFromWallet().toString(); //읽을수있게 문자화해주고
    if (address != "") {
      //빈칸아니면 어드레스로 넘겨주고
      res.send({ address: address });
    } else {
      res.send("empty address!!");
    }
  });

  app.listen(http_port, () => {
    //서버열어
    console.log("Listening Http Port:" + http_port);
  });
}

initHttpServer();
