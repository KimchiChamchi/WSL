const p2p_port = process.env.P2P_PORT || 6001;

const WebSocket = require("ws");

function initP2PServer(portNum) {
  const server = new WebSocket.Server({ port: portNum });
  server.on("connection", (ws) => {
    initConnection(ws);
  });
  console.log("웹소켓 서버를 열엇고 포트는 " + portNum + "임");
}
initP2PServer(6001);
initP2PServer(6002);
initP2PServer(6003);

let sockets = [];

function initConnection(ws) {
  console.log("뭐해야돼");
  sockets.push(ws);
}

function getSockets() {
  return sockets;
}

function write(ws, message) {
  ws.send(JSON.stringify(message));
}

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

function connectToPeers(newPeers) {
  console.log(newPeers);
  newPeers.forEach((peer) => {
    const ws = new WebSocket(peer);
    ws.on("open", () => {
      console.log("야호");
      initConnection(ws);
    });
    ws.on("error", () => {
      console.log("웹소켓 연결 실패");
    });
  });
}
module.exports = {
  broadcast,
  connectToPeers,
  getSockets,
};
