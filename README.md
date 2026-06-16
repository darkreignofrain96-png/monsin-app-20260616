# 事前問診 LIFF Webアプリ

公式LINEのリッチメニューまたはLIFF URLから開く、問診専用のWebアプリです。

## 機能

- `/intake` で問診画面を表示
- 最初の質問で「整形外科」と「内科・その他」に分岐
- 整形外科ではシェーマに症状部位をマーキング
- 回答内容をAIでSOAPのS形式に要約
- 要約をSlack Incoming Webhookへ送信

音声入力、カルテ管理、テンプレート管理、スプレッドシート保存機能は含めていません。

## 必要な環境変数

Vercel本番では、Vercelの `Settings > Environment Variables` に設定してください。

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4-mini
SLACK_WEBHOOK_URL=
LIFF_ID=
LINE_USER_HASH_SECRET=
```

ローカルで試す場合は `.env.example` をコピーして `.env` を作成します。

## ローカル確認

```bash
npm install
npm run dev
```

問診画面:

```text
http://127.0.0.1:5173/intake
```

## Vercelデプロイ

GitHub経由でVercelに接続する場合は、このフォルダ一式をGitHubに入れてください。

Vercel設定:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

リポジトリ内のサブフォルダとして使う場合は、Vercelの `Root Directory` をそのフォルダ名に設定してください。

## LINE側の設定

LIFFのEndpoint URL:

```text
https://your-project.vercel.app/intake
```

公式LINEのリッチメニュー:

```text
https://liff.line.me/{LIFF_ID}
```

## 主なファイル

- `src/App.jsx`: 問診画面
- `src/styles.css`: 問診画面のスタイル
- `api/app.js`: AI要約とSlack送信API
- `api/index.js`: Vercel API入口
- `public/intake-schema.png`: シェーマ画像
- `vercel.json`: Vercel設定
