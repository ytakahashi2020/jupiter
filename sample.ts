import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import fetch from "cross-fetch";
import * as fs from "fs";
import * as path from "path";

// Solana ネットワークへの接続を設定
const connection = new Connection("https://api.mainnet-beta.solana.com");

// my-keypair.json ファイルのパスを設定
const keypairPath = path.resolve(__dirname, "my-keypair.json");

// キーペアをファイルから直接読み込む
const keyData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(keyData));

// スワップするトークンのミントアドレスと数量を設定
const inputMint = "So11111111111111111111111111111111111111112"; // SOL のミントアドレス
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC のミントアドレス
const amount = 500000; // 0.005 SOL（ラミポート単位）
const slippageBps = 100; // 1% のスリッページ

// Quote API で見積もり取得
const quoteResponse = await (
  await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
  )
).json();

// Swap API でスワップトランザクションを取得
const swapResponse = await (
  await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          global: false,
          priorityLevel: "high",
          dynamicComputeUnitLimit: true,
          dynamicSlippage: true,
          jitoTipLamports: 100000,
        },
      },
    }),
  })
).json();

// console.log("swapTransaction", swapResponse.swapTransaction);

// トランザクションデータを復元
const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, "base64");
// console.log("swapTransactionBuf", swapTransactionBuf);
const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
// console.log("transaction before sign", transaction);

// ウォレットで署名
transaction.sign([wallet]);
// console.log("transaction after sign", transaction);

// トランザクション送信
const signature = await connection.sendRawTransaction(transaction.serialize(), {
  skipPreflight: true,
  maxRetries: 2,
});

// console.log("serialized transaction", transaction.serialize());

// 10秒待機する
await new Promise((resolve) => setTimeout(resolve, 10000));

const status = await connection.getSignatureStatuses([signature]);
const statusInfo = status.value[0];

if (statusInfo) {
  console.log("Confirmation Status:", statusInfo.confirmationStatus);
  console.log(`https://solscan.io/tx/${signature}`);
  console.log("Slot:", statusInfo.slot);
  console.log("Error:", statusInfo.err);
} else {
  console.log("トランザクションが見つかりませんでした。");
}
