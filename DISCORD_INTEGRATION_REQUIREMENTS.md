# Discord連携スケジュール通知機能 - 要件定義書

## 1. 機能概要
ボード単位でDiscord Webhookと連携し、期限が近いタスクを定期的に通知する機能を実装する。

## 2. 機能要件

### 2.1 通知内容
- **期限が近いタスクの一覧**を通知
- 各タスクに表示する情報：
  - タスク名（カードタイトル）
  - 期限日（due_date）
  - 所属リスト名
  - 残り日数

### 2.2 通知対象の基準
- **ボードごとに設定可能**
- 「期限が近い」の基準日数を個別に設定
  - 例: 3日前、7日前など
  - デフォルト: 3日

### 2.3 通知スケジュール
- **詳細設定式**のUI
  - 曜日選択（複数選択可）
  - 時刻選択（時・分）
  - 頻度設定（毎日、毎週、隔週など）
- 内部的にはCron式で管理

### 2.4 設定レベル
- **ボード単位**で設定
- 各ボードに以下を設定：
  - Discord Webhook URL
  - 通知の有効/無効
  - 通知基準日数（何日前から）
  - 通知スケジュール（Cron式）

### 2.5 メッセージフォーマット
- **シンプルなテキスト形式**
- 装飾は最小限
- 例:
```
【タスク管理】期限が近いタスク通知

ボード: プロジェクトA

期限が近いタスク (3日以内):

1. タスク名: ○○○の実装
   期限: 2025-11-22
   リスト: 進行中
   残り: 2日

2. タスク名: △△△のレビュー
   期限: 2025-11-23
   リスト: レビュー待ち
   残り: 3日
```

### 2.6 0件時の挙動
- 期限が近いタスクが0件の場合は**通知しない**
- Discord側に無駄なメッセージを送らない

## 3. データベース設計

### 3.1 新規テーブル: `board_discord_settings`
```sql
CREATE TABLE board_discord_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  webhook_url TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,  -- 1: 有効, 0: 無効
  days_ahead INTEGER DEFAULT 3,  -- 何日前から通知するか
  cron_schedule TEXT NOT NULL,  -- Cron式（例: "0 9 * * 1-5" = 平日9時）
  timezone TEXT DEFAULT 'Asia/Tokyo',  -- タイムゾーン
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_board_discord_board_id ON board_discord_settings(board_id);
```

## 4. 画面設計

### 4.1 ボード設定画面
`/dashboard/board/[boardId]/settings` に新規ページを追加

#### 設定項目
1. **Discord連携の有効/無効**
   - トグルスイッチ

2. **Webhook URL**
   - テキスト入力フィールド
   - プレースホルダー: "https://discord.com/api/webhooks/..."
   - バリデーション: Discord Webhook URLの形式チェック

3. **通知基準日数**
   - 数値入力フィールド
   - 範囲: 1〜30日
   - デフォルト: 3日
   - ラベル: "期限の何日前から通知しますか？"

4. **通知スケジュール設定**
   - **頻度選択**:
     - 毎日
     - 毎週（曜日選択）
     - カスタム（Cron式）
   - **時刻選択**:
     - 時（0-23）
     - 分（0, 15, 30, 45）
   - **曜日選択**（毎週の場合）:
     - 月、火、水、木、金、土、日（複数選択可）

5. **プレビューボタン**
   - 現在の設定で実際に通知を送信してテスト

6. **保存ボタン**

### 4.2 ダッシュボードへのリンク追加
- ボード一覧に「設定」アイコンを追加
- ボード詳細画面のヘッダーに「設定」リンクを追加

## 5. 技術仕様

### 5.1 スケジュール実行
- **Cloudflare Workers Cron Triggers**を使用
- 最小実行間隔: 1分ごとにチェック
- Cron設定: `wrangler.toml`に記載
```toml
[triggers]
crons = ["* * * * *"]  # 1分ごとに実行
```

### 5.2 実行フロー
1. Cron Triggerが1分ごとに実行
2. 現在時刻を取得
3. 全ボードのDiscord設定を取得
4. 各設定のCron式と現在時刻を比較
5. 実行タイミングに一致する場合:
   - 該当ボードの期限が近いタスクを取得
   - タスクが1件以上ある場合のみDiscordに送信

### 5.3 Discord Webhook送信
- HTTP POSTリクエスト
- Content-Type: `application/json`
- ボディ:
```json
{
  "content": "【タスク管理】期限が近いタスク通知\n\nボード: {board_title}\n\n..."
}
```

### 5.4 Cron式の管理
- ユーザーが詳細設定で選択した内容をCron式に変換
- 例:
  - 毎日9時 → `0 9 * * *`
  - 毎週月・水・金の18時 → `0 18 * * 1,3,5`
  - 隔週火曜10時 → `0 10 * * 2` (隔週は別ロジックで管理)

### 5.5 タイムゾーン対応
- デフォルト: `Asia/Tokyo` (JST)
- Cloudflare WorkersはUTCで動作するため、時刻変換が必要

## 6. セキュリティ要件

### 6.1 Webhook URLの保護
- Webhook URLは暗号化して保存（オプション）
- 設定画面では一部をマスク表示（例: `https://discord.com/api/webhooks/***...***`）

### 6.2 バリデーション
- Webhook URLの形式チェック
- 不正なCron式を防ぐ
- days_ahead の範囲チェック（1〜30日）

### 6.3 レート制限
- 同じボードから1分間に複数の通知を送らないようにする
- 最終送信時刻を記録

## 7. エラーハンドリング

### 7.1 Discord送信失敗時
- エラーログを記録
- ユーザーには通知しない（サイレントフェイル）
- 管理画面に「最終送信ステータス」を表示

### 7.2 Webhook URLが無効な場合
- 設定保存時にテスト送信を実行
- 失敗した場合はエラーメッセージを表示

## 8. 実装優先順位

### Phase 1（基本機能）
1. データベーステーブル作成
2. ボード設定画面のUI
3. Discord Webhook送信機能
4. 期限が近いタスクの取得ロジック

### Phase 2（スケジュール機能）
1. Cron Trigger設定
2. スケジュール判定ロジック
3. 定期実行処理

### Phase 3（改善）
1. プレビュー機能
2. 送信履歴の記録
3. エラーログ表示
4. Webhook URLの暗号化

## 9. 今後の拡張可能性

- メンション機能（@role, @user）
- Discord Embed対応
- 複数Webhook対応
- 通知テンプレートのカスタマイズ
- ラベル別の通知
- リスト別の通知設定
- Slack, Microsoft Teams対応
