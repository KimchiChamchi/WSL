const fs = require("fs");
const ecdsa = require("elliptic"); // 타원 곡선 디지털 서명 알고리즘
const ec = new ecdsa.ec("secp256k1");

// 개인키 들어갈 경로는 wallet/PRIVATE_KEY환경변수      또는 wallet/default얏
const privateKeyLocation = "wallet/" + (process.env.PRIVATE_KEY || "default");
// 개인키는 지갑 경로에 개인키 private_key 라고 만들고양
const privateKeyFile = privateKeyLocation + "/private_key";

function initWallet() {
  // 지갑에 개인키가 이미 있으면 있다고 알려주고 건너뛰기
  if (fs.existsSync(privateKeyFile)) {
    console.log("헌 지갑 " + privateKeyFile + "에 개인키가 있어요");
    return;
  }
  // 지갑 경로가 없으면 경로 생성
  if (!fs.existsSync("wallet/")) {
    fs.mkdirSync("wallet/");
  }
  // 지갑 경로가 없으면 경로 생성
  if (!fs.existsSync(privateKeyLocation)) {
    fs.mkdirSync(privateKeyLocation);
  }
  // 개인키 암호 생성해서
  const newPrivateKey = generatePrivateKey();
  // 개인키 파일에 기입하기
  fs.writeFileSync(privateKeyFile, newPrivateKey);
  console.log("새 지갑을 장만하였어요");
  console.log("개인키는 " + privateKeyFile + " 에 있어요");
}
initWallet();

// 개인키 암호 생성 해주는 함수
function generatePrivateKey() {
  //   const Q = ec.genKeyPair();
  //   console.log("난 Q", Q);
  //   const privateQ = Q.getPrivate();
  //   console.log("난 Q.getPrivate", Q.getPrivate());
  //   console.log("난 Q.getPrivate을 변수에 담은것", privateQ);

  // genKeyPair로 랜덤한 키 쌍을 생성
  const keyPair = ec.genKeyPair();
  // 키 쌍의 priv 부분만 가져와서
  const privateKey = keyPair.getPrivate();
  //   console.log(privateKey.toString(16)); // private_key 파일의 내용과 동일
  //   console.log("keyPair!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  //   console.log(keyPair);
  // 16진수로 변환
  return privateKey.toString(16);
}

// 지갑에서 개인키 가져오는 함수
function getPrivateKeyFromWallet() {
  // 개인키 파일의 내용을 buffer에 담아서 반환해주기
  const buffer = fs.readFileSync(privateKeyFile, "utf8");
  return buffer.toString();
}
// getPrivateKeyFromWallet();
// 지갑에서 공개키 꺼내오는 함수
function getPublicKeyFromWallet() {
  // 지갑에서 있는 개인키를 가져와서
  const privateKey = getPrivateKeyFromWallet();
  // 키 쌍으로 되돌려서
  const key = ec.keyFromPrivate(privateKey, "hex");
  //   console.log("privateKey!!!!!!!!!!!!!!!!!!");
  //   console.log(privateKey);
  //   console.log("key!!!!!!!!!!!!!!!!!!!!");
  //   console.log(key);
  //   console.log("qqqqqqqqqqqqqqqq!!!!!!!!!!!!!!!!!!!!");
  //   console.log(key.getPublic());
  //   console.log(key.getPublic().encode("hex"));
  // 공개키 형식으로 변환하여 반환
  return key.getPublic().encode("hex");
}
// getPublicKeyFromWallet();

module.exports = {
  getPublicKeyFromWallet,
};
