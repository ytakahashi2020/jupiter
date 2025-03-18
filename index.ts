import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import fetch from "cross-fetch";
import * as fs from "fs";
import * as path from "path";

// Solana ネットワークへの接続を設定
const connection = new Connection("https://api.mainnet-beta.solana.com");

// my-keypair.json ファイルのパスを設定
const keypairPath = path.resolve(__dirname, "my-keypair.json");

// キーペアをファイルから読み込む関数
const loadKeypairFromFile = (filePath) => {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(keyData));
};

// ウォレットのキーペアを読み込む
const wallet = loadKeypairFromFile(keypairPath);

// スワップするトークンのミントアドレスと数量を設定
const inputMint = "So11111111111111111111111111111111111111112"; // SOL のミントアドレス
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC のミントアドレス
const amount = 1000000; // 0.01 SOL をラミポート単位で指定
const slippageBps = 50; // スリッページ許容範囲を 0.5% に設定

// Quote API を呼び出してスワップの見積もりを取得
const quoteResponse = await (
  await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
  )
).json();

// Swap API を呼び出してスワップトランザクションを取得
const swapResponse = await (
  await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true, // SOL のラップとアンラップを自動で行う
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

console.log(swapResponse);

// トランザクションのシリアライズ
const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, "base64");
const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
console.log("transaction", transaction);

// トランザクションに署名
transaction.sign([wallet]);

const transactionBinary = transaction.serialize();
console.log("transactionBinary", transactionBinary);

const signature = await connection.sendRawTransaction(transactionBinary, {
  maxRetries: 2,
  skipPreflight: true,
});

const confirmation = await connection.confirmTransaction(
  { signature },
  "finalized"
);

if (confirmation.value.err) {
  throw new Error(
    `Transaction failed: ${JSON.stringify(
      confirmation.value.err
    )}\nhttps://solscan.io/tx/${signature}/`
  );
} else
  console.log(`Transaction successful: https://solscan.io/tx/${signature}/`);

// 最新のブロックハッシュを取得してトランザクションに設定
const { blockhash } = await connection.getLatestBlockhash();
transaction.message.recentBlockhash = blockhash;

// トランザクションをシリアライズして送信
const rawTransaction = transaction.serialize();
const txid = await connection.sendRawTransaction(rawTransaction, {
  skipPreflight: true,
  maxRetries: 2,
});

// トランザクションの確認
await connection.confirmTransaction({
  blockhash: transaction.message.recentBlockhash,
  lastValidBlockHeight: (
    await connection.getLatestBlockhash()
  ).lastValidBlockHeight,
  signature: txid,
});

console.log(`Transaction successful: https://solscan.io/tx/${txid}`);
