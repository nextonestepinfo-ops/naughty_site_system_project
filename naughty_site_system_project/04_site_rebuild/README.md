# Webサイト再構築作業場所

ここに、既存Webサイト案をもとに再構成したサイトを作る。

## 方針

- 既存トップのVすぽ風ファーストビューは活かす。
- その他の構成、素材、ページは再検討する。
- スタッフ紹介、出勤、シフト、イベント、メニューは管理システム側のデータから表示できるようにする。
- スマホ表示を優先して見やすくする。

## 現在のプロトタイプ

- `index.html`
  - 公開サイト側のvNextプロトタイプ。
  - `naughty_Webサイト-handoff.zip` のReact/Babelデザインを基準に、PC/スマホ両対応で表示。
- `app.js`
  - 既存CMSデータをvNextデザイン用の `window.NTY` 形式へ変換するアダプター。
  - 管理画面が保存した `localStorage` の内容があれば優先し、なければ `../03_system_seed/naughty_site_data.js` を使う。
- `design/` / `site/`
  - vNextのデザインCSS、Reactコンポーネント、レスポンシブ指定、背景演出。

ローカル確認時はプロジェクトルートでHTTPサーバーを起動し、`/04_site_rebuild/index.html?v=vnext-mvp-20260616` を開く。
