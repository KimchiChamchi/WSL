const fs = require("fs");
const ecdsa = require("elliptic"); //타원 곡선 디지털 서명 알고리즘
const ec = new ecdsa.ec("secp256k1");

const privateKeyLocation =
  "server1/wallet/" + (process.env.PRIVATE_KEY || "default"); //wallet안에 "default"라는 폴더가 있는지 확인해본다. 없으면 만든다.
const privateKeyFile = privateKeyLocation + "/private_key"; //default라는 폴더 안에 파일이 있는지 확인해본다. 없으면 만든다.

function initWallet() {
  //암호화 파일 만드는 함수
  if (fs.existsSync(privateKeyFile)) {
    //있으면 리턴 끝내고 없으면 밑으로 쭉죽
    console.log("기존 지갑 private key 경로 : " + privateKeyFile);
    return;
  }
  if (!fs.existsSync("server1/wallet/")) {
    //wallet파일이없다면
    fs.mkdirSync("server1/wallet/"); //파일만들고
  }
  if (!fs.existsSync(privateKeyLocation)) {
    //wallet파일default파일이없다면
    fs.mkdirSync(privateKeyLocation); //default파일만들어 주고
  }
  if (!fs.existsSync(privateKeyFile)) {
    //파일이 없다면 true이고 있으면 false임
    console.log(`주소값 키값을 생성중입니다.`);
    const newPrivateKey = generatePrivateKey();
    fs.writeFileSync(privateKeyFile, newPrivateKey); //첫번째 인자값은 경로+파일명, 넣을 내용들
    console.log(`개인키 생성이 완료되었습니다.`);
  }
}

function generatePrivateKey() {
  //암호화 키 만드는 함수 겹치지 않아야됨
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
}

function getPrivateKeyFromWallet() {
  //비밀키(인증서) 출력하는 함수
  const buffer = fs.readFileSync(privateKeyFile, "utf8"); //지갑에 만들어놓은 키 불러와서 읽을수있게 바꿔줌
  return buffer.toString(); //만들어놓은 파일은txt인식 안되니깐 toString()붙이면 우리가 알아들을 수 있는 결과물로 출력
}

function getPublicKeyFromWallet() {
  //공개키(지갑 주소) 만들기
  const privateKey = getPrivateKeyFromWallet(); //비밀키 읽을수있는 함수 불러오고
  const key = ec.keyFromPrivate(privateKey, "hex"); //암호화해서
  return key.getPublic().encode("hex"); //암호화리턴
}

module.exports = { getPublicKeyFromWallet, initWallet };
