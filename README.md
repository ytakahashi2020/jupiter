## 1 Connection の作成

`const connection = new Connection("https://api.mainnet-beta.solana.com");`

## 2 キーペアの取得

### 1 Path の取得

`const keypairPath = path.resolve(__dirname, "my-keypair.json");`

### 2 配列に変換

#### 1 文字列として取得

`fs.readFileSync(filePath, "utf8")`

#### 2 配列に変換

`JSON.parse(...)`

### 3 キーペアの取得

#### 1 Uint8Array 型に変換

`Uint8Array.from()`

#### 2 キーペアの取得

`Keypair.fromSecretKey();`

## 3 見積もりの取得

### 1 必要情報の設定

```
// スワップするトークンのミントアドレスと数量を設定
const inputMint = "So11111111111111111111111111111111111111112"; // SOL のミントアドレス
const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC のミントアドレス
const amount = 1000000; // 0.01 SOL をラミポート単位で指定
const slippageBps = 50; // スリッページ許容範囲を 0.5% に設定
```

### 2 fetch の実行

```
await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
  )
```

### 3 JSON 形式に変換

## 4 Swap トランザクションの取得

### 1 公式ページの確認

https://dev.jup.ag/docs/api/swap-api/swap

⇨ 必須項目は userPublicKey と quoteResponse のみ

### 2 実行

```
 await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
    }),
  })
```

## 5 トランザクション形式の変換

### 1 Swap Transaction の取得

`swapResponse.swapTransaction`

### 2 base64 文字列をバイナリ（Buffer）に変換

`Buffer.from(..., "base64")`

### 3 Solana SDK で使えるオブジェクトに変換

`VersionedTransaction.deserialize(...)`

## 6 署名の実行

`transaction.sign([wallet]);`

## 7 トランザクションの送付

### 1 バイナリ形式に変換

`transaction.serialize();`

### 2 送信

`await connection.sendRawTransaction(transactionBinary);`

### 3 オプションの設定

```
{
  maxRetries: 2,
  skipPreflight: true,
}
```
