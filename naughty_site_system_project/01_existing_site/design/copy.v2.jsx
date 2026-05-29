/* global React */
// =====================================================
// naughty — copy bank (sharp / friendly)
// 2つのトーンを切り替えられるように
// =====================================================

window.NaughtyCopy = {
  sharp: {
    fvTagline: "深夜0時、画面の向こうから、",
    fvLine2: "はじまる、",
    fvLineEm: "いたずら。",
    fvSub: "あなたの夜を、ちょっとだけ狂わせる。\nコンセプトカフェ「naughty」、東京・○○。",
    fvMeta: "EST. 2026 — TOKYO",
    fvBadge: "OPEN 20:00 — 26:00",

    conceptLead1: "舞台は、",
    conceptLeadEm: "深夜の小さな部屋。",
    conceptLead2: "8人のいたずらっ子が、\n今夜もあなたを待っている。",
    conceptBody: [
      "naughtyは、東京の片隅にひっそりと佇むコンセプトカフェ。",
      "「いたずらっ子」というモチーフを軸に、明るくて少しいたずらな夜を提供します。普段は出会えない、ちょっと特別なキャストたちとの時間を。",
      "白と黒、そしてピンクの線一本。私たちは、夜の編集者です。"
    ],
    conceptBullets: [
      { k: "Concept", v: "Naughty × Editorial — いたずらっ子の編集室" },
      { k: "Open",    v: "20:00 — 26:00 / 火 → 日" },
      { k: "Cast",    v: "週ごとに入れ替わる8名の常連メンバー" },
      { k: "Style",   v: "白黒×ピンク。雑誌のように、夜を編む。" }
    ],
    conceptBadge: ["NAUGHTY", "EST. 2026"],

    ctaH2Line1: "今夜、",
    ctaH2Em: "いたずら",
    ctaH2Line2: "を、はじめる。",

    accessH: "naughty 東京・○○",
    accessSub: "BAR & CONCEPT CAFE",
    newsItems: [
      { date: "2026.05.14", pin: "EVENT", t: "5月の限定メニュー『苺と意地悪』本日より販売開始しました。", event: true },
      { date: "2026.05.10", pin: "NEWS",  t: "新キャスト「鈴」「桃」がデビューします。プロフィール公開中。" },
      { date: "2026.05.06", pin: "INFO",  t: "ゴールデンウィーク期間中の営業時間変更のお知らせ。" },
      { date: "2026.05.01", pin: "MEDIA", t: "雑誌『TOKYO NIGHT』にnaughtyが掲載されました。" }
    ]
  },
  friendly: {
    fvTagline: "夜、こっそりはじまる。",
    fvLine2: "ちょっとした、",
    fvLineEm: "いたずら。",
    fvSub: "8人の女の子と、ゆるくて少しだけ可愛い時間を。\n東京・○○の、深夜0時のお店。",
    fvMeta: "SINCE 2026 — TOKYO",
    fvBadge: "OPEN 20:00 — 26:00",

    conceptLead1: "ここは、",
    conceptLeadEm: "夜のヒミツ基地。",
    conceptLead2: "8人のいたずらっ子が、\nあなたの夜にこっそり遊びにきます。",
    conceptBody: [
      "naughtyは、東京・○○にある、小さなコンセプトカフェ。",
      "「いたずらっ子」をモチーフにした、白黒+ピンクの世界観で、明るくて元気で、ちょっとだけ特別な夜をお届けします。仕事終わりに、お酒と一緒に、軽い気持ちでどうぞ。",
      "あなたのお気に入りの、いたずらっ子に出会えるかも。"
    ],
    conceptBullets: [
      { k: "About", v: "いたずらっ子モチーフの、コンセプトカフェ" },
      { k: "Open",  v: "20:00 — 26:00 / 火 → 日(月曜定休)" },
      { k: "Cast",  v: "個性派の8名。あなたの推しを見つけて。" },
      { k: "Vibe",  v: "白黒+ピンク、ゆるくて可愛い夜。" }
    ],
    conceptBadge: ["WELCOME!", "naughty 2026"],

    ctaH2Line1: "ふらっと、",
    ctaH2Em: "あそびに",
    ctaH2Line2: "きませんか。",

    accessH: "naughty 東京・○○店",
    accessSub: "コンセプトカフェ & バー",
    newsItems: [
      { date: "2026.05.14", pin: "EVENT", t: "5月の限定メニュー「いちごのいたずら」はじめました🍓 ぜひ。", event: true },
      { date: "2026.05.10", pin: "NEWS",  t: "新しい子が2人デビューします!プロフィールをチェック。" },
      { date: "2026.05.06", pin: "INFO",  t: "GWの営業時間が変わります。詳しくは記事をご覧ください。" },
      { date: "2026.05.01", pin: "MEDIA", t: "雑誌『TOKYO NIGHT』に取材していただきました。ありがとう!" }
    ]
  }
};

// Cast list (8 people)
window.NaughtyCast = [
  { en: "GIN",  jp: "ぎん",   tags: ["VOCAL","CAT"],     photo: "assets/cast/cast-01.png" },
  { en: "MOA",  jp: "もあ",  tags: ["LEAD","BUNNY"],    photo: "assets/cast/cast-02.png" },
  { en: "RIN",  jp: "りん",  tags: ["DEVIL","DANCE"],   photo: "assets/cast/cast-03.png" },
  { en: "NANA", jp: "なな",  tags: ["ANGEL","DJ"],      photo: "assets/cast/cast-04.png" },
  { en: "SAKI", jp: "さき",  tags: ["FOX","ART"],       photo: "assets/cast/cast-05.png" },
  { en: "MIYU", jp: "みゆ",  tags: ["WITCH","DRINK"],   photo: null },
  { en: "KOI",  jp: "こい",  tags: ["HEART","SHOW"],    photo: null },
  { en: "YURA", jp: "ゆら",  tags: ["MOON","KARAOKE"],  photo: null }
];

// Schedule (8 cast × 7 days) — true = on shift, "event" = special, false = off
window.NaughtyScheduleMatrix = [
  // M T W Th F Sa Su
  [true,  false, true,  true,  true,  true,  false], // GIN
  [false, true,  true,  false, true,  "event",true ], // MOA
  [true,  true,  false, true,  true,  true,  false], // RIN
  [false, false, true,  true,  false, true,  true ], // NANA
  [true,  true,  true,  false, true,  true,  false], // SAKI
  [false, true,  false, true,  true,  "event",true ], // MIYU
  [true,  false, true,  true,  false, true,  true ], // KOI
  [false, true,  true,  false, true,  true,  false], // YURA
];

window.NaughtyWeekDates = [
  { w: "MON", d: 18, today: false },
  { w: "TUE", d: 19, today: true  },
  { w: "WED", d: 20, today: false },
  { w: "THU", d: 21, today: false },
  { w: "FRI", d: 22, today: false },
  { w: "SAT", d: 23, today: false },
  { w: "SUN", d: 24, today: false },
];
