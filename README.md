# 事前問診 LIFF Webアプリ

公式LINEのリッチメニューまたはLIFF URLから開く、問診専用のWebアプリです。

## 機能

- `/intake` で問診画面を表示
- 最初の質問で「整形外科」と「内科・その他」に分岐
- 整形外科ではシェーマに症状部位をマーキング
- 回答内容をAIでSOAPのS形式に要約
- 要約をSlackへ送信
- Slack本文の先頭に、カルテへそのまま貼れる「コピペ用S」を表示
- シェーマに印がある場合は、シェーマ画像もSlackへ添付

音声入力、カルテ管理、テンプレート管理、スプレッドシート保存機能は含めていません。

## 必要な環境変数

Vercel本番では、Vercelの `Settings > Environment Variables` に設定してください。

```env
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.4-mini
SLACK_WEBHOOK_URL=
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
LIFF_ID=
LINE_USER_HASH_SECRET=
```

`SLACK_WEBHOOK_URL` はテキスト通知に使います。

シェーマ画像もSlackへ添付する場合は、追加で以下が必要です。

- `SLACK_BOT_TOKEN`: Slack Bot User OAuth Token。例: `xoxb-...`
- `SLACK_CHANNEL_ID`: 送信先チャンネルID。例: `C0123456789`

Slack Appには少なくとも以下のBot Token Scopesを付けてください。

- `files:write`
- `chat:write`

Botを送信先チャンネルへ招待しておく必要があります。

ローカルで試す場合は `.env.example` をコピーして `.env` を作成します。Vercelに入れた環境変数はローカルでは読まれません。

```bash
copy .env.example .env
```

Vercel本番で環境変数を追加・変更した場合は、保存後に必ず再デプロイしてください。再デプロイ前の画面は古い環境変数のまま動きます。

Slack送信の最小構成はどちらかです。

- テキスト通知のみ: `SLACK_WEBHOOK_URL`
- テキスト通知 + シェーマ画像添付: `SLACK_BOT_TOKEN` と `SLACK_CHANNEL_ID`

`SLACK_CHANNEL_ID` はチャンネル名ではなく、`C...` で始まるチャンネルIDを入れてください。

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
