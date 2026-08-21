/* =============================================================
   JasperPeng — data.js
   全站唯一数据源。

   多语言约定
   ----------
   L(简, 繁, En, 日) 生成一个四语字段。main.js 里的 T() 按当前
   语言取值，缺失时回落到简体。

   专有名词不翻译，四语共用同一写法：
     JasperPeng · 嗵嗵仮面 · NooteMetro · DOUDOU
     草莓酱 / 拉 / 祈 / 夏花 / 嗵嗵 / Noote（角色名）
   其余词汇（板块名、分类名、标题、导语、说明）全部提供四语。

   日期不写死，存 ISO 值，由 Intl 按语言格式化。

   加文章：往 ARTICLES 加一条，四语标题/导语都填上。
   加分类：往对应 section 的 cats 加一条，再跑一次 build.ps1。
   ============================================================= */
(function (w) {
  'use strict';

  var MAIL = 'pengjasper@icloud.com';

  /* 四语字段构造器 */
  function L(zhs, zht, en, ja) { return { 'zh-Hans': zhs, 'zh-Hant': zht, en: en, ja: ja }; }
  /* 专有名词：四语同形 */
  function P(s) { return { 'zh-Hans': s, 'zh-Hant': s, en: s, ja: s }; }

  /* ---------------------------------------------------------
     一级板块 · 顺序即导航顺序
     --------------------------------------------------------- */
  var SECTIONS = [
    {
      key: 'research', dir: 'research',
      label:  L('研究', '研究', 'Research', 'リサーチ'),
      title:  L('值得想清楚的问题', '值得想清楚的問題', 'Ideas worth exploring.', '考える価値のある問い'),
      lede:   L('关于创作、技术、文化与存在的笔记，以及还没想清楚的问题。',
                '關於創作、技術、文化與存在的筆記，以及還沒想清楚的問題。',
                'Notes on creativity, technology, culture and existence — including the questions still unresolved.',
                '創作・技術・文化・存在についてのメモ、そしてまだ答えの出ていない問い。'),
      kicker:     L('浏览研究', '瀏覽研究', 'Explore Research', 'リサーチを見る'),
      featKicker: L('我的研究', '我的研究', 'My Research', 'マイリサーチ'),
      cats: [
        { slug: 'news',       label: L('动态', '動態', 'News', 'ニュース'),
          desc: L('关于这个档案馆的更新、上线与阶段性记录。', '關於這個檔案館的更新、上線與階段性紀錄。',
                  'Updates, launches and milestones of this archive.', 'このアーカイブの更新・公開・節目の記録。') },
        { slug: 'philosophy', label: L('思考', '思考', 'Philosophy', '思索'),
          desc: L('关于创作、技术、文化与存在的笔记与个人思考。', '關於創作、技術、文化與存在的筆記與個人思考。',
                  'Notes and personal reflections on creativity, technology, culture and existence.',
                  '創作・技術・文化・存在についてのメモと個人的な考察。') }
      ],
      feature: [
        { to: 'article:the-word',   label: P('The word') },
        { to: 'article:image-read', label: L('图像', '圖像', 'Art', 'イメージ') }
      ]
    },
    {
      key: 'works', dir: 'works',
      label:  L('作品', '作品', 'Works', 'ワークス'),
      title:  L('精选作品', '精選作品', 'Selected Works', 'セレクテッドワークス'),
      lede:   L('手作、平面、插画与影像 —— 做出来的东西，以及做的过程。',
                '手作、平面、插畫與影像 —— 做出來的東西，以及做的過程。',
                'Crafts, graphics, illustration and photography — the things made, and the making of them.',
                '手仕事・グラフィック・イラスト・写真 ——「作ったもの」と「作る過程」。'),
      kicker:     L('浏览作品', '瀏覽作品', 'Explore Works', 'ワークスを見る'),
      featKicker: L('精选', '精選', 'Best goods', 'ベスト'),
      cats: [
        { slug: 'artifacts',     label: L('手作', '手作', 'Artifacts', '手仕事'),
          desc: L('手作物件与实体造物，以及它们的制作过程。', '手作物件與實體造物，以及它們的製作過程。',
                  'Handmade objects and physical artifacts, and how they were made.', '手作りの物と実体、そしてその制作過程。') },
        { slug: 'design',        label: L('设计', '設計', 'Design', 'デザイン'),
          desc: L('平面、版式与系统设计的实践与规范。', '平面、版式與系統設計的實踐與規範。',
                  'Graphic, layout and system design — practice and guidelines.', 'グラフィック・レイアウト・システム設計の実践と規範。') },
        { slug: 'illustrations', label: L('插画', '插畫', 'Illustrations', 'イラスト'),
          desc: L('插画作品与系列创作。', '插畫作品與系列創作。', 'Illustration works and series.', 'イラスト作品とシリーズ。') },
        { slug: 'comics',        label: L('漫画', '漫畫', 'Comics', 'コミック'),
          desc: L('短篇漫画与图像叙事实验。', '短篇漫畫與圖像敘事實驗。',
                  'Short comics and experiments in visual narrative.', '短編漫画と視覚的な語りの実験。') },
        { slug: 'art',           label: L('艺术', '藝術', 'Art', 'アート'),
          desc: L('不受媒介限制的自由创作。', '不受媒介限制的自由創作。',
                  'Free work, unbound by medium.', 'メディアに縛られない自由な制作。') },
        { slug: 'photos',        label: L('摄影', '攝影', 'Photos', 'フォト'),
          desc: L('旅途、城市与日常的摄影记录。', '旅途、城市與日常的攝影紀錄。',
                  'Photographs from travel, cities and daily life.', '旅・都市・日常の写真記録。') }
      ],
      feature: [
        { to: 'article:tongtong-mask',  label: P('嗵嗵仮面') },
        { to: 'article:indian-anklets', label: L('印度脚铃', '印度腳鈴', 'Indian anklets', 'インドの足鈴') },
        { to: 'article:doudou-seasons', label: P('DOUDOU') }
      ],
      tags: {
        kicker: L('摄影', '攝影', 'Photos', 'フォト'),
        items: [
          { to: 'article:osaka',           label: L('大阪', '大阪', 'Osaka', '大阪') },
          { to: 'article:kyoto',           label: L('京都', '京都', 'Kyoto', '京都') },
          { to: 'article:nanjing-station', label: L('南京站', '南京站', 'Nanjing station', '南京駅') }
        ]
      }
    },
    {
      key: 'universe', dir: 'universe',
      label:  L('世界观', '世界觀', 'Universe', 'ユニバース'),
      title:  L('一个属于自己的世界', '一個屬於自己的世界', 'A world of my own.', '自分だけの世界'),
      lede:   L('一座不存在的城市，和支撑它成立的地理、交通与建筑。',
                '一座不存在的城市，和支撐它成立的地理、交通與建築。',
                'A city that does not exist, and the geography, transit and architecture that make it hold together.',
                '存在しない都市と、それを成り立たせる地理・交通・建築。'),
      kicker:     L('浏览世界观', '瀏覽世界觀', 'Explore Universe', 'ユニバースを見る'),
      featKicker: L('品牌', '品牌', 'Brands', 'ブランド'),
      cats: [
        { slug: 'maps',         label: L('地图', '地圖', 'Maps', 'マップ'),
          desc: L('虚构世界的地图与地理体系。', '虛構世界的地圖與地理體系。',
                  'Maps and geography of a fictional world.', '架空世界の地図と地理体系。') },
        { slug: 'terrain',      label: L('地形', '地形', 'Terrain', '地形'),
          desc: L('地形、水系与自然环境设定。', '地形、水系與自然環境設定。',
                  'Terrain, rivers and natural environment.', '地形・水系・自然環境の設定。') },
        { slug: 'metro',        label: L('轨道交通', '軌道交通', 'Metro', 'メトロ'),
          desc: L('轨道交通线网与站点系统。', '軌道交通線網與站點系統。',
                  'Rail network and station systems.', '路線網と駅システム。') },
        { slug: 'architecture', label: L('建筑', '建築', 'Architecture', '建築'),
          desc: L('建筑、空间与城市肌理。', '建築、空間與城市肌理。',
                  'Buildings, spaces and urban texture.', '建築・空間・都市の肌理。') },
        { slug: 'scenery',      label: L('风景', '風景', 'Scenery', '風景'),
          desc: L('风景、光线与场景设定。', '風景、光線與場景設定。',
                  'Landscape, light and scene settings.', '風景・光・シーンの設定。') }
      ],
      feature: [ { to: 'article:noote-metro', label: P('NooteMetro') } ]
    },
    {
      key: 'characters', dir: 'characters',
      label:  L('角色', '角色', 'Characters', 'キャラクター'),
      title:  L('人、故事与身份', '人、故事與身分', 'People, stories and identities.', '人物・物語・アイデンティティ'),
      lede:   L('原创角色的设定、关系与他们各自的说话方式。',
                '原創角色的設定、關係與他們各自的說話方式。',
                'Original characters — their settings, relationships, and the way each of them speaks.',
                'オリジナルキャラクターの設定・関係、そしてそれぞれの語り口。'),
      kicker:     L('浏览角色', '瀏覽角色', 'Explore Characters', 'キャラクターを見る'),
      featKicker: L('原创角色', '原創角色', 'OC', 'オリキャラ'),
      cats: [
        { slug: 'oc',            label: L('原创角色', '原創角色', 'OC', 'オリキャラ'), to: 'characters/',
          desc: L('原创角色设定与三视图。', '原創角色設定與三視圖。',
                  'Original character sheets and turnarounds.', 'オリジナルキャラの設定と三面図。') },
        { slug: 'character',     label: L('角色', '角色', 'Character', 'キャラクター'), to: 'characters/',
          desc: L('角色关系、性格与故事线。', '角色關係、性格與故事線。',
                  'Relationships, personalities and story lines.', '関係性・性格・ストーリーライン。') },
        { slug: 'illustrations', label: L('角色插画', '角色插畫', 'Illustrations', 'キャライラスト'),
          desc: L('角色相关的插画作品。', '角色相關的插畫作品。',
                  'Illustrations featuring the characters.', 'キャラクター関連のイラスト。') },
        { slug: 'guidebook',     label: L('设定集', '設定集', 'Guidebook', '設定資料'),
          desc: L('角色使用规范与设定集。', '角色使用規範與設定集。',
                  'Usage guidelines and character guidebooks.', 'キャラ利用ガイドラインと設定資料。') }
      ],
      feature: [
        { to: 'char:caomeijiang', label: P('草莓酱') },
        { to: 'char:la',          label: P('拉') },
        { to: 'char:qi',          label: P('祈') },
        { to: 'char:xiahua',      label: P('夏花') }
      ]
    },
    {
      key: 'about', dir: 'resources',
      label:  L('关于', '關於', 'About', 'アバウト'),
      title:  L('作品背后的工具', '作品背後的工具', 'Tools behind the work.', '制作を支える道具'),
      lede:   L('可下载的素材、视觉规范，以及一些没处归类的东西。',
                '可下載的素材、視覺規範，以及一些沒處歸類的東西。',
                'Downloadable assets, visual guidelines, and a few things that fit nowhere else.',
                'ダウンロード素材、ビジュアル規範、そしてどこにも入らない諸々。'),
      kicker:     L('关于我', '關於我', 'About me', '私について'),
      featKicker: L('规范', '規範', 'Guidelines', 'ガイドライン'),
      cats: [
        { slug: 'resources',  label: L('资源', '資源', 'Resources', 'リソース'),
          desc: L('可下载的素材、字体与图形资源。', '可下載的素材、字體與圖形資源。',
                  'Downloadable assets, typefaces and graphics.', 'ダウンロード可能な素材・書体・グラフィック。') },
        { slug: 'guidelines', label: L('规范', '規範', 'Guidelines', 'ガイドライン'),
          desc: L('字体、标识与视觉识别规范。', '字體、標識與視覺識別規範。',
                  'Typography, logo and visual identity guidelines.', '書体・ロゴ・ビジュアルアイデンティティの規範。') },
        { slug: 'misc',       label: L('杂项', '雜項', 'Miscellaneous', 'その他'),
          desc: L('杂项记录与未归类内容。', '雜項紀錄與未歸類內容。',
                  'Miscellaneous notes and unfiled things.', '雑多な記録と未分類のもの。') }
      ],
      feature: [
        { to: 'article:fonts', label: L('字体', '字體', 'Fonts', '書体') },
        { to: 'article:logos', label: L('标识', '標識', 'Logos', 'ロゴ') },
        { to: 'cat:resources', label: L('插画素材', '插畫素材', 'Illustrations', 'イラスト素材') }
      ]
    },
    {
      key: 'contact', dir: null,
      label:  L('联系', '聯絡', 'Contact', 'コンタクト'),
      kicker:     L('联系', '聯絡', 'Contact', 'コンタクト'),
      featKicker: L('关于我', '關於我', 'About me', '私について'),
      links: [
        { label: L('邮件', '郵件', 'Mail', 'メール'), href: 'mailto:' + MAIL },
        { label: P('X'),       soon: true },
        { label: P('Bluesky'), soon: true },
        { label: P('Github'),  soon: true }
      ],
      notes: [
        { kicker: L('关于我', '關於我', 'About me', '私について'),
          text:   L('常驻中国大陆', '常駐中國大陸', 'Based in PRC', '中国本土在住') },
        { kicker: L('赞助', '贊助', 'Donate', 'サポート'),
          text:   L('暂未开放', '尚未開放', 'Coming soon', '準備中'), dim: true }
      ]
    }
  ];

  /* ---------------------------------------------------------
     角色 · 该页固定深色。名字为专有名词，不翻译。
     --------------------------------------------------------- */
  var CHARACTERS = [
    { slug: 'caomeijiang', name: P('草莓酱'), year: '2024', version: 'v3', res: 'resources',
      region: L('中央区', '中央區', 'Central', '中央区'),
      role:   L('Noote 看板娘', 'Noote 看板娘', 'Noote mascot', 'Noote 看板娘'),
      age:    L('19 岁', '19 歲', '19 years old', '19歳'), sex: P('♀'),
      quote:  P('Hello, This is puree strawberry'),
      bio:    L('第一个被完整定稿的角色，也是改得最多的一个。前六版都太好看了，好看到没有性格；第七版把配色压暗两度、加了一点不对称，人才立住。',
                '第一個被完整定稿的角色，也是改得最多的一個。前六版都太好看了，好看到沒有性格；第七版把配色壓暗兩度、加了一點不對稱，人才立住。',
                'The first character to be fully finalised, and the one revised most. The first six versions were too pretty — pretty to the point of having no personality. The seventh dropped the palette two steps and added a little asymmetry, and only then did she hold.',
                '最初に完全に確定したキャラクターであり、最も描き直したキャラクターでもある。最初の六版はきれいすぎた——性格が消えるほどに。七版目で配色を二段暗くし、少し非対称を加えて、ようやく立った。') },

    { slug: 'la', name: P('拉'), year: '2024', version: 'v2', res: 'resources',
      region: L('北岸', '北岸', 'North Shore', '北岸'),
      role:   L('沉默而可靠', '沉默而可靠', 'Silent and reliable', '寡黙で頼れる'),
      age:    L('24 岁', '24 歲', '24 years old', '24歳'), sex: P('♂'),
      quote:  P('……'),
      bio:    L('几乎没有台词。性格全靠站姿、视线方向，以及别人看他的反应来交代。',
                '幾乎沒有台詞。性格全靠站姿、視線方向，以及別人看他的反應來交代。',
                'Almost no lines. His personality is carried entirely by posture, where he looks, and how others react to him.',
                'ほとんど台詞がない。性格は立ち姿、視線の向き、そして他人の反応だけで語られる。') },

    { slug: 'qi', name: P('祈'), year: '2025', version: 'v1', res: 'resources',
      region: L('旧港', '舊港', 'Old Harbour', '旧港'),
      role:   L('话最多的那个', '話最多的那個', 'The talkative one', '一番よく喋る'),
      age:    L('21 岁', '21 歲', '21 years old', '21歳'), sex: P('♂'),
      quote:  L('所以说啊 —— 你听我讲完嘛', '所以說啊 —— 你聽我講完嘛',
                'So anyway — just let me finish', 'だからさ——最後まで聞いてよ'),
      bio:    L('设计难点在于：要让人一眼看出他很吵，但又不能让人觉得烦。答案是把音量放在配色上，而不是表情上。',
                '設計難點在於：要讓人一眼看出他很吵，但又不能讓人覺得煩。答案是把音量放在配色上，而不是表情上。',
                'The design problem: he must read as loud at a glance, without becoming annoying. The answer was to put the volume in the palette rather than the expression.',
                '設計上の難所は、一目で「うるさい」と分かりつつ、鬱陶しくならないこと。答えは、音量を表情ではなく配色に置くことだった。') },

    { slug: 'xiahua', name: P('夏花'), year: '2025', version: 'v2', res: 'resources',
      region: L('西丘', '西丘', 'West Hill', '西丘'),
      role:   L('出场最少', '出場最少', 'Fewest appearances', '出番は最少'),
      age:    L('17 岁', '17 歲', '17 years old', '17歳'), sex: P('♀'),
      quote:  L('我待会儿就走。', '我待會就走。', "I'm leaving in a minute.", 'もう少ししたら帰る。'),
      bio:    L('只在三张图里出现过，但每次都改变了整组画面的重心。存在感和出场次数无关。',
                '只在三張圖裡出現過，但每次都改變了整組畫面的重心。存在感和出場次數無關。',
                'She appears in only three pictures, yet each time she shifts the centre of gravity of the whole set. Presence has nothing to do with screen time.',
                '登場は三枚のみ。しかしそのたびに画面全体の重心が変わる。存在感は出番の多さとは関係がない。') },

    { slug: 'tong', name: P('嗵嗵'), year: '2025', version: 'v1', res: 'guidelines',
      region: L('地下线', '地下線', 'Underground', '地下線'),
      role:   L('面具下的沉默', '面具下的沉默', 'Silence behind a mask', '仮面の下の沈黙'),
      age:    L('年龄不明', '年齡不明', 'Age unknown', '年齢不詳'), sex: P('—'),
      quote:  L('（敲了敲面具）', '（敲了敲面具）', '(taps the mask)', '（仮面を叩く）'),
      bio:    L('从一张手作面具反推出来的角色。先有物件，后有人 —— 这是唯一一个这样诞生的。',
                '從一張手作面具反推出來的角色。先有物件，後有人 —— 這是唯一一個這樣誕生的。',
                'A character reverse-engineered from a handmade mask. The object came first, the person second — the only one born this way.',
                '手作りの仮面から逆算して生まれたキャラクター。物が先、人が後——こうして生まれたのはこの一人だけ。') },

    { slug: 'doudou', name: P('DOUDOU'), year: '2026', version: 'v4', res: 'resources',
      region: L('环线沿途', '環線沿途', 'Along the Loop', '環状線沿い'),
      role:   L('四季的容器', '四季的容器', 'A vessel for four seasons', '四季の器'),
      age:    P('—'), sex: P('—'),
      quote:  L('春天留白，冬天只剩轮廓。', '春天留白，冬天只剩輪廓。',
                'Spring leaves space; winter leaves only outline.', '春は余白を残し、冬は輪郭だけを残す。'),
      bio:    L('同一个角色活过四个季节，四张放在一起看才是完整的一句话。单看任何一张都不算数。',
                '同一個角色活過四個季節，四張放在一起看才是完整的一句話。單看任何一張都不算數。',
                'One character lived through four seasons. Only together do the four images form a complete sentence; any one alone does not count.',
                '同じキャラクターが四つの季節を生きる。四枚そろって初めて一つの文になる。一枚だけでは成立しない。') },

    { slug: 'noote', name: P('Noote'), year: '2026', version: 'v1', res: 'guidelines',
      region: L('全域', '全域', 'Everywhere', '全域'),
      role:   L('世界本身', '世界本身', 'The world itself', '世界そのもの'),
      age:    P('—'), sex: P('—'),
      quote:  L('这里的电车晚上会偏绿。', '這裡的電車晚上會偏綠。',
                'The trains here turn green at night.', 'ここの電車は夜になると緑に寄る。'),
      bio:    L('严格说不是角色，是这座城市的拟人。所有其他人都住在他身体里。',
                '嚴格說不是角色，是這座城市的擬人。所有其他人都住在他身體裡。',
                'Strictly speaking not a character but a personification of the city. Everyone else lives inside him.',
                '厳密にはキャラクターではなく、この都市の擬人化。ほかの全員が彼の中に住んでいる。') }
  ];

  /* ---------------------------------------------------------
     文章
     title / lede 四语；body 目前只有中文，见文件末尾说明。
     date 存 ISO 值，由 Intl 按语言格式化。
     --------------------------------------------------------- */
  var A = [];
  function add(o) { A.push(o); }

  /* ===== Works · Artifacts ===== */
  add({ slug: 'indian-anklets', section: 'works', cat: 'artifacts', date: '2026-08-18', read: 5,
    title: L('用铃铛和长绳编织一串印度脚铃', '用鈴鐺和長繩編織一串印度腳鈴',
             'Weaving a string of Indian anklets from bells and cord', '鈴と長い紐でインドの足鈴を編む'),
    lede:  L('福禄寿 FloruitShow 乐队作品中常出现的乐器，《玉珍》《兰若度母》等作品重要的乐器之一，声音清脆悦耳。',
             '福祿壽 FloruitShow 樂隊作品中常出現的樂器，《玉珍》《蘭若度母》等作品重要的樂器之一，聲音清脆悅耳。',
             'An instrument that recurs in the music of FloruitShow — central to tracks like Yuzhen and Tara — with a bright, ringing voice.',
             'FloruitShow の楽曲に度々登場する楽器。『玉珍』『蘭若度母』などで重要な役割を担い、澄んだ音色を持つ。'),
    tags: [L('作品','作品','Works','ワークス'), P('2026'), L('手作','手作','Handmade','手仕事')],
    body: [
      { t: 'p', v: '如果你听过福禄寿 FloruitShow 的歌，应该会发现她们的音乐里经常出现一些很有意思的传统乐器。印度脚铃就是其中让我印象比较深的一种。它看起来特别简单，就是用一根长绳把很多小铃铛串在一起，但真正用起来的时候，声音特别好听。' },
      { t: 'p', v: '这种铃铛最大的特点是会跟着人的动作一起响。走路、跳舞，或者只是轻轻晃动一下，都会发出清脆的声音。所以听起来会有一种很特别的感觉，好像声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'quote', v: '声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'p', v: '福禄寿在舞台上使用印度脚铃的时候，也让我觉得这种乐器特别适合她们的音乐。像《玉珍》《兰若度母》这些作品，本身就有很多传统文化的感觉，再加上铃铛的声音，整个作品就变得更加有自己的味道。' },
      { t: 'figure', cap: '编织过程 · 绳结与间距' },
      { t: 'p', v: '我觉得有意思的是，这种乐器真的很简单。没有什么复杂的结构，就是铃铛和绳子，却可以留下非常明显的声音。小时候我们可能也玩过类似的小铃铛，但到了音乐里，它就突然变成了一种很有氛围感的东西。' }
    ]});

  add({ slug: 'tongtong-mask', section: 'works', cat: 'artifacts', date: '2026-08-16', read: 6,
    title: L('嗵嗵仮面：一张面具的重量分配', '嗵嗵仮面：一張面具的重量分配',
             '嗵嗵仮面: how a mask distributes its weight', '嗵嗵仮面：仮面の重量配分'),
    lede:  L('造型稿画得再好看，戴上十分钟脖子就开始抗议 —— 面具真正的难点在看不见的地方。',
             '造型稿畫得再好看，戴上十分鐘脖子就開始抗議 —— 面具真正的難點在看不見的地方。',
             'However beautiful the concept drawing, ten minutes in and your neck starts complaining. The real difficulty of a mask lies where you cannot see it.',
             'どれほど美しい造形案でも、十分被れば首が抗議を始める。仮面の本当の難所は、見えないところにある。'),
    tags: [L('作品','作品','Works','ワークス'), P('2026'), L('手作','手作','Handmade','手仕事')],
    body: [
      { t: 'p', v: '做面具最容易被低估的一件事是重量。造型稿画得再好看，一旦材料铺满整张脸，重心就会往前掉，戴上十分钟脖子就开始抗议。' },
      { t: 'h2', v: '把重量往后挪' },
      { t: 'p', v: '解决办法其实很朴素：把结构性的部分做薄，把装饰性的部分往两侧和后脑分散，让整体重心尽量落在两耳连线上。这条线是头部转动的轴，重心压在轴上，脖子就不用一直较劲。' },
      { t: 'figure', cap: '内衬结构与配重点' },
      { t: 'p', v: '最后成品比第一版轻了将近四成，戴一个下午也不难受。造型几乎没改，改的全是看不见的地方 —— 这大概是所有可穿戴物件的共同规律。' }
    ]});

  /* ===== Works · Design ===== */
  add({ slug: 'grid-system', section: 'works', cat: 'design', date: '2026-08-12', read: 7,
    title: L('一套够用就好的网格系统', '一套夠用就好的網格系統',
             'A grid system that is just enough', '足りればいいグリッドシステム'),
    lede:  L('不追求覆盖所有情况，只解决这个档案馆自己的排版问题。',
             '不追求涵蓋所有情況，只解決這個檔案館自己的排版問題。',
             'Not built to cover every case — only to solve this archive’s own layout problems.',
             'あらゆるケースを網羅するのではなく、このアーカイブ自身の組版問題だけを解く。'),
    tags: [L('作品','作品','Works','ワークス'), L('设计','設計','Design','デザイン')],
    body: [
      { t: 'p', v: '十二列、1280 最大宽度、二十的间距单位。听起来平平无奇，但正因为平平无奇，它不会在任何一个页面上出意外。' },
      { t: 'h2', v: '断点只留三个' },
      { t: 'p', v: '九百以下收成单列导航，六百四十以下卡片降为两列。中间那些"看起来也需要调一下"的宽度，实际逐一测过之后发现并不需要 —— 加断点的冲动，多数时候来自没把流体单位用够。' },
      { t: 'p', v: '真正管用的是 clamp。字号、间距、圆角全都交给它，断点只负责改变结构（几列、横排还是竖排），不负责改数值。这样一套下来，需要手动照顾的地方少了三分之二。' }
    ]});

  add({ slug: 'type-scale', section: 'works', cat: 'design', date: '2026-08-11', read: 5,
    title: L('中英混排的字号阶梯', '中英混排的字號階梯',
             'A type scale for mixed Chinese and Latin', '和欧混植のためのタイプスケール'),
    lede:  L('同一个字号下，汉字看起来总比拉丁字母大一号。',
             '同一個字號下，漢字看起來總比拉丁字母大一號。',
             'At the same point size, Chinese characters always look a size larger than Latin letters.',
             '同じ級数でも、漢字はラテン文字より一回り大きく見える。'),
    tags: [L('作品','作品','Works','ワークス'), L('设计','設計','Design','デザイン')],
    body: [
      { t: 'p', v: '汉字是方的，拉丁字母有升部降部，所以同样 17px，一段中文的视觉重量明显比英文重。混排的时候如果不管，中文会显得又挤又黑。' },
      { t: 'p', v: '我的处理是：中文行高比英文多给 0.15，字间距给一点点正值，标题的字重比英文低一级。三个调整都很小，合起来才把两种文字拉到同一个视觉层面。' },
      { t: 'quote', v: '混排不是让两种文字一样大，是让它们看起来一样重。' }
    ]});

  /* ===== Works · Illustrations ===== */
  add({ slug: 'doudou-seasons', section: 'works', cat: 'illustrations', date: '2026-08-14', read: 4,
    title: L('DOUDOU 春夏秋冬 · 四条时间线', 'DOUDOU 春夏秋冬 · 四條時間線',
             'DOUDOU through four seasons — four timelines', 'DOUDOU 春夏秋冬 · 四つの時間軸'),
    lede:  L('同一个角色，四种季节，四种完全不同的呼吸节奏。',
             '同一個角色，四種季節，四種完全不同的呼吸節奏。',
             'One character, four seasons, four entirely different rhythms of breathing.',
             '同じキャラクター、四つの季節、まったく異なる四つの呼吸。'),
    tags: [L('作品','作品','Works','ワークス'), L('插画','插畫','Illustrations','イラスト')],
    body: [
      { t: 'p', v: '这一组的想法很简单：让同一个角色在四个季节里各活一次，看看画面会自己长成什么样。' },
      { t: 'p', v: '春天用了最多的留白，夏天几乎塞满，秋天开始往回收，冬天只剩下轮廓。四张放在一起看，才是完整的一句话；单看任何一张，都像话说了一半。' },
      { t: 'figure', cap: '秋卷 · 局部' }
    ]});

  add({ slug: 'linework', section: 'works', cat: 'illustrations', date: '2026-08-09', read: 4,
    title: L('线稿：什么时候该断笔', '線稿：什麼時候該斷筆',
             'Linework: when to break the stroke', '線画：どこで線を切るか'),
    lede:  L('一条不断的轮廓线会把形体锁死，断开反而更像。',
             '一條不斷的輪廓線會把形體鎖死，斷開反而更像。',
             'An unbroken contour locks the form in place; breaking it actually reads truer.',
             '途切れない輪郭線は形を固めてしまう。切ったほうが、かえって本物に見える。'),
    tags: [L('作品','作品','Works','ワークス'), L('插画','插畫','Illustrations','イラスト')],
    body: [
      { t: 'p', v: '刚开始画的时候总想把轮廓封死，觉得线连不上就是没画完。后来发现，受光那一侧的线断掉，形体反而更透气，也更像有光照在上面。' },
      { t: 'p', v: '规律大致是：背光处线重且连续，受光处线轻甚至断开。这不是省事，是让线条承担明暗的职责。' }
    ]});

  /* ===== Works · Comics ===== */
  add({ slug: 'paper-strip', section: 'works', cat: 'comics', date: '2026-08-10', read: 2,
    title: L('四格：关于等一班不会来的车', '四格：關於等一班不會來的車',
             'Four panels: waiting for a train that never comes', '四コマ：来ない電車を待つ'),
    lede:  L('没有对白，只有站台的灯从亮到暗。', '沒有對白，只有月台的燈從亮到暗。',
             'No dialogue — only the platform lights going from bright to dark.',
             '台詞はない。ホームの灯りが明から暗へ変わるだけ。'),
    tags: [L('作品','作品','Works','ワークス'), L('漫画','漫畫','Comics','コミック')],
    body: [
      { t: 'p', v: '四格，没有对白，只有站台的灯从亮到暗。第一格灯全亮，第二格灭了一半，第三格只剩指示牌，第四格什么都没有。' },
      { t: 'figure', cap: '第三格 · 原稿' },
      { t: 'p', v: '不写字是故意的。一旦写了"末班车已过"，这四格就变成了通知；不写，它才是等待本身。' }
    ]});

  /* ===== Works · Art ===== */
  add({ slug: 'color-notes', section: 'works', cat: 'art', date: '2026-08-08', read: 5,
    title: L('色彩笔记：灰色其实有温度', '色彩筆記：灰色其實有溫度',
             'Colour notes: grey has a temperature', '色のメモ：グレーには温度がある'),
    lede:  L('同一个明度的灰，偏暖半度和偏冷半度，读起来是两种情绪。',
             '同一個明度的灰，偏暖半度和偏冷半度，讀起來是兩種情緒。',
             'Two greys of identical value, one half a step warm and one half a step cool, read as two different moods.',
             '同じ明度のグレーでも、半段暖かいか冷たいかで、まったく別の感情に読める。'),
    tags: [L('作品','作品','Works','ワークス'), L('艺术','藝術','Art','アート')],
    body: [
      { t: 'p', v: '把一整面墙刷成中性灰，再在旁边放一块偏暖半度的灰，人眼立刻能读出差别，但说不出差在哪里。这种"说不出"恰恰是灰色最有用的地方。' },
      { t: 'quote', v: '灰色不是没有颜色，是把颜色藏起来了。' },
      { t: 'p', v: '所以做整体偏灰的画面时，我从来不用纯灰。每一块灰都往某个方向偏一点点，让它们之间产生极弱的冷暖关系 —— 观众感觉得到，但不会分心。' }
    ]});

  add({ slug: 'negative-space', section: 'works', cat: 'art', date: '2026-08-05', read: 4,
    title: L('留白不是空的', '留白不是空的', 'Negative space is not empty', '余白は空ではない'),
    lede:  L('空出来的地方也在参与构图，只是它不说话。',
             '空出來的地方也在參與構圖，只是它不說話。',
             'The empty areas take part in the composition too — they just stay quiet.',
             '空けた場所も構図に参加している。ただ、黙っているだけだ。'),
    tags: [L('作品','作品','Works','ワークス'), L('艺术','藝術','Art','アート')],
    body: [
      { t: 'p', v: '把主体挪一挪，剩下的空白形状也跟着变。如果那个空白的形状本身不好看，整张图就不会好看 —— 哪怕主体画得再准。' },
      { t: 'p', v: '检查方法很土：把画面眯成一片模糊，只看黑白块的分布。这时候留白会变成一个具体的形状，好不好一眼就知道。' }
    ]});

  /* ===== Works · Photos ===== */
  add({ slug: 'osaka', section: 'works', cat: 'photos', date: '2026-08-06', read: 6,
    title: L('大阪：夜行电车的色温', '大阪：夜行電車的色溫',
             'Osaka: the colour temperature of a night train', '大阪：夜行電車の色温度'),
    lede:  L('关西的夜晚是偏绿的，这件事在照片里比在现场明显得多。',
             '關西的夜晚是偏綠的，這件事在照片裡比在現場明顯得多。',
             'Kansai nights lean green — far more obviously in a photograph than in person.',
             '関西の夜は緑に寄る。それは現場よりも写真のほうがはるかに顕著だ。'),
    tags: [L('作品','作品','Works','ワークス'), L('摄影','攝影','Photos','フォト'), L('旅行','旅行','Travel','旅')],
    body: [
      { t: 'p', v: '车厢里的荧光灯把所有人的脸都调成同一个色温，只有窗外掠过的招牌在不停打断它。那种打断很有节奏，像呼吸。' },
      { t: 'figure', cap: '环状线 · 车窗' },
      { t: 'p', v: '后期几乎没有调色，因为一旦把绿调回来，那个夜晚就不见了。忠于记忆有时候比忠于白平衡重要。' }
    ]});

  add({ slug: 'kyoto', section: 'works', cat: 'photos', date: '2026-08-04', read: 4,
    title: L('京都：把游客拍进去', '京都：把遊客拍進去',
             'Kyoto: put the tourists in the frame', '京都：観光客ごと撮る'),
    lede:  L('与其等一个空无一人的画面，不如承认人也是风景的一部分。',
             '與其等一個空無一人的畫面，不如承認人也是風景的一部分。',
             'Rather than wait for an empty frame, admit that people are part of the scenery too.',
             '無人の画面を待つより、人もまた風景の一部だと認めたほうがいい。'),
    tags: [L('作品','作品','Works','ワークス'), L('摄影','攝影','Photos','フォト'), L('旅行','旅行','Travel','旅')],
    body: [
      { t: 'p', v: '在京都等一个没有人的镜头，往往要站上四十分钟。后来我放弃了，改成等一个"人站得刚好"的镜头，反而快得多，画面也更诚实。' },
      { t: 'p', v: '空景照片有一种假，好像这个地方从来没人来过。可它明明每天有几万人经过 —— 把人拍进去，照片才是那一天的照片。' }
    ]});

  add({ slug: 'nanjing-station', section: 'works', cat: 'photos', date: '2026-08-02', read: 5,
    title: L('南京站：候车厅的几何', '南京站：候車廳的幾何',
             'Nanjing station: the geometry of a waiting hall', '南京駅：待合ホールの幾何'),
    lede:  L('一个每天几十万人经过的空间，结构反而是最冷静的。',
             '一個每天幾十萬人經過的空間，結構反而是最冷靜的。',
             'A space hundreds of thousands pass through daily, yet its structure is the calmest thing in it.',
             '一日に数十万人が通る空間で、いちばん冷静なのは構造のほうだ。'),
    tags: [L('作品','作品','Works','ワークス'), L('摄影','攝影','Photos','フォト')],
    body: [
      { t: 'p', v: '候车厅的屋顶是一组重复的三角桁架，人流再乱，抬头永远是同一个节奏。这种反差本身就值得拍。' },
      { t: 'figure', cap: '南京站 · 屋顶结构' }
    ]});

  /* ===== Research · News ===== */
  add({ slug: 'site-launch', section: 'research', cat: 'news', date: '2026-08-18', read: 8,
    title: L('JasperPeng 个人网站正式上线！来自 2026 年的声音。',
             'JasperPeng 個人網站正式上線！來自 2026 年的聲音。',
             'JasperPeng’s personal site is live — a voice from 2026.',
             'JasperPeng の個人サイト公開 —— 2026年からの声。'),
    lede:  L('这个档案馆为什么存在，以及它接下来会长成什么样子。',
             '這個檔案館為什麼存在，以及它接下來會長成什麼樣子。',
             'Why this archive exists, and what it is going to grow into.',
             'このアーカイブがなぜ存在するのか、そしてこれからどう育つのか。'),
    tags: [L('研究','研究','Research','リサーチ'), L('动态','動態','News','ニュース')],
    body: [
      { t: 'p', v: '很长一段时间里，我的东西散落在各个平台：插画在一个地方，设定集在另一个地方，随手写的想法则基本上没有地方。' },
      { t: 'h2', v: '为什么要自己做一个' },
      { t: 'p', v: '平台会改版、会关停、会用推荐算法决定谁看得到什么。而档案需要的恰恰是稳定和可检索 —— 这两件事只能自己做。' },
      { t: 'quote', v: '档案的价值不在于当下有多少人看，而在于十年后它还在不在。' },
      { t: 'p', v: '所以有了这个站点。它不追求流量，只追求把东西放好、放稳、找得到。分类会随着内容长出来，而不是先搭好架子再往里塞。' }
    ]});

  add({ slug: 'archive-plan', section: 'research', cat: 'news', date: '2026-08-15', read: 4,
    title: L('接下来半年打算做的事', '接下來半年打算做的事',
             'What I plan to do over the next six months', 'これから半年でやること'),
    lede:  L('一份写给自己看的、允许被推翻的计划。',
             '一份寫給自己看的、允許被推翻的計畫。',
             'A plan written for myself, and allowed to be overturned.',
             '自分のために書いた、覆してよい計画。'),
    tags: [L('研究','研究','Research','リサーチ'), L('动态','動態','News','ニュース')],
    body: [
      { t: 'p', v: '先把已有的东西搬完 —— 这件事最枯燥，但不做完，后面所有的分类都是空的。' },
      { t: 'p', v: '然后是角色页。七个人现在只有名字和一句话，需要补设定集、三视图、关系图。' },
      { t: 'p', v: '最后才是世界观那部分。工程量最大，也最容易做不完，所以排在最后 —— 排在前面的话，前两件事永远轮不到。' }
    ]});

  /* ===== Research · Philosophy ===== */
  add({ slug: 'the-word', section: 'research', cat: 'philosophy', date: '2026-08-13', read: 7,
    title: L('The word：语言作为一种视觉材料', 'The word：語言作為一種視覺材料',
             'The word: language as a visual material', 'The word：視覚素材としての言語'),
    lede:  L('文字、命名、字体，以及语言与视觉表达之间那条模糊的边界。',
             '文字、命名、字體，以及語言與視覺表達之間那條模糊的邊界。',
             'Words, naming, typefaces — and the blurred border between language and visual expression.',
             '文字、命名、書体、そして言語と視覚表現のあいだの曖昧な境界。'),
    tags: [L('研究','研究','Research','リサーチ'), L('思考','思考','Philosophy','思索')],
    body: [
      { t: 'p', v: '一个词被写下来的那一刻，它同时变成了两样东西：意思，和形状。大多数时候我们只读前者。' },
      { t: 'h2', v: '当形状开始说话' },
      { t: 'p', v: '但把字号放大到某个程度，形状就会盖过意思。这也是为什么标题的排版从来不只是"把字变大" —— 变大之后它就不再是句子，而是图形。' },
      { t: 'figure', cap: '同一个词的六种字重' },
      { t: 'p', v: '给角色命名的时候我也有同样的感觉。"祈"和"拉"在纸上的重量完全不同，哪怕还没有人知道他们是谁。' }
    ]});

  add({ slug: 'image-read', section: 'research', cat: 'philosophy', date: '2026-08-07', read: 6,
    title: L('关于图像的可读性', '關於圖像的可讀性',
             'On the legibility of images', 'イメージの可読性について'),
    lede:  L('一张图需要被读懂到什么程度，取决于它想要谁看。',
             '一張圖需要被讀懂到什麼程度，取決於它想要誰看。',
             'How legible an image needs to be depends on who it wants to be seen by.',
             '画像がどこまで読み解かれるべきかは、誰に見せたいかで決まる。'),
    tags: [L('研究','研究','Research','リサーチ'), L('思考','思考','Philosophy','思索')],
    body: [
      { t: 'p', v: '可读性不是越高越好。有些图像的价值恰恰在于它拒绝被立刻读懂，逼着人多停留几秒 —— 那几秒是它全部的意义。' },
      { t: 'p', v: '但这件事有前提：拒绝必须是设计出来的，不能是没画清楚。观众分得出来哪种是故意的。' },
      { t: 'quote', v: '看不懂和还没看懂，是两回事。' }
    ]});

  /* ===== Universe · Metro ===== */
  add({ slug: 'noote-metro', section: 'universe', cat: 'metro', date: '2026-08-17', read: 9,
    title: L('NooteMetro：线网的第三次修订', 'NooteMetro：線網的第三次修訂',
             'NooteMetro: the third revision of the network', 'NooteMetro：路線網の三度目の改訂'),
    lede:  L('地图、交通系统与虚构的城市环境 —— 这个世界观里被建造得最久的一部分。',
             '地圖、交通系統與虛構的城市環境 —— 這個世界觀裡被建造得最久的一部分。',
             'Maps, transit and a fictional urban environment — the longest-built part of this world.',
             '地図、交通、架空の都市環境 —— この世界観で最も長く作り続けている部分。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('轨道交通','軌道交通','Metro','メトロ')],
    body: [
      { t: 'p', v: '第三版线网最大的改动是承认了一件事：这座城市不需要那么多换乘站。' },
      { t: 'h2', v: '从八条减到六条' },
      { t: 'p', v: '前两版一直在加线，结果中心区挤成一团，外围却什么都没有。这一版反过来，先确定城市边界，再让线路去够它。' },
      { t: 'figure', cap: '第三版线网 · 中心区' },
      { t: 'p', v: '虚构的交通系统一样要讲道理。一旦线网自己说不通 —— 比如两条线在没有理由的地方交汇 —— 整个城市看起来就是假的。' }
    ]});

  add({ slug: 'station-naming', section: 'universe', cat: 'metro', date: '2026-08-01', read: 5,
    title: L('站名是怎么取的', '站名是怎麼取的',
             'How the station names were chosen', '駅名はどう付けたか'),
    lede:  L('一个好站名要同时回答"这是哪"和"这里有什么"。',
             '一個好站名要同時回答「這是哪」和「這裡有什麼」。',
             'A good station name answers both "where is this" and "what is here".',
             'よい駅名は「ここはどこか」と「ここに何があるか」の両方に答える。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('轨道交通','軌道交通','Metro','メトロ')],
    body: [
      { t: 'p', v: '真实城市的站名大多来自地名、单位名或地标。虚构城市的难点在于：这些名字得先有来历，才不会像随口编的。' },
      { t: 'p', v: '我的做法是先写一段简短的地方志，站名从里面挑。哪怕读者永远看不到那段地方志，名字读起来也会不一样。' }
    ]});

  /* ===== Universe · Maps ===== */
  add({ slug: 'maps-geography', section: 'universe', cat: 'maps', date: '2026-07-29', read: 5,
    title: L('先画海岸线', '先畫海岸線', 'Draw the coastline first', 'まず海岸線を引く'),
    lede:  L('一切地理设定都从一条不讲道理的海岸线开始。',
             '一切地理設定都從一條不講道理的海岸線開始。',
             'All geography begins with one unreasonable coastline.',
             'すべての地理設定は、理屈に合わない一本の海岸線から始まる。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('地图','地圖','Maps','マップ')],
    body: [
      { t: 'p', v: '海岸线不能画得太规整，规整的海岸线一看就是人造的。真实的海岸永远比你以为的更碎 —— 有一个尺度上的自相似，放大看还是那么碎。' },
      { t: 'p', v: '所以我画的时候是先随手甩一条，再在每一段上继续甩更小的，重复三轮。得到的结果比刻意设计的好看得多。' }
    ]});

  add({ slug: 'map-legend', section: 'universe', cat: 'maps', date: '2026-07-26', read: 4,
    title: L('图例决定了地图的性格', '圖例決定了地圖的性格',
             'The legend decides the map’s personality', '凡例が地図の性格を決める'),
    lede:  L('同一份数据，换一套图例就是另一座城市。',
             '同一份資料，換一套圖例就是另一座城市。',
             'Same data, different legend — a different city entirely.',
             '同じデータでも、凡例を変えれば別の都市になる。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('地图','地圖','Maps','マップ')],
    body: [
      { t: 'p', v: '把绿地画成大块的浅绿，城市就显得宜居；画成细碎的点状，同一片地就显得荒。数据一个字没改。' },
      { t: 'figure', cap: '两套图例 · 同一份底图' }
    ]});

  /* ===== Universe · Terrain ===== */
  add({ slug: 'terrain-contours', section: 'universe', cat: 'terrain', date: '2026-08-03', read: 6,
    title: L('等高线决定了故事', '等高線決定了故事',
             'Contour lines decide the story', '等高線が物語を決める'),
    lede:  L('地形不是背景板。坡度改一点，城市该长在哪里就全变了。',
             '地形不是背景板。坡度改一點，城市該長在哪裡就全變了。',
             'Terrain is not a backdrop. Shift the gradient a little and where the city should grow changes entirely.',
             '地形は背景ではない。勾配を少し変えれば、都市が育つ場所はすっかり変わる。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('地形','地形','Terrain','地形')],
    body: [
      { t: 'p', v: '先画等高线，再放城市，顺序反过来就会出问题 —— 把城建在不该建的地方，之后所有的交通线都要绕。' },
      { t: 'figure', cap: '中部高地 · 等高线草图' },
      { t: 'p', v: '有了地形之后，很多设定会自己冒出来：哪里会缺水、哪里容易被围困、哪条路一定要修隧道。这些都不用编，地形已经替你回答了。' }
    ]});

  add({ slug: 'river-systems', section: 'universe', cat: 'terrain', date: '2026-07-30', read: 5,
    title: L('水系：河从哪来，城就在哪', '水系：河從哪來，城就在哪',
             'Rivers: where the water comes from, the city follows', '水系：川の来るところに街ができる'),
    lede:  L('几乎所有真实城市都能用一条河解释清楚，虚构的也一样。',
             '幾乎所有真實城市都能用一條河解釋清楚，虛構的也一樣。',
             'Almost every real city can be explained by a river. Fictional ones are no different.',
             'ほぼすべての実在の都市は一本の川で説明できる。架空の都市も同じだ。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('地形','地形','Terrain','地形')],
    body: [
      { t: 'p', v: '河流的走向要服从地形，支流要从高处汇入干流。这条规则一破，地图就假了 —— 而且是那种说不出哪里不对的假。' },
      { t: 'quote', v: '先有水，才有路；先有路，才有城。' }
    ]});

  /* ===== Universe · Architecture ===== */
  add({ slug: 'architecture-spaces', section: 'universe', cat: 'architecture', date: '2026-07-27', read: 6,
    title: L('给建筑一个年代', '給建築一個年代',
             'Give a building a decade', '建築に年代を与える'),
    lede:  L('一栋楼属于哪个年代，比它长什么样更能决定它可信不可信。',
             '一棟樓屬於哪個年代，比它長什麼樣更能決定它可信不可信。',
             'Which decade a building belongs to determines its believability more than its appearance does.',
             '建物がどの年代のものかは、見た目よりも説得力を左右する。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('建筑','建築','Architecture','建築')],
    body: [
      { t: 'p', v: '把一栋楼的建成年代定下来，它的材料、层高、窗户比例就都被限制住了 —— 这种限制反而让设计变容易，因为可选项一下子少了九成。' },
      { t: 'p', v: '一条街上如果所有楼都是同一个年代，会显得像影视基地。真实的街道总是几个年代混在一起，彼此别扭地共存。' }
    ]});

  add({ slug: 'facade-rhythm', section: 'universe', cat: 'architecture', date: '2026-07-23', read: 4,
    title: L('立面的节奏', '立面的節奏', 'The rhythm of a façade', 'ファサードのリズム'),
    lede:  L('窗户的排列方式，比楼本身的形状更容易被记住。',
             '窗戶的排列方式，比樓本身的形狀更容易被記住。',
             'How the windows are arranged is remembered more easily than the shape of the building.',
             '窓の並び方は、建物の形そのものよりも記憶に残る。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('建筑','建築','Architecture','建築')],
    body: [
      { t: 'p', v: '人记不住一栋楼的轮廓，但记得住它的窗户是密的还是疏的、是竖长还是横宽。立面的节奏就是建筑的字体。' },
      { t: 'figure', cap: '三种开窗节奏' }
    ]});

  /* ===== Universe · Scenery ===== */
  add({ slug: 'scenery-light', section: 'universe', cat: 'scenery', date: '2026-07-28', read: 4,
    title: L('一天里最短的那种光', '一天裡最短的那種光',
             'The shortest light of the day', '一日でいちばん短い光'),
    lede:  L('日落前的二十分钟，颜色会做一些平时不做的事。',
             '日落前的二十分鐘，顏色會做一些平時不做的事。',
             'In the twenty minutes before sunset, colour does things it otherwise never does.',
             '日没前の二十分、色は普段しないことをする。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('风景','風景','Scenery','風景')],
    body: [
      { t: 'p', v: '那二十分钟里，阴影是蓝的，受光面是橙的，中间几乎没有过渡。画的时候得敢用这种对比，稍微保守一点就不像了。' },
      { t: 'figure', cap: '黄昏 · 色彩取样' }
    ]});

  add({ slug: 'seasons-frame', section: 'universe', cat: 'scenery', date: '2026-07-25', read: 5,
    title: L('四季在同一个取景框里', '四季在同一個取景框裡',
             'Four seasons in one frame', '同じフレームの中の四季'),
    lede:  L('固定机位，只让季节变 —— 这是检验场景设定最快的方法。',
             '固定機位，只讓季節變 —— 這是檢驗場景設定最快的方法。',
             'Fix the camera, let only the season change — the fastest way to test a scene.',
             'カメラを固定し、季節だけを変える —— シーン設定を検証する最速の方法。'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('风景','風景','Scenery','風景')],
    body: [
      { t: 'p', v: '同一个角度画四遍，哪些东西该变、哪些不该变，一目了然。不该变的却变了，说明当初就没想清楚。' },
      { t: 'p', v: '这个方法很省事，也很残酷：它会把所有含糊的地方一次性暴露出来。' }
    ]});

  /* ===== Characters · OC ===== */
  add({ slug: 'strawberry-sheet', section: 'characters', cat: 'oc', date: '2026-08-18', read: 5,
    title: L('草莓酱：七版之后才立住的角色', '草莓醬：七版之後才立住的角色',
             '草莓酱: a character that only held on the seventh try', '草莓酱：七版目でようやく立ったキャラ'),
    lede:  L('前六版都太好看了，好看到没有性格。',
             '前六版都太好看了，好看到沒有性格。',
             'The first six versions were too pretty — pretty to the point of having no personality.',
             '最初の六版はきれいすぎた。性格が消えるほどに。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('原创角色','原創角色','OC','オリキャラ')],
    body: [
      { t: 'p', v: '草莓酱的设定改了七版。前六版的问题都一样：太顺眼了。每一处都挑不出毛病，合起来就是一张没有记忆点的脸。' },
      { t: 'figure', cap: '三视图 · 定稿版' },
      { t: 'p', v: '第七版把配色压暗了两度，加了一点不对称 —— 左右耳饰不一样，刘海一侧短一截。人立刻就有了脾气。' },
      { t: 'quote', v: '完美对称的角色，看起来像模板。' }
    ]});

  add({ slug: 'oc-palette', section: 'characters', cat: 'oc', date: '2026-08-16', read: 4,
    title: L('角色配色的三色律', '角色配色的三色律',
             'The three-colour rule for characters', 'キャラ配色の三色則'),
    lede:  L('主色、辅色、点缀色，比例大致是 6:3:1。',
             '主色、輔色、點綴色，比例大致是 6:3:1。',
             'Primary, secondary, accent — roughly 6:3:1.',
             'メイン、サブ、アクセント。おおよそ 6:3:1。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('原创角色','原創角色','OC','オリキャラ')],
    body: [
      { t: 'p', v: '六成主色定基调，三成辅色做层次，一成点缀色负责让人记住。点缀色必须只有一处 —— 两处就不叫点缀了。' },
      { t: 'p', v: '七个角色排在一起的时候，这条规律的好处才显出来：每个人都有一个专属的点缀色，远看就能分清谁是谁。' }
    ]});

  /* ===== Characters · Character ===== */
  add({ slug: 'character-relations', section: 'characters', cat: 'character', date: '2026-08-01', read: 6,
    title: L('角色关系图：谁欠谁一句话', '角色關係圖：誰欠誰一句話',
             'Relationship chart: who owes whom a sentence', '関係図：誰が誰に一言を負っているか'),
    lede:  L('把没说出口的话画成线，关系图立刻就立体了。',
             '把沒說出口的話畫成線，關係圖立刻就立體了。',
             'Draw the unsaid sentences as lines, and the chart immediately gains depth.',
             '言えなかった一言を線にすると、関係図は一気に立体になる。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('角色关系','角色關係','Character','人物関係')],
    body: [
      { t: 'p', v: '一开始我按"认识 / 不认识"画线，画完发现毫无信息量 —— 一张所有人都连着所有人的网。' },
      { t: 'p', v: '后来改成按"欠对方一句什么话"来连，整张图才活过来。拉欠祈一句道歉，祈欠草莓酱一句实话，夏花谁都不欠。这样一写，性格就不用再解释了。' },
      { t: 'figure', cap: '关系图 · 第二版' }
    ]});

  add({ slug: 'silence-design', section: 'characters', cat: 'character', date: '2026-07-27', read: 5,
    title: L('怎么设计一个不说话的角色', '怎麼設計一個不說話的角色',
             'How to design a character who does not speak', '喋らないキャラクターの設計'),
    lede:  L('台词是最省事的塑造手段，去掉它之后才知道设计够不够。',
             '台詞是最省事的塑造手段，去掉它之後才知道設計夠不夠。',
             'Dialogue is the laziest way to build a character. Remove it and you find out whether the design is enough.',
             '台詞は最も手軽な造形手段だ。それを外して初めて、設計が足りているか分かる。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('角色关系','角色關係','Character','人物関係')],
    body: [
      { t: 'p', v: '不说话的角色，全部信息只能靠三样东西传达：站姿、视线方向，以及别人看他的反应。' },
      { t: 'quote', v: '沉默的角色最难藏拙 —— 设计上任何一点偷懒都会被看见。' },
      { t: 'p', v: '拉就是这么来的。他一句台词都没有，但每次出现，旁边的人都会先看他一眼再开口。这一眼就是他的台词。' }
    ]});

  /* ===== Characters · Illustrations ===== */
  add({ slug: 'oc-lineup', section: 'characters', cat: 'illustrations', date: '2026-07-24', read: 4,
    title: L('全员合影：五个人怎么站', '全員合影：五個人怎麼站',
             'Group shot: how five people stand', '集合絵：五人はどう並ぶか'),
    lede:  L('一张合影里的站位，其实已经把关系全说完了。',
             '一張合影裡的站位，其實已經把關係全說完了。',
             'Where everyone stands in a group shot already says everything about their relationships.',
             '集合写真の立ち位置は、それだけで関係のすべてを語っている。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('角色插画','角色插畫','Illustrations','キャライラスト')],
    body: [
      { t: 'p', v: '把谁放中间、谁半个身子在画外、谁看镜头谁不看，决定了读者第一眼认为谁是主角。' },
      { t: 'figure', cap: '合影 · 站位草图' },
      { t: 'p', v: '最后定的版本里，草莓酱在偏左，中间是空的。空着的位置比站着人的位置更有话说。' }
    ]});

  add({ slug: 'expression-sheet', section: 'characters', cat: 'illustrations', date: '2026-07-22', read: 5,
    title: L('表情表：把情绪拆成十二格', '表情表：把情緒拆成十二格',
             'Expression sheet: twelve cells of emotion', '表情表：感情を十二コマに分ける'),
    lede:  L('十二格不是为了画全，是为了找出这个角色不会做的表情。',
             '十二格不是為了畫全，是為了找出這個角色不會做的表情。',
             'The twelve cells are not for completeness — they are to find the expressions this character would never make.',
             '十二コマは網羅のためではない。このキャラが決してしない表情を見つけるためだ。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('角色插画','角色插畫','Illustrations','キャライラスト')],
    body: [
      { t: 'p', v: '画到第九格通常就会卡住，而卡住的那几格，恰恰说明这个角色的边界在哪里。' },
      { t: 'p', v: '祈画不出"沉默"，夏花画不出"急躁"。画不出来不是能力问题，是那个表情不属于他们。' }
    ]});

  /* ===== Characters · Guidebook ===== */
  add({ slug: 'oc-guidebook', section: 'characters', cat: 'guidebook', date: '2026-08-05', read: 4,
    title: L('角色使用规范（草案）', '角色使用規範（草案）',
             'Character usage guidelines (draft)', 'キャラクター利用規範（草案）'),
    lede:  L('关于这些角色可以怎么用、不可以怎么用。',
             '關於這些角色可以怎麼用、不可以怎麼用。',
             'What you may and may not do with these characters.',
             'これらのキャラクターで何をしてよく、何をしてはいけないか。'),
    tags: [L('角色','角色','Characters','キャラクター'), L('设定集','設定集','Guidebook','設定資料')],
    body: [
      { t: 'p', v: '简单说：非商业的二次创作欢迎，商业用途请先问一声，不要改动角色的核心设定。' },
      { t: 'h2', v: '什么算核心设定' },
      { t: 'p', v: '名字、点缀色、以及那句签名台词。其余的服装、发型、场景都可以随便改 —— 那些本来就是给人玩的。' }
    ]});

  /* ===== About · Resources ===== */
  add({ slug: 'rainbow-picturebook', section: 'about', cat: 'resources', date: '2026-08-18', read: 5,
    title: L('【彩虹绘本】首个 OC 设定集确认！草莓酱三视图资源上新。',
             '【彩虹繪本】首個 OC 設定集確認！草莓醬三視圖資源上新。',
             '[Rainbow Picturebook] First OC guidebook confirmed — 草莓酱 turnaround sheets now available.',
             '【虹の絵本】初のOC設定資料集が確定！草莓酱の三面図を公開。'),
    lede:  L('第一本设定集的内容、规格与获取方式。',
             '第一本設定集的內容、規格與取得方式。',
             'What the first guidebook contains, its specifications, and how to get it.',
             '初めての設定資料集の内容・仕様・入手方法。'),
    tags: [L('资源','資源','Resources','リソース'), P('2026')],
    body: [
      { t: 'p', v: '设定集收录草莓酱的三视图、配色规范与七版演进过程，全部为可下载的高清图。' },
      { t: 'h2', v: '规格' },
      { t: 'p', v: 'A4 竖版，共 32 页，附一份可直接取色的色卡文件。立绘为透明背景 PNG，方便二次创作直接使用。' }
    ]});

  add({ slug: 'brush-pack', section: 'about', cat: 'resources', date: '2026-08-04', read: 3,
    title: L('常用笔刷与纸纹打包', '常用筆刷與紙紋打包',
             'A pack of the brushes and paper textures I actually use', 'よく使うブラシと紙テクスチャの配布'),
    lede:  L('这三年基本只用这七支笔。', '這三年基本只用這七支筆。',
             'For three years I have used essentially these seven brushes.',
             'この三年、ほぼこの七本しか使っていない。'),
    tags: [L('资源','資源','Resources','リソース')],
    body: [
      { t: 'p', v: '试过很多笔刷，最后固定下来的只有七支：三支线稿、两支上色、一支纹理、一支橡皮。' },
      { t: 'p', v: '数量少的好处是肌肉记忆稳定 —— 不用在每一步都停下来挑工具。' }
    ]});

  /* ===== About · Guidelines ===== */
  add({ slug: 'fonts', section: 'about', cat: 'guidelines', date: '2026-08-13', read: 5,
    title: L('字体与排印资源', '字體與排印資源',
             'Typefaces and typographic resources', '書体と組版リソース'),
    lede:  L('档案馆里用到的字体，以及为什么选它们。',
             '檔案館裡用到的字體，以及為什麼選它們。',
             'The typefaces used across this archive, and why they were chosen.',
             'このアーカイブで使う書体と、それを選んだ理由。'),
    tags: [L('规范','規範','Guidelines','ガイドライン'), L('字体','字體','Fonts','書体')],
    body: [
      { t: 'p', v: '中文正文优先用系统字，理由很实际：加载快、不会因为网络问题掉字、在各种设备上都能正常渲染。' },
      { t: 'quote', v: '最好的字体是用户已经装好的那一款。' },
      { t: 'p', v: '只有标题和标识才用定制字形，而且都转成曲线，不依赖字体文件。' }
    ]});

  add({ slug: 'logos', section: 'about', cat: 'guidelines', date: '2026-08-12', read: 4,
    title: L('标识系统', '標識系統', 'The logo system', 'ロゴシステム'),
    lede:  L('一个字母能承担多少识别度。', '一個字母能承擔多少識別度。',
             'How much recognisability a single letter can carry.',
             '一文字がどれだけの識別性を担えるか。'),
    tags: [L('规范','規範','Guidelines','ガイドライン'), L('标识','標識','Logos','ロゴ')],
    body: [
      { t: 'p', v: '标识就是一个圆角方块加一个 J。越简单的东西越经得起缩小 —— 16 像素下还认得出来，才算合格。' },
      { t: 'p', v: '测试方法：把它缩到浏览器标签页那么大，隔一米看。看不出来就重做。' }
    ]});

  /* ===== About · Miscellaneous ===== */
  add({ slug: 'archive-naming', section: 'about', cat: 'misc', date: '2026-07-20', read: 4,
    title: L('文件命名：给未来的自己留线索', '檔案命名：給未來的自己留線索',
             'File naming: leaving clues for your future self', 'ファイル命名：未来の自分に手がかりを残す'),
    lede:  L('三年后你不会记得 final_v3_真的最终.psd 里是什么。',
             '三年後你不會記得 final_v3_真的最終.psd 裡是什麼。',
             'In three years you will not remember what was inside final_v3_really_final.psd.',
             '三年後、final_v3_本当に最終.psd の中身は思い出せない。'),
    tags: [L('杂项','雜項','Miscellaneous','その他')],
    body: [
      { t: 'p', v: '现在统一用「日期-项目-用途-版本」，全小写，用短横线。丑，但三年后还能搜到。' },
      { t: 'quote', v: '命名规范是写给未来的自己看的，不是写给现在的自己看的。' }
    ]});

  add({ slug: 'workspace', section: 'about', cat: 'misc', date: '2026-07-18', read: 3,
    title: L('桌面：一张长期在变的照片', '桌面：一張長期在變的照片',
             'The desk: one photograph that keeps changing', '机の上：ずっと変わり続ける一枚'),
    lede:  L('每隔一段时间拍一次工位，比日记诚实得多。',
             '每隔一段時間拍一次工位，比日記誠實得多。',
             'Photographing the desk now and then is far more honest than a diary.',
             '時々デスクを撮る。日記よりずっと正直だ。'),
    tags: [L('杂项','雜項','Miscellaneous','その他')],
    body: [
      { t: 'p', v: '桌上摆着什么，基本等于最近在忙什么。翻一遍这些照片，比翻备忘录清楚。' },
      { t: 'figure', cap: '2026 年 7 月 · 工位' }
    ]});

  /* ---------- 图片路径 ----------
     这里只写 slug，不写扩展名。真实文件名由 build.ps1 扫描 assets/images
     得出，写进 js/assets.js（在本文件之前加载）。

     换图：找到 assets/images/<板块目录>/<slug>.jpg（少数是 .png），
     用自己的图盖掉同名文件即可，什么都不用删、构建也不用跑。
     换成别的扩展名的话丢进同一个目录，再双击「刷新图片.cmd」重排一次序。
     下面那个 .png 兜底只在「清单里查不到这个 slug」时才用得上，
     真走到那一步还有 main.js 的 img error 兜底会逐个换扩展名重试。 */
  var ASSETS = w.JP_ASSETS || {};
  function assetOf(dir, slug) {
    return ASSETS[dir + '/' + slug] || ('assets/images/' + dir + '/' + slug + '.png');
  }

  /* 统一补全默认字段 */
  A.forEach(function (a) {
    a.author = a.author || 'JasperPeng';
    a.cover  = assetOf(dirOf(a.section), a.slug);
    a.bodyLang = 'zh-Hans';        /* 正文目前只有中文，非中文界面会提示 */
  });
  /* 立绘（Figma 批注要求 PNG 透明背景） */
  CHARACTERS.forEach(function (c) { c.art = assetOf('characters', c.slug); });

  function dirOf(key) {
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === key) return SECTIONS[i].dir;
    return 'works';
  }

  w.JP = { SECTIONS: SECTIONS, ARTICLES: A, CHARACTERS: CHARACTERS, MAIL: MAIL, asset: assetOf };

})(window);
