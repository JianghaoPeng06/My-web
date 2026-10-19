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

   文章的隐藏开关（读者看不到，只影响排序、推荐和顶栏精选）
   ----------------------------------------------------
   weight: 1–5   推荐权重。文章页底部「继续阅读」按它挑文章：
                 5 = 最常被推荐，1 = 很少出现。不写就当 3。
   pin: true     在自己所在的分类页里置顶常驻（排在最前，带「置顶」小标）。
                 不置顶就删掉这一项，或写 pin: false。
   两项都写在 add({ … }) 的第一行，read: 后面，例如：
     add({ slug: 'kyoto', section: 'works', cat: 'photos', date: '2026-08-04', read: 4, weight: 3, pin: true,
   改完保存、刷新页面即可，不用跑 build.ps1。
   menu          精选到顶部栏（2026-10-17）：顶栏下拉面板右边那一列「精选栏」，读者看不到这个开关本身。
                 menu: true 用文章标题；menu: L('短名', …) 用这个短名（顶栏里放不下长标题时用）。
                 单独一行，写在 lede（和 author）后面、tags 前面。不精选就删掉这一行。
                 同一板块的精选按日期从新到旧排，同一天权重高的在前。改完要跑 build.ps1（后台保存会自动跑）。
                 每个板块的精选栏最多 5 项（连同板块里手写的 feature，比如角色板块的 4 个角色）。
   ============================================================= */
(function (w) {
  'use strict';

  var MAIL = 'pengjasper@icloud.com';

  /* 网站版本号 —— 显示在每页页脚「JasperPeng©2026」后面。
     由站长自己决定什么时候改、改成多少；改完保存、刷新即可，
     再双击「刷新图片.cmd」把它写进静态页面（忘了也不要紧，页面打开时会自动对上）。 */
  var VERSION = 'v4.5.0';

  /* 留言板（2026-10-05）。入口是首页按钮下面那枚玻璃胶囊「留言板（限时）」和「联系」里的「留言板」（下面 contact.links 最后一项），点进去是 messages/。
     「限时」只是写在胶囊上的字，不会自己消失 —— 站长哪天不想要了，再把胶囊和页面一起删掉。
     env  Twikoo 后台地址（2026-10-06 部署在站长 Cloudflare 上的 Worker「twikoo」+ D1「twikoo」）；
          改成空字符串 '' 就变回「即将开放」，不会出现坏掉的表单。改完保存、刷新就生效。 */
  var BOARD = { env: 'https://comment.jasperpeng.uk' };

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
      cats: [
        { slug: 'news',       label: L('动态', '動態', 'News', 'ニュース'),
          desc: L('关于这个档案馆的更新、上线与阶段性记录。', '關於這個檔案館的更新、上線與階段性紀錄。',
                  'Updates, launches and milestones of this archive.', 'このアーカイブの更新・公開・節目の記録。') },
        { slug: 'philosophy', label: L('思考', '思考', 'Philosophy', '思索'),
          desc: L('关于创作、技术、文化与存在的笔记与个人思考。', '關於創作、技術、文化與存在的筆記與個人思考。',
                  'Notes and personal reflections on creativity, technology, culture and existence.',
                  '創作・技術・文化・存在についてのメモと個人的な考察。') }
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
      cats: [
        { slug: 'artifacts',     label: L('手作', '手作', 'Artifacts', '手仕事'),
          desc: L('手作物件与实体造物，以及它们的制作过程。', '手作物件與實體造物，以及它們的製作過程。',
                  'Handmade objects and physical artifacts, and how they were made.', '手作りの物と実体、そしてその制作過程。') },
        { slug: 'design',        label: L('设计', '設計', 'Design', 'デザイン'),
          desc: L('平面、版式与系统设计的实践与规范。', '平面、版式與系統設計的實踐與規範。',
                  'Graphic, layout and system design — practice and guidelines.', 'グラフィック・レイアウト・システム設計の実践と規範。') },
        { slug: 'illustrations', label: L('插画', '插畫', 'Illustrations', 'イラスト'),
          desc: L('插画作品与系列创作。', '插畫作品與系列創作。', 'Illustration works and series.', 'イラスト作品とシリーズ。') },
        /* 「漫画」不再是文章列表，直接进章节地图页 comics/（2026-10-05，Figma「漫画」画板） */
        { slug: 'comics',        label: L('漫画', '漫畫', 'Comics', 'コミック'), to: 'comics/',
          desc: L('短篇漫画与图像叙事实验。', '短篇漫畫與圖像敘事實驗。',
                  'Short comics and experiments in visual narrative.', '短編漫画と視覚的な語りの実験。') },
        { slug: 'art',           label: L('艺术', '藝術', 'Art', 'アート'),
          desc: L('不受媒介限制的自由创作。', '不受媒介限制的自由創作。',
                  'Free work, unbound by medium.', 'メディアに縛られない自由な制作。') },
        { slug: 'photos',        label: L('摄影', '攝影', 'Photos', 'フォト'),
          desc: L('旅途、城市与日常的摄影记录。', '旅途、城市與日常的攝影紀錄。',
                  'Photographs from travel, cities and daily life.', '旅・都市・日常の写真記録。') }
      ]
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
      ]
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
      ]
    },
    {
      key: 'contact', dir: null,
      label:  L('联系', '聯絡', 'Contact', 'コンタクト'),
      kicker:     L('联系', '聯絡', 'Contact', 'コンタクト'),
      featKicker: L('关于我', '關於我', 'About me', '私について'),
      links: [
        { label: L('邮件', '郵件', 'Mail', 'メール'), href: 'mailto:' + MAIL },
        { label: P('X'),       href: 'https://x.com/jianghaoPeng' },                           /* 2026-10-06 开放 */
        { label: P('Bluesky'), href: 'https://bsky.app/profile/jianghaopeng.bsky.social' },
        { label: P('GitHub'),  href: 'https://github.com/JianghaoPeng06' },
        { label: L('留言板', '留言板', 'Message Board', 'メッセージボード'), to: 'messages/' }   /* 2026-10-16 加，站内页面，同一标签页打开 */
        /* 想先关掉某一项：把 href: '…' 换成 soon: true，就又显示成「暂未开放」 */
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
     漫画 · 章节地图（comics/，固定深色）
     ---------------------------------------------------------
     每一项是地图上的一个章节，点开 ▶ 进入竖向条漫 comics/read/?c=<slug>。

     kind   'chapter' 正篇 → 六边形；'side' 番外 → 平行四边形
     x, y   在地图上的大致位置（章节中心点，单位是 Figma 画板上的像素）。
            地图背后是一张三角网格（边长 110、一行高约 95），格子会自动吸附到最近的网格位置，
            所以不用算得很准。参考：Chapter 1 在 (640, 356)，Side Story 1 在 (365, 642)
            —— 往左下错开一格半、往下三行，引导线就是「先水平、再斜下」那一折
     from   从哪个章节连线过来（写那个章节的 slug）；第一个章节不写
     label  章节号（地图上格子下方那行字）
     title  章节名（选中放大时，格子里显示的那句）
            这两项固定用英文、不随界面语言翻译（用户 2026-10-05 要求），所以用 P() 写

     封面：assets/images/comics/<slug>.jpg —— 盖掉同名文件即可，和文章封面一样。
     条漫页面：按顺序命名 01、02、03… 放进 assets/comics/<slug>/，
     然后双击「刷新图片.cmd」。每张图宽度建议 1040 像素（显示宽度 520 的两倍，手机上清楚），
     高度随意，竖着拼起来就是整话。
     加新章节 = 这里加一条 + 放封面 + 放页面。
     --------------------------------------------------------- */
  var COMICS = [
    { slug: 'chapter-1', kind: 'chapter', x: 640, y: 356,
      label: P('Chapter 1'),
      title: P('Meet New Friends') },
    { slug: 'side-story-1', kind: 'side', x: 365, y: 642, from: 'chapter-1',
      label: P('Side Story 1'),
      title: P('Edge of the tower') }
  ];

  /* ---------------------------------------------------------
     文章
     title / lede 四语；body 目前只有中文，见文件末尾说明。
     date 存 ISO 值，由 Intl 按语言格式化。
     --------------------------------------------------------- */
  var A = [];
  function add(o) { A.push(o); }

  /* ===== Works · Artifacts ===== */
  add({ slug: 'indian-anklets', section: 'works', cat: 'artifacts', date: '2026-09-02', read: 5, weight: 4,
    title: L('用铃铛和长绳编织一串印度脚铃', '用鈴鐺和長繩編織一串印度腳鈴',
             'Weaving a string of Indian anklets from bells and cord', '鈴と長い紐でインドの足鈴を編む'),
    lede:  L('福禄寿 FloruitShow 乐队作品中常出现的乐器，《玉珍》《兰若度母》等作品重要的乐器之一，声音清脆悦耳。',
             '福祿壽 FloruitShow 樂隊作品中常出現的樂器，《玉珍》《蘭若度母》等作品重要的樂器之一，聲音清脆悅耳。',
             'An instrument that recurs in the music of FloruitShow — central to tracks like Yuzhen and Tara — with a bright, ringing voice.',
             'FloruitShow の楽曲に度々登場する楽器。『玉珍』『蘭若度母』などで重要な役割を担い、澄んだ音色を持つ。'),
    menu: L('印度脚铃', '印度腳鈴', 'Indian anklets', 'インドの足鈴'),
    tags: [L('作品','作品','Works','ワークス'), P('2026'), L('手作','手作','Handmade','手仕事')],
    body: [
      { t: 'p', v: '如果你听过福禄寿 FloruitShow 的歌，应该会发现她们的音乐里经常出现一些很有意思的传统乐器。印度脚铃就是其中让我印象比较深的一种。它看起来特别简单，就是用一根长绳把很多小铃铛串在一起，但真正用起来的时候，声音特别好听。' },
      { t: 'p', v: '这种铃铛最大的特点是会跟着人的动作一起响。走路、跳舞，或者只是轻轻晃动一下，都会发出清脆的声音。所以听起来会有一种很特别的感觉，好像声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'quote', v: '声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'p', v: '福禄寿在舞台上使用印度脚铃的时候，也让我觉得这种乐器特别适合她们的音乐。像《玉珍》《兰若度母》这些作品，本身就有很多传统文化的感觉，再加上铃铛的声音，整个作品就变得更加有自己的味道。' },
      { t: 'figure', cap: '夏の晴れ空の下で祈る' },
      { t: 'p', v: '我觉得有意思的是，这种乐器真的很简单。没有什么复杂的结构，就是铃铛和绳子，却可以留下非常明显的声音。小时候我们可能也玩过类似的小铃铛，但到了音乐里，它就突然变成了一种很有氛围感的东西。' }
    ]});

  add({ slug: 'tongtong-mask', section: 'works', cat: 'artifacts', date: '2026-08-16', read: 6, weight: 4,
    title: L('嗵嗵仮面：一张面具的重量分配', '嗵嗵仮面：一張面具的重量分配',
             '嗵嗵仮面: how a mask distributes its weight', '嗵嗵仮面：仮面の重量配分'),
    lede:  L('造型稿画得再好看，戴上十分钟脖子就开始抗议 —— 面具真正的难点在看不见的地方。',
             '造型稿畫得再好看，戴上十分鐘脖子就開始抗議 —— 面具真正的難點在看不見的地方。',
             'However beautiful the concept drawing, ten minutes in and your neck starts complaining. The real difficulty of a mask lies where you cannot see it.',
             'どれほど美しい造形案でも、十分被れば首が抗議を始める。仮面の本当の難所は、見えないところにある。'),
    menu: P('嗵嗵仮面'),
    tags: [L('作品','作品','Works','ワークス'), P('2026'), L('手作','手作','Handmade','手仕事')],
    body: [
      { t: 'p', v: '做面具最容易被低估的一件事是重量。造型稿画得再好看，一旦材料铺满整张脸，重心就会往前掉，戴上十分钟脖子就开始抗议。' },
      { t: 'h2', v: '把重量往后挪' },
      { t: 'p', v: '解决办法其实很朴素：把结构性的部分做薄，把装饰性的部分往两侧和后脑分散，让整体重心尽量落在两耳连线上。这条线是头部转动的轴，重心压在轴上，脖子就不用一直较劲。' },
      { t: 'figure', cap: '内衬结构与配重点' },
      { t: 'p', v: '最后成品比第一版轻了将近四成，戴一个下午也不难受。造型几乎没改，改的全是看不见的地方 —— 这大概是所有可穿戴物件的共同规律。' }
    ]});

  /* ===== Works · Design ===== */
  add({ slug: 'grid-system', section: 'works', cat: 'design', date: '2026-08-12', read: 7, weight: 3,
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

  add({ slug: 'type-scale', section: 'works', cat: 'design', date: '2026-08-11', read: 5, weight: 3,
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
  add({ slug: 'doudou-seasons', section: 'works', cat: 'illustrations', date: '2026-09-01', read: 4, weight: 4,
    title: P('DOUDOU 春夏秋冬'),
    lede:  L('那是一首预谋很久的歌，却迟迟未上线录音室版，不过2023巡演以春夏秋冬命名。',
             '那是一首預謀很久的歌，卻遲遲未上線錄音室版，不過 2023 巡演以春夏秋冬命名。',
             'That is a long-planned song, yet the studio version still hasn\'t been released. However, the 2023 tour is named after the four seasons.',
             'それは長年温めてきた曲だが、スタジオ版はいまだにリリースされていない。ただし、2023 年のツアーは春夏秋冬にちなんで名付けられた。'),
    menu: P('DOUDOU'),
    tags: [L('作品','作品','Works','ワークス'), L('插画','插畫','Illustrations','イラスト')],
    body: [
      { t: 'p', v: '这一组的想法很简单：让四个季节里各“活”一次，看看画面会自己长成什么样。' },
      { t: 'quote', v: '春天，就让这繁华都开遍，\n夏天，我想你想了千万遍，\n秋天，当落叶画成一个圈，\n冬天，就在这冰封一瞬间。', c: 'tea' },
      { t: 'figure', cap: '为纪念春夏秋冬巡演创作' },
      { t: 'p', v: '可恶的不良商家给我图盗了拿去商用，气煞我也！不过目前下架了。' }
    ]});

  add({ slug: 'linework', section: 'works', cat: 'illustrations', date: '2026-08-09', read: 4, weight: 2,
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

  /* ===== Works · Art ===== */
  add({ slug: 'color-notes', section: 'works', cat: 'art', date: '2026-08-08', read: 5, weight: 3,
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

  add({ slug: 'negative-space', section: 'works', cat: 'art', date: '2026-08-05', read: 4, weight: 2,
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
  add({ slug: 'osaka', section: 'works', cat: 'photos', date: '2026-08-06', read: 6, weight: 4,
    title: L('大阪：夜行电车的色温', '大阪：夜行電車的色溫',
             'Osaka: the colour temperature of a night train', '大阪：夜行電車の色温度'),
    lede:  L('关西的夜晚是偏绿的，这件事在照片里比在现场明显得多。',
             '關西的夜晚是偏綠的，這件事在照片裡比在現場明顯得多。',
             'Kansai nights lean green — far more obviously in a photograph than in person.',
             '関西の夜は緑に寄る。それは現場よりも写真のほうがはるかに顕著だ。'),
    menu: L('大阪', '大阪', 'Osaka', '大阪'),
    tags: [L('作品','作品','Works','ワークス'), L('摄影','攝影','Photos','フォト'), L('旅行','旅行','Travel','旅')],
    body: [
      { t: 'p', v: '车厢里的荧光灯把所有人的脸都调成同一个色温，只有窗外掠过的招牌在不停打断它。那种打断很有节奏，像呼吸。' },
      { t: 'figure', cap: '环状线 · 车窗' },
      { t: 'p', v: '后期几乎没有调色，因为一旦把绿调回来，那个夜晚就不见了。忠于记忆有时候比忠于白平衡重要。' }
    ]});

  add({ slug: 'kyoto', section: 'works', cat: 'photos', date: '2026-08-04', read: 4, weight: 3, pin: true,
    title: L('京都：把游客拍进去', '京都：把遊客拍進去',
             'Kyoto: put the tourists in the frame', '京都：観光客ごと撮る'),
    lede:  L('与其等一个空无一人的画面，不如承认人也是风景的一部分。',
             '與其等一個空無一人的畫面，不如承認人也是風景的一部分。',
             'Rather than wait for an empty frame, admit that people are part of the scenery too.',
             '無人の画面を待つより、人もまた風景の一部だと認めたほうがいい。'),
    menu: L('京都', '京都', 'Kyoto', '京都'),
    tags: [L('作品','作品','Works','ワークス'), L('摄影','攝影','Photos','フォト'), L('旅行','旅行','Travel','旅')],
    body: [
      { t: 'p', v: '在京都等一个没有人的镜头，往往要站上四十分钟。后来我放弃了，改成等一个"人站得刚好"的镜头，反而快得多，画面也更诚实。' },
      { t: 'p', v: '空景照片有一种假，好像这个地方从来没人来过。可它明明每天有几万人经过 —— 把人拍进去，照片才是那一天的照片。' }
    ]});

  add({ slug: 'nanjing-station', section: 'works', cat: 'photos', date: '2026-08-02', read: 5, weight: 2,
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
  add({ slug: 'site-launch', section: 'research', cat: 'news', date: '2026-09-09', read: 3, weight: 5, pin: true,
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
      { t: 'img', src: 'assets/images/research/site-launch-2.jpg', cap: 'V2.0.0加入的首页海报' },
      { t: 'p', v: '平台会改版、会关停、会用推荐算法决定谁看得到什么。而档案需要的恰恰是稳定和可检索 —— 这两件事只能自己做。' },
      { t: 'quote', v: '档案的价值不在于当下有多少人看，而在于十年后它还在不在。' },
      { t: 'p', v: '所以有了这个站点。它不追求流量，只追求把东西放好、放稳、找得到。我想，比起看人脸色，随时封禁的社交媒体，一个真正属于自己的网站才是保存我作品和想法最好的容器，在这里我可以随意发言，而你，我的读者，欢迎访问我的小网站，如果有一天你的网络无法访问了，可以写邮件联系我，或者使用网络代理工具访问，当然，我相信大约是不会有那一天的。' },
      { t: 'img', src: 'assets/images/research/site-launch-3.jpg', cap: 'V4.3.0 Home页面纪念' }
    ]});

  /* ===== Research · Philosophy ===== */
  add({ slug: 'my-philosophy', section: 'research', cat: 'philosophy', date: '2026-10-16', read: 7, weight: 5, pin: true,
    title: L('我的观点', '我的哲學',
             'My Philosophy', '私の哲学'),
    lede:  L('生命对于世界，是一种怎样的关系。',
             '生命對於世界，是一種怎樣的關係。',
             'What kind of relationship does life have with the world?',
             '生命にとって世界とは、どのような関係なのか。'),
    menu: L('我的观点', '我的哲學', 'My Philosophy', '私の哲学'),
    tags: [L('研究','研究','Research','リサーチ'), L('思考','思考','Philosophy','思索')],
    body: [
      { t: 'h2', v: '我无法完全确定，自己是否真的醒着。' },
      { t: 'p', v: '从分子，原子再到细胞，血液循环，最后竟然能产生一个能思考，有想法的意识，这简直不可思议。' },
      { t: 'p', v: '我的生命，我的能力是有限的，我不知道我出生之前世界是否存在，我也不知道我死后世界是否存在，我更不知道我正在经历的这一秒，世界是否是真实的，我不能确定现在是不是在一个还未醒来的梦中，毕竟在梦里我也可以完成 [睡醒] 这个行为。' },
      { t: 'p', v: '这并不意味着世界一定是虚假的，也不意味着世界只存在于我的意识之中。它只是揭示了一个难以回避的认识论困境：我可以相信世界独立于我的意识而存在，却很难从自己的意识之外，直接验证这种存在究竟是什么样子。' },
      { t: 'p', v: '即使世界确实存在于我的意识之外，我所能亲自抵达的，也始终只是自己有限的生命。我不知道死亡之后是否还存在一个能够被我认识的世界。我也无法亲自验证，当我不再拥有意识时，世界是否会以我无法理解的方式继续存在。' },
      { t: 'p', v: '“世界随我出生而诞生，随我死亡而湮灭”，未必是一项关于宇宙的客观结论。它也可以是一种关于个体经验边界的描述：对一个人而言，他所经历、感受、理解和爱过的世界，与他的生命密不可分。' },
      { t: 'p', v: '当一个人离开，他未必带走整个宇宙，却带走了一个再也无法以同样方式被经历的世界。' },
      { t: 'h2', v: '生命正因为它的短暂，才显得无比珍贵。' },
      { t: 'p', v: '如果一个人能够永远活着，那么今天与明天之间，还有多么紧迫的区别？如果一首歌永远不会结束，那么它的最后一个音符是否仍然值得我们屏息聆听？如果夏天永远不会离开，我们是否还会在某个黄昏停下脚步，认真看一眼落日？' },
      { t: 'p', v: '我无法证明，短暂是生命获得意义的唯一原因。但我越来越觉得，有限性是我们之所以珍惜某些事物的重要原因之一。因为时间有限，所以相遇不能无限推迟；因为精力有限，所以我们必须在不同的愿望之间作出选择；因为生命有限，所以今天所拥有的体验，无法简单地被未来的某一天完全替代。' },
      { t: 'img', src: 'assets/images/research/my-philosophy-2.jpg', cap: '图片拍摄于2026.3，日本京都' },
      { t: 'p', v: '我可以在明年重新听见一首歌，却无法重新成为今天的自己，再以完全相同的经历和心境听见它。甚至同一个人，在不同的时间与我相遇，也会成为不同的相遇。我们会成长，会遗忘，会改变，会逐渐成为连自己都不曾预料到的样子。' },
      { t: 'h3', v: '我意识到，过去的那一秒钟永远过去了，再也没有办法重新经历，如果你说穿越，本质上对于你的生命来说，穿越回过去的某一秒，也是你原来生命时间的下一秒。', c: 'jam' },
      { t: 'h2', v: '生命没有标准答案，世界没有绝对的对错。' },
      { t: 'p', v: '一个社会所推崇的成功，不一定适合每一个人的性格与愿望；一套制度可以组织庞大的人群，却不一定能够替每个人回答生命的意义；一种生活被多数人认可，也不意味着其他生活就天然低人一等。' },
      { t: 'p', v: '国家、组织、学校、职场，以及各种由人建立的评价体系，都可能对我们的生活产生真实的影响。但它们毕竟不是宇宙本身，更不是判断一个生命是否值得存在的最终裁决者。' },
      { t: 'p', v: '自己的生命，自己的时间，谁也没有权力规训你，但这并不意味着你可以做任何事，虽然地球是每个人的，但强者已经把它们分割占据，如果你没有那么强大的能力，就要清楚自己做的事会带来哪些后果。就像毒品，本身世界允许存在的事物，你有权选择尝试，但在社会中，你得知道自己在哪，若在禁毒的国家尝试，那么你将会被处罚，若你有能力解决这个惩罚，或去往不禁止的国家，那么你可以自由尝试。' },
      { t: 'p', v: '世界本身就没有绝对的对错，长期被国家规训的人，意识形态可能被固化，以至于下意识认为吸毒就是违法。可跳出牢笼，世界上很多国家吸毒并不违法。这里只是举个例子，世界属于我们，也属于你。' },
      { t: 'h3', v: '世界上存在的事物，都是合理的。分子，原子能够组成，那么它就是能够出现的，不能因为对人类有害，就抹去它存在的意义。', c: 'jam' },
      { t: 'img', src: 'assets/images/research/my-philosophy-3.jpg', cap: '夏天的绿色，是比我网站更美的颜色' },
      { t: 'h2', v: '你的生命，独一无二。' },
      { t: 'p', v: 'Nothing But Yourself', c: 'wisteria', f: 'deco' },
      { t: 'p', v: '你有权做任何你想做的事。' },
      { t: 'p', v: '生命的意义，在于你所经历的每一刻，你的欢笑，你的悲伤，这些都是构成你多彩生命的一部分，对于宇宙的结局，我们不需要太过于担心，即使是正在经历宇宙毁灭，那也是对于你们最特别，最独一无二的感受' },
      { t: 'p', v: '我们被赋予了短暂的时间体验人生，就应该按照自己的想法做下一件事，生命中遇见的每一个人都是你体验的一部分，你所拍下的每一张照片，不必因为某个不喜欢的人或事而删除，因为你删除的不仅仅是你所讨厌的，也还有自己的过去，自己拍下照片的那一秒。' },
      { t: 'h2', v: '写在最后' },
      { t: 'p', v: '世界是我们的。' },
      { t: 'p', v: '物质是不灭的。' },
      { t: 'p', v: '组成我们的所有原子，分子，尘埃，最终都会在宇宙中重新再见。' },
      { t: 'p', v: 'In the end, we will turn into dust and meet again.', c: 'wisteria', f: 'deco' }
    ]});

  add({ slug: 'image-read', section: 'research', cat: 'philosophy', date: '2026-08-07', read: 6, weight: 3,
    title: L('关于图像的可读性', '關於圖像的可讀性',
             'On the legibility of images', 'イメージの可読性について'),
    lede:  L('一张图需要被读懂到什么程度，取决于它想要谁看。',
             '一張圖需要被讀懂到什麼程度，取決於它想要誰看。',
             'How legible an image needs to be depends on who it wants to be seen by.',
             '画像がどこまで読み解かれるべきかは、誰に見せたいかで決まる。'),
    menu: L('图像', '圖像', 'Art', 'イメージ'),
    tags: [L('研究','研究','Research','リサーチ'), L('思考','思考','Philosophy','思索')],
    body: [
      { t: 'p', v: '我会等待下一个夏天' },
      { t: 'p', v: '也许是因为夏天的光线太明亮，也许是因为傍晚的风总能让人短暂地忘记白日的闷热，也许是因为这个季节里，有太多事物显得鲜活而具体。' },
      { t: 'p', v: '绿色的树叶，午后远处传来的声音，雨水落在地面上的气味，太阳下山前最后一段明亮的时间。' },
      { t: 'p', v: '夏天似乎总在提醒我，生命并不只是一连串抽象的年月。时间也可以是一个具体的下午，是皮肤感受到的温度，是走在路上时吹过脸颊的风，是某个瞬间忽然出现、却不知道该如何向别人解释的愉悦。' },
      { t: 'p', v: '可是夏天也会结束。' },
      { t: 'p', v: '白昼会逐渐缩短，晚风会慢慢变凉，树叶的颜色会改变。某一天，我才意识到，自己已经很久没有在黄昏时感受到盛夏的温度了。' },
      { t: 'p', v: '那些曾经觉得理所当然的东西，就这样悄悄离开。' },
      { t: 'p', v: '我不能要求夏天一直停留，也无法把某一个黄昏永远保存下来。我甚至可能忘记它具体发生在哪一天，忘记当时的天空究竟有多蓝，忘记那阵风吹过时，我心里正在想着什么。' },
      { t: 'p', v: '但我知道，自己曾经在那里。' },
      { t: 'p', v: '我曾经站在某个地方，看见太阳落下；曾经在某个傍晚听完一首歌；曾经因为一道光、一阵风，或者一片与平常不同的天空，而在心里产生过微小的喜悦。' },
      { t: 'p', v: '那些瞬间没有因为结束就变成从未发生过。' },
      { t: 'p', v: '我想，人生中的许多遗憾大概都是如此。我们并不总能及时意识到某个时刻的珍贵。许多日子在发生的时候显得普通，直到它们成为回忆，我们才发现，原来自己已经走过那么长的距离。' },
      { t: 'p', v: '小时候，我们可能希望快点长大；后来，又会怀念尚未长大的日子。我们以为自己还有很多时间，于是把一些事情留给以后，把一些话留给下次，把一些想去的地方留给将来。' },
      { t: 'p', v: '而时间并不会因为我们尚未准备好，就放慢脚步。' },
      { t: 'p', v: '所以我想试着改变一点。' },
      { t: 'p', v: '当我喜欢一个季节的时候，我希望自己能够坦然地喜欢它，而不是因为它终将结束，就提前为离别感到痛苦。' },
      { t: 'p', v: '当我遇见珍惜的人时，我希望自己能够认真地与他相处，而不是因为担心分离，就在相遇的时候先一步退缩。' },
      { t: 'p', v: '当我拥有一段还算平静的日子时，我希望自己能够感受到它的安稳，而不是因为害怕未来的不确定，就无法享受此刻的平静。' },
      { t: 'p', v: '我不可能永远快乐，也不可能把每个瞬间都过得充实而深刻。有些日子会疲倦，会失落，会对一切都提不起兴趣。生命并不需要被装饰成一首从头到尾都明亮的诗。' },
      { t: 'p', v: '我允许自己有不那么美好的时刻。' },
      { t: 'p', v: '我只是希望，当美好真的到来时，我不要总是忙着错过它。' },
      { t: 'p', v: '然后，我会等待下一个夏天。' },
      { t: 'p', v: '我不知道那时的自己会在哪里，会认识怎样的人，会经历哪些变化。也许我会比现在更成熟，也许会忘记如今的一些烦恼，也许会拥有新的愿望，重新理解今天所珍惜的一切。' },
      { t: 'p', v: '我不能保证下一个夏天一定比这个夏天美好。' },
      { t: 'p', v: '但我希望自己能够再次感受到它。' },
      { t: 'p', v: '我希望有一天，当温暖的风重新吹过来，当傍晚的阳光再次落在街道上，当熟悉的歌声从某个地方响起，我仍然愿意停下脚步，给这个世界一点时间，也给自己一点时间。' },
      { t: 'p', v: '恰恰因为夏天会结束，我才愿意在夏天到来的时候，好好感受它。' },
      { t: 'p', v: '我想，这句话并不只适用于夏天。' },
      { t: 'p', v: '它也适用于生命。' },
      { t: 'p', v: '我无法让时间停下，无法要求所有喜欢的人永远陪在身边，无法保证未来的一切都按照自己的愿望发展。但正是因为我知道这一切都有可能结束，所以我不愿意把全部的生活都留给等待。' },
      { t: 'p', v: '我想在能够相遇的时候相遇，在能够表达的时候表达，在能够看见的时候看见，在能够热爱的时候热爱。' },
      { t: 'p', v: '我想尽可能多地看看世界，也想在某些时候，单纯地待在世界之中。' },
      { t: 'p', v: '如果未来终究会带走现在，那么至少在现在还属于我的时候，我想真正地活过它。' }
    ]});

  /* ===== Universe · Metro ===== */
  add({ slug: 'noote-metro', section: 'universe', cat: 'metro', date: '2026-08-17', read: 9, weight: 5,
    title: L('NooteMetro：线网的第三次修订', 'NooteMetro：線網的第三次修訂',
             'NooteMetro: the third revision of the network', 'NooteMetro：路線網の三度目の改訂'),
    lede:  L('地图、交通系统与虚构的城市环境 —— 这个世界观里被建造得最久的一部分。',
             '地圖、交通系統與虛構的城市環境 —— 這個世界觀裡被建造得最久的一部分。',
             'Maps, transit and a fictional urban environment — the longest-built part of this world.',
             '地図、交通、架空の都市環境 —— この世界観で最も長く作り続けている部分。'),
    menu: P('NooteMetro'),
    tags: [L('世界观','世界觀','Universe','ユニバース'), L('轨道交通','軌道交通','Metro','メトロ')],
    body: [
      { t: 'p', v: '第三版线网最大的改动是承认了一件事：这座城市不需要那么多换乘站。' },
      { t: 'h2', v: '从八条减到六条' },
      { t: 'p', v: '前两版一直在加线，结果中心区挤成一团，外围却什么都没有。这一版反过来，先确定城市边界，再让线路去够它。' },
      { t: 'figure', cap: '第三版线网 · 中心区' },
      { t: 'p', v: '虚构的交通系统一样要讲道理。一旦线网自己说不通 —— 比如两条线在没有理由的地方交汇 —— 整个城市看起来就是假的。' }
    ]});

  add({ slug: 'station-naming', section: 'universe', cat: 'metro', date: '2026-08-01', read: 5, weight: 3,
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
  add({ slug: 'maps-geography', section: 'universe', cat: 'maps', date: '2026-07-29', read: 5, weight: 3,
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

  add({ slug: 'map-legend', section: 'universe', cat: 'maps', date: '2026-07-26', read: 4, weight: 2, pin: true,
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
  add({ slug: 'terrain-contours', section: 'universe', cat: 'terrain', date: '2026-08-03', read: 6, weight: 3,
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

  add({ slug: 'river-systems', section: 'universe', cat: 'terrain', date: '2026-07-30', read: 5, weight: 2,
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
  add({ slug: 'architecture-spaces', section: 'universe', cat: 'architecture', date: '2026-07-27', read: 6, weight: 3,
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

  add({ slug: 'facade-rhythm', section: 'universe', cat: 'architecture', date: '2026-07-23', read: 4, weight: 2,
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
  add({ slug: 'scenery-light', section: 'universe', cat: 'scenery', date: '2026-07-28', read: 4, weight: 3,
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

  add({ slug: 'seasons-frame', section: 'universe', cat: 'scenery', date: '2026-07-25', read: 5, weight: 2,
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
  add({ slug: 'strawberry-sheet', section: 'characters', cat: 'oc', date: '2026-08-18', read: 5, weight: 4,
    title: P('草莓酱'),
    lede:  L('【彩虹绘本】看板娘',
             '【彩虹绘本】看板娘',
             '【彩虹绘本】mascot',
             '【彩虹绘本】看板娘'),
    tags: [L('角色','角色','Characters','キャラクター'), L('原创角色','原創角色','OC','オリキャラ')],
    body: [
      { t: 'p', v: '这是高三某次语文考试的时候无聊画的，可能受到了《重返未来 1999》的影响，突然间想到一个最简单的设定，后来，我决定将其作为【彩虹绘本】的看板娘啦' },
      { t: 'figure', cap: '创作于2024年，也许该加个立绘了' },
      { t: 'p', v: '第七版把配色压暗了两度，加了一点不对称 —— 左右耳饰不一样，刘海一侧短一截。人立刻就有了脾气。' },
      { t: 'p', v: 'Puree Strawberry', f: 'deco' }
    ]});

  add({ slug: 'design-specification-document', section: 'about', cat: 'guidelines', date: '2026-10-16', read: 9, weight: 5, pin: true,
    title: L('JasperPeng 设计规范文档', '設計規範文檔',
             'Design Specification Document', 'デザイン仕様ドキュメント'),
    lede:  L('一张暖色的纸、一株茶芽，和让它们井井有条的几条规矩。下面的色块、字体和动作都是活的，可以点、可以拖、可以试。',
             '一張暖色的紙、一株茶芽，和讓它們井井有條的幾條規矩。下面的色塊、字體和動作都是活的，可以點、可以拖、可以試。',
             'A warm sheet of paper, a single sprout, and the few rules that keep them in order. Everything below is live — click it, drag it, try it.',
             '温かい色の紙、一本の茶の芽、そしてそれらを整える数本のルール。下の色や書体、動きはすべて触って試せます。'),
    author: 'JasperPeng，Claude by Anthropic',
    menu: L('设计规范文档', '設計規範文檔', 'Design Specification Document', 'デザイン仕様ドキュメント'),
    tags: [L('规范','規範','Guidelines','ガイドライン'), L('字体','字體','Fonts','書体'), L('标识','標識','Logos','ロゴ'), L('资源','資源','Resources','リソース')],
    body: [
      { t: 'html', v: '<div class="sx sx-hero" data-sx-auto><div class="sx-hero__dots" aria-hidden="true"><i style="--c:#FAF9F5;--i:0"></i><i style="--c:#141413;--i:1"></i><i style="--c:#8F9755;--i:2"></i><i style="--c:#8C89CD;--i:3"></i><i style="--c:#CF6872;--i:4"></i><i style="--c:#5E9FC3;--i:5"></i><i style="--c:#70B2B2;--i:6"></i><i style="--c:#D8C0A1;--i:7"></i></div><div class="sx-hero__say">A warm sheet of paper, <em>and a single sprout.</em></div><div class="sx-hero__sub">纸、墨、芽 —— 这个网站的颜色、字体、形状和动作都从这里来。<br>下面的东西都是活的：色块可以点，滑块可以拖，动画可以重播。</div></div>' },
      { t: 'h2', v: '00 五条原则' },
      { t: 'p', v: '整套规范只有五句话。后面所有的颜色、字号、圆角和动作，都是从这五句里推出来的。' },
      { t: 'html', v: '<div class="sx sx-wide sx-rules" data-sx-auto><div class="sx-rule" style="--c:#8F9755;--i:0"><b>1</b><strong>纸在先</strong><span>页面是一张暖色的纸。层次靠纸色深浅和细线，不靠阴影；墨色写字，茶芽是纸上长出的一点光，用得越少越亮。</span></div><div class="sx-rule" style="--c:#3C5387;--i:1"><b>2</b><strong>读的用衬线，点的用无衬线</strong><span>正文、导语用 Georgia，像在读书；标题、导航、按钮用 Google Sans，像在用工具。中文一律黑体。</span></div><div class="sx-rule" style="--c:#8C89CD;--i:2"><b>3</b><strong>形状会说话</strong><span>小圆角的矩形是动作，胶囊是标签。越大越圆，套在里面的圆角和外面同心；尺寸都是 4 的倍数。</span></div><div class="sx-rule" style="--c:#CF6872;--i:3"><b>4</b><strong>安静的版面，华丽的时刻</strong><span>颜色、字体、排版都克制，把舞台留给动效。一屏只演一出戏。</span></div><div class="sx-rule" style="--c:#70B2B2;--i:4"><b>5</b><strong>作品是主角</strong><span>不加滤镜、不加阴影，深色模式下也不调暗。界面退后一步，托住作品。</span></div></div>' },
      { t: 'hr' },
      { t: 'h2', v: '01 颜色：纸、墨和一株芽' },
      { t: 'p', v: '网站上只有三种东西：纸是背景，墨是文字，茶芽是唯一的品牌色。纸分三档深浅，再加一块暖色的燕麦色做卡片和图片底；墨也分三档，标题、正文、说明各用一档。' },
      { t: 'html', v: '<div class="sx sx-wide sx-sw" data-sx-auto><div><span class="sx-k">纸 · 背景　点一下复制色值</span><div class="sx-sw__row"><button class="sx-chip" type="button" data-sx-copy="#FAF9F5" style="--c:#FAF9F5;--on:#141413;--i:0"><b>Ivory light</b><span>页面</span><code>#FAF9F5</code></button><button class="sx-chip" type="button" data-sx-copy="#F0EEE6" style="--c:#F0EEE6;--on:#141413;--i:1"><b>Ivory medium</b><span>次级区块</span><code>#F0EEE6</code></button><button class="sx-chip" type="button" data-sx-copy="#E8E6DC" style="--c:#E8E6DC;--on:#141413;--i:2"><b>Ivory dark</b><span>悬停</span><code>#E8E6DC</code></button><button class="sx-chip" type="button" data-sx-copy="#E3DACC" style="--c:#E3DACC;--on:#141413;--i:3"><b>Oat</b><span>卡片、图片底</span><code>#E3DACC</code></button><button class="sx-chip" type="button" data-sx-copy="#FFFFFF" style="--c:#FFFFFF;--on:#141413;--i:4"><b>White</b><span>浮层、输入框</span><code>#FFFFFF</code></button></div></div><div><span class="sx-k">墨 · 文字</span><div class="sx-sw__row"><button class="sx-chip" type="button" data-sx-copy="#141413" style="--c:#141413;--on:#FAF9F5;--i:5"><em>17.5:1</em><b>Slate dark</b><span>标题、页脚</span><code>#141413</code></button><button class="sx-chip" type="button" data-sx-copy="#3D3D3A" style="--c:#3D3D3A;--on:#FAF9F5;--i:6"><em>10.3:1</em><b>Slate medium</b><span>正文</span><code>#3D3D3A</code></button><button class="sx-chip" type="button" data-sx-copy="#5E5D59" style="--c:#5E5D59;--on:#FAF9F5;--i:7"><em>6.3:1</em><b>Slate light</b><span>说明、日期</span><code>#5E5D59</code></button><button class="sx-chip" type="button" data-sx-copy="#B0AEA5" style="--c:#B0AEA5;--on:#141413;--i:8"><b>Cloud medium</b><span>只做装饰，不放字</span><code>#B0AEA5</code></button></div></div></div>' },
      { t: 'p', v: '三档文字的对比度在浅色下是 17.5、10.3、6.3，深色下是 17.3、10.2、6.1，几乎对称。所以切换深色模式时，层次感一点不变。' },
      { t: 'html', v: '<div class="sx sx-modes"><div class="sx-mode" style="--m-bg:#FAF9F5;--m1:#141413;--m2:#3D3D3A;--m3:#5E5D59"><span>浅色</span><div><span class="m1">标题 Aa</span><em>17.5:1</em></div><div><span class="m2">纸上的正文，像在读书。</span><em>10.3:1</em></div><div><span class="m3">说明 · 2026-10-16</span><em>6.3:1</em></div></div><div class="sx-mode" style="--m-bg:#151515;--m1:#F9F9F7;--m2:#C3C2B7;--m3:#97958D"><span>深色</span><div><span class="m1">标题 Aa</span><em>17.3:1</em></div><div><span class="m2">纸上的正文，像在读书。</span><em>10.2:1</em></div><div><span class="m3">说明 · 2026-10-16</span><em>6.1:1</em></div></div></div>' },
      { t: 'h3', v: '茶芽', c: 'tea' },
      { t: 'p', v: '茶芽的颜色取自 JasperPeng 自己画的嫩芽。十级色阶，浅的一端略偏小麦黄，深的一端略偏苔绿，像茶叶从芽尖到叶脉。点一下色块可以复制色值。' },
      { t: 'html', v: '<div class="sx sx-wide" data-sx-auto><div class="sx-tea" data-sx-auto><button class="sx-tea__step" type="button" data-sx-copy="#FBFCF4" style="--c:#FBFCF4;--on:#141413;--h:34%;--i:0" aria-label="茶芽 50 #FBFCF4"><b>50</b><code>#FBFCF4</code></button><button class="sx-tea__step" type="button" data-sx-copy="#EDF1C8" style="--c:#EDF1C8;--on:#141413;--h:41%;--i:1" aria-label="茶芽 100 #EDF1C8"><b>100</b><code>#EDF1C8</code></button><button class="sx-tea__step" type="button" data-sx-copy="#DCE1AD" style="--c:#DCE1AD;--on:#141413;--h:48%;--i:2" aria-label="茶芽 200 #DCE1AD"><b>200</b><code>#DCE1AD</code></button><button class="sx-tea__step" type="button" data-sx-copy="#BEC487" style="--c:#BEC487;--on:#141413;--h:56%;--i:3" aria-label="茶芽 300 #BEC487"><b>300</b><code>#BEC487</code></button><button class="sx-tea__step is-brand" type="button" data-sx-copy="#8F9755" style="--c:#8F9755;--on:#FFFFFF;--h:64%;--i:4" aria-label="茶芽 400 #8F9755"><b>400</b><code>#8F9755</code></button><button class="sx-tea__step" type="button" data-sx-copy="#7C833D" style="--c:#7C833D;--on:#FFFFFF;--h:71%;--i:5" aria-label="茶芽 500 #7C833D"><b>500</b><code>#7C833D</code></button><button class="sx-tea__step" type="button" data-sx-copy="#6B7044" style="--c:#6B7044;--on:#FFFFFF;--h:78%;--i:6" aria-label="茶芽 600 #6B7044"><b>600</b><code>#6B7044</code></button><button class="sx-tea__step" type="button" data-sx-copy="#545936" style="--c:#545936;--on:#FFFFFF;--h:85%;--i:7" aria-label="茶芽 700 #545936"><b>700</b><code>#545936</code></button><button class="sx-tea__step" type="button" data-sx-copy="#3B4027" style="--c:#3B4027;--on:#FFFFFF;--h:92%;--i:8" aria-label="茶芽 800 #3B4027"><b>800</b><code>#3B4027</code></button><button class="sx-tea__step" type="button" data-sx-copy="#252817" style="--c:#252817;--on:#FFFFFF;--h:100%;--i:9" aria-label="茶芽 900 #252817"><b>900</b><code>#252817</code></button></div><div class="sx-tea__uses"><span><i style="--c:#EDF1C8"></i>100 · 浅底标签</span><span><i style="--c:#8F9755"></i>400 · 品牌色块</span><span><i style="--c:#7C833D"></i>500 · 焦点光圈</span><span><i style="--c:#6B7044"></i>600 · 强调文字、品牌按钮</span><span><i style="--c:#545936"></i>700 · 标签上的字</span></div></div>' },
      { t: 'quote', v: '按钮和链接都是墨色，品牌色不用在它们上面。茶芽只出现在选中、焦点、标签和少量图形里，所以它一出现就很显眼。' },
      { t: 'h3', v: '点缀色和浅底色', c: 'wisteria' },
      { t: 'p', v: '藤紫在色环上和茶芽几乎正好相对，是最出彩的一对；莓红呼应草莓酱的莓果；星蓝是原来的品牌色，退成点缀。六个点缀色都调到和茶芽差不多的柔和度，各配一个浅底色，放在一起没有哪个特别跳。' },
      { t: 'html', v: '<div class="sx sx-wide sx-hue" data-sx-auto><div class="sx-wheel" aria-label="色环：茶芽在 114°，藤紫在 285°，几乎正好相对"><span class="sx-wheel__axis"></span><span class="sx-wheel__dot" style="--c:#8F9755;--a:114.6deg"></span><span class="sx-wheel__dot" style="--c:#8C89CD;--a:285.3deg"></span><span class="sx-wheel__mid"><b>171°</b><span>茶芽 ↔ 藤紫</span></span></div><div class="sx-pairs"><div class="sx-pair" style="--c:#5E9FC3;--soft:#C5DBE9;--i:0"><i></i><div><b>星蓝 · 雾</b><button class="sx-hex" type="button" data-sx-copy="#5E9FC3">#5E9FC3</button><button class="sx-hex" type="button" data-sx-copy="#C5DBE9">#C5DBE9</button><span class="sx-k" style="display:block;color:#5E5D59">原来的品牌色</span></div></div><div class="sx-pair" style="--c:#3C5387;--soft:#C6D1E9;--i:1"><i></i><div><b>暮蓝 · 霭</b><button class="sx-hex" type="button" data-sx-copy="#3C5387">#3C5387</button><button class="sx-hex" type="button" data-sx-copy="#C6D1E9">#C6D1E9</button><span class="sx-k" style="display:block;color:#5E5D59">能写字的那一个</span></div></div><div class="sx-pair" style="--c:#70B2B2;--soft:#B9D9D4;--i:2"><i></i><div><b>潟湖青 · 浪</b><button class="sx-hex" type="button" data-sx-copy="#70B2B2">#70B2B2</button><button class="sx-hex" type="button" data-sx-copy="#B9D9D4">#B9D9D4</button></div></div><div class="sx-pair" style="--c:#8C89CD;--soft:#D5C8DF;--i:3"><i></i><div><b>藤紫 · 丁香</b><button class="sx-hex" type="button" data-sx-copy="#8C89CD">#8C89CD</button><button class="sx-hex" type="button" data-sx-copy="#D5C8DF">#D5C8DF</button><span class="sx-k" style="display:block;color:#5E5D59">茶芽的对面</span></div></div><div class="sx-pair" style="--c:#CF6872;--soft:#EBCCCB;--i:4"><i></i><div><b>莓红 · 腮红</b><button class="sx-hex" type="button" data-sx-copy="#CF6872">#CF6872</button><button class="sx-hex" type="button" data-sx-copy="#EBCCCB">#EBCCCB</button><span class="sx-k" style="display:block;color:#5E5D59">草莓酱的颜色</span></div></div><div class="sx-pair" style="--c:#D8C0A1;--soft:#E6D5BB;--i:5"><i></i><div><b>沙 · 麦</b><button class="sx-hex" type="button" data-sx-copy="#D8C0A1">#D8C0A1</button><button class="sx-hex" type="button" data-sx-copy="#E6D5BB">#E6D5BB</button></div></div></div></div>' },
      { t: 'p', v: '点缀色写字时要看够不够深：暮蓝在纸上有 7.2:1，什么字号都能用；藤紫和莓红只够大字，所以只用在小标题和装饰性的大字上 —— 比如上面那个紫色的小标题。' },
      { t: 'h3', v: '选中的文字' },
      { t: 'p', v: '用鼠标选中这一段试试。选中的底色是茶芽加 50% 透明，文字保持原来的颜色，浅色下对比度 10.7:1，深色下 7.2:1 —— 选中了也照样好读。' },
      { t: 'hr' },
      { t: 'h2', v: '02 字体：读的用衬线，点的用无衬线' },
      { t: 'p', v: '英文的无衬线用 Google Sans，衬线用 Georgia，装饰性的大字句子用 Kawoszeh；中文一律黑体。字体文件随网站一起发，所以手机和电脑上看到的是同一套字。' },
      { t: 'html', v: '<div class="sx sx-wide sx-type"><label class="sx-type__in"><span>在这里打字试试</span><input class="sx-input" type="text" maxlength="48" value="Design. Think. Create." placeholder="Design. Think. Create." data-sx-type></label><div class="sx-type__row"><div><b>Google Sans</b><span>标题 · 导航 · 按钮</span></div><div class="sx-type__out" style="font-family:var(--font);font-weight:700;letter-spacing:-.02em" data-sx-type-out>Design. Think. Create.</div></div><div class="sx-type__row"><div><b>Georgia</b><span>正文 · 导语 · 引文</span></div><div class="sx-type__out" style="font-family:var(--font-serif)" data-sx-type-out>Design. Think. Create.</div></div><div class="sx-type__row"><div><b>Kawoszeh</b><span>装饰 · 只用大字</span></div><div class="sx-type__out" style="font-family:var(--font-deco);font-variant-numeric:oldstyle-nums;font-size:clamp(30px,4.6vw,52px)" data-sx-type-out>Design. Think. Create.</div></div><div class="sx-type__row"><div><b>等宽</b><span>版本号 · 数据</span></div><div class="sx-type__out" style="font-family:var(--font-mono);font-size:clamp(18px,2.4vw,26px)" data-sx-type-out>Design. Think. Create.</div></div></div>' },
      { t: 'quote', v: '英文正文用 Georgia，中文正文退回黑体：宋体在屏幕上，尤其在 Windows 上，小字号容易发虚。' },
      { t: 'p', v: '数字也分两种：要读的地方用等高的数字，日期、价格一眼就能对齐；装饰的地方反过来，用高高低低的起伏数字，像手写的一样。' },
      { t: 'html', v: '<div class="sx sx-nums"><div><strong style="font-family:var(--font-serif)">2026 · 1234567890</strong><span>要读的地方 · 等高数字</span></div><div><strong style="font-family:var(--font-deco);font-variant-numeric:oldstyle-nums">2026 · 1234567890</strong><span>装饰的地方 · 起伏数字</span></div></div>' },
      { t: 'h3', v: '字号' },
      { t: 'p', v: '十档字号会随屏幕宽度连续缩放，不是到了某个宽度突然跳一下。在电脑上拖动窗口宽度试试，右边是此刻的实际像素。' },
      { t: 'html', v: '<div class="sx sx-ladder"><div><div><b>首屏大标题</b><span>48 → 80</span></div><strong style="font-size:var(--fs-display);font-family:var(--font);font-weight:700">Design.</strong><output>—</output></div><div><div><b>宣言</b><span>32 → 64</span></div><strong style="font-size:var(--fs-statement);font-family:var(--font-serif);font-weight:400">Meaning.</strong><output>—</output></div><div><div><b>文章标题</b><span>32 → 52</span></div><strong style="font-size:var(--fs-h1);font-family:var(--font);font-weight:700">一套够用的规范</strong><output>—</output></div><div><div><b>区块标题</b><span>28 → 36</span></div><strong style="font-size:var(--fs-h2);font-family:var(--font);font-weight:700">纸、墨和一株芽</strong><output>—</output></div><div><div><b>小标题</b><span>23 → 32</span></div><strong style="font-size:var(--fs-h3);font-family:var(--font);font-weight:600">形状会说话</strong><output>—</output></div><div><div><b>卡片标题</b><span>20 → 24</span></div><strong style="font-size:var(--fs-h4);font-family:var(--font);font-weight:600">作品是主角</strong><output>—</output></div><div><div><b>导语</b><span>20 → 24</span></div><strong style="font-size:var(--fs-lead);font-family:var(--font-serif);font-weight:400">一张暖色的纸。</strong><output>—</output></div><div><div><b>正文</b><span>18 → 20</span></div><strong style="font-size:var(--fs-text);font-family:var(--font-serif);font-weight:400">读的用衬线，像在读书。</strong><output>—</output></div><div><div><b>界面</b><span>16</span></div><strong style="font-size:var(--fs-ui);font-family:var(--font);font-weight:500">导航 · 按钮 · 标签</strong><output>—</output></div><div><div><b>小字</b><span>14</span></div><strong style="font-size:var(--fs-small);font-family:var(--font);font-weight:400">日期、图注和说明</strong><output>—</output></div></div>' },
      { t: 'hr' },
      { t: 'h2', v: '03 版面与间距' },
      { t: 'p', v: '页面是 12 栏，最宽 1432px，页边距随屏幕宽度从 32px 长到 80px。上面的东西都对齐到栏上。' },
      { t: 'html', v: '<div class="sx sx-wide sx-page" data-sx-auto aria-label="12 栏网格上排好的一页"><div class="sx-page__cols"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i><i style="--i:8"></i><i style="--i:9"></i><i style="--i:10"></i><i style="--i:11"></i></div><div class="sx-page__body"><div class="a" style="--i:0"></div><div class="b" style="--i:1"></div><div class="c" style="--i:2"></div><div class="d" style="--i:3"></div><div class="e" style="--i:4"></div><div class="f" style="--i:5"></div></div><span class="sx-page__tag" style="left:6%;top:2%">12 栏</span><span class="sx-page__tag" style="right:6%;top:2%">最宽 1432px</span><span class="sx-page__tag" style="left:1%;bottom:3%">页边距 32 → 80</span></div>' },
      { t: 'p', v: '从按钮里的缝隙到区块之间的留白，都从同一把 12 级的尺子上取，全是 4 的倍数。' },
      { t: 'html', v: '<div class="sx sx-space" data-sx-auto><div><b>space-1</b><i style="--v:4;--c:#8F9755;--i:0"></i><span>4px · 图标和字</span></div><div><b>space-2</b><i style="--v:8;--c:#8F9755;--i:1"></i><span>8px</span></div><div><b>space-3</b><i style="--v:12;--c:#8F9755;--i:2"></i><span>12px</span></div><div><b>space-4</b><i style="--v:16;--c:#8F9755;--i:3"></i><span>16px · 按钮内边距</span></div><div><b>space-5</b><i style="--v:24;--c:#8C89CD;--i:4"></i><span>24px · 卡片之间</span></div><div><b>space-6</b><i style="--v:32;--c:#8C89CD;--i:5"></i><span>32px</span></div><div><b>space-7</b><i style="--v:40;--c:#8C89CD;--i:6"></i><span>40px</span></div><div><b>space-8</b><i style="--v:48;--c:#8C89CD;--i:7"></i><span>48px</span></div><div><b>space-9</b><i style="--v:64;--c:#CF6872;--i:8"></i><span>64px</span></div><div><b>space-10</b><i style="--v:80;--c:#CF6872;--i:9"></i><span>80px</span></div><div><b>space-11</b><i style="--v:96;--c:#CF6872;--i:10"></i><span>96px</span></div><div><b>space-12</b><i style="--v:160;--c:#CF6872;--i:11"></i><span>160px · 区块上下</span></div><div style="margin-top:8px"><span></span><span class="sx-k"><span style="color:#8F9755">●</span> 组件里面　<span style="color:#8C89CD">●</span> 组件之间　<span style="color:#CF6872">●</span> 区块之间</span><span></span></div></div>' },
      { t: 'hr' },
      { t: 'h2', v: '04 圆角：控件看高度，面看大小，嵌套看外框' },
      { t: 'p', v: '三条规则就能算出所有圆角：控件的圆角是高度的四分之一；面越大越圆，卡片 18px；套在里面的圆角和外框同心。拖一下滑块看看。' },
      { t: 'html', v: '<div class="sx sx-rad"><div class="sx-panel" data-sx-rbox style="--h:40"><span class="sx-k">控件：圆角 = 高度 ÷ 4</span><div class="sx-rad__stage"><span class="sx-rad__btn">按钮</span></div><input class="sx-range" type="range" min="24" max="64" step="4" value="40" data-sx-range="h" aria-label="控件高度"><span class="sx-read">高 <b data-sx-out="v">40</b>px → 圆角 <b data-sx-out="q">10</b>px</span></div><div class="sx-panel" data-sx-rbox style="--p:8"><span class="sx-k">嵌套：内角 = 外角 − 间距</span><div class="sx-rad__stage"><div class="sx-rad__out"><div class="sx-rad__in">同心</div></div></div><input class="sx-range" type="range" min="4" max="20" step="2" value="8" data-sx-range="p" aria-label="间距"><span class="sx-read">外角 24 − 间距 <b data-sx-out="v">8</b> = 内角 <b data-sx-out="c">16</b>px</span></div></div>' },
      { t: 'html', v: '<div class="sx sx-panel sx-shapes"><div><i style="width:64px;height:24px;border-radius:999px;--c:#EDF1C8"></i>标签<br>胶囊</div><div><i style="width:84px;height:40px;border-radius:10px;--c:#141413"></i>按钮<br>10</div><div><i style="width:96px;height:72px;border-radius:14px;--c:#D5C8DF"></i>浮层、图片<br>14</div><div><i style="width:112px;height:96px;border-radius:18px;--c:#E3DACC"></i>卡片<br>18</div><div><i style="width:132px;height:120px;border-radius:24px;--c:#C5DBE9"></i>展示卡<br>24</div></div>' },
      { t: 'quote', v: '小圆角的矩形 = 能点、会发生动作；胶囊 = 标签和状态。两种形状不混用，所以按钮不做成胶囊。' },
      { t: 'hr' },
      { t: 'h2', v: '05 组件' },
      { t: 'p', v: '控件只有三种高度：32、40、48，默认 40。一个画面里最多一个实心的主按钮，最大的那一档只在首屏用。悬停 200ms，按下缩到 97%。' },
      { t: 'html', v: '<div class="sx sx-panel sx-ui"><span class="sx-k">把鼠标放上去、按下去试试</span><div><span class="sx-k sx-mono">32 · 小</span><button class="sx-btn sx-btn--primary sx-btn--sm" type="button">主按钮</button><button class="sx-btn sx-btn--soft sx-btn--sm" type="button">次按钮</button><button class="sx-btn sx-btn--ghost sx-btn--sm" type="button">细边按钮</button></div><div><span class="sx-k sx-mono">40 · 默认</span><button class="sx-btn sx-btn--primary" type="button">主按钮</button><button class="sx-btn sx-btn--soft" type="button">次按钮</button><button class="sx-btn sx-btn--ghost" type="button">细边按钮</button></div><div><span class="sx-k sx-mono">48 · 首屏</span><button class="sx-btn sx-btn--primary sx-btn--lg" type="button">主按钮</button><button class="sx-btn sx-btn--ghost sx-btn--lg" type="button">细边按钮</button></div><div><span class="sx-k sx-mono">标签</span><span class="sx-tag">设计</span><span class="sx-tag">规范</span><span class="sx-tag">字体</span></div><div><span class="sx-k sx-mono">输入框</span><input class="sx-input" type="text" placeholder="点一下，看焦点光圈" style="flex:1;max-width:340px" aria-label="试试输入框"></div></div>' },
      { t: 'hr' },
      { t: 'h2', v: '06 动效：安静的纸，华丽的时刻', c: 'jam' },
      { t: 'p', v: '动效分两层。界面层是小动作：快、轻、不打扰，你一动手它就回应，从不让人等。叙事层是讲故事的大场面：画面钉住，跟着滚动推进，一屏只演一出。两层用的是同一套「纸的动作」，所以再华丽也像发生在纸上。' },
      { t: 'html', v: '<div class="sx sx-panel" data-sx-box data-sx-auto><div class="sx-bar"><span class="sx-k">每条都按真实时长跑一遍</span><button class="sx-play" type="button" data-sx-play>再跑一遍</button></div><div class="sx-dur"><span class="sx-dur__h">界面层 · 一动手就有回应</span><div><span>即时反馈</span><s><i style="--d:60;--c:#8F9755"></i></s><code>60ms</code></div><div><span>按下</span><s><i style="--d:120;--c:#8F9755"></i></s><code>120ms</code></div><div><span>悬停、菜单</span><s><i style="--d:200;--c:#8F9755"></i></s><code>200ms</code></div><div><span>弹窗</span><s><i style="--d:300;--c:#8F9755"></i></s><code>300ms</code></div><div><span>卡片浮起</span><s><i style="--d:450;--c:#8F9755"></i></s><code>450ms</code></div><span class="sx-dur__h">叙事层 · 讲故事的大场面</span><div><span>入场</span><s><i style="--d:900;--c:#8C89CD"></i></s><code>900ms</code></div><div><span>整屏过渡</span><s><i style="--d:1000;--c:#8C89CD"></i></s><code>1000ms</code></div></div></div>' },
      { t: 'h3', v: '五条曲线' },
      { t: 'p', v: '同样的时长，曲线不同，感觉就完全不同。按下要干脆，悬停要顺，小惊喜会冲过头再弹回来，入场像纸慢慢落定。点「慢放」看得更清楚。' },
      { t: 'html', v: '<div class="sx sx-panel" data-sx-box data-sx-auto><div class="sx-bar"><span class="sx-k">五条曲线 · 小球按各自的时长和曲线跑</span><span style="display:flex;gap:8px"><button class="sx-play" type="button" data-sx-slow aria-pressed="false">慢放 ×5</button><button class="sx-play" type="button" data-sx-play>播放</button></span></div><div class="sx-curves"><div class="sx-curve" style="--c:#8F9755;--d:120;--e:cubic-bezier(0.32,0.72,0,1)"><svg viewBox="0 0 52 52" aria-hidden="true"><rect x="0.5" y="0.5" width="51" height="51" rx="8"/><path d="M4 48 C18.1 16.3 4.0 4.0 48 4"/></svg><div><b>按下</b><code>120ms · 0.32 0.72 0 1</code></div><div class="sx-curve__track"><i></i></div></div><div class="sx-curve" style="--c:#3C5387;--d:200;--e:cubic-bezier(0.165,0.84,0.44,1)"><svg viewBox="0 0 52 52" aria-hidden="true"><rect x="0.5" y="0.5" width="51" height="51" rx="8"/><path d="M4 48 C11.3 11.0 23.4 4.0 48 4"/></svg><div><b>悬停、菜单</b><code>200ms · 0.165 0.84 0.44 1</code></div><div class="sx-curve__track"><i></i></div></div><div class="sx-curve" style="--c:#CF6872;--d:300;--e:cubic-bezier(0.34,1.3,0.64,1)"><svg viewBox="0 0 52 52" aria-hidden="true"><rect x="0.5" y="0.5" width="51" height="51" rx="8"/><path d="M4 48 C19.0 -9.2 32.2 4.0 48 4"/></svg><div><b>小惊喜</b><code>300ms · 0.34 1.3 0.64 1</code></div><div class="sx-curve__track"><i></i></div></div><div class="sx-curve" style="--c:#8C89CD;--d:900;--e:cubic-bezier(0.16,1,0.3,1)"><svg viewBox="0 0 52 52" aria-hidden="true"><rect x="0.5" y="0.5" width="51" height="51" rx="8"/><path d="M4 48 C11.0 4.0 17.2 4.0 48 4"/></svg><div><b>纸页落定</b><code>900ms · 0.16 1 0.3 1</code></div><div class="sx-curve__track"><i></i></div></div><div class="sx-curve" style="--c:#70B2B2;--d:1000;--e:cubic-bezier(0.4,0,0.6,1)"><svg viewBox="0 0 52 52" aria-hidden="true"><rect x="0.5" y="0.5" width="51" height="51" rx="8"/><path d="M4 48 C21.6 48.0 30.4 4.0 48 4"/></svg><div><b>跟随滚动</b><code>1000ms · 0.4 0 0.6 1</code></div><div class="sx-curve__track"><i></i></div></div></div></div>' },
      { t: 'h3', v: '一出完整的戏' },
      { t: 'p', v: '往下滚动：下面这块会钉在屏幕上，文字像墨水一样一个词一个词地渗出来，图片像裁开纸一样展开，最后一笔线描出来。往回滚，一切倒着走。' },
      { t: 'html', v: '<div class="sx sx-wide sx-scene" data-sx-scene><div class="sx-scene__stick"><div class="sx-scene__card"><div><div class="sx-scene__say"><span>设计</span><span>是在</span><span>人与世界</span><span>之间，</span><span>建立</span><span>意义、</span><span>连接</span><span>与</span><span>温度。</span></div><div class="sx-scene__steps"><span>墨迹显影</span><span>裁纸展开</span><span>描线</span></div><div class="sx-scene__bar" aria-hidden="true"><i></i></div></div><div class="sx-scene__pic"><svg viewBox="0 0 400 300" role="img" aria-label="示例画面：沙色山丘、苔绿坡地和一个茶芽色的太阳"><rect width="400" height="300" fill="#C5DBE9"/><circle cx="300" cy="86" r="34" fill="#8F9755"/><path d="M0 230 C70 180 140 185 210 222 C270 254 330 236 400 200 L400 300 L0 300 Z" fill="#D8C0A1"/><path d="M0 262 C90 236 170 246 250 270 C310 288 360 282 400 270 L400 300 L0 300 Z" fill="#7C9D74"/><path d="M120 120 l4 9 10 1 -8 6 3 10 -9-5 -9 5 3-10 -8-6 10-1z" fill="#FAF9F5"/><path data-sx-draw pathLength="1" d="M40 196 C80 150 120 160 150 130 S210 70 262 92 S292 120 300 86" fill="none" stroke="#141413" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div></div></div>' },
      { t: 'h3', v: '纸的五个动作' },
      { t: 'p', v: '所有动效都由这五个动作组合出来。每张卡片进入视野时会演一次，也可以点「重播」。' },
      { t: 'html', v: '<div class="sx sx-wide sx-moves"><div class="sx-move" data-sx-box data-sx-auto><div class="sx-move__demo"><div class="sx-ink"><span style="--i:0">纸上的</span><span style="--i:1">字，</span><span style="--i:2">慢慢</span><span style="--i:3">显出来。</span></div></div><b>墨迹显影</b><span>透明度和一点模糊一起退去，像墨水渗进纸里。用在大字句子上，跟着滚动一个词一个词地出来。</span><code>透明度 .15 → 1 · 模糊 3px → 0</code><button class="sx-play" type="button" data-sx-play>重播</button></div><div class="sx-move" data-sx-box data-sx-auto><div class="sx-move__demo"><div class="sx-sheets"><i style="--c:#E3DACC;--r:-8deg;--tilt:-8deg;--i:0;left:0px"></i><i style="--c:#D5C8DF;--r:3deg;--tilt:3deg;--i:1;left:44px"></i><i style="--c:#EBCCCB;--r:9deg;--tilt:9deg;--i:2;left:88px"></i></div></div><b>纸页落定</b><span>上浮、淡入，再带一点倾斜，像一张纸被轻轻放到桌上。卡片和列表入场都用它。</span><code>位移 24px · 900ms · 依次间隔 60ms</code><button class="sx-play" type="button" data-sx-play>重播</button></div><div class="sx-move" data-sx-box data-sx-auto><div class="sx-move__demo"><svg class="sx-draw" viewBox="0 0 240 70" aria-hidden="true"><path pathLength="1" d="M8 50 C40 10 70 60 100 34 S150 8 178 36 S214 58 232 22"/></svg></div><b>描线</b><span>分隔线、下划线、线路图像被一笔画出来，速度均匀，进入视野时画一次。</span><code>300px/s · 圆头</code><button class="sx-play" type="button" data-sx-play>重播</button></div><div class="sx-move" data-sx-box data-sx-auto><div class="sx-move__demo"><div class="sx-cut"><svg viewBox="0 0 400 175" aria-hidden="true"><rect width="400" height="175" fill="#EBCCCB"/><circle cx="90" cy="70" r="30" fill="#CF6872"/><path d="M0 130 C100 100 220 150 400 110 L400 175 L0 175Z" fill="#E6D5BB"/></svg></div></div><b>裁纸展开</b><span>画面沿着裁切线从框里「长」出来，同时从微微放大落回原样。</span><code>裁切 12% → 0 · 画面 1.12 → 1</code><button class="sx-play" type="button" data-sx-play>重播</button></div><div class="sx-move"><div class="sx-move__demo"><div class="sx-lift">把鼠标移到这张卡片上</div></div><b>纸张浮起</b><span>悬停时抬起 4px，出现很淡的影子，像纸从桌面掀起；按下去缩到 97%。</span><code>悬停 450ms · 按下 120ms · 缩放 .97</code><button class="sx-btn sx-btn--primary sx-btn--sm" type="button" style="justify-self:start">按一下试试</button></div></div>' },
      { t: 'h3', v: '六条规矩' },
      { t: 'ul', v: ['一屏只演一出：同一屏里最多一个大场面，其他地方保持安静。', '内容先在，动效后到：文字和图片默认看得见，入场只播一次；跟着滚动的场景可以来回。', '只动四样东西：位移、缩放、透明度、裁切，模糊最多 4px，保证每秒 60 帧。', '时长有上限：界面层不超过 450ms，叙事层不超过 1.2 秒；位移只用 4、8、24、40px。', '尊重系统设置：开了「减少动态效果」，一律换成淡入，钉住的场景直接显示最后的画面。', '手机上减配：位移减半，不做模糊，钉住的场景缩短。'] },
      { t: 'hr' },
      { t: 'p', v: 'Quiet pages, bright moments.', c: 'wisteria', f: 'deco' },
      { t: 'p', v: '这份规范会跟着网站一起长。新的颜色、新的动作，都会先在这里试过，再放到页面上。' }
    ]});

  /* ===== Characters · Character ===== */
  add({ slug: 'character-relations', section: 'characters', cat: 'character', date: '2026-08-01', read: 6, weight: 4,
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

  add({ slug: 'silence-design', section: 'characters', cat: 'character', date: '2026-07-27', read: 5, weight: 3,
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
  add({ slug: 'oc-lineup', section: 'characters', cat: 'illustrations', date: '2026-07-24', read: 4, weight: 3,
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

  add({ slug: 'expression-sheet', section: 'characters', cat: 'illustrations', date: '2026-07-22', read: 5, weight: 2,
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
  add({ slug: 'oc-guidebook', section: 'characters', cat: 'guidebook', date: '2026-08-05', read: 4, weight: 3,
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
  add({ slug: 'regrettable', section: 'research', cat: 'philosophy', date: '2026-10-19', read: 5, weight: 4,
    title: L('遗憾的是', '遺憾的',
             'Regrettable', '残念ながら'),
    lede:  L('分享一些我喜爱的歌，被封禁的歌。',
             '分享一些我喜愛的歌，被封禁的歌',
             'Share some songs I love — songs that have been banned.',
             '私の好きな曲、そして発禁になった曲をいくつか紹介したい。'),
    menu: true,
    tags: [L('资源','資源','Resources','リソース'), P('2026')],
    body: [
      { t: 'h2', v: '艺术是属于世界的。' },
      { t: 'p', v: '我一直认为，艺术是属于世界的，是一个时代的符号和证明，当今世界，不管哪个国家考古出新的作品，对于全人类的发展或研究都是重要且珍贵的。我们能学习到旧日的文化，不管是技术还是某一种图案纹样，不仅能为日后艺术发展提供参考，也能为科学界研究地球提供论据。' },
      { t: 'p', v: '文化和艺术本来应该是互不相干，各自生长的领域。然而因为政见不一，在没有言论自由的国家，永远失去了本应属于世界的文化瑰宝，这不仅是这个国家的损失，更是对全人类的损失。因为你一个地方的封禁，导致世界各地的朋友再也听不到这段旋律，再也见不到这片光景。' },
      { t: 'p', v: '当然，人们不会因为你的威严就屈服，人们自发留下了很多宝贵的作品，在非官方的渠道永远保护着......' },
      { t: 'h2', v: '遗憾的' },
      { t: 'h2', v: '还愿-草东没有派对', c: 'jam' },
      { t: 'img', src: 'assets/images/research/regrettable-2.jpg', cap: '还愿-草东没有派对' },
      { t: 'p', v: '游戏《还愿》的歌曲，因维尼熊称呼，被中国大陆封禁，起初人们以为只是大陆作妖，已经见怪不怪了，没想到后来Steam全球商店都下架了这部作品。' },
      { t: 'p', v: '2020 年 12 月： 赤烛宣布准备在 GOG 上重新发行，但 GOG 随后取消了发行计划。\n2021 年 3 月： 赤烛通过自己的官方商店重新销售《还愿》。\n2025 年 2 月： 开发商明确表示，没有重新上架 Steam 的计划，也没有 Steam 激活码可供购买。' },
      { t: 'h3', v: '庆幸的是，游戏的音乐还能在中国大陆以外的平台收听。' },
      { t: 'h2', v: '嗵嗵-DOUDOU', c: 'jam' },
      { t: 'img', src: 'assets/images/research/regrettable-3.jpg', cap: '嗵嗵-DOUDOU' },
      { t: 'html', v: '<div style="margin:24px 0 16px;padding:18px 20px;background:#FAF9F5;border:1px solid #E8E6DC;border-radius:12px;">\n  <a href="https://Floruit.show/" target="_blank" rel="noopener noreferrer"\n     style="display:inline-flex;align-items:center;gap:7px;color:#356AC3;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">\n    跳转至 Floruit.show/嗵嗵\n    <span style="font-size:17px;font-weight:400;">↗</span>\n  </a>\n  <p style="margin:10px 0 0;color:#77766F;font-size:12px;line-height:1.8;">\n    友链是为互助之目的，所指向站点均与 JasperPeng <strong style="color:#5E5D59;font-weight:600;">无隶属或合作关系</strong>，亦不构成对其的认可或背书。\n  </p>\n</div>' },
      { t: 'h3', v: '截至发文，中国大陆官方至今没有对这首歌下架作出任何解释。以下说法也并未得到证实。' },
      { t: 'p', v: '一种说法，《嗵嗵》于2025年3月发行，与中国官方大力宣传歌曲《玉盘》冲突，《玉盘》对于中国大陆和台湾有特殊含义，大陆评论区控评现象严重，反对者继而涌向比《玉盘》热度更高的《嗵嗵》评论区刷不良言论[1]，导致《嗵嗵》下架。然而，目前尚缺乏能够直接证明上述事件之间存在因果关系的可靠证据，因此，这一解释仍应视为未经证实的推测，而非已确认的下架原因。' },
      { t: 'p', v: '一种说法认为，《嗵嗵》下架可能与其歌词引发的争议有关。部分听众或二创创作者对歌词中的生命、死亡及情绪表达进行了较为阴暗的解读，并将其与自我伤害或自杀等主题联系起来。这种解读可能引发部分用户的投诉或举报，进而导致平台对歌曲及相关视频进行审核处理。然而，目前尚缺乏能够证明相关举报确实发生，以及举报直接导致歌曲下架的可靠证据。' },
      { t: 'p', v: '此外，DOUDOU乐队遭受同行恶意举报也是一种未被证实的猜测。' },
      { t: 'p', v: '最后，关于福禄寿乐队过往以及版权方主动下架猜测很容易被证伪，首先，如果因为福禄寿乐队过往而下架作品，那也是福禄寿原账号先被下架封禁，而非DOUDOU账号，原账号《我用什么把你留住》热度比《嗵嗵》高，影响力也更大，没有理由只有《嗵嗵》被下架，其次，如果版权方主动要求下架，不会使全大陆内网无法搜索“嗵嗵”词条，也不会有改歌词版再次被下架。' },
      { t: 'hr' },
      { t: 'p', v: '[1]不良言论：此处特指中国大陆所认为的不良言论，对全世界范围内无适用性。' }
    ]});

  add({ slug: 'brush-pack', section: 'about', cat: 'resources', date: '2026-08-04', read: 3, weight: 2, pin: true,
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
  add({ slug: 'logos', section: 'about', cat: 'guidelines', date: '2026-08-12', read: 1, weight: 2,
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
  add({ slug: 'archive-naming', section: 'about', cat: 'misc', date: '2026-07-20', read: 4, weight: 2,
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

  add({ slug: 'workspace', section: 'about', cat: 'misc', date: '2026-07-18', read: 3, weight: 1,
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
    /* 推荐权重收进 1–5 的整数；没写、写错都当 3 */
    var wt = Math.round(+a.weight);
    a.weight = (wt >= 1 && wt <= 5) ? wt : 3;
    a.pin = a.pin === true;
  });
  /* 立绘（Figma 批注要求 PNG 透明背景） */
  CHARACTERS.forEach(function (c) { c.art = assetOf('characters', c.slug); });
  /* 漫画：封面走同一套清单；条漫页面由 build.ps1 扫 assets/comics/<slug>/ 写进 JP_COMIC_PAGES */
  var PAGES = w.JP_COMIC_PAGES || {};
  COMICS.forEach(function (c) {
    c.cover = assetOf('comics', c.slug);
    c.pages = PAGES[c.slug] || [];
  });

  function dirOf(key) {
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === key) return SECTIONS[i].dir;
    return 'works';
  }

  w.JP = { SECTIONS: SECTIONS, ARTICLES: A, CHARACTERS: CHARACTERS, COMICS: COMICS, VERSION: VERSION, BOARD: BOARD };

})(window);
