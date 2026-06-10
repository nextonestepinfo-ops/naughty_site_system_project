const base = process.env.NOS_OS_PRODUCTION_URL || "https://nos-os-silk.vercel.app";
const adminScope = "?role=admin&employeeId=0646e8a9-dbc2-525b-b99f-dddaa74dfdee";

const employees = {
  "0646e8a9-dbc2-525b-b99f-dddaa74dfdee": { position: "管理者 / 代表", department: "経営・営業", bio: "会社全体の案件、売上、タスク優先度を確認します。" },
  "e47d3925-107f-5836-b288-bc701828be71": { position: "管理者 / 運用", department: "経営・運用", bio: "社員βの運用、案件確認、タスク整理を担当します。" },
  "592a547d-7c00-502e-a5a3-dd57fec5679d": { position: "社員", department: "制作・運用", bio: "制作、確認、営業準備のタスクを担当します。" },
  "4bd50f79-5bed-5dd5-9d39-1908f8d16ff2": { position: "社員", department: "システム開発", bio: "システム、DB、業務改善タスクを担当します。" },
};

const customers = {
  "9d0dcc9a-4625-5387-bdef-3cc5082b397c": { name: "NosTechnology 事業運営", company: "NosTechnology", notes: "社員βで使う社内運用データ。営業、案件、タスク、勤怠の確認に使います。" },
  "57efe911-9803-5f5f-bab1-06986d46336b": { name: "店舗向けWeb制作候補", company: "店舗向けWeb制作候補", notes: "飲食店、カフェ、店舗向けにWeb制作デモを見せて初回商談につなげる候補。" },
  "09cdb9df-24cf-5c67-a008-d775be2e7210": { name: "中小企業ツール候補", company: "中小企業ツール候補", notes: "勤怠、在庫、売上メモ、問い合わせ管理など小さい業務改善ツールの相談候補。" },
  "46829e10-8861-579e-8e41-5f1d92bf61f7": { name: "高単価POC候補", company: "高単価POC候補", notes: "ヒアリング、サンプル確認、POC、検証、本開発の順で無理なく進める候補。" },
};

const projects = {
  "65642bd9-140c-55a6-891a-0bfd0d4879a3": { name: "6月 初受注・営業スプリント", notes: "初回受注に向けて、連絡先選定、返信対応、商談化、見積提出まで毎日確認します。" },
  "a0677715-9120-5849-98c7-76fe36322078": { name: "店舗向けWeb制作デモ販売", notes: "店舗向けデモページと説明文を整え、営業で見せられる状態にします。" },
  "240b0959-9d57-5600-9172-8d10182bfb87": { name: "小規模業務改善ツール雛形", notes: "勤怠、在庫、売上メモ、問い合わせ管理を小さく作れる型にします。" },
  "696aaba0-a249-5558-a843-1ac436a2dc53": { name: "高単価システム開発 POC準備", notes: "サンプル確認、POC、検証、本開発の段階に分けて提案します。" },
  "b89ae7f4-3c37-5ca3-95af-7ca2d2739c94": { name: "SNS・受託サイト営業導線", notes: "ココナラ、クラウドワークス、SNS、DM、紹介営業の入口を準備します。" },
};

const tasks = {
  "f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce": { title: "【テスト】返信が来た候補へ次回確認日を返す", description: "温度が下がる前に、日程候補と次に確認する内容を短く返します。" },
  "3fbf6ddc-c89e-52d9-873b-d19efcb70123": { title: "【テスト】今日連絡する営業先10件を決める", description: "見込みが高い候補を選び、最初の一言まで用意します。" },
  "6f3edf32-5067-59bb-8fd3-6d165fa180f8": { title: "【テスト】売上管理シートの初期項目を確定", description: "担当、流入元、商品カテゴリ、状態、見込み金額、確度、次アクションを固定します。" },
  "808ea268-10d3-58c2-8ff2-b3c6558daf8a": { title: "【テスト】Webデモの説明を営業向けに整える", description: "デモの違い、価格の入口、納品までの流れを営業で話しやすい言葉に直します。" },
  "37d8297a-3a86-582f-b364-1943049f2d00": { title: "【テスト】ココナラ出品文と応募文を公開前確認", description: "Web制作、小ツール、資料作成の3カテゴリで最初に出せる文面を整えます。" },
  "2182d3ab-4a93-5198-8b9e-dfe1be5ff2d1": { title: "【テスト】小規模ツールのヒアリング質問を1枚にする", description: "勤怠、在庫、売上メモ、日報の確認項目に絞って商談で使える形にします。" },
  "8c39a87c-fe22-58c7-9a27-184860fcef62": { title: "【テスト】高単価POCの検証ステップを整理", description: "サンプル確認、POC、検証、本開発を分け、見積前に潰す不確実性を書きます。" },
  "60336217-e420-5e4c-8097-90e699904374": { title: "【テスト】メンバー別の今週成果物を登録", description: "各メンバーが今週出す見える成果物を1つずつ決めます。" },
};

const goalTrees = {
  "c3020014-e7fe-5072-bef5-a9a60f999910": {
    title: "会社",
    goal: "2026年12月までに売上1000万円を達成する",
    metrics: [
      { id: "metric-company-revenue", label: "売上", current: 0, target: 10000000, unit: "円" },
      { id: "metric-company-contracts", label: "契約", current: 0, target: 3, unit: "件" },
    ],
    branches: [
      {
        id: "branch-company-web",
        title: "Web制作で初受注を作る",
        dueDate: "2026-07-01",
        assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee",
        projectId: "65642bd9-140c-55a6-891a-0bfd0d4879a3",
        tasks: [
          { id: "tree-task-company-list", title: "【テスト】営業リストを作る", dueDate: "2026-06-10", assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee", taskId: "3fbf6ddc-c89e-52d9-873b-d19efcb70123" },
          { id: "tree-task-company-reply", title: "【テスト】返信候補を商談につなげる", dueDate: "2026-06-12", assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee", taskId: "f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce" },
        ],
      },
    ],
  },
  "ff7169ce-3226-532a-a97a-7ebf886896f4": {
    title: "今日",
    goal: "返信対応、営業先選定、サンプル確認を今日進める",
    metrics: [{ id: "metric-daily-contact", label: "連絡", current: 0, target: 10, unit: "件" }],
    branches: [
      {
        id: "branch-daily-sales",
        title: "午前中に営業を動かす",
        dueDate: "2026-06-09",
        assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee",
        projectId: "65642bd9-140c-55a6-891a-0bfd0d4879a3",
        tasks: [
          { id: "tree-task-daily-reply", title: "【テスト】返信候補に次回確認日を返す", dueDate: "2026-06-09", assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee", taskId: "f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce" },
          { id: "tree-task-daily-ten", title: "【テスト】今日連絡する10件を決める", dueDate: "2026-06-09", assigneeId: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee", taskId: "3fbf6ddc-c89e-52d9-873b-d19efcb70123" },
        ],
      },
    ],
  },
  "aa55407f-1efa-58f3-982b-b9f8061384b8": {
    title: "橋迫 個人目標",
    goal: "Webサンプルを営業で売りやすい状態にする",
    metrics: [{ id: "metric-hashisako-samples", label: "サンプル", current: 5, target: 10, unit: "個" }],
    branches: [
      {
        id: "branch-hashisako-design",
        title: "デザインサンプルを整える",
        dueDate: "2026-06-12",
        assigneeId: "592a547d-7c00-502e-a5a3-dd57fec5679d",
        projectId: "a0677715-9120-5849-98c7-76fe36322078",
        tasks: [{ id: "tree-task-hashisako-restaurant", title: "【テスト】飲食店サンプルを営業向けに見直す", dueDate: "2026-06-10", assigneeId: "592a547d-7c00-502e-a5a3-dd57fec5679d", taskId: null }],
      },
    ],
  },
};

async function patch(path, body) {
  const response = await fetch(`${base}${path}${adminScope}`, {
    method: "PATCH",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${text}`);
}

for (const [id, body] of Object.entries(employees)) await patch(`/api/employees/${id}`, body);
for (const [id, body] of Object.entries(customers)) await patch(`/api/customers/${id}`, body);
for (const [id, body] of Object.entries(projects)) await patch(`/api/projects/${id}`, body);
for (const [id, body] of Object.entries(tasks)) await patch(`/api/tasks/${id}`, body);
for (const [id, body] of Object.entries(goalTrees)) await patch(`/api/goal-trees/${id}`, body);

console.log("Production beta data localized.");
