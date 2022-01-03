const express = require("express");
const bodyParser = require("body-parser");
const { getBlocks, nextBlock, getVersion } = require("./chainedBlockasdf");
const { addBlock, Blocks } = require("./checkValidBlock");
const { connectToPeers, getSockets } = require("./p2pServer");

const http_port = process.env.HTTP_PORT || 3001;

function initHttpServer() {
  const app = express();
  app.use(bodyParser.json());

  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"ws://localhost:6002\"]}"
  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"ws://localhost:6003\"]}"
  app.post("/addPeers", (req, res) => {
    const data = req.body.data;
    connectToPeers(data);
  });

  app.get("/peers", (req, res) => {
    let sockInfo = [];
    console.log(getSockets());
    getSockets().forEach((s) => {
      sockInfo.push(s._socket.remoteAddress + ":" + s._socket.remotePort);
    });
    res.send(sockInfo);
  });

  app.get("/blocks", (req, res) => {
    res.send(getBlocks());
  });

  app.post("/mineBlock", (req, res) => {
    const data = req.body.data || [];
    console.log(data);
    const block = nextBlock(data);
    addBlock(block);

    res.send(block);
  });

  app.get("/version", (req, res) => {
    res.send(getVersion());
  });

  app.post("/stop", (req, res) => {
    res.send({ msg: "Stop Server" });
    process.exit();
  });

  app.listen(http_port, () => {
    console.log(http_port + "포트 대기중");
  });
}

initHttpServer();
