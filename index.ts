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
const amount = 500000; // 0.005 SOL（ラミポート単位）
const slippageBps = 50; // 0.5% のスリッページ

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

// トランザクションデータを復元
const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, "base64");
const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

// ウォレットで署名
transaction.sign([wallet]);

// トランザクション送信
const signature = await connection.sendRawTransaction(transaction.serialize(), {
  skipPreflight: true,
  maxRetries: 2,
});

// 最新のブロックハッシュを取得（確認用に必要）
const latestBlockhash = await connection.getLatestBlockhash();

// トランザクションの確認
const confirmation = await connection.confirmTransaction(
  {
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  },
  "confirmed"
);

// 結果出力
if (confirmation.value.err) {
  throw new Error(
    `Transaction failed: ${JSON.stringify(
      confirmation.value.err
    )}\nhttps://solscan.io/tx/${signature}/`
  );
} else {
  console.log(`Transaction successful: https://solscan.io/tx/${signature}`);
}
