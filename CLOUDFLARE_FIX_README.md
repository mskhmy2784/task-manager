# タスク管理ツール - Cloudflare Pages デプロイ修正ガイド

## 問題: ログイン後に画面が真っ白になる

### 原因と修正

この問題には複数の原因が考えられます。以下の修正を順番に適用してください。

---

## 🔧 修正1: SPAルーティング設定

Cloudflare Pagesでは、SPAのルーティングを正しく動作させるために以下のファイルが必要です。

### `public/_redirects` を作成
```
/* /index.html 200
```

### `public/_routes.json` を作成（推奨）
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", "/favicon.ico", "/*.js", "/*.css", "/*.png", "/*.svg", "/*.ico", "/*.webmanifest"]
}
```

---

## 🔧 修正2: Google Cloud Console 設定

### 承認済みJavaScript生成元の追加

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「APIとサービス」→「認証情報」→ 該当のOAuth 2.0クライアントIDをクリック
3. 「承認済みのJavaScript生成元」に**Cloudflare PagesのURL**を追加:
   - `https://your-project.pages.dev`
   - カスタムドメインがあれば: `https://your-custom-domain.com`

**重要:** URLの末尾にスラッシュ（/）を付けないでください。

---

## 🔧 修正3: Cloudflare Pages 環境変数設定

Cloudflare Pages の設定画面で環境変数を設定します：

1. Cloudflare ダッシュボード → Pages → プロジェクト → Settings → Environment variables
2. 以下の変数を**Production**と**Preview**両方に追加:

| 変数名 | 値 |
|--------|-----|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuthクライアントID |
| `VITE_SPREADSHEET_ID` | GoogleスプレッドシートID |

**重要:** 環境変数を設定後、**必ず再デプロイ**してください。

---

## 🔧 修正4: 改善版ソースコード

### `src/contexts/DataContext.jsx`
- エラー発生時に画面に表示するように修正
- ローディング状態を適切に管理

### `src/services/googleSheets.js`
- 環境変数未設定時のエラーメッセージ追加
- 認証エラー、ネットワークエラーの適切なハンドリング

---

## 📋 チェックリスト

デプロイ前に以下を確認してください:

- [ ] `public/_redirects` ファイルが存在する
- [ ] Google Cloud Console で Cloudflare Pages の URL が承認されている
- [ ] Cloudflare Pages で環境変数が設定されている
- [ ] 環境変数設定後に再デプロイした
- [ ] Google スプレッドシートが共有設定されている（または対象アカウントがアクセス可能）

---

## 🔍 デバッグ方法

ブラウザの開発者ツール（F12）でコンソールを確認してください。
以下のようなエラーが表示される場合があります：

| エラーメッセージ | 原因 | 解決策 |
|-----------------|------|--------|
| `idpiframe_initialization_failed` | OAuthドメイン未登録 | Google Cloud Console で承認済みドメインを追加 |
| `Not authenticated` | トークン未取得 | ログアウト後、再ログイン |
| `VITE_SPREADSHEET_ID is not set` | 環境変数未設定 | Cloudflare Pages で環境変数を設定して再デプロイ |
| `Failed to fetch` | ネットワークエラー | インターネット接続確認、CORS設定確認 |

---

## 📁 ファイル構成

```
task-manager/
├── public/
│   ├── _redirects          # 追加: SPA用リダイレクト
│   └── _routes.json        # 追加: Cloudflare Pages用ルーティング
├── src/
│   ├── contexts/
│   │   └── DataContext.jsx # 修正: エラーハンドリング強化
│   └── services/
│       └── googleSheets.js # 修正: エラーハンドリング強化
└── vite.config.js          # 修正: Cloudflare Pages最適化
```

---

## 🚀 再デプロイ手順

```bash
# 1. 変更をコミット
git add .
git commit -m "Fix: Cloudflare Pages deployment issues"

# 2. GitHubにプッシュ（自動デプロイが設定されている場合）
git push origin main
```

または、Cloudflare Pages ダッシュボードから手動で再デプロイを実行してください。
