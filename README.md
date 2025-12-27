# 📋 タスク管理ツール

React + Google Sheets API を使用した PWA 対応のタスク管理アプリケーション

![Version](https://img.shields.io/badge/version-1.0.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ 特徴

- 📱 **PWA対応** - スマホのホーム画面に追加可能
- 🔐 **Googleアカウント認証** - セキュアなアクセス
- 📊 **Google Sheets連携** - データはスプレッドシートに保存
- 🎨 **レスポンシブデザイン** - PC・タブレット・スマホ対応

## 🖥️ スクリーンショット

<!-- スクリーンショットを追加する場合はここに -->
<!-- ![ダッシュボード](screenshots/dashboard.png) -->

## 📦 機能一覧

### タスク管理
- ✅ タスクの作成・編集・削除・コピー
- ✅ ステータス管理（未着手 / 進行中 / 完了 / 保留）
- ✅ 優先度設定（最高 / 高 / 中 / 低）
- ✅ カテゴリ・サブカテゴリによる分類
- ✅ タグ付け（複数タグ対応）
- ✅ 開始日・期限日・時間の設定
- ✅ 見積もり工数（日数・時間）
- ✅ 関連リンクの添付（最大5件）
- ✅ 複数選択・一括削除

### ルーティン管理
- 🔄 繰り返しタスクの設定
- 🔄 頻度: 毎日 / 週次 / 月次
- 🔄 週次: 複数曜日選択対応（平日のみ等）
- 🔄 月次: 日付指定、末日対応
- 🔄 ルーティン実行ログの記録

### ダッシュボード
- 📊 今日の日付・時刻表示
- 📊 サマリーカード（未完了 / 期限超過 / 保留中）
- 📊 カードクリックでタスク一覧へジャンプ
- 📊 今日のタスク / ルーティン一覧
- 📊 期限超過タスク一覧

### タスク一覧
- 🔍 検索機能
- 🔍 フィルタリング（カテゴリ / 優先度 / ステータス / タグ）
- 🔍 ソート（期限日 / 優先度 / 作成日）
- 🔍 ステータスバッジからの直接変更

### 設定画面
- ⚙️ メインカテゴリの管理
- ⚙️ サブカテゴリの管理
- ⚙️ タグの管理

## 🛠️ 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React 18 + Vite |
| スタイリング | CSS（カスタム） |
| データストレージ | Google Sheets API |
| 認証 | Google OAuth 2.0（GIS） |
| PWA | vite-plugin-pwa |
| アイコン | Lucide React |
| 日付処理 | date-fns |
| ホスティング | Cloudflare Pages |

## 🚀 セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/mskhmy2784/task-manager.git
cd task-manager
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env` ファイルを作成して編集:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_SPREADSHEET_ID=your-spreadsheet-id
```

### 4. Google Cloud Console 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. 「APIとサービス」→「ライブラリ」→ **Google Sheets API** を有効化
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→ **OAuth 2.0 クライアント ID** を作成
4. アプリケーションの種類: **ウェブアプリケーション**
5. 承認済みの JavaScript 生成元に以下を追加:
   - `http://localhost:5173`（開発用）
   - `https://your-app.pages.dev`（本番用）

### 5. スプレッドシート準備

Google スプレッドシートを作成し、以下のシートを追加:

| シート名 | 用途 |
|----------|------|
| Tasks | タスクデータ |
| Routines | ルーティンデータ |
| RoutineLogs | ルーティン実行ログ |
| MainCategories | メインカテゴリ |
| SubCategories | サブカテゴリ |
| Tags | タグ |

各シートの1行目にヘッダー行を設定してください（詳細は下記参照）。

### 6. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 にアクセス

### 7. 本番ビルド

```bash
npm run build
```

## 🌐 デプロイ（Cloudflare Pages）

### GitHub連携

1. Cloudflare Dashboardで「Workers & Pages」→「Create」→「Pages」
2. GitHubリポジトリを選択
3. ビルド設定:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 環境変数を設定:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_SPREADSHEET_ID`

## 📄 スプレッドシート構造

### Tasks シート

ヘッダー行（A1から）:
```
id	title	description	mainCategoryId	subCategoryId	priority	status	startDate	startTime	dueDate	dueTime	estimatedDays	estimatedHours	period	tags	links	createdAt	updatedAt
```

### Routines シート

ヘッダー行（A1から）:
```
id	title	description	mainCategoryId	subCategoryId	frequency	dayOfWeek	dayOfMonth	isActive	createdAt	updatedAt
```

### RoutineLogs シート

ヘッダー行（A1から）:
```
id	routineId	date	completed	completedAt
```

### MainCategories シート

ヘッダー行（A1から）:
```
id	name	color	createdAt
```

### SubCategories シート

ヘッダー行（A1から）:
```
id	mainCategoryId	name	createdAt
```

### Tags シート

ヘッダー行（A1から）:
```
id	name	color	createdAt
```

## 📝 ライセンス

MIT License

## 📜 更新履歴

### v1.0.8 (2025-12-27)
- タスク一覧画面のヘッダーレイアウトを改善
  - 選択ボタンと新規タスクボタンを右側に配置
  - 検索ボックスを独立した行に移動
- ステータスドロップダウンメニューの表示を改善
  - メニューを上方向に表示するよう変更
  - 下のタスクと重ならないよう修正

### v1.0.7 (2025-12-27)
- package.jsonのBOM文字を削除

### v1.0.6 (2025-12-27)
- Cloudflare Pages対応
  - SPAルーティング用_redirectsファイルを追加
  - _routes.jsonファイルを追加
- DataContextにエラー表示とローディング画面を追加
- googleSheets.jsにエラーハンドリング強化

### v1.0.4 (2024-12-26)
- ルーティン削除時に関連ログも削除するように修正

### v1.0.3 (2024-12-26)
- ルーティン管理のメニュー表示を修正

### v1.0.2 (2024-12-26)
- appendRow関数の修正（行を直接指定して書き込み）

### v1.0.0 (2024-12-26)
- 初回リリース
- タスク管理機能
- ルーティン管理機能
- ダッシュボード
- 設定画面
- PWA対応
