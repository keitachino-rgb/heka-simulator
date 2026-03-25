# SIPS CMS - Content Management System

Social Impact Solutions向けのシンプルで使いやすいコンテンツ管理システムです。

## 機能

- **ニュース管理**: ニュース記事の作成、編集、削除、公開管理
- **ページ管理**: 静的ページの管理（SEO対応）
- **サービス管理**: サービス情報の管理
- **設定管理**: サイト全体の設定
- **ユーザー認証**: JWT認証によるセキュアなアクセス
- **REST API**: 完全なREST APIで外部連携対応

## インストール

```bash
# プロジェクトディレクトリに移動
cd sips_cms

# 依存パッケージをインストール
npm install
```

## セットアップ

1. `.env.example` をコピーして `.env` を作成
```bash
cp .env.example .env
```

2. `.env` ファイルで必要な設定を編集（本番環境ではJWT_SECRETを変更してください）

## 起動

```bash
# 開発モード（nodemonで自動再起動）
npm run dev

# 本番モード
npm start
```

サーバーが起動したら、ブラウザで `http://localhost:5000` にアクセスしてください。

## デフォルトログイン情報

- **ユーザー名**: admin
- **パスワード**: admin123

**⚠️ 重要**: 本番環境では必ずパスワードを変更してください。

## 使い方

### ログイン
1. ログイン画面でユーザー名とパスワードを入力
2. ログインボタンをクリック

### ニュース管理
- 「新規作成」ボタンで新しいニュースを作成
- 既存のニュースをクリックして編集
- 削除ボタンで記事を削除
- 公開チェックボックスで公開/非公開を切り替え

### ページ管理
- コーポレートサイトの重要なページを管理
- SEO対応（メタディスクリプション）
- HTML/マークダウンコンテンツに対応

### サービス管理
- サービス情報を一元管理
- 表示順序を設定可能
- アイコン番号を指定

### 設定管理
- サイトタイトル
- サイトディスクリプション
- お問い合わせメールアドレス

## API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン

### ニュース
- `GET /api/articles` - 全ニュース取得
- `GET /api/articles/:id` - 特定のニュース取得
- `POST /api/articles` - ニュース作成（認証必須）
- `PUT /api/articles/:id` - ニュース更新（認証必須）
- `DELETE /api/articles/:id` - ニュース削除（認証必須）

### ページ
- `GET /api/pages` - 全ページ取得
- `GET /api/pages/:slug` - スラッグでページ取得
- `POST /api/pages` - ページ作成（認証必須）
- `PUT /api/pages/:id` - ページ更新（認証必須）
- `DELETE /api/pages/:id` - ページ削除（認証必須）

### サービス
- `GET /api/services` - 全サービス取得
- `POST /api/services` - サービス作成（認証必須）
- `PUT /api/services/:id` - サービス更新（認証必須）
- `DELETE /api/services/:id` - サービス削除（認証必須）

### 設定
- `GET /api/settings` - 全設定取得
- `POST /api/settings` - 設定更新（認証必須）

## データベース

SQLiteを使用しています。
- ファイル: `cms.db`
- 自動作成: 初回起動時に自動的に作成されます

## テーブル構成

- **users**: ユーザー情報
- **articles**: ニュース/ブログ記事
- **pages**: 静的ページ
- **services**: サービス情報
- **settings**: サイト設定

## 本番環境へのデプロイ

### Vercelへのデプロイ

1. リポジトリをGitHubにプッシュ
2. Vercelで新規プロジェクトを作成
3. ルートディレクトリを `sips_cms` に設定
4. 環境変数を設定：
   - `JWT_SECRET`: セキュアなシークレットキー
   - `NODE_ENV`: production

### その他のプラットフォーム

- Heroku
- Railway
- Render
- AWS Lambda + RDS

## セキュリティに関する注意

1. **デフォルトユーザーの削除**: 本番環境では必ず変更してください
2. **JWT_SECRETの変更**: 強力なシークレットキーを設定してください
3. **HTTPS**: 本番環境では必ずHTTPSを使用してください
4. **CORS設定**: 必要に応じてCORSを制限してください

## トラブルシューティング

### ポート5000が既に使用されている場合
```bash
PORT=3000 npm start
```

### データベースファイルがロックされている
```bash
rm cms.db
npm start
```

## ライセンス

MIT
