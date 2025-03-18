import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Base58形式の秘密鍵文字列を取得
const secretKeyBase58 = "秘密鍵"; // ここに実際のBase58秘密鍵を入れる

// Base58からUint8Array型の秘密鍵にデコード
const secretKeyArray = new Uint8Array(bs58.decode(secretKeyBase58));

// Keypairを生成
const keypair = Keypair.fromSecretKey(secretKeyArray);

// 公開鍵と秘密鍵（Uint8Array形式）を表示
console.log("Public Key:", keypair.publicKey.toString());
console.log("Secret Key (Uint8Array):", secretKeyArray); // 正しく表示される
