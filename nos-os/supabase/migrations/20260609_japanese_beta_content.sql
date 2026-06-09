update public.employees
set position = values.position,
    department = values.department,
    bio = values.bio,
    updated_at = now()
from (
  values
    ('0646e8a9-dbc2-525b-b99f-dddaa74dfdee'::uuid, '管理者 / 代表', '経営・営業', '会社全体の案件、売上、タスク優先度を確認します。'),
    ('e47d3925-107f-5836-b288-bc701828be71'::uuid, '管理者 / 運用', '経営・運用', '社員βの運用、案件確認、タスク整理を担当します。'),
    ('592a547d-7c00-502e-a5a3-dd57fec5679d'::uuid, '社員', '制作・運用', '制作、確認、営業準備のタスクを担当します。'),
    ('4bd50f79-5bed-5dd5-9d39-1908f8d16ff2'::uuid, '社員', 'システム開発', 'システム、DB、業務改善タスクを担当します。')
) as values(id, position, department, bio)
where public.employees.id = values.id;

update public.customers
set name = values.name,
    company = values.company,
    notes = values.notes,
    updated_at = now()
from (
  values
    ('9d0dcc9a-4625-5387-bdef-3cc5082b397c'::uuid, 'NosTechnology 事業運営', 'NosTechnology', '社員βで使う社内運用データ。営業、案件、タスク、勤怠の確認に使います。'),
    ('57efe911-9803-5f5f-bab1-06986d46336b'::uuid, '店舗向けWeb制作候補', '店舗向けWeb制作候補', '飲食店、カフェ、店舗向けにWeb制作デモを見せて初回商談につなげる候補。'),
    ('09cdb9df-24cf-5c67-a008-d775be2e7210'::uuid, '中小企業ツール候補', '中小企業ツール候補', '勤怠、在庫、売上メモ、問い合わせ管理など小さい業務改善ツールの相談候補。'),
    ('46829e10-8861-579e-8e41-5f1d92bf61f7'::uuid, '高単価POC候補', '高単価POC候補', 'ヒアリング、サンプル確認、POC、検証、本開発の順で無理なく進める候補。')
) as values(id, name, company, notes)
where public.customers.id = values.id;

update public.projects
set name = values.name,
    notes = values.notes,
    updated_at = now()
from (
  values
    ('65642bd9-140c-55a6-891a-0bfd0d4879a3'::uuid, '6月 初受注・営業スプリント', '初回受注に向けて、連絡先選定、返信対応、商談化、見積提出まで毎日確認します。'),
    ('a0677715-9120-5849-98c7-76fe36322078'::uuid, '店舗向けWeb制作デモ販売', '店舗向けデモページと説明文を整え、営業で見せられる状態にします。'),
    ('240b0959-9d57-5600-9172-8d10182bfb87'::uuid, '小規模業務改善ツール雛形', '勤怠、在庫、売上メモ、問い合わせ管理を小さく作れる型にします。'),
    ('696aaba0-a249-5558-a843-1ac436a2dc53'::uuid, '高単価システム開発 POC準備', 'サンプル確認、POC、検証、本開発の段階に分けて提案します。'),
    ('b89ae7f4-3c37-5ca3-95af-7ca2d2739c94'::uuid, 'SNS・受託サイト営業導線', 'ココナラ、クラウドワークス、SNS、DM、紹介営業の入口を準備します。')
) as values(id, name, notes)
where public.projects.id = values.id;

update public.tasks
set title = values.title,
    body = values.body,
    updated_at = now()
from (
  values
    ('f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce'::uuid, '返信が来た候補へ次回確認日を返す', '温度が下がる前に、日程候補と次に確認する内容を短く返します。'),
    ('3fbf6ddc-c89e-52d9-873b-d19efcb70123'::uuid, '今日連絡する営業先10件を決める', '見込みが高い候補を選び、最初の一言まで用意します。'),
    ('6f3edf32-5067-59bb-8fd3-6d165fa180f8'::uuid, '売上管理シートの初期項目を確定', '担当、流入元、商品カテゴリ、状態、見込み金額、確度、次アクションを固定します。'),
    ('808ea268-10d3-58c2-8ff2-b3c6558daf8a'::uuid, 'Webデモの説明を営業向けに整える', 'デモの違い、価格の入口、納品までの流れを営業で話しやすい言葉に直します。'),
    ('37d8297a-3a86-582f-b364-1943049f2d00'::uuid, 'ココナラ出品文と応募文を公開前確認', 'Web制作、小ツール、資料作成の3カテゴリで最初に出せる文面を整えます。'),
    ('2182d3ab-4a93-5198-8b9e-dfe1be5ff2d1'::uuid, '小規模ツールのヒアリング質問を1枚にする', '勤怠、在庫、売上メモ、日報の確認項目に絞って商談で使える形にします。'),
    ('8c39a87c-fe22-58c7-9a27-184860fcef62'::uuid, '高単価POCの検証ステップを整理', 'サンプル確認、POC、検証、本開発を分け、見積前に潰す不確実性を書きます。'),
    ('60336217-e420-5e4c-8097-90e699904374'::uuid, 'メンバー別の今週成果物を登録', '各メンバーが今週出す見える成果物を1つずつ決めます。')
) as values(id, title, body)
where public.tasks.id = values.id;

update public.task_comments
set body = '午前中に一言だけでも返して、商談化の温度を落とさないようにします。'
where id = '945125a1-33b8-5e1b-b739-37fa675c2117'::uuid;

update public.notifications
set title = values.title,
    body = values.body
from (
  values
    ('a276f0af-e18a-51ce-b9f8-1d8569414ba4'::uuid, '返信対応と営業先選定が本日期限です', '先に返信対応を済ませてから、今日連絡する10件を決めてください。'),
    ('18ef070e-1fa0-56aa-bc0b-b485bece204b'::uuid, '今週成果物の登録が本日期限です', '各メンバーに、今週出す見える成果物を1つずつ登録してもらってください。')
) as values(id, title, body)
where public.notifications.id = values.id;

update public.goal_trees
set title = '会社',
    goal = '2026年12月までに売上1000万円を達成する',
    metrics = '[{"id":"metric-company-revenue","label":"売上","current":0,"target":10000000,"unit":"円"},{"id":"metric-company-contracts","label":"契約","current":0,"target":3,"unit":"件"}]'::jsonb,
    branches = '[{"id":"branch-company-web","title":"Web制作で初受注を作る","dueDate":"2026-07-01","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","projectId":"65642bd9-140c-55a6-891a-0bfd0d4879a3","tasks":[{"id":"tree-task-company-list","title":"営業リストを作る","dueDate":"2026-06-10","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","taskId":"3fbf6ddc-c89e-52d9-873b-d19efcb70123"},{"id":"tree-task-company-reply","title":"返信候補を商談につなげる","dueDate":"2026-06-12","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","taskId":"f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce"}]}]'::jsonb,
    updated_at = now()
where id = 'c3020014-e7fe-5072-bef5-a9a60f999910'::uuid;

update public.goal_trees
set title = '今日',
    goal = '返信対応、営業先選定、サンプル確認を今日進める',
    metrics = '[{"id":"metric-daily-contact","label":"連絡","current":0,"target":10,"unit":"件"}]'::jsonb,
    branches = '[{"id":"branch-daily-sales","title":"午前中に営業を動かす","dueDate":"2026-06-09","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","projectId":"65642bd9-140c-55a6-891a-0bfd0d4879a3","tasks":[{"id":"tree-task-daily-reply","title":"返信候補に次回確認日を返す","dueDate":"2026-06-09","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","taskId":"f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce"},{"id":"tree-task-daily-ten","title":"今日連絡する10件を決める","dueDate":"2026-06-09","assigneeId":"0646e8a9-dbc2-525b-b99f-dddaa74dfdee","taskId":"3fbf6ddc-c89e-52d9-873b-d19efcb70123"}]}]'::jsonb,
    updated_at = now()
where id = 'ff7169ce-3226-532a-a97a-7ebf886896f4'::uuid;

update public.goal_trees
set title = '橋迫 個人目標',
    goal = 'Webサンプルを営業で売りやすい状態にする',
    metrics = '[{"id":"metric-hashisako-samples","label":"サンプル","current":5,"target":10,"unit":"個"}]'::jsonb,
    branches = '[{"id":"branch-hashisako-design","title":"デザインサンプルを整える","dueDate":"2026-06-12","assigneeId":"592a547d-7c00-502e-a5a3-dd57fec5679d","projectId":"a0677715-9120-5849-98c7-76fe36322078","tasks":[{"id":"tree-task-hashisako-restaurant","title":"飲食店サンプルを営業向けに見直す","dueDate":"2026-06-10","assigneeId":"592a547d-7c00-502e-a5a3-dd57fec5679d","taskId":null}]}]'::jsonb,
    updated_at = now()
where id = 'aa55407f-1efa-58f3-982b-b9f8061384b8'::uuid;
