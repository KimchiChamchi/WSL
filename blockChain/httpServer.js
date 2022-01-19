const express = require("express");
const bodyParser = require("body-parser");
const {
  Blocks,
  getBlocks,
  nextBlock,
  getVersion,
  getLastBlock,
} = require("./chainedBlock");
// const { addBlock } = require("./checkValidBlock");
const { addBlock } = require("./chainedBlock");
const { isValidNewBlock } = require("./checkValidBlock");
const { connectToPeers, getSockets } = require("./p2pServer");
const { getPublicKeyFromWallet } = require("./encryption");

const http_port = process.env.HTTP_PORT || 3001;

function initHttpServer() {
  const app = express();
  app.use(bodyParser.json());

  // addPeers 할 때
  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"ws://localhost:6003\" ]}" http://localhost:3001/addPeers
  // mineBlock 할 때
  // curl -H "Content-type:application/json" --data "{\"data\" : [ \"김블록\" ]}" http://localhost:3001/mineBlock

  app.post("/addPeers", (req, res) => {
    const data = req.body.data || [];
    connectToPeers(data);
  });

  app.get("/peers", (req, res) => {
    let sockInfo = [];

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

  app.post("/asdf", (req, res) => {
    const lastblock = Blocks[Blocks.length - 1];
    const prevBlock = Blocks[Blocks.length - 2];
    console.log(lastblock);
    console.log(prevBlock);
    console.log(isValidNewBlock(lastblock, prevBlock));
  });

  app.get("/version", (req, res) => {
    res.send(getVersion());
  });

  app.get("/stop", (req, res) => {
    res.send({ msg: "서버 멈춰!" });
    process.exit();
  });

  app.get("/address", (req, res) => {
    const address = getPublicKeyFromWallet().toString();
    if (address != "") {
      res.send({ address: address });
    } else {
      res.send("주소가 비었어!");
    }
  });

  app.listen(http_port, () => {
    console.log(http_port + "포트 대기중");
  });
}

initHttpServer();
