# 統合型プロジェクト・タスク管理システム 仕様書

## 1. プロジェクト概要

### 1.1 目的
複数のプロジェクト、開発タスク、SNSマーケティング活動、KPI目標を一元管理する統合ダッシュボードシステム

### 1.2 対象ユーザー
- YouTuber / コンテンツクリエイター
- 複数プロジェクトを同時進行する個人・小規模チーム
- SNSマーケティングと開発タスクを並行管理する必要がある人

### 1.3 技術スタック
- **フロントエンド**: SvelteKit (Svelte 5)
- **スタイリング**: Tailwind CSS 4
- **データベース**: Cloudflare D1 (SQLite)
- **UI コンポーネント**: Lucide Icons, Chart.js
- **認証**: bcryptjs
- **ドラッグ&ドロップ**: svelte-dnd-action
- **デプロイ**: Cloudflare Pages

---

## 2. 機能要件

### 2.1 認証機能
- ユーザー名とパスワードによる認証
- bcryptjsによるパスワードハッシュ化
- Cookieベースのセッション管理

### 2.2 プロジェクト管理

#### 2.2.1 プロジェクト一覧（メインダッシュボード）
- プロジェクト作成・編集・削除
- プロジェクトステータス管理（進行中・完了・保留）
- プロジェクトカラー選択（8色パレット）
- タグ付け（複数選択可）
- 全体統計表示
  - プロジェクト数
  - 完了タスク数
  - 残りタスク数
  - 全体進捗率

#### 2.2.2 プロジェクト詳細ページ
- プロジェクト概要表示
- KPI目標管理セクション
- YouTube統計セクション
- 関連ボード一覧
- ドキュメント管理
- タブ切り替え（ボード/ドキュメント）

#### 2.2.3 マイルストーン管理
- マイルストーン作成・編集・削除
- 開始日・終了日設定
- ステータス管理（pending, in_progress, completed）
- タスクチェックリスト
- 並び替え機能

### 2.3 タスク管理（Kanban方式）

#### 2.3.1 ボード管理
- ボード作成・編集・削除
- プロジェクトへの紐付け
- ボード統計（リスト数、カード数）
- グリッド表示

#### 2.3.2 ボード詳細
- **Kanbanビュー**（デフォルト）
  - 複数リスト表示
  - ドラッグ&ドロップによるリスト並び替え
  - カードのリスト間移動
  - カードの並び替え
  - svelte-dnd-action（200ms flip animation）

- **カレンダービュー**
  - 月単位カレンダー表示
  - 期限日付でカード表示
  - 前月・来月ナビゲーション

#### 2.3.3 リスト管理
- リスト作成・編集・削除
- position管理による順序保持
- カード数表示

#### 2.3.4 カード管理
- **基本情報**
  - タイトル（必須）
  - 説明（任意）
  - 期限日付（任意）
  - タグ（複数可、カスタム色）

- **装飾オプション**
  - タイトルテキスト色・背景色
  - 説明テキスト色・背景色
  - 期限テキスト色
  - ボーダー色
  - 18色カラーパレット

- **操作**
  - 作成・編集・削除
  - ドラッグ&ドロップ移動・並び替え
  - Discord通知フラグ
  - ドキュメント添付

### 2.4 KPI・目標追跡システム

#### 2.4.1 KPI目標設定
- カテゴリ選択
  - SNS投稿
  - コース販売
  - ブログPV
  - マーケティング
  - その他（カスタム）
- 目標名・目標値・単位設定
- 繰り返し周期
  - 毎週・毎月・3ヶ月・6ヶ月・毎年
- 開始日設定

#### 2.4.2 KPI実績記録
- 日単位での数値入力
- 記録日付指定
- 直近5件の実績表示
- 複数期間の履歴管理

#### 2.4.3 KPI表示
- 進捗率（%）
- 進捗バー（カテゴリカラー）
- 現在値 / 目標値
- 過去の達成記録
- 達成率の色分け
  - 100%以上: 緑
  - 70%以上: 黄
  - 未満: 赤

### 2.5 YouTube統計連携

#### 2.5.1 全体設定
- YouTube Data APIキー登録
- チャンネル追加（@handle or Channel ID）
- チャンネル一覧・削除
- 統計自動更新

#### 2.5.2 プロジェクト内統計
- チャンネル統計表示
  - 登録者数
  - 再生数
  - 動画数
  - サムネイル
  - 最終更新日時
- グラフ分析（Chart.js）
  - 時系列グラフ
  - 期間選択
  - 増減トレンド

### 2.6 Discord連携

#### 2.6.1 ボード単位設定
- Webhook URL登録
- 通知有効/無効切り替え
- スケジュール通知
  - 指定時刻（例: 09:00）
  - 指定曜日（Mon-Fri等）

#### 2.6.2 カード単位通知
- discord_notifyフラグ
- カード更新時Webhook通知

### 2.7 ドキュメント管理
- プロジェクト単位のドキュメント
- ボード単位のドキュメント
- カード単位のドキュメント
- テキスト編集
- 作成日・更新日表示

### 2.8 SNS投稿計画（拡張機能）
- プラットフォーム別管理（Twitter, YouTube, Facebook, Instagram, Blog）
- 投稿ステータス（planned, scheduled, published, cancelled）
- スケジュール日付・完了日付
- メモ機能

### 2.9 プロジェクト目標管理
- 目標設定（定常業務/スポット）
- 完了チェック
- 並び替え機能

---

## 3. 画面構成

### 3.1 ページ構造
```
/ (ランディングページ)
  ├─ /login (認証)
  └─ /dashboard (メインダッシュボード)
       ├─ /dashboard/projects (プロジェクト一覧)
       │   └─ /dashboard/projects/[projectId] (プロジェクト詳細)
       │       ├─ /dashboard/projects/[projectId]/youtube (YouTube分析)
       │       └─ /dashboard/projects/[projectId]/documents/[docId]
       │
       ├─ /dashboard/boards (ボード一覧)
       │   └─ /dashboard/board/[boardId] (Kanban/カレンダービュー)
       │       ├─ /dashboard/board/[boardId]/settings (Discord設定)
       │       └─ /dashboard/board/[boardId]/documents
       │
       └─ /dashboard/youtube-settings (YouTube API設定)
```

### 3.2 メインダッシュボード
- ヘッダー
  - ロゴ
  - ナビゲーション（プロジェクト・ボード・YouTube設定）
  - ログアウトボタン
- サマリーカード
  - プロジェクト数
  - 完了タスク数
  - 残りタスク数
  - 全体進捗率
- プロジェクト一覧（グリッド）
  - プロジェクトカード
  - ステータス・タグ表示
  - クイックアクション

### 3.3 プロジェクト詳細
- プロジェクト情報セクション
- KPI目標管理セクション
  - 目標一覧
  - 実績入力フォーム
  - 過去履歴
- YouTube統計セクション
  - チャンネル統計
  - 詳細分析リンク
- 関連ボード
- ドキュメント

### 3.4 ボード詳細（Kanban）
- ヘッダー
  - ボードタイトル
  - ビュー切り替え（Kanban/カレンダー）
  - 設定ボタン
- リスト一覧（横スクロール）
  - リスト追加
  - カード一覧（縦スクロール）
  - カード追加
- カード詳細パネル
  - inline編集
  - タグ管理
  - 色設定
  - Discord通知

---

## 4. データベース設計

### 4.1 コアテーブル

#### users
- id (PRIMARY KEY)
- username (UNIQUE)
- password_hash
- created_at

#### projects
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- title
- description
- status (active, completed, on_hold)
- color
- position
- created_at, updated_at

#### boards
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- project_id (FOREIGN KEY, NULLABLE)
- title
- position
- created_at, updated_at

#### lists
- id (PRIMARY KEY)
- board_id (FOREIGN KEY)
- title
- position
- created_at, updated_at

#### cards
- id (PRIMARY KEY)
- list_id (FOREIGN KEY)
- title
- description
- due_date
- position
- color, title_color, description_color, due_date_color
- title_bg_color, description_bg_color, border_color
- discord_notify
- created_at, updated_at

### 4.2 KPI・目標テーブル

#### project_kpi_goals
- id (PRIMARY KEY)
- project_id (FOREIGN KEY)
- category
- title
- target_value
- current_value
- unit
- repeat_cycle (weekly, monthly, quarterly, semi_annual, annual)
- period_start, period_end
- created_at, updated_at

#### project_kpi_records
- id (PRIMARY KEY)
- goal_id (FOREIGN KEY)
- value
- recorded_date
- notes
- created_at

#### project_kpi_period_history
- id (PRIMARY KEY)
- goal_id (FOREIGN KEY)
- period_start, period_end
- target_value, achieved_value, achievement_rate
- created_at

### 4.3 マイルストーン

#### milestones
- id (PRIMARY KEY)
- project_id (FOREIGN KEY)
- title, description
- start_date, due_date
- status (pending, in_progress, completed)
- position
- created_at, updated_at

#### milestone_tasks
- id (PRIMARY KEY)
- milestone_id (FOREIGN KEY)
- title
- completed
- position
- created_at, updated_at

### 4.4 その他テーブル

#### labels, card_labels, card_tags
- ラベル・タグ管理

#### documents
- プロジェクト・ボード・カード単位のドキュメント

#### board_discord_settings
- Discord Webhook設定

#### project_tags, project_tag_mappings
- プロジェクトタグ

#### project_objectives
- プロジェクト目標

#### project_sns_items
- SNS投稿計画

#### attachments
- ファイル添付（Cloudflare R2）

---

## 5. デザイン要件

### 5.1 カラースキーム
- **メインカラー**: Indigo/Blue (#3B82F6, #6366F1)
- **アクセントカラー**:
  - Green (#10B981) - 成功・完了
  - Red (#EF4444) - YouTube・削除
  - Amber (#F59E0B) - マーケティング
  - Purple (#8B5CF6) - KPI
- **グラデーション背景**: from-slate-50 to-indigo-100

### 5.2 アイコン
- Lucide Icons使用
- 統一された単色アイコン
- responsive サイズ（14px～64px）

### 5.3 UIコンポーネント
- モーダルダイアログ（Escapeキーで閉じる）
- プログレスバー
- カラーパレット（18色）
- グリッドレイアウト（MD breakpoint対応）
- フォーム（inline編集）
- タブUI

---

## 6. 外部API連携

### 6.1 YouTube Data API
- **使用範囲**: 無料枠
- **取得データ**: チャンネル統計（登録者数、再生数、動画数）
- **認証**: APIキー方式
- **制限**: 10,000 units/day

### 6.2 Discord Webhook
- **使用範囲**: 無制限
- **機能**: カード更新通知、スケジュール通知
- **認証**: Webhook URL

### 6.3 将来の拡張（予定）
- Twitter API（無料範囲）
- Facebook Graph API
- Instagram Basic Display API
- 自作ブログAPI

---

## 7. 開発・デプロイフロー

### 7.1 ローカル開発
1. SQLiteでローカルDB作成
2. マイグレーション適用（migrations/0001_schema.sql）
3. SvelteKit開発サーバー（npm run dev）
4. http://localhost:5173

### 7.2 本番デプロイ
1. Cloudflare D1データベース作成
2. マイグレーション適用（wrangler d1 migrations apply）
3. Cloudflare Pagesにデプロイ
4. 環境変数設定（D1接続情報）

---

## 8. 非機能要件

### 8.1 パフォーマンス
- カード数100件程度までスムーズ動作
- ドラッグ&ドロップ200ms animation
- インデックス最適化（16個）

### 8.2 セキュリティ
- パスワードbcryptハッシュ化
- CSRF対策（SvelteKit標準）
- セッション管理

### 8.3 ブラウザ対応
- Chrome最新版
- Firefox最新版
- Safari最新版

---

## 9. 実装優先順位

### Phase 1（完了）
- 認証機能
- プロジェクト管理
- ボード・リスト・カードCRUD
- ドラッグ&ドロップ
- タグ・ラベル機能

### Phase 2（完了）
- KPI目標追跡システム
- YouTube統計連携
- Discord通知
- カレンダービュー

### Phase 3（拡張予定）
- Twitter API連携
- Facebook/Instagram連携
- 自作ブログAPI連携
- ファイル添付（Cloudflare R2）
- 検索機能
- アーカイブ機能

---

## 10. 技術的注意点

### 10.1 ドラッグ&ドロップ
- ライブラリ: svelte-dnd-action
- position値での順序管理
- flip animation: 200ms

### 10.2 D1接続
- Cloudflare Workers環境での`env`オブジェクト
- SvelteKitの`platform.env`からアクセス

### 10.3 データベース最適化
- インデックス16個設定済み
- position管理による順序保持
- JSON形式でのタグ保存

---

## 11. まとめ

このアプリケーションは、単純なTrelloクローンではなく、**複数プロジェクトと開発タスク、SNSマーケティング活動を統合管理する高機能ダッシュボードシステム**です。

特に以下のユーザーに最適：
- YouTuber / コンテンツクリエイター
- 複数プロジェクトを同時進行する個人
- SNSマーケティングと開発を並行管理する必要がある人
