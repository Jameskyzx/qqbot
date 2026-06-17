export interface CSPlayer {
  nick: string;
  name: string;
  team: string;
  role: string;
  note: string;
  style?: string;
  avoid?: string;
  image: string;
  imageSource: 'liquipedia' | 'wikimedia';
  aliases?: string[];
  tags?: string[];
}

export interface DailyCard {
  key: string;
  title: string;
  name: string;
  subtitle: string;
  scoreLabel: string;
  advice: string;
  avoid: string;
  line: string;
  image?: string;
  imageLabel?: string;
  liquipediaPage?: string;
  playerImageFallback?: string;
  fandomFile?: string;
  fandomPage?: string;
}

export interface SkinCard extends DailyCard {
  weapon: string;
  rarity: string;
}

export interface KnifeCard extends DailyCard {
  aliases: string[];
  skinFilePrefixes: string[];
}

export interface DailyCharacter {
  key: string;
  title: string;
  name: string;
  band: 'MyGO!!!!!' | 'Ave Mujica';
  role: string;
  voice: string;
  note: string;
  page: string;
  file?: string;
  aliases?: string[];
  era?: string;
  imageMood?: string;
}

export interface DailyGenshinCharacter {
  key: string;
  title: string;
  name: string;
  page: string;
  note: string;
  tag: string;
  cn?: string;
  element?: string;
  region?: string;
  weapon?: string;
  aliases?: string[];
}

export interface DailyTextCard {
  key: string;
  title: string;
  name: string;
  subtitle: string;
  body: string;
  advice: string;
  line: string;
  scoreLabel: string;
}

export interface DailyDuelWeapon {
  key: string;
  name: string;
  style: string;
  power: number;
  tempo: number;
  line: string;
  image?: string;
  fandomFile?: string;
}

export const csPlayers: CSPlayer[] = [
  { nick: 'ZywOo', name: 'Mathieu Herbaut', team: 'Vitality', role: 'AWPer / 核心大哥', note: '今天就按这个纪律打，枪硬但别急着开香槟。', image: 'https://liquipedia.net/commons/images/2/2b/ZywOo_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia', aliases: ['载物'] },
  { nick: 's1mple', name: 'Oleksandr Kostyliev', team: 'NAVI / Falcons 语境', role: 'AWPer / 巨星位', note: '手感上来就是不讲道理，但别学他每一波都想当主角。', image: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Oleksandr_s1mple_Kostyliev_%28cropped%29.jpg', imageSource: 'wikimedia', aliases: ['森破'] },
  { nick: 'donk', name: 'Danil Kryshkovets', team: 'Team Spirit', role: 'Rifler / Entry', note: '这签攻击性拉满，见人就想撕口子，但补枪也得跟上。', image: 'https://liquipedia.net/commons/images/a/a5/Donk_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'sh1ro', name: 'Dmitriy Sokolov', team: 'Team Spirit', role: 'AWPer', note: '别急，架住关键枪，今天靠纪律赢回合。', image: 'https://liquipedia.net/commons/images/4/4c/Sh1ro_at_BLAST_Open_Spring_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'ropz', name: 'Robin Kool', team: 'FaZe / Vitality 语境', role: 'Lurker / Rifler', note: '今天你得学会晚点出手，timing 到了再收。', image: 'https://liquipedia.net/commons/images/f/f4/Ropz_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'dev1ce', name: 'Nicolai Reedtz', team: 'Astralis 语境', role: 'AWPer', note: '老派纪律签，别花，架好枪就有人送上门。', image: 'https://liquipedia.net/commons/images/0/05/Dev1ce_at_Roman_Imperium_Cup_V.jpg', imageSource: 'liquipedia', aliases: ['device'] },
  { nick: 'Aleksib', name: 'Aleksi Virolainen', team: 'NAVI', role: 'IGL', note: '今天别光想杀人，先把队友摆明白，默认别散。', image: 'https://liquipedia.net/commons/images/2/26/Aleksib_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'b1t', name: 'Valerii Vakhovskyi', team: 'NAVI', role: 'Rifler', note: '定位要干净，少说话多补枪，这签挺稳。', image: 'https://liquipedia.net/commons/images/2/2e/B1t_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'w0nderful', name: 'Ihor Zhdanov', team: 'NAVI', role: 'AWPer', note: '狙别乱换位置，今天拼的是稳定，不是剪辑。', image: 'https://liquipedia.net/commons/images/9/9e/W0nderful_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'EliGE', name: 'Jonathan Jablonowski', team: 'Complexity / Liquid 语境', role: 'Rifler', note: '今天正面要硬一点，但别把队友补枪距离拉没。', image: 'https://liquipedia.net/commons/images/e/e3/EliGE_at_SL_Budapest_Major_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'flameZ', name: 'Shahar Shushan', team: 'Vitality', role: 'Entry / Rifler', note: '第一身位有说法，但别每回合都把自己当闪光弹。', image: 'https://liquipedia.net/commons/images/2/29/FlameZ_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'magixx', name: 'Boris Vorobyev', team: 'Team Spirit', role: 'Support / Rifler', note: '今天干脏活，别嫌镜头少，赢回合才是真的。', image: 'https://liquipedia.net/commons/images/e/e3/Magixx_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'huNter-', name: 'Nemanja Kovac', team: 'G2 语境', role: 'Rifler', note: '老哥位，今天别急着证明自己，关键枪稳住就行。', image: 'https://liquipedia.net/commons/images/5/52/HuNter-_at_Stake_Ranked_Episode_1.jpg', imageSource: 'liquipedia', aliases: ['hunter'] },
  { nick: 'malbsMd', name: 'Mario Samayoa', team: 'G2', role: 'Rifler', note: '这签就是敢打，问题是敢打完得有人补。', image: 'https://liquipedia.net/commons/images/d/d4/MalbsMd_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'Jimpphat', name: 'Jimi Salo', team: 'MOUZ', role: 'Anchor / Rifler', note: '今天当包点门神，少乱动就是大贡献。', image: 'https://liquipedia.net/commons/images/0/0d/Jimpphat_at_PGL_Cluj-Napoca_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'siuhy', name: 'Kamil Szkaradek', team: 'MOUZ', role: 'IGL', note: '指挥签，别急着拼枪，先把节奏拿回来。', image: 'https://liquipedia.net/commons/images/d/df/Siuhy_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'm0NESY', name: 'Ilya Osipov', team: 'G2 / Falcons 语境', role: 'AWPer', note: '少年狙签，能操作，但今天别把每回合都打成残局教学。', image: 'https://liquipedia.net/commons/images/e/e3/M0NESY_at_BLAST_Rivals_Spring_2025.jpg', imageSource: 'liquipedia', aliases: ['小孩'] },
  { nick: 'NiKo', name: 'Nikola Kovac', team: 'G2 / Falcons 语境', role: 'Rifler', note: '爆头线拉满，但别第一时间上头，别让好枪法救坏决策。', image: 'https://liquipedia.net/commons/images/a/a1/NiKo_at_Copenhagen_Major_2024_EU_RMR.jpg', imageSource: 'liquipedia' },
  { nick: 'karrigan', name: 'Finn Andersen', team: 'FaZe', role: 'IGL', note: '今天靠脑子赢，枪软一点没事，节奏别软。', image: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Interview_karrigan_-_FaZe_(DH_Masters_Malm%C3%B6_2017)_(cropped).jpg', imageSource: 'wikimedia' },
  { nick: 'rain', name: 'Havard Nygaard', team: 'FaZe', role: 'Entry / Rifler', note: '老将签，关键回合别犹豫，拉出去把空间打出来。', image: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Rain_BLAST_Backstage_2020_FaZe_Clan_(cropped).jpg', imageSource: 'wikimedia' },
  { nick: 'Twistzz', name: 'Russel Van Dulken', team: 'Liquid / FaZe 语境', role: 'Rifler', note: '准星好看签，今天别花活，干净利落就完事。', image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Twistzz_IMG_1465_(47926460051)_(cropped).jpg', imageSource: 'wikimedia' },
  { nick: 'jL', name: 'Justinas Lekavicius', team: 'NAVI', role: 'Rifler', note: '情绪和火力都给满，但别赢一回合就开香槟。', image: 'https://liquipedia.net/commons/images/1/18/JL_at_IEM_Sydney_2023.jpg', imageSource: 'liquipedia' },
  { nick: 'Spinx', name: 'Lotan Giladi', team: 'Vitality 语境', role: 'Lurker / Rifler', note: '晚点出手，别急着露，今天靠侧翼偷回合。', image: 'https://liquipedia.net/commons/images/a/ad/Spinx_at_Copenhagen_Major_2024_EU_RMR.jpg', imageSource: 'liquipedia' },
  { nick: 'broky', name: 'Helvijs Saukants', team: 'FaZe', role: 'AWPer', note: '这签有点玄学，手感来了像会魔法，没来就先保枪。', image: 'https://liquipedia.net/commons/images/1/16/Broky_at_IEM_Katowice_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'frozen', name: 'David Cernansky', team: 'FaZe', role: 'Rifler', note: '稳定输出签，今天别硬装主角，位置打舒服就有了。', image: 'https://liquipedia.net/commons/images/4/43/Frozen_at_Copenhagen_Major_2024_EU_RMR.jpg', imageSource: 'liquipedia' },
  { nick: 'apEX', name: 'Dan Madesclaire', team: 'Vitality', role: 'IGL', note: '情绪和指挥一起拉满，今天别光吼，暂停后得有东西。', image: 'https://liquipedia.net/commons/images/b/b7/ApEX_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'mezii', name: 'William Merriman', team: 'Vitality 语境', role: 'Rifler / Support', note: '团队签，数据不一定好看，但补位和信息要打明白。', image: 'https://liquipedia.net/commons/images/c/ca/Mezii_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'KSCERATO', name: 'Kaike Cerato', team: 'FURIA', role: 'Rifler', note: '巴西步枪签，今天正面得硬，但别把节奏打散。', image: 'https://liquipedia.net/commons/images/e/ef/KSCERATO_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'yuurih', name: 'Yuri Santos', team: 'FURIA', role: 'Rifler', note: '稳定补枪签，别急着当主角，把回合收干净就赢。', image: 'https://liquipedia.net/commons/images/1/17/Yuurih_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'MAJ3R', name: 'Engin Kupeli', team: 'Eternal Fire', role: 'IGL', note: '老指挥签，今天靠纪律和暂停后第一回合说话。', image: 'https://liquipedia.net/commons/images/b/b5/MAJ3R_at_IEM_Krakow_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'tabseN', name: 'Johannes Wodarz', team: 'BIG', role: 'Rifler / IGL', note: '德国老大哥签，枪和脑子都得顶一下，别只当工具人。', image: 'https://liquipedia.net/commons/images/5/5e/TabseN_at_CCT_Season_3_Global_Finals.jpg', imageSource: 'liquipedia' },
  { nick: 'electroNic', name: 'Denis Sharipov', team: 'Virtus.pro / NAVI 语境', role: 'Rifler', note: '老步枪签，今天别急，关键中期枪位要拿住。', image: 'https://liquipedia.net/commons/images/b/b3/ElectroNic_at_IEM_Krakow_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'Perfecto', name: 'Ilya Zalutskiy', team: 'Virtus.pro / NAVI 语境', role: 'Support / Anchor', note: '脏活累活签，别嫌镜头少，包点站住就是价值。', image: 'https://liquipedia.net/commons/images/f/f5/Perfecto_oct-2025_playerphoto.png', imageSource: 'liquipedia' },
  { nick: 'NAF', name: 'Keith Markovic', team: 'Liquid', role: 'Rifler / Lurker', note: '冷面侧翼签，今天别急着露，残局慢慢切。', image: 'https://liquipedia.net/commons/images/6/62/NAF_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'cadiaN', name: 'Casper Moller', team: 'Heroic / Liquid 语境', role: 'AWPer / IGL', note: '情绪指挥签，今天可以吼，但回合计划得先到位。', image: 'https://liquipedia.net/commons/images/5/55/CadiaN_at_Roman_Imperium_Cup_VII.jpg', imageSource: 'liquipedia' },
  { nick: 'kennyS', name: 'Kenny Schrub', team: '传奇选手', role: 'AWPer', note: '经典狙签，今天允许你想操作，但别每枪都当集锦。', image: 'https://liquipedia.net/commons/images/0/0e/KennyS_at_BLAST_Paris_Major_2023_EU_RMR.jpeg', imageSource: 'liquipedia' },
  { nick: 'GeT_RiGhT', name: 'Christopher Alesund', team: '传奇选手', role: 'Lurker / Rifler', note: '老派侧翼签，别急，等对面一回头故事就开始了。', image: 'https://liquipedia.net/commons/images/4/4b/GeT_RiGhT_%40_PGL_Major_Stockholm_2021.jpg', imageSource: 'liquipedia' },
  { nick: 'f0rest', name: 'Patrik Lindberg', team: '传奇选手', role: 'Rifler', note: '老枪男签，今天少花活，纯度拉满就行。', image: 'https://liquipedia.net/commons/images/5/5c/F0rest_at_IEM_Dallas_2023.jpg', imageSource: 'liquipedia' },
  { nick: 'coldzera', name: 'Marcelo David', team: '传奇选手 / RED Canids 语境', role: 'Rifler', note: '名场面签，别只想着飞起来，先把补枪站好。', image: 'https://liquipedia.net/commons/images/0/08/Coldzera_at_Copenhagen_Major_2024_AME_RMR.jpg', imageSource: 'liquipedia' },
  { nick: 'olofmeister', name: 'Olof Kajbjer', team: '传奇选手', role: 'Rifler', note: '老传奇签，今天别急着证明，关键回合稳住就有味。', image: 'https://liquipedia.net/commons/images/f/fe/Olofmeister_%40_PGL_Major_Stockholm_2021.jpg', imageSource: 'liquipedia' },
  { nick: 'GuardiaN', name: 'Ladislav Kovacs', team: '传奇选手', role: 'AWPer', note: '老狙签，架点纪律拿出来，别第一枪空了人也没了。', image: 'https://liquipedia.net/commons/images/9/9b/GuardiaN_%40_EPICENTER_2019.jpg', imageSource: 'liquipedia' },
  { nick: 'Snax', name: 'Janusz Pogorzelski', team: 'G2 / 传奇语境', role: 'IGL / Rifler', note: '老油条签，今天靠经验偷回合，别跟年轻人拼嗓门。', image: 'https://liquipedia.net/commons/images/3/37/Snax_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'TaZ', name: 'Wiktor Wojtas', team: '教练 / 传奇选手', role: 'Coach / Rifler', note: '教练签，今天别急着冲，先暂停一下把队友脑子叫回来。', image: 'https://liquipedia.net/commons/images/9/9c/TaZ_at_BLAST_Open_Spring_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'NEO', name: 'Filip Kubski', team: 'FaZe 教练 / 传奇选手', role: 'Coach / Rifler', note: '老传奇签，今天不拼花，拼的是把复杂局面打简单。', image: 'https://liquipedia.net/commons/images/e/e4/NEO_at_PGL_Cluj-Napoca_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'dupreeh', name: 'Peter Rasmussen', team: '传奇选手', role: 'Rifler', note: '冠军经验签，今天别浪，知道什么时候不打也是本事。', image: 'https://liquipedia.net/commons/images/4/4f/Dupreeh_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'Magisk', name: 'Emil Reif', team: 'Astralis / Falcons 语境', role: 'Rifler', note: '体系步枪签，枪要硬，位置也得干净。', image: 'https://liquipedia.net/commons/images/8/8f/Magisk_at_ESL_Pro_League_S22.jpg', imageSource: 'liquipedia' },
  { nick: 'gla1ve', name: 'Lukas Rossander', team: 'ENCE / Astralis 语境', role: 'IGL', note: '战术签，今天别只拼枪，暂停后第一波要有设计。', image: 'https://liquipedia.net/commons/images/a/a5/Gla1ve_at_Roman_Imperium_Cup_V.jpg', imageSource: 'liquipedia' },
  { nick: 'XANTARES', name: 'Can Dortkardes', team: 'Eternal Fire', role: 'Rifler', note: '爆头线签，正面拉出来要有东西，但别把队友补枪甩没。', image: 'https://liquipedia.net/commons/images/d/d5/XANTARES_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'woxic', name: 'Ozgur Eker', team: 'Eternal Fire', role: 'AWPer', note: '土耳其狙签，今天先架住关键枪，别急着换位置。', image: 'https://liquipedia.net/commons/images/4/49/Woxic_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
];

csPlayers.push(
  { nick: 'bLitz', name: 'Garidmagnai Byambasuren', team: 'The MongolZ', role: 'IGL / Rifler', note: '蒙古指挥签，今天别乱，第一波交换要清楚。', image: 'https://liquipedia.net/commons/images/3/30/The_MongolZ_2023_allmode.png', imageSource: 'liquipedia' },
  { nick: '910', name: 'Usukhbayar Banzragch', team: 'The MongolZ', role: 'AWPer', note: '亚洲狙签，先架住关键枪，别急着换位置找节目。', image: 'https://liquipedia.net/commons/images/3/30/The_MongolZ_2023_allmode.png', imageSource: 'liquipedia' },
  { nick: 'Techno4K', name: 'Sodbayar Munkhbold', team: 'The MongolZ', role: 'Rifler', note: '正面枪男签，今天可以硬，但补枪距离别断。', image: 'https://liquipedia.net/commons/images/3/30/The_MongolZ_2023_allmode.png', imageSource: 'liquipedia' },
  { nick: 'somebody', name: 'Haowen Xu', team: 'TYLOO', role: 'Rifler', note: '中国CS老熟人签，枪可以敢开，残局别急。', image: 'https://liquipedia.net/commons/images/2/2f/TYLOO_2019_allmode.png', imageSource: 'liquipedia' },
  { nick: 'JamYoung', name: 'Yi Yang', team: 'TYLOO / 中国CS语境', role: 'Rifler', note: '年轻火力签，别只打自信枪，回合目标要跟上。', image: 'https://liquipedia.net/commons/images/2/2f/TYLOO_2019_allmode.png', imageSource: 'liquipedia' },
  { nick: 'Westmelon', name: 'Qinghui Liu', team: 'Lynn Vision', role: 'Rifler', note: 'LVG火力签，今天正面别怂，但别让队形散。', image: 'https://liquipedia.net/commons/images/0/0a/Lynn_Vision_Gaming_2023_allmode.png', imageSource: 'liquipedia' },
  { nick: 'Jame', name: 'Dzhami Ali', team: 'Virtus.pro', role: 'AWPer / IGL', note: 'Jame Time签，保枪可以，前提是你真算明白了。', image: 'https://liquipedia.net/commons/images/1/12/Jame_at_IEM_Katowice_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'torzsi', name: 'Adam Torzsas', team: 'MOUZ', role: 'AWPer', note: 'MOUZ狙签，今天稳住第一枪，空了就换点。', image: 'https://liquipedia.net/commons/images/b/b7/Torzsi_at_IEM_Dallas_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'xertioN', name: 'Dorian Berman', team: 'MOUZ', role: 'Rifler / Entry', note: '第一身位签，敢打没问题，死前信息要给满。', image: 'https://liquipedia.net/commons/images/e/e1/XertioN_at_PGL_Copenhagen_2024_EU_RMR_A.jpg', imageSource: 'liquipedia' },
  { nick: 'iM', name: 'Ivan Mihai', team: 'NAVI', role: 'Rifler', note: 'NAVI步枪签，少乱拉，多补枪，关键局别掉线。', image: 'https://liquipedia.net/commons/images/6/69/IM_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'zont1x', name: 'Myroslav Plakhotia', team: 'Team Spirit', role: 'Rifler / Anchor', note: '年轻锚点签，今天别急着前压，包点站住就是价值。', image: 'https://liquipedia.net/commons/images/5/58/Zont1x_at_BLAST_Bounty_Winter_2026.jpg', imageSource: 'liquipedia', aliases: ['zontix'] },
);

csPlayers.push(
  { nick: 'degster', name: 'Peter Rothmann', team: '9INE / OG 语境', role: 'AWPer', note: '丹麦狙签，节奏感强，今天别乱动架点时机。', image: 'https://liquipedia.net/commons/images/7/7d/Degster_at_IEM_Katowice_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'nexa', name: 'Nemanja Isaković', team: 'G2 / OG 语境', role: 'IGL', note: '指挥签，经验到位，今天暂停后第一回合要有结果。', image: 'https://liquipedia.net/commons/images/8/8e/Nexa_at_IEM_Katowice_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'hunter-g2', name: 'Nemanja Kovač', team: 'G2 语境', role: 'Rifler', note: '老大哥步枪签，今天别急着证明，关键枪稳住就行。', image: 'https://liquipedia.net/commons/images/5/52/HuNter-_at_Stake_Ranked_Episode_1.jpg', imageSource: 'liquipedia', aliases: ['hunter'] },
  { nick: 'fer', name: 'Fernando Alvarenga', team: 'FURIA 历史 / 巴西CS语境', role: 'Entry / Rifler', note: '巴西侵略性签，今天快节奏没问题，但别提速过早。', image: 'https://liquipedia.net/commons/images/f/f2/Fer_at_ESL_One_Cologne_2019.jpg', imageSource: 'liquipedia' },
  { nick: 'YEKINDAR', name: 'Mareks Gaļinskis', team: 'Liquid / Spirit 语境', role: 'Entry / Rifler', note: '主动性拉满签，今天闯得可以，但别让队友接不住。', image: 'https://liquipedia.net/commons/images/0/0b/YEKINDAR_at_IEM_Cologne_2024.jpg', imageSource: 'liquipedia', aliases: ['yekindar'] },
  { nick: 'Ax1Le', name: 'Sergei Rykhtorov', team: 'Team Spirit', role: 'Rifler', note: 'Spirit步枪签，高强度对枪不怵，今天正面别软。', image: 'https://liquipedia.net/commons/images/d/d2/Ax1Le_at_IEM_Dallas_2024.jpg', imageSource: 'liquipedia', aliases: ['ax1le'] },
  { nick: 'chopper', name: 'Leonid Vishnyakov', team: 'Team Spirit', role: 'IGL', note: 'Spirit指挥签，今天靠纪律和道具，不是靠爆发。', image: 'https://liquipedia.net/commons/images/8/87/Chopper_at_IEM_Dallas_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'skullz', name: 'Felipe Medeiros', team: 'FURIA', role: 'Rifler / Entry', note: 'FURIA破口签，死也要把信息带回来。', image: 'https://liquipedia.net/commons/images/5/53/Skullz_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'FalleN', name: 'Gabriel Toledo', team: 'FURIA / 传奇语境', role: 'AWPer / IGL', note: '老将传奇签，经验和个人能力都在，今天别低估他。', image: 'https://liquipedia.net/commons/images/7/77/FalleN_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia', aliases: ['fallen'] },
  { nick: 'chelo', name: 'Marcelo Cespedes', team: 'FURIA', role: 'Rifler', note: 'FURIA体系枪签，今天做好脏活，数据不好看不要紧。', image: 'https://liquipedia.net/commons/images/f/fb/Chelo_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'JDC', name: 'Joel Emmermacher', team: 'Astralis', role: 'Rifler', note: '丹麦体系步枪签，纪律优先，今天补枪距离要拉到位。', image: 'https://liquipedia.net/commons/images/e/e6/Jdc_at_IEM_Katowice_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'TeSeS', name: 'René Rønnow Tchoubigui', team: 'Astralis / HEROIC 语境', role: 'Rifler', note: '丹麦步枪签，今天稳住节奏，道具和补枪一起到。', image: 'https://liquipedia.net/commons/images/2/26/TeSeS_at_IEM_Katowice_2025.jpg', imageSource: 'liquipedia' },
  { nick: 'Brollan', name: 'Ludvig Brolin', team: 'Falcons / NIP 语境', role: 'Rifler', note: '北欧步枪签，爆发力强，今天第一枪打对了剩下好说。', image: 'https://liquipedia.net/commons/images/8/8f/Brollan_at_IEM_Katowice_2024.jpg', imageSource: 'liquipedia' },
  { nick: 'ropz-faze', name: 'Robin Kool', team: 'FaZe', role: 'Lurker / Rifler', note: '自由人签，今天不急，等timing，一出手就要有东西。', image: 'https://liquipedia.net/commons/images/f/f4/Ropz_at_BLAST_Open_Spring_2026.jpg', imageSource: 'liquipedia' },
  { nick: 'Hobbit', name: 'Abay Khassenov', team: 'Falcons / G2 历史', role: 'Rifler', note: '哈萨克斯坦步枪签，稳定是他的基本面，今天也别急。', image: 'https://liquipedia.net/commons/images/2/22/Hobbit_at_IEM_Dallas_2024.jpg', imageSource: 'liquipedia' },
);

const extraDailyFactsA: DailyTextCard[] = [
  { key: 'saltwater-taffy', title: '每日冷知识', name: '盐水太妃糖不含盐水', subtitle: '食品 / 命名', body: '英语里的"saltwater taffy"名字来源不太确定，它并不是真的用大量盐水做的，更多是地名传说。', advice: '今天看名字别想当然，背后可能是另一回事。', line: '有些名字只是名字，别认真往字面解。', scoreLabel: '新鲜度' },
  { key: 'coral-bleach', title: '每日冷知识', name: '珊瑚白化不等于死亡', subtitle: '海洋 / 生态', body: '珊瑚变白是因为失去共生藻，但若温度恢复较快，珊瑚可能重新与藻类共生并恢复颜色。', advice: '今天看见颜色褪掉的东西，先别急着放弃。', line: '白了不一定死了，可能只是状态不好。', scoreLabel: '新鲜度' },
  { key: 'maglev-record', title: '每日冷知识', name: '磁悬浮列车速度纪录很高', subtitle: '工程 / 交通', body: '磁悬浮车辆实验速度已超过600km/h，靠电磁力悬浮和推进，减少摩擦是关键。', advice: '今天把阻力减少一点，速度会自己上来。', line: '快不是拼命推，是减阻。', scoreLabel: '新鲜度' },
  { key: 'yawn-contagious', title: '每日冷知识', name: '打哈欠会传染', subtitle: '行为 / 神经', body: '看到别人打哈欠，或者读到"打哈欠"，很多人会跟着做，与镜像神经元和社交同步有关。', advice: '今天别让别人的情绪带着你走，保持自己节奏。', line: '打哈欠这事，连说一次都会传染。', scoreLabel: '新鲜度' },
  { key: 'saturn-float', title: '每日冷知识', name: '土星密度比水还小', subtitle: '天文 / 行星', body: '土星平均密度约0.69g/cm³，理论上如果有足够大的水池，土星能漂浮。', advice: '今天别被外表的体量唬住，密度更重要。', line: '最大的星，不一定最重。', scoreLabel: '新鲜度' },
  { key: 'fingerprint-twins', title: '每日冷知识', name: '同卵双胞胎指纹不同', subtitle: '遗传 / 身份', body: '同卵双胞胎共享DNA，但指纹在胎儿发育时受到随机物理因素影响，所以各不相同。', advice: '今天环境的细节会塑造出差异，不要忽略过程。', line: 'DNA一样，指纹还是不同。环境真的有效。', scoreLabel: '新鲜度' },
  { key: 'honey-bee-miles', title: '每日冷知识', name: '蜜蜂一生只采约一茶匙蜂蜜', subtitle: '生物 / 劳动', body: '工蜂一生大约飞行800公里，采集的花蜜最终只能做成约一茶匙蜂蜜。', advice: '今天小的积累需要很长时间，但那是真实代价。', line: '一茶匙蜂蜜，背后是800公里飞行。', scoreLabel: '新鲜度' },
  { key: 'sneeze-speed', title: '每日冷知识', name: '喷嚏速度很快但数据夸大了', subtitle: '生理 / 速度', body: '喷嚏射流速度通常在30-50m/s左右，早期报道的"160km/h"数据被广泛质疑，实际较低。', advice: '今天遇到令人印象深刻的数字，不妨先核查来源。', line: '好的数字要有出处，没出处的传了也没用。', scoreLabel: '新鲜度' },
  { key: 'tree-rings-climate', title: '每日冷知识', name: '树木年轮记录气候', subtitle: '地质 / 古气候', body: '年轮宽窄对应当年生长条件，利用长寿树木可以重建数百年甚至数千年的气候历史。', advice: '今天自己留下的痕迹，也在记录着环境。', line: '树比人更会写日记，不说话但很诚实。', scoreLabel: '新鲜度' },
  { key: 'airport-code', title: '每日冷知识', name: '机场代码有历史遗留原因', subtitle: '航空 / 命名', body: '一些机场IATA代码看起来和城市名无关，因为早期代码由气象站命名，后来延续下来。', advice: '今天遇到奇怪规则，很可能有历史原因。', line: '有些命名逻辑早就不在了，名字却还活着。', scoreLabel: '新鲜度' },
];

const extraDailyPoemsA: DailyTextCard[] = [
  { key: 'wang-an-shi-plum', title: '每日古诗词', name: '王安石《梅花》', subtitle: '宋诗 / 冬梅', body: '遥知不是雪，为有暗香来。', advice: '今天有时不用大声，香气会自己到。', line: '真正的存在，不需要被看见也能被感知。', scoreLabel: '诗意值' },
  { key: 'tao-yuan-ming-drink', title: '每日古诗词', name: '陶渊明《饮酒》', subtitle: '晋诗 / 归隐', body: '采菊东篱下，悠然见南山。', advice: '今天找一个不被打扰的地方，哪怕五分钟。', line: '悠然是一种姿态，不是一种条件。', scoreLabel: '诗意值' },
  { key: 'han-yu-early-spring', title: '每日古诗词', name: '韩愈《早春》', subtitle: '唐诗 / 早春', body: '草色遥看近却无。', advice: '今天期待的东西远看有，近看没有，不要气馁。', line: '有时候近看才是错的，退一步更清楚。', scoreLabel: '诗意值' },
  { key: 'su-dong-po-red-cliff', title: '每日古诗词', name: '苏轼《赤壁赋》', subtitle: '宋文 / 哲理', body: '逝者如斯，而未尝往也；盈虚者如彼，而卒莫消长也。', advice: '今天别纠结流逝，本质没有消失只是换了形式。', line: '东坡说变化，最终说的是不变。', scoreLabel: '诗意值' },
  { key: 'zhang-ruoxu', title: '每日古诗词', name: '张若虚《春江花月夜》', subtitle: '唐诗 / 月夜', body: '江畔何人初见月，江月何年初照人。', advice: '今天遇到宏大问题，先接受它，再慢慢看。', line: '有些问题不是没有答案，是答案本来就是"不知道"。', scoreLabel: '诗意值' },
  { key: 'li-bai-toast', title: '每日古诗词', name: '李白《将进酒》', subtitle: '唐诗 / 豪情', body: '天生我材必有用，千金散尽还复来。', advice: '今天别嫌自己不够用，先把手上的事做好。', line: '气场这东西，有时候是说给自己听的。', scoreLabel: '诗意值' },
  { key: 'wang-changling-border2', title: '每日古诗词', name: '王昌龄《从军行》', subtitle: '唐诗 / 边塞', body: '黄沙百战穿金甲，不破楼兰终不还。', advice: '今天定个不回头的目标，认真走一段。', line: '不是每条路都短，能走完的才叫走过。', scoreLabel: '诗意值' },
  { key: 'li-qingzhao-river', title: '每日古诗词', name: '李清照《武陵春》', subtitle: '宋词 / 愁绪', body: '只恐双溪舴艋舟，载不动、许多愁。', advice: '今天情绪很重，找个出口说一说，别全压着。', line: '愁这个东西，李清照连重量都算出来了。', scoreLabel: '诗意值' },
];


export const csTeams: DailyCard[] = [
  {
    key: 'vitality',
    title: '今日CS队伍',
    name: 'Vitality',
    subtitle: 'ZywOo核心体系 / 纪律和个人能力都在线',
    scoreLabel: '签位强度',
    advice: '今天思路就是稳住默认，等核心位把第一枪打开。',
    avoid: '别一赢手枪局就开香槟，强队最怕自己先松。',
    line: '这队伍签抽出来，今天至少不能怂。',
    image: 'https://liquipedia.net/commons/images/f/f3/Team_Vitality_2023_allmode.png',
    liquipediaPage: 'Team Vitality',
    fandomFile: 'BLAST_23_vita.png',
    playerImageFallback: 'ZywOo',
  },
  {
    key: 'navi',
    title: '今日CS队伍',
    name: 'NAVI',
    subtitle: '结构化默认 / 信息和纪律优先',
    scoreLabel: '签位强度',
    advice: '先把信息拿满，别急着单点爆破，靠中期调整赢。',
    avoid: '别五个人各玩各的，NAVI味一散就真难看。',
    line: '这签不一定最爆，但认真打很能折磨对面。',
    image: 'https://liquipedia.net/commons/images/3/30/Natus_Vincere_2021_allmode.png',
    liquipediaPage: 'Natus Vincere',
    fandomFile: 'BLAST_23_navi.png',
    playerImageFallback: 'Aleksib',
  },
  {
    key: 'spirit',
    title: '今日CS队伍',
    name: 'Team Spirit',
    subtitle: '年轻火力 / donk破口能力',
    scoreLabel: '签位强度',
    advice: '第一身位敢给压力，但第二时间补枪必须跟上。',
    avoid: '别把每个回合都打成个人集锦，集锦失败就是白给。',
    line: '这签火力是有的，问题是别上头。',
    image: 'https://liquipedia.net/commons/images/a/a3/Team_Spirit_2022_allmode.png',
    liquipediaPage: 'Team Spirit',
    fandomFile: 'Pgl_22_sticker_spir.png',
    playerImageFallback: 'donk',
  },
  {
    key: 'falcons',
    title: '今日CS队伍',
    name: 'Falcons',
    subtitle: '明星阵容 / 上限很高，磨合也要看',
    scoreLabel: '签位强度',
    advice: '今天别只看ID，重点看补枪距离和回合纪律。',
    avoid: '别一把没打好就审判银河战舰，CS不是PPT。',
    line: '尼尼孩孩这个语境一出来，弹幕已经有画面了。',
    image: 'https://liquipedia.net/commons/images/6/61/Team_Falcons_2022_allmode.png',
    liquipediaPage: 'Team Falcons',
    fandomFile: 'CS2_AWP_Inventory.png',
    playerImageFallback: 'm0NESY',
  },
  {
    key: 'mouz',
    title: '今日CS队伍',
    name: 'MOUZ',
    subtitle: '年轻纪律 / 包点和补枪细节',
    scoreLabel: '签位强度',
    advice: '少乱来，多补枪，打出团队交换就很舒服。',
    avoid: '别关键局突然没人敢要信息。',
    line: 'MOUZ签就是别花，稳着稳着对面就急了。',
    image: 'https://liquipedia.net/commons/images/1/11/MOUZ_2021_allmode.png',
    liquipediaPage: 'MOUZ',
    fandomFile: 'BLAST_23_mouz.png',
    playerImageFallback: 'Jimpphat',
  },
  {
    key: 'g2',
    title: '今日CS队伍',
    name: 'G2',
    subtitle: '枪男传统 / 节目效果也不少',
    scoreLabel: '签位强度',
    advice: '枪法可以解决一部分问题，但别让枪法救坏决策。',
    avoid: '别默认还没走完就开始硬拉。',
    line: '这签有节目，但节目别演到自己身上。',
    image: 'https://liquipedia.net/commons/images/9/93/G2_Esports_2020_allmode.png',
    liquipediaPage: 'G2 Esports',
    fandomFile: 'BLAST_23_g2.png',
    playerImageFallback: 'malbsMd',
  },
  {
    key: 'faze',
    title: '今日CS队伍',
    name: 'FaZe',
    subtitle: '经验和残局 / 大场面属性',
    scoreLabel: '签位强度',
    advice: '残局慢一点，别急着把优势送回去。',
    avoid: '别用经验给自己的白给找借口。',
    line: 'FaZe签就是心脏体检，别第一回合就血压拉满。',
    image: 'https://liquipedia.net/commons/images/b/bb/FaZe_Clan_2021_allmode.png',
    liquipediaPage: 'FaZe Clan',
    fandomFile: 'BLAST_23_faze.png',
    playerImageFallback: 'karrigan',
  },
  {
    key: 'liquid',
    title: '今日CS队伍',
    name: 'Liquid',
    subtitle: '北美语境 / 个人能力和节奏转换',
    scoreLabel: '签位强度',
    advice: '正面别软，中期别散，残局别急。',
    avoid: '别把优势局打成观众心理测试。',
    line: '北美味来了，今天主打一个让人不禁想问。',
    image: 'https://liquipedia.net/commons/images/5/5d/Team_Liquid_2023_allmode.png',
    liquipediaPage: 'Team Liquid',
    fandomFile: 'BLAST_23_liq.png',
    playerImageFallback: 'NAF',
  },
];

export const csMaps: DailyCard[] = [
  { key: 'mirage', title: '今日CS地图', name: 'Mirage', subtitle: '默认控中 / A夹B小都是节目点', scoreLabel: '手感指数', advice: '中路先拿信息，别五个人排队送拱门。', avoid: '别烟一散就干拉，timing 不在你这。', line: '荒漠迷城一出来，天梯味已经顶满了。', fandomFile: 'De_mirage_cs2.png' },
  { key: 'inferno', title: '今日CS地图', name: 'Inferno', subtitle: '香蕉道博弈 / 道具纪律地图', scoreLabel: '手感指数', advice: '香蕉道别省道具，CT回防先等队友。', avoid: '别一个人拿着半甲硬清车位。', line: '炼狱小镇这图，急的人先白给。', fandomFile: 'Cs2_inferno_remake.png' },
  { key: 'nuke', title: '今日CS地图', name: 'Nuke', subtitle: '上下层信息 / 转点和沟通', scoreLabel: '手感指数', advice: '先把外场和铁板信息讲清楚，别让队友猜谜。', avoid: '别一听脚步就全队转点，像被遥控。', line: '核子危机要的是脑子，不是嗓门。', fandomFile: 'CS2_Nuke_A_site.png' },
  { key: 'ancient', title: '今日CS地图', name: 'Ancient', subtitle: '中路和包点压缩 / 细节吃人', scoreLabel: '手感指数', advice: '中路别白给，包点别孤岛，补枪距离拉近。', avoid: '别让对面每回合免费拿中。', line: '远古遗迹这图，信息一断人就开始原始。', fandomFile: 'De_ancient.png' },
  { key: 'anubis', title: '今日CS地图', name: 'Anubis', subtitle: '水路控制 / 回防压力', scoreLabel: '手感指数', advice: '水路信息很关键，进点后别忘了后路。', avoid: '别下包后全员看一个方向。', line: '阿努比斯打着打着就像心理学考试。', fandomFile: 'De_anubis_cs2.png' },
  { key: 'dust2', title: '今日CS地图', name: 'Dust2', subtitle: '经典枪法图 / 中门信息', scoreLabel: '手感指数', advice: '枪可以硬，但别把每回合都当单挑服。', avoid: '别中门被看穿还硬装没事。', line: 'D2这签，简单粗暴，但白给也很快。', fandomFile: 'Cs2_dust2.png' },
  { key: 'overpass', title: '今日CS地图', name: 'Overpass', subtitle: '厕所长管工地 / 信息链和回防路线', scoreLabel: '手感指数', advice: '先把厕所和工地信息讲清楚，回防别三个人挤一个口。', avoid: '别听到一点动静全队乱转，像被对面牵着走。', line: '死亡游乐园这签，信息断了就真开始坐过山车。', fandomFile: 'Overpass_CS2.png' },
];

export const csWeapons: DailyCard[] = [
  { key: 'ak47', title: '今日CS武器', name: 'AK-47', subtitle: '一枪头信仰 / 但别乱泼', scoreLabel: '爆头指数', advice: '今天准星放稳，第一发别急，打完记得换位。', avoid: '别二十发全泼天上还说压枪问题。', line: 'AK签可以的，枪给你了，别自己把自己打没。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'm4a1s', title: '今日CS武器', name: 'M4A1-S', subtitle: '控枪稳定 / 偷人舒服', scoreLabel: '爆头指数', advice: '多换位置，少硬扫，靠消音和节奏偷回合。', avoid: '别子弹打完才想起来退。', line: 'A1签就是细，细完别怂。', fandomFile: 'CS2_M4A1-S_Inventory.png' },
  { key: 'awp', title: '今日CS武器', name: 'AWP', subtitle: '架点纪律 / 一枪改变回合', scoreLabel: '爆头指数', advice: '第一枪要稳，空了就换位置，别站原地等审判。', avoid: '别每回合都想打集锦狙。', line: '大狙在手，责任也在手，别只要镜头不要回合。', fandomFile: 'CS2_AWP_Inventory.png' },
  { key: 'deagle', title: '今日CS武器', name: 'Desert Eagle', subtitle: '经济局希望 / 也可能是错觉', scoreLabel: '爆头指数', advice: '别急开枪，等对面进准星，一发讲道理。', avoid: '别七发全空还喊差一点。', line: '沙鹰签最会骗人，但骗成了就是名场面。', fandomFile: 'CS2_Desert_Eagle_Inventory.png' },
  { key: 'mp9', title: '今日CS武器', name: 'MP9', subtitle: '近点爆发 / 经济管理', scoreLabel: '爆头指数', advice: '打近点，吃信息，杀一个就跑，别恋战。', avoid: '别拿MP9去和AK中远距离讲道理。', line: 'MP9签就是灵活，别灵活到白给。', fandomFile: 'CS2_MP9_Inventory.png' },
  { key: 'mac10', title: '今日CS武器', name: 'MAC-10', subtitle: '冲锋和拉扯 / 第一身位工具', scoreLabel: '爆头指数', advice: '给队友拉空间，死也要换到信息和站位。', avoid: '别冲进去没人补，死得很孤独。', line: '这签主打一个不怕死，但怕没人跟。', fandomFile: 'CS2_MAC-10_Inventory.png' },
  { key: 'galil', title: '今日CS武器', name: 'Galil AR', subtitle: '穷哥们步枪 / 性价比', scoreLabel: '爆头指数', advice: '别嫌枪便宜，控好弹道一样能打出价值。', avoid: '别拿着Galil还想当ZywOo。', line: '经济一般但人不能一般，Galil也能有节目。', fandomFile: 'CS2_Galil_AR_Inventory.png' },
];

export const csRoles: DailyCard[] = [
  { key: 'entry', title: '今日CS定位', name: '突破手', subtitle: '第一身位 / 拉空间', scoreLabel: '适配指数', advice: '你今天负责把口子撕开，死也要给信息。', avoid: '别第一个出去死了还不报点。', line: '突破签很硬，问题是你得真敢第一个进。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'support', title: '今日CS定位', name: '辅助位', subtitle: '闪光烟火 / 脏活累活', scoreLabel: '适配指数', advice: '道具给明白，补枪站近一点，别嫌镜头少。', avoid: '别闪队友比闪敌人准。', line: '辅助签不丢人，赢回合的人都懂。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'anchor', title: '今日CS定位', name: '包点锚点', subtitle: '守点纪律 / 抗压', scoreLabel: '适配指数', advice: '别急着前压送，拖时间就是价值。', avoid: '别听到脚步就自己交完全部道具。', line: '锚点签很残酷，镜头少但锅大。', fandomFile: 'CS2_Nuke_A_site.png' },
  { key: 'lurker', title: '今日CS定位', name: '自由人', subtitle: '侧翼时机 / 信息差', scoreLabel: '适配指数', advice: '慢一点，等timing，别为了绕后把正面卖完。', avoid: '别绕到最后队友全没了。', line: '自由人签不是逛街签，别误会。', fandomFile: 'De_mirage_cs2.png' },
  { key: 'igl', title: '今日CS定位', name: '指挥', subtitle: '节奏和决策 / 背锅位', scoreLabel: '适配指数', advice: '今天少喊口号，多给明确计划，暂停后第一回合要有东西。', avoid: '别五个人各打各的还说是默认。', line: '指挥签，嘴可以硬，战术得真有。', fandomFile: 'Cs2_inferno_remake.png' },
  { key: 'awper-role', title: '今日CS定位', name: '狙击手', subtitle: '首杀和架点 / 高责任位', scoreLabel: '适配指数', advice: '拿首杀就收，空枪就退，别恋战。', avoid: '别一把狙打成队伍财政黑洞。', line: '狙击手签很帅，但空枪也很响。', fandomFile: 'CS2_AWP_Inventory.png' },
];

export const csUtilities: DailyCard[] = [
  { key: 'flash', title: '今日CS道具', name: '闪光弹', subtitle: '破点和补枪节奏 / 队友最怕你乱丢', scoreLabel: '道具准度', advice: '先报闪再出手，帮队友拿第一枪，不要自己闪自己。', avoid: '别闪出去发现白的只有队友。', line: '闪光签挺关键，闪得好是体系，闪不好是事故。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'smoke', title: '今日CS道具', name: '烟雾弹', subtitle: '切空间 / 拖时间 / 断信息', scoreLabel: '道具准度', advice: '烟要封关键视线，别为了丢烟把自己站成免费首杀。', avoid: '别烟封歪了还硬说是新战术。', line: '烟这个东西，封住的是枪线，封不住脑子。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'molotov', title: '今日CS道具', name: '燃烧弹', subtitle: '清点和拖延 / 逼位移', scoreLabel: '道具准度', advice: '火要么逼人走，要么拖回防，别烧空气。', avoid: '别下包后火全交完，回防来了只能干看。', line: '火丢得好，对面难受；火丢得烂，队友难受。', fandomFile: 'Molotovhud.png' },
  { key: 'he', title: '今日CS道具', name: 'HE手雷', subtitle: '压血线 / 反清 / 经济局偷伤害', scoreLabel: '道具准度', advice: '听到脚步再给，配合枪线把对面血量打残。', avoid: '别开局随手一颗雷，炸了个心理安慰。', line: '雷签就是朴实，炸不死人也要炸出价值。', fandomFile: 'Hegrenadehud_csgo.png' },
  { key: 'decoy', title: '今日CS道具', name: '诱饵弹', subtitle: '整活和骗信息 / 低成本节目效果', scoreLabel: '道具准度', advice: '能骗一秒是一秒，但别真把战术押在这玩意上。', avoid: '别全队最有设计的是诱饵弹。', line: '诱饵签有点抽象，但抽象里偶尔也有东西。', fandomFile: 'Decoyhud_csgo.png' },
  { key: 'kit', title: '今日CS道具', name: '拆弹钳', subtitle: '回防保险 / 别省小钱丢大局', scoreLabel: '道具准度', advice: 'CT经济允许就买，残局少一秒就是两种人生。', avoid: '别到包前才发现自己没钳，开始看天命。', line: '钳子签很现实，CS最后经常输在这点小钱。', fandomFile: 'Defuserhud_csgo.png' },
];

export const csTactics: DailyCard[] = [
  { key: 'default', title: '今日CS战术', name: '默认控图', subtitle: '信息优先 / 慢慢压缩', scoreLabel: '执行指数', advice: '先拿信息和地图控制，再决定提速点，别五个人同时迷路。', avoid: '别默认默认着就没人敢动了。', line: '默认不是发呆，默认是让对面先露破绽。', fandomFile: 'De_mirage_cs2.png' },
  { key: 'explode', title: '今日CS战术', name: '爆弹一波', subtitle: '道具同步 / 快速进点', scoreLabel: '执行指数', advice: '烟闪火一起到，人也要一起到，别道具打完人在原地。', avoid: '别一波爆弹变成一波排队。', line: '爆弹签要的就是整齐，散了就只剩节目。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'split', title: '今日CS战术', name: '夹击同步', subtitle: '两线压力 / timing 最重要', scoreLabel: '执行指数', advice: '两边别脱节，正面先给压力，侧翼再收口。', avoid: '别夹击夹到最后只剩一个人在逛街。', line: '夹击签很吃沟通，一慢就从战术变成旅游。', fandomFile: 'Overpass_CS2.png' },
  { key: 'fake', title: '今日CS战术', name: '假打转点', subtitle: '骗轮转 / 读防守', scoreLabel: '执行指数', advice: '假打要让对面真信，给声音、给道具、给压力，再转。', avoid: '别对面没动，你自己先被自己骗了。', line: '假打签有脑子，但脑子得比嗓门先到。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'contact', title: '今日CS战术', name: '静音接触', subtitle: '靠近点位 / 突然提速', scoreLabel: '执行指数', advice: '走到位再爆发，第一枪要有人补，别一个人开故事。', avoid: '别静音摸到脸上，然后没人敢出。', line: '接触签就是憋一口气，憋完得真打出来。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'forcebuy', title: '今日CS战术', name: '强起翻盘', subtitle: '经济赌博 / 信息和交叉火力', scoreLabel: '执行指数', advice: '枪差就打近点和交叉，别中远距离硬找自信。', avoid: '别把强起打成捐款。', line: '强起签可以燃，但燃完别把经济烧没了。', fandomFile: 'CS2_Desert_Eagle_Inventory.png' },
];

export const csClutches: DailyCard[] = [
  { key: 'one-v-one', title: '今日CS残局', name: '1v1残局', subtitle: '信息差 / 假动作 / 心态', scoreLabel: '残局指数', advice: '别急着给脚步，先判断包点和时间，再做选择。', avoid: '别明明有时间，硬急成无信息单挑。', line: '1v1签就是心理战，谁先急谁先交学费。', fandomFile: 'CS2_Desert_Eagle_Inventory.png' },
  { key: 'save', title: '今日CS残局', name: '理性保枪', subtitle: '经济纪律 / 下一回合还能做人', scoreLabel: '残局指数', advice: '没钳没道具没位置，该保就保，别为了面子送枪。', avoid: '别保枪保到被抓，经济和面子一起没。', line: '保枪签不丢人，丢人的是保都保不住。', fandomFile: 'CS2_AWP_Inventory.png' },
  { key: 'retake', title: '今日CS残局', name: '多人回防', subtitle: '切空间 / 道具反清 / 不要一窝蜂', scoreLabel: '残局指数', advice: '先等队友，再用烟闪切点，别三个人从同一个门挤进去。', avoid: '别人数优势打成排队单挑。', line: '回防签看纪律，不是看谁嗓门最大。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'postplant', title: '今日CS残局', name: '下包后防守', subtitle: '交叉枪线 / 时间压力', scoreLabel: '残局指数', advice: '站位拉开，别全看一个方向，听拆包再给压力。', avoid: '别包都下了还主动送出去帮对面提速。', line: '下包后签就是别急，时间是你队友。', fandomFile: 'De_anubis_cs2.png' },
  { key: 'eco-clutch', title: '今日CS残局', name: 'ECO偷回合', subtitle: '短枪和道具 / 抓对面大意', scoreLabel: '残局指数', advice: '靠近点、叠人、骗道具，别和长枪正常对枪。', avoid: '别拿小枪打远点还说差一点。', line: 'ECO签最会骗人，但真骗到就是血赚。', fandomFile: 'CS2_MAC-10_Inventory.png' },
  { key: 'awp-save', title: '今日CS残局', name: '大狙残局', subtitle: '高价值武器 / 站位选择', scoreLabel: '残局指数', advice: '有机会就打一枪换位，没机会就把狙带走。', avoid: '别为了镜头把全队最贵的枪送了。', line: '狙残局签挺帅，但帅之前先别空。', fandomFile: 'CS2_AWP_Inventory.png' },
];

export const csEconomies: DailyCard[] = [
  { key: 'full-eco', title: '今日CS经济局', name: '纯ECO攒钱', subtitle: '放弃本回合幻想 / 给下一把买满', scoreLabel: '经济纪律', advice: '目标不是奇迹翻盘，是集中掉枪、埋包或保住下一回合关键钱线。', avoid: '别五个人各买一把小枪，把下一回合也一起买没了。', line: '纯ECO签不好看，但会过日子的队伍才有后劲。', fandomFile: 'CS2_Glock-18_Inventory.png' },
  { key: 'force-buy', title: '今日CS经济局', name: '强起抢节奏', subtitle: '短枪甲道具 / 近点交叉', scoreLabel: '经济纪律', advice: '强起就打近点、叠人和爆发，不要拿差枪去远点拼公平对枪。', avoid: '别嘴上说强起，实际五个人分散找手感。', line: '强起签可以燃，但它不是无脑起。', fandomFile: 'CS2_Desert_Eagle_Inventory.png' },
  { key: 'half-buy', title: '今日CS经济局', name: '半起控上限', subtitle: '留底钱 / 小枪找掉枪', scoreLabel: '经济纪律', advice: '买到不破坏下回合长枪局的程度，能捡就捡，没机会就别继续加码。', avoid: '别看队友买了两颗雷，你也上头补成全起。', line: '半起签考验自制力，最怕半着半着变捐款。', fandomFile: 'CS2_P250_Inventory.png' },
  { key: 'bonus-round', title: '今日CS经济局', name: '奖励局保滚雪球', subtitle: '用上回合枪 / 换经济优势', scoreLabel: '经济纪律', advice: '奖励局别急着全换长枪，靠站位和道具把便宜枪打出价值。', avoid: '别为了体面全换枪，赢了手枪却没滚起雪球。', line: '奖励局签就是算账，账算清楚才是真优势。', fandomFile: 'CS2_MP9_Inventory.png' },
  { key: 'hero-rifle', title: '今日CS经济局', name: '英雄步枪', subtitle: '一把长枪带四把小枪 / 信息围绕核心', scoreLabel: '经济纪律', advice: '长枪别第一个送，小枪围绕它补枪、拉枪线、捡枪再转节奏。', avoid: '别英雄枪还没开火，队友先把地图送干净。', line: '英雄枪签很帅，但英雄也需要队友递梯子。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'anti-eco', title: '今日CS经济局', name: '反ECO稳收', subtitle: '防短枪偷人 / 不给掉枪', scoreLabel: '经济纪律', advice: '用道具清近点，拉开距离打，不给对面捡第一把长枪的机会。', avoid: '别优势枪械局主动钻烟送节目效果。', line: '反ECO签最怕轻敌，输一次整张图都疼。', fandomFile: 'CS2_M4A1-S_Inventory.png' },
];

export const csShotcalls: DailyCard[] = [
  { key: 'default-split-call', title: '今日CS指挥口令', name: '默认转夹击', subtitle: '先控图 / 后同步收口', scoreLabel: '指挥清晰度', advice: '开局只给两件事：谁拿信息，谁保补枪。拿到空间后再喊提速点。', avoid: '别一上来喊一堆路线，队友只记住了“自由发挥”。', line: '好口令不是长，是所有人知道下一步。', fandomFile: 'De_mirage_cs2.png' },
  { key: 'late-exec-call', title: '今日CS指挥口令', name: '晚点爆弹', subtitle: '压时间 / 道具同步 / 一波进点', scoreLabel: '指挥清晰度', advice: '提前报秒数和道具顺序，最后十秒只保留最短口令，别临门改计划。', avoid: '别时间剩二十秒还在问“打哪”。', line: '晚爆签拼的是整齐，不是嗓门。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'fake-rotate-call', title: '今日CS指挥口令', name: '假打骗转', subtitle: '声音给足 / 真转要快', scoreLabel: '指挥清晰度', advice: '假点给烟火脚步，转点人提前靠位，听到回防信息就立刻收口。', avoid: '别假打假到自己也信了，包还在原点发呆。', line: '假打签要骗对面，不是骗队友。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'contact-pop-call', title: '今日CS指挥口令', name: '静音接触后提速', subtitle: '少脚步 / 第一枪后全跟', scoreLabel: '指挥清晰度', advice: '摸到位之前安静，第一枪或第一颗闪就是全队开关，补枪别断。', avoid: '别接触到脸上还没人敢按W。', line: '接触签就是一口气，犹豫就漏气。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'retake-pack-call', title: '今日CS指挥口令', name: '回防集合令', subtitle: '等人 / 切空间 / 一起清点', scoreLabel: '指挥清晰度', advice: '先喊集合点和第一颗道具，人数齐了再清，不要三个人分三批送。', avoid: '别刚到包点外就各自干拉找英雄镜头。', line: '回防口令越短，队友越可能真听懂。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'timeout-reset-call', title: '今日CS指挥口令', name: '暂停重置', subtitle: '断连败 / 明确下一回合目标', scoreLabel: '指挥清晰度', advice: '暂停只解决一个问题：下一回合怎么拿首个空间或首个信息。', avoid: '别暂停开成情绪大会，回来还是没人知道买什么。', line: '暂停签不是休息，是把乱局按回流程。', fandomFile: 'CS2_Clipboard.png' },
];

export const csReviews: DailyCard[] = [
  { key: 'first-death-review', title: '今日CS复盘切片', name: '首死复盘', subtitle: '谁先掉 / 为什么没人补', scoreLabel: '复盘价值', advice: '只看首死前十秒：信息够不够、道具有没有、补枪距离是不是断了。', avoid: '别只骂枪法，很多首死其实是队形问题。', line: '首死切片最诚实，借口会被时间轴拆穿。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'utility-timing-review', title: '今日CS复盘切片', name: '道具时机复盘', subtitle: '烟闪火有没有服务进点', scoreLabel: '复盘价值', advice: '把道具落点和队友出手时间对齐，看是道具早了、人慢了，还是目的错了。', avoid: '别只说“我烟会丢”，会丢不等于丢得对。', line: '道具复盘一开，谁在空交一眼就清楚。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'trade-spacing-review', title: '今日CS复盘切片', name: '补枪距离复盘', subtitle: '第一身位和第二身位有没有脱节', scoreLabel: '复盘价值', advice: '暂停在第一枪响的瞬间，看第二个人能不能一秒内补到枪线。', avoid: '别把“没办法补”说成“差一点”。', line: '补枪签很残酷，距离一远就只剩观战。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'postplant-review', title: '今日CS复盘切片', name: '下包后站位复盘', subtitle: '时间优势 / 交叉枪线 / 别主动送', scoreLabel: '复盘价值', advice: '看下包后三十秒：谁该藏、谁该看拆、谁不该出去找人。', avoid: '别包一下就全员热血，主动把时间优势送回去。', line: '下包后复盘最能治上头。', fandomFile: 'De_anubis_cs2.png' },
  { key: 'retake-path-review', title: '今日CS复盘切片', name: '回防路线复盘', subtitle: '集合点 / 道具切割 / 清点顺序', scoreLabel: '复盘价值', advice: '标出三个人进点路线，看是不是同一个窄口排队，还是有人负责切枪线。', avoid: '别人数优势还一个门一个门送进去。', line: '回防复盘看纪律，纪律没有就别怪残局难。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'economy-swing-review', title: '今日CS复盘切片', name: '经济转折复盘', subtitle: '掉枪 / 保枪 / 强起连锁', scoreLabel: '复盘价值', advice: '找到比分转折前后的两回合，看是掉枪太多、强起失败，还是保枪判断错。', avoid: '别只复盘输的枪，经济崩经常从赢的回合开始。', line: '经济复盘不热闹，但它决定后面有没有枪玩。', fandomFile: 'CS2_MP9_Inventory.png' },
];

csTeams.push(
  { key: 'astralis', title: '今日CS队伍', name: 'Astralis', subtitle: '丹麦体系 / 纪律和地图理解', scoreLabel: '签位强度', advice: '今天少拼嗓门，多把交叉火力和道具顺序打明白。', avoid: '别把体系打成排队单挑。', line: 'Astralis签就是老派味，细节不够就露馅。', liquipediaPage: 'Astralis', playerImageFallback: 'dev1ce' },
  { key: 'furia', title: '今日CS队伍', name: 'FURIA', subtitle: '巴西进攻性 / 节奏压迫', scoreLabel: '签位强度', advice: '主动没问题，但第二时间补枪一定要跟上。', avoid: '别把快节奏打成快送。', line: 'FURIA签有火，但火别烧到自己。', liquipediaPage: 'FURIA Esports', playerImageFallback: 'KSCERATO' },
  { key: 'mongolz', title: '今日CS队伍', name: 'The MongolZ', subtitle: '亚洲强队 / 枪法和韧性', scoreLabel: '签位强度', advice: '正面别虚，残局别急，交换距离打近一点。', avoid: '别优势局一松就把节奏还回去。', line: '蒙古签抽到，今天别先认怂。', liquipediaPage: 'The MongolZ', playerImageFallback: 'bLitz' },
  { key: 'virtuspro', title: '今日CS队伍', name: 'Virtus.pro', subtitle: '慢控和纪律 / Jame Time语境', scoreLabel: '签位强度', advice: '慢可以，但慢要拿信息，不是原地发呆。', avoid: '别保枪保到队友心态先没。', line: 'VP签就是耐心测试，急的人先出局。', liquipediaPage: 'Virtus.pro', playerImageFallback: 'electroNic' },
  { key: 'eternal-fire', title: '今日CS队伍', name: 'Eternal Fire', subtitle: '土耳其火力 / 正面爆发', scoreLabel: '签位强度', advice: '第一枪要硬，回合纪律也得跟上。', avoid: '别只剩爆头线，没有回合计划。', line: '土耳其签一出来，正面压力直接拉满。', liquipediaPage: 'Eternal Fire', playerImageFallback: 'XANTARES', image: 'https://eternalfire.gg/wp-content/uploads/2022/10/eflogowhite.png' },
  { key: 'aurora', title: '今日CS队伍', name: 'Aurora', subtitle: '东欧枪男 / 节奏切换', scoreLabel: '签位强度', advice: '用枪法撬开局面，但中期别断信息链。', avoid: '别打着打着全队变单排。', line: 'Aurora签有锐度，别锐到没队友。', liquipediaPage: 'Aurora Gaming', playerImageFallback: 'woxic' },
  { key: 'heroic', title: '今日CS队伍', name: 'HEROIC', subtitle: '体系重建 / 信息和补枪', scoreLabel: '签位强度', advice: '今天别散，第一波交换和道具目的先讲清楚。', avoid: '别每个回合都像临时拼车。', line: 'HEROIC签要的是队形，不是各自精彩。', liquipediaPage: 'HEROIC', playerImageFallback: 'cadiaN' },
  { key: '3dmax', title: '今日CS队伍', name: '3DMAX', subtitle: '法国体系 / 冲击强队位', scoreLabel: '签位强度', advice: '把默认控图打扎实，别让对面免费拿首杀。', avoid: '别一到强队局就先自乱阵脚。', line: '3DMAX签不花，但要打得硬。', liquipediaPage: '3DMAX', playerImageFallback: 'apEX' },
  { key: 'pain', title: '今日CS队伍', name: 'paiN Gaming', subtitle: '巴西韧性 / 中期决策', scoreLabel: '签位强度', advice: '正面要敢换，残局要慢算时间。', avoid: '别优势人数还一个个送。', line: 'paiN签像名字一样，急了就疼。', liquipediaPage: 'paiN Gaming', playerImageFallback: 'coldzera' },
  { key: 'tyloo', title: '今日CS队伍', name: 'TYLOO', subtitle: '中国CS老牌 / 节奏和枪感', scoreLabel: '签位强度', advice: '枪要敢开，补枪距离别拉散。', avoid: '别开局想太多，中期又没人说话。', line: 'TYLOO签抽到，今天给点中国CS信仰分。', liquipediaPage: 'TYLOO', playerImageFallback: 'somebody' },
  { key: 'lynnvision', title: '今日CS队伍', name: 'Lynn Vision', subtitle: '中国新锐 / 正面和执行力', scoreLabel: '签位强度', advice: '按计划提速，别道具到了人没到。', avoid: '别小优势局打得像在试探人生。', line: 'LVG签有冲劲，关键是别断档。', liquipediaPage: 'Lynn Vision Gaming', playerImageFallback: 'Westmelon' },
  { key: 'big', title: '今日CS队伍', name: 'BIG', subtitle: '德国纪律 / 道具和默认', scoreLabel: '签位强度', advice: '先把默认打清楚，道具别省也别乱交。', avoid: '别默认控到时间没了才想起来进点。', line: 'BIG签很讲规矩，规矩乱了就很难看。', liquipediaPage: 'BIG', playerImageFallback: 'tabseN' },
  { key: 'complexity', title: '今日CS队伍', name: 'Complexity', subtitle: '北美冲击 / 正面交换', scoreLabel: '签位强度', advice: '今天别等奇迹，第一时间补枪要到位。', avoid: '别经济局刚有机会就把枪送回去。', line: 'COL签主打一个别复杂化。', liquipediaPage: 'Complexity Gaming', playerImageFallback: 'EliGE' },
);

csMaps.push(
  { key: 'train', title: '今日CS地图', name: 'Train', subtitle: '内外场控图 / 绿通和回防', scoreLabel: '手感指数', advice: '外场信息别断，进点前先把关键狙位处理掉。', avoid: '别一出门就被架死还说没办法。', line: '列车停放站这签，慢一秒和快一秒都要命。', fandomPage: 'Train', fandomFile: 'De_train_cs2.png' },
  { key: 'cache', title: '今日CS地图', name: 'Cache', subtitle: '中路控制 / A叉和B点爆弹', scoreLabel: '手感指数', advice: '中路别白给，A叉压力和B区假动作要讲清楚。', avoid: '别烟还没封，人已经过马路了。', line: '死城之谜这图，信息一断就开始猜谜。', fandomPage: 'Cache', fandomFile: 'De_cache.png' },
  { key: 'cobblestone', title: '今日CS地图', name: 'Cobblestone', subtitle: '长距离枪线 / B区执行', scoreLabel: '手感指数', advice: '长枪线要耐心，进B之前道具和补枪距离先摆好。', avoid: '别龙区散步散到被逐个点名。', line: '古堡签有年代感，但白给一直很现代。', fandomPage: 'Cobblestone', fandomFile: 'De_cbble.png' },
  { key: 'tuscan', title: '今日CS地图', name: 'Tuscan', subtitle: '经典回归 / 中路和两翼夹击', scoreLabel: '手感指数', advice: '先拿中路空间，再看两翼同步，别让队伍断成两截。', avoid: '别复古图打出复古沟通。', line: 'Tuscan签有老味，细节不到位就很苦。', fandomPage: 'Tuscan', fandomFile: 'De_tuscan_cs2.png' },
  { key: 'vertigo', title: '今日CS地图', name: 'Vertigo', subtitle: '楼梯和A坡 / 垂直空间', scoreLabel: '手感指数', advice: 'A坡争夺要有烟闪火顺序，别干拉看天。', avoid: '别掉下去，物理白给最难洗。', line: '殒命大厦签，楼上楼下都能出节目。', fandomPage: 'Vertigo', fandomFile: 'De_vertigo_cs2.png' },
  { key: 'office', title: '今日CS地图', name: 'Office', subtitle: '人质图 / 近点混战', scoreLabel: '手感指数', advice: '别急冲窄口，先用道具清近点和交叉。', avoid: '别一进门就把自己交给霰弹枪。', line: '办公室签很欢乐，但欢乐不等于乱送。', fandomPage: 'Office', fandomFile: 'Cs_office_cs2.png' },
  { key: 'italy', title: '今日CS地图', name: 'Italy', subtitle: '巷战和人质 / 近点信息', scoreLabel: '手感指数', advice: '巷道信息要慢慢拿，别无道具硬进。', avoid: '别把人质图打成单挑赛。', line: '意大利小镇签，优雅不了一点。', fandomPage: 'Italy', fandomFile: 'Cs_italy_cs2.png' },
);

csWeapons.push(
  { key: 'm4a4', title: '今日CS武器', name: 'M4A4', subtitle: '高弹量步枪 / 正面压制', scoreLabel: '爆头指数', advice: '多用弹量优势打多目标转移，别站桩扫到没子弹。', avoid: '别和A1一样玩偷人，枪不一样思路也不一样。', line: 'M4A4签就是稳压，压不住就是你急。', fandomFile: 'CS2_M4A4_Inventory.png' },
  { key: 'usp', title: '今日CS武器', name: 'USP-S', subtitle: '手枪局纪律 / 消音点射', scoreLabel: '爆头指数', advice: '第一枪慢一点，打头线和换位，不要连续硬peek。', avoid: '别一梭子打完还站原地。', line: 'USP签很冷静，冷静完别怂。', fandomFile: 'CS2_USP-S_Inventory.png' },
  { key: 'glock', title: '今日CS武器', name: 'Glock-18', subtitle: 'T方手枪 / 跑动和集火', scoreLabel: '爆头指数', advice: '抱团提速，近点集火，别一个人远距离点半天。', avoid: '别手枪局单摸当大哥。', line: '格洛克签要人多，孤狼没节目。', fandomFile: 'CS2_Glock-18_Inventory.png' },
  { key: 'famas', title: '今日CS武器', name: 'FAMAS', subtitle: 'CT半甲步枪 / 经济管理', scoreLabel: '爆头指数', advice: '利用位置和交叉火力，别拿它去和AK硬碰硬。', avoid: '别嫌便宜枪，便宜枪也要打干净。', line: 'FAMAS签就是会过日子，别过成捐款。', fandomFile: 'CS2_FAMAS_Inventory.png' },
  { key: 'aug', title: '今日CS武器', name: 'AUG', subtitle: '开镜稳定 / 长枪线', scoreLabel: '爆头指数', advice: '长点架住就收，不要开镜开到队友都没了。', avoid: '别因为能开镜就忘了换位。', line: 'AUG签有点稳健，也有点容易上头。', fandomFile: 'CS2_AUG_Inventory.png' },
  { key: 'sg553', title: '今日CS武器', name: 'SG 553', subtitle: 'T方开镜步枪 / 远点压制', scoreLabel: '爆头指数', advice: '远点拿信息和首杀，拿完就别贪第二枪。', avoid: '别开镜走路慢到被近点吃掉。', line: 'SG签是望远镜，但别望到回合没了。', fandomFile: 'CS2_SG_553_Inventory.png' },
  { key: 'p250', title: '今日CS武器', name: 'P250', subtitle: '低成本破甲 / 经济局偷人', scoreLabel: '爆头指数', advice: '贴近打第一枪，杀一个就赚，别远点硬讲道理。', avoid: '别把经济局打成单人送温暖。', line: 'P250签小钱办大事，办不了也别嘴硬。', fandomFile: 'CS2_P250_Inventory.png' },
  { key: 'five-seven', title: '今日CS武器', name: 'Five-SeveN', subtitle: 'CT近点手枪 / 爆发输出', scoreLabel: '爆头指数', advice: '近点蹲住交叉，等对面进你的距离再开火。', avoid: '别远距离和步枪互相尊重。', line: '57签最会阴人，阴不到就是白给。', fandomFile: 'CS2_Five-SeveN_Inventory.png' },
  { key: 'tec9', title: '今日CS武器', name: 'Tec-9', subtitle: '提速手枪 / 第一身位', scoreLabel: '爆头指数', advice: '吃闪冲近点，帮队友拉枪线，别停在半路犹豫。', avoid: '别冲了没人跟，回头一看全在出生点。', line: 'Tec-9签就是冲，但冲要有队友。', fandomFile: 'CS2_Tec-9_Inventory.png' },
  { key: 'p90', title: '今日CS武器', name: 'P90', subtitle: '跑打和火力压制 / 整活也能赢', scoreLabel: '爆头指数', advice: '近距离压迫可以，打完就转位置，别贪。', avoid: '别拿P90中远距离当AK。', line: 'P90签节目效果很足，别足到被踢。', fandomFile: 'CS2_P90_Inventory.png' },
  { key: 'xm1014', title: '今日CS武器', name: 'XM1014', subtitle: '近点霰弹 / 经济偷局', scoreLabel: '爆头指数', advice: '守窄口和近点，杀到一个就换位，别追出去送枪。', avoid: '别拿喷子出门追远点。', line: '连喷签很脏，但脏活也要讲位置。', fandomFile: 'CS2_XM1014_Inventory.png' },
  { key: 'ssg08', title: '今日CS武器', name: 'SSG 08', subtitle: '鸟狙 / 经济局远点威胁', scoreLabel: '爆头指数', advice: '打一枪就走，靠机动性和信息赚价值。', avoid: '别空一枪还站原地摆姿势。', line: '鸟狙签很轻，但压力不轻。', fandomFile: 'CS2_SSG_08_Inventory.png' },
);

csClutches.push(
  { key: 'one-v-two', title: '今日CS残局', name: '1v2拆分残局', subtitle: '隔离单挑 / 信息反推', scoreLabel: '残局指数', advice: '先把两个人拆开打，不要同时接两条枪线。', avoid: '别急着冲进交叉火力。', line: '1v2签不是硬刚签，是拆题签。', fandomFile: 'CS2_USP-S_Inventory.png' },
  { key: 'one-v-three', title: '今日CS残局', name: '1v3偷时间', subtitle: '假动作 / 转点 / 对面心态', scoreLabel: '残局指数', advice: '先造动静逼对面乱，再找落单点，不要正面硬撞三个人。', avoid: '别一开局就暴露所有信息。', line: '1v3签先别说赢，先让对面开始慌。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'two-v-four', title: '今日CS残局', name: '2v4反打', subtitle: '交叉火力 / 道具重置', scoreLabel: '残局指数', advice: '两个人别分太远，先靠道具和双拉拿第一个击杀。', avoid: '别一个人想当英雄，另一个人只能观战。', line: '2v4签看配合，个人主义先收一收。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'pistol-retake', title: '今日CS残局', name: '手枪局回防', subtitle: '人多节奏 / 近点清理', scoreLabel: '残局指数', advice: '一起进，一起补，先清近点再碰包。', avoid: '别三个人三秒进三次门。', line: '手枪回防签，散了就只剩点头。', fandomFile: 'CS2_Glock-18_Inventory.png' },
  { key: 'ninja-defuse', title: '今日CS残局', name: '偷拆残局', subtitle: '烟雾和声音 / 胆子与判断', scoreLabel: '残局指数', advice: '烟里偷拆前先确认对面距离和子弹压力，能骗再骗。', avoid: '别没烟没钳还硬演忍者。', line: '偷拆签很帅，但失败也很安静。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'fake-defuse', title: '今日CS残局', name: '假拆真拉', subtitle: '声音博弈 / 逼对面出枪', scoreLabel: '残局指数', advice: '点包骗枪位，拉出来只接一个角，别同时看三处。', avoid: '别假拆假到自己都信了。', line: '假拆签就是演技，演完得真会打。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'lowhp', title: '今日CS残局', name: '残血残局', subtitle: '一枪死 / 信息和角度选择', scoreLabel: '残局指数', advice: '残血就别硬换血，靠角度、道具和时间打。', avoid: '别还剩7滴血硬当突破手。', line: '残血签最考验嘴硬含金量。', fandomFile: 'CS2_P250_Inventory.png' },
);

export const csSkins: SkinCard[] = [
  { key: 'ak-redline', title: '今日CS皮肤', name: 'AK-47 | Redline', weapon: 'AK-47', rarity: 'Classified', subtitle: '经典红线 / 朴素但有压迫感', scoreLabel: '出货指数', advice: '今天皮肤不花，但枪要干净，第一发别急。', avoid: '别拿经典皮肤打出抽象弹道。', line: '红线签很稳，稳不住就是人的问题。', fandomFile: 'AK-47_Redline.png', fandomPage: 'Redline' },
  { key: 'ak-fire-serpent', title: '今日CS皮肤', name: 'AK-47 | Fire Serpent', weapon: 'AK-47', rarity: 'Covert', subtitle: '火蛇 / 老贵族味', scoreLabel: '出货指数', advice: '今天别急，火蛇是气场，不是免死金牌。', avoid: '别皮肤比回合价值高。', line: '火蛇签抽到，先别开香槟，枪线站好。', fandomFile: 'AK-47_Fire_Serpent.png' },
  { key: 'ak-asiimov', title: '今日CS皮肤', name: 'AK-47 | Asiimov', weapon: 'AK-47', rarity: 'Covert', subtitle: '白橙科幻 / 高辨识度', scoreLabel: '出货指数', advice: '枪要打得像皮肤一样干净，别泼成涂鸦。', avoid: '别只会看检视，不会看小地图。', line: '二西莫夫签很亮，别亮完就白给。', fandomFile: 'AK-47_Asiimov.png', fandomPage: 'Asiimov' },
  { key: 'ak-bloodsport', title: '今日CS皮肤', name: 'AK-47 | Bloodsport', weapon: 'AK-47', rarity: 'Covert', subtitle: '红白赛车感 / 正面火力', scoreLabel: '出货指数', advice: '今天正面可以硬，但补枪距离要跟上。', avoid: '别打得像没保险的赛车。', line: '血腥运动签很躁，躁也要有章法。', fandomFile: 'AK-47_Bloodsport.png' },
  { key: 'awp-dragon-lore', title: '今日CS皮肤', name: 'AWP | Dragon Lore', weapon: 'AWP', rarity: 'Covert', subtitle: '龙狙 / 传说级节目效果', scoreLabel: '出货指数', advice: '第一枪要稳，拿到优势就收，不要把龙狙送出去。', avoid: '别空枪后还在原地检视。', line: '龙狙签抽到，今天责任也跟着涨价。', fandomFile: 'AWP_Dragon_Lore.png', fandomPage: 'Dragon Lore' },
  { key: 'awp-asiimov', title: '今日CS皮肤', name: 'AWP | Asiimov', weapon: 'AWP', rarity: 'Covert', subtitle: '科幻大狙 / 经典白橙', scoreLabel: '出货指数', advice: '架点拿完就换位，别因为皮肤帅就多站半秒。', avoid: '别集锦没剪出来，经济先没了。', line: 'AWP二西莫夫签，帅可以，别空。', fandomFile: 'AWP_Asiimov.png', fandomPage: 'Asiimov' },
  { key: 'awp-containment', title: '今日CS皮肤', name: 'AWP | Containment Breach', weapon: 'AWP', rarity: 'Covert', subtitle: '怪物破笼 / 压迫感', scoreLabel: '出货指数', advice: '今天架点要狠，但空枪后撤更重要。', avoid: '别把自己关在同一个点位里。', line: '突破签配突破皮，听着就有事。', fandomFile: 'AWP_Containment_Breach.png' },
  { key: 'm4a1s-printstream', title: '今日CS皮肤', name: 'M4A1-S | Printstream', weapon: 'M4A1-S', rarity: 'Covert', subtitle: '白黑珍珠 / 干净偷人', scoreLabel: '出货指数', advice: '用消音和换位偷价值，别正面硬扫。', avoid: '别皮肤极简，打法极乱。', line: '印花集签很干净，别打脏。', fandomFile: 'M4A1-S_Printstream.png', fandomPage: 'Printstream' },
  { key: 'm4a1s-hyper-beast', title: '今日CS皮肤', name: 'M4A1-S | Hyper Beast', weapon: 'M4A1-S', rarity: 'Covert', subtitle: '怪兽涂装 / 老经典', scoreLabel: '出货指数', advice: '站位可以大胆一点，但换位别忘。', avoid: '别画面很凶，回合很软。', line: '暴怒野兽签，凶得有理才行。', fandomFile: 'M4A1-S_Hyper_Beast.png', fandomPage: 'Hyper Beast' },
  { key: 'm4a4-howl', title: '今日CS皮肤', name: 'M4A4 | Howl', weapon: 'M4A4', rarity: 'Contraband', subtitle: '咆哮 / 争议传奇', scoreLabel: '出货指数', advice: '弹量优势用来压制和转移，不是用来乱扫。', avoid: '别咆哮完人没了。', line: '咆哮签抽到，声音可以大，枪别飘。', fandomFile: 'M4A4_Howl.png', fandomPage: 'Howl' },
  { key: 'usp-kill-confirmed', title: '今日CS皮肤', name: 'USP-S | Kill Confirmed', weapon: 'USP-S', rarity: 'Covert', subtitle: '爆头确认 / 手枪局压迫', scoreLabel: '出货指数', advice: '第一发慢一点，手枪局别急着连续peek。', avoid: '别确认的是自己的死亡。', line: '枪响确认签，确认前先瞄头。', fandomFile: 'USP-S_Kill_Confirmed.png' },
  { key: 'deagle-blaze', title: '今日CS皮肤', name: 'Desert Eagle | Blaze', weapon: 'Desert Eagle', rarity: 'Restricted', subtitle: '火沙鹰 / 一发梦', scoreLabel: '出货指数', advice: '别急开枪，等准星和脚步都稳了再讲道理。', avoid: '别七发火光，全是空气。', line: '火沙鹰签最骗自信，但骗成了真帅。', fandomFile: 'Desert_Eagle_Blaze.png', fandomPage: 'Blaze' },
  { key: 'glock-fade', title: '今日CS皮肤', name: 'Glock-18 | Fade', weapon: 'Glock-18', rarity: 'Restricted', subtitle: '渐变 / 手枪局小豪华', scoreLabel: '出货指数', advice: '抱团提速，靠近打，别远点单点到天荒地老。', avoid: '别渐变很贵，打法很散。', line: '格洛克渐变签，手枪局别演。', fandomFile: 'Glock-18_Fade.png', fandomPage: 'Fade' },
  { key: 'mp9-starlight', title: '今日CS皮肤', name: 'MP9 | Starlight Protector', weapon: 'MP9', rarity: 'Covert', subtitle: '星光守护者 / 近点爆发', scoreLabel: '出货指数', advice: '近点杀一个就走，别恋战。', avoid: '别守护的是对面经济。', line: 'MP9星光签，闪亮但要跑得快。', fandomFile: 'MP9_Starlight_Protector.png' },
  { key: 'mac10-disco', title: '今日CS皮肤', name: 'MAC-10 | Disco Tech', weapon: 'MAC-10', rarity: 'Classified', subtitle: '迪斯科科技 / 第一身位节目', scoreLabel: '出货指数', advice: '冲锋要有闪和补枪，不要自己开舞池。', avoid: '别进点跳舞，队友进不来。', line: '迪斯科签很嗨，嗨完得换到空间。', fandomFile: 'MAC-10_Disco_Tech.png' },
];

export interface KnifeSkin {
  key: string;
  name: string;
  rarity: string;
  advice: string;
  avoid: string;
  line: string;
  fileSuffixes: string[];
}

export const csKnives: KnifeCard[] = [
  { key: 'bayonet', title: '今日发刀', name: 'Bayonet', subtitle: '刺刀 / 老派经典', scoreLabel: '刀运指数', advice: '今天抽到老经典，稳一点，别检视到被偷。', avoid: '别刀还没掏明白，人先没了。', line: '刺刀签很直，别玩弯的。', fandomPage: 'Bayonet', fandomFile: 'Cs2-knife-bayonet-stock-market.png', aliases: ['bayonet'], skinFilePrefixes: ['Bayonet'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'm9-bayonet', title: '今日发刀', name: 'M9 Bayonet', subtitle: 'M9刺刀 / 厚重大哥', scoreLabel: '刀运指数', advice: '这刀气场够，回合也得够硬。', avoid: '别只会切刀不看身后。', line: 'M9签抽到，今天多少有点排面。', fandomPage: 'M9 Bayonet', fandomFile: 'Cs2-knife-m9-bayonet-stock.png', aliases: ['m9'], skinFilePrefixes: ['M9_Bayonet', 'M9Bayonet'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'karambit', title: '今日发刀', name: 'Karambit', subtitle: '爪子刀 / 顶级人气', scoreLabel: '刀运指数', advice: '抽到爪子先别飘，回合先赢再检视。', avoid: '别转刀转到忘补枪。', line: '爪子签有节目，节目别变事故。', fandomPage: 'Karambit', fandomFile: 'Cs2-knife-karambit-stock.png', aliases: ['爪子刀', '爪子'], skinFilePrefixes: ['Karambit'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'butterfly', title: '今日发刀', name: 'Butterfly Knife', subtitle: '蝴蝶刀 / 检视之王', scoreLabel: '刀运指数', advice: '可以检视，但别检视到被timing抓。', avoid: '别刀花活比枪法多。', line: '蝴蝶签来了，先把手稳住。', fandomPage: 'Butterfly Knife', fandomFile: 'Cs2-knife-butterfly-stock-market.png', aliases: ['蝴蝶刀', '蝴蝶'], skinFilePrefixes: ['Butterfly_Knife', 'Butterfly'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'flip', title: '今日发刀', name: 'Flip Knife', subtitle: '折叠刀 / 实用经典', scoreLabel: '刀运指数', advice: '朴素但耐看，今天少花活多赢回合。', avoid: '别觉得不够贵就乱玩。', line: '折刀签不装，但能打。', fandomPage: 'Flip Knife', fandomFile: 'Weapon_knife_flip_cs2.png', aliases: ['折刀'], skinFilePrefixes: ['Flip_Knife', 'Flip'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'gut', title: '今日发刀', name: 'Gut Knife', subtitle: '穿肠刀 / 老资历', scoreLabel: '刀运指数', advice: '冷门刀也有味，别自己先嫌弃。', avoid: '别刀冷门，打法也冷场。', line: '穿肠签抽到，今天主打朴实。', fandomPage: 'Gut Knife', fandomFile: 'Weapon_knife_gut_cs2.png', aliases: ['穿肠刀'], skinFilePrefixes: ['Gut_Knife', 'Gut'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'huntsman', title: '今日发刀', name: 'Huntsman Knife', subtitle: '猎杀者匕首 / 厚实硬朗', scoreLabel: '刀运指数', advice: '今天别怕正面，但枪线别乱冲。', avoid: '别猎杀到最后猎的是自己。', line: '猎杀者签，有点硬汉味。', fandomPage: 'Huntsman Knife', fandomFile: 'Weapon_knife_tactical_cs2.png', aliases: ['猎杀者'], skinFilePrefixes: ['Huntsman_Knife', 'Huntsman'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'falchion', title: '今日发刀', name: 'Falchion Knife', subtitle: '弯刀 / 动作有记忆点', scoreLabel: '刀运指数', advice: '今天节奏别弯，回合路线要直。', avoid: '别甩刀甩到忘了换弹。', line: '弯刀签，花但不能乱。', fandomPage: 'Falchion Knife', fandomFile: 'Weapon_knife_falchion_cs2.png', aliases: ['弯刀'], skinFilePrefixes: ['Falchion_Knife', 'Falchion'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'bowie', title: '今日发刀', name: 'Bowie Knife', subtitle: '鲍伊猎刀 / 大开大合', scoreLabel: '刀运指数', advice: '气势够了，今天枪也得够干净。', avoid: '别刀大，胆子小。', line: '鲍伊签很有重量，别把回合打轻了。', fandomPage: 'Bowie Knife', fandomFile: 'Weapon_knife_survival_bowie_cs2.png', aliases: ['鲍伊'], skinFilePrefixes: ['Bowie_Knife', 'Bowie'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'shadow-daggers', title: '今日发刀', name: 'Shadow Daggers', subtitle: '暗影双匕 / 整活气质', scoreLabel: '刀运指数', advice: '双刀签很有节目，但别双倍白给。', avoid: '别以为两把刀等于两条命。', line: '暗影双匕签，节目效果先到位。', fandomPage: 'Shadow Daggers', fandomFile: 'Weapon_knife_push_cs2.png', aliases: ['双匕', '拳套刀'], skinFilePrefixes: ['Shadow_Daggers', 'Shadow'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'navaja', title: '今日发刀', name: 'Navaja Knife', subtitle: '折刀小刀 / 低调冷门', scoreLabel: '刀运指数', advice: '刀可以低调，回合别低迷。', avoid: '别冷门刀配冷门枪法。', line: '纳瓦哈签，主打一个别嫌。', fandomPage: 'Navaja Knife', fandomFile: 'Weapon_knife_gypsy_jackknife_cs2.png', aliases: ['纳瓦哈'], skinFilePrefixes: ['Navaja_Knife', 'Navaja'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'stiletto', title: '今日发刀', name: 'Stiletto Knife', subtitle: '短剑 / 细长利落', scoreLabel: '刀运指数', advice: '今天打法要利落，别拖泥带水。', avoid: '别刀很优雅，枪很狼狈。', line: '短剑签有味，关键是别手抖。', fandomPage: 'Stiletto Knife', fandomFile: 'Weapon_knife_stiletto_cs2.png', aliases: ['短剑'], skinFilePrefixes: ['Stiletto_Knife', 'Stiletto'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'talon', title: '今日发刀', name: 'Talon Knife', subtitle: '锯齿爪刀 / 爪子兄弟', scoreLabel: '刀运指数', advice: '这签很锋利，但回合判断别割裂。', avoid: '别检视检到被背刺。', line: '锯齿爪签，今天排面够。', fandomPage: 'Talon Knife', fandomFile: 'Weapon_knife_widowmaker_cs2.png', aliases: ['锯齿爪'], skinFilePrefixes: ['Talon_Knife', 'Talon'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'ursus', title: '今日发刀', name: 'Ursus Knife', subtitle: '熊刀 / 简洁硬派', scoreLabel: '刀运指数', advice: '少花活，多赢回合，熊刀就吃这个味。', avoid: '别硬派刀配软脚步。', line: '熊刀签，朴实但不丢人。', fandomPage: 'Ursus Knife', fandomFile: 'Weapon_knife_ursus_cs2.png', aliases: ['熊刀'], skinFilePrefixes: ['Ursus_Knife', 'Ursus'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'classic', title: '今日发刀', name: 'Classic Knife', subtitle: '经典刀 / CS血统', scoreLabel: '刀运指数', advice: '经典刀签，今天把基本功打回来。', avoid: '别经典的是刀，抽象的是人。', line: '经典刀签一出，老味来了。', fandomPage: 'Classic Knife', fandomFile: 'Weapon_knife_css_cs2.png', aliases: ['经典刀'], skinFilePrefixes: ['Classic_Knife', 'Classic'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'paracord', title: '今日发刀', name: 'Paracord Knife', subtitle: '系绳匕首 / 实战风', scoreLabel: '刀运指数', advice: '今天别花，打得实用一点。', avoid: '别战术风皮肤配无战术打法。', line: '系绳刀签，低调但能看。', fandomPage: 'Paracord Knife', fandomFile: 'Weapon_knife_cord_cs2.png', aliases: ['系绳刀'], skinFilePrefixes: ['Paracord_Knife', 'Paracord'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'survival', title: '今日发刀', name: 'Survival Knife', subtitle: '求生匕首 / 硬朗工具感', scoreLabel: '刀运指数', advice: '今天先活下来再谈操作，别第一身位白给。', avoid: '别求生刀抽到了，人却不求生。', line: '求生刀签，字面意义先别死。', fandomPage: 'Survival Knife', fandomFile: 'Weapon_knife_canis_cs2.png', aliases: ['求生刀'], skinFilePrefixes: ['Survival_Knife', 'Survival'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'nomad', title: '今日发刀', name: 'Nomad Knife', subtitle: '流浪者匕首 / 干净利落', scoreLabel: '刀运指数', advice: '走位可以灵活，但别真流浪到队友找不到你。', avoid: '别绕后绕成失踪人口。', line: '流浪者签，别流浪过头。', fandomPage: 'Nomad Knife', fandomFile: 'Weapon_knife_outdoor_cs2.png', aliases: ['流浪者'], skinFilePrefixes: ['Nomad_Knife', 'Nomad'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'skeleton', title: '今日发刀', name: 'Skeleton Knife', subtitle: '骷髅刀 / 高人气硬货', scoreLabel: '刀运指数', advice: '抽到骷髅刀，今天回合得打出骨架。', avoid: '别只有刀有骨架，战术没骨架。', line: '骷髅刀签，有点硬通货味。', fandomPage: 'Skeleton Knife', fandomFile: 'Weapon_knife_skeleton_cs2.png', aliases: ['骷髅刀'], skinFilePrefixes: ['Skeleton_Knife', 'Skeleton'] } as KnifeCard & { skinFilePrefixes: string[] },
  { key: 'kukri', title: '今日发刀', name: 'Kukri Knife', subtitle: '廓尔喀刀 / CS2新刀型', scoreLabel: '刀运指数', advice: '新刀签，今天可以有点新思路，但别乱。', avoid: '别新刀新鲜，回合发霉。', line: '廓尔喀签抽到，新鲜感有了。', fandomPage: 'Kukri Knife', fandomFile: 'CS2_weapon_knife_kukri.png', aliases: ['廓尔喀', '库克里'], skinFilePrefixes: ['Kukri_Knife', 'Kukri'] } as KnifeCard & { skinFilePrefixes: string[] },
];

export const knifeSkins: KnifeSkin[] = [
  { key: 'vanilla', name: 'Vanilla', rarity: 'Covert', advice: '原版签吃的是刀型本身，今天别花，赢回合最有排面。', avoid: '别原版刀很干净，操作很凌乱。', line: 'Vanilla签，朴素但硬。', fileSuffixes: ['Vanilla', 'Stock', 'stock'] },
  { key: 'doppler', name: 'Doppler', rarity: 'Covert', advice: '多普勒签很亮，亮归亮，别把自己亮给对面。', avoid: '别检视比补枪还积极。', line: 'Doppler一出，群里先沉默三秒。', fileSuffixes: ['Doppler', 'doppler_phase2', 'doppler_phase3', 'doppler_phase4'] },
  { key: 'doppler-phase1', name: 'Doppler Phase 1', rarity: 'Covert', advice: 'P1签是暗紫冷调，今天稳着打也有高级感。', avoid: '别颜色低调，脚步高调。', line: 'Doppler P1签，低调里有光。', fileSuffixes: ['Doppler_Phase_1', 'Doppler_Phase1', 'doppler_phase1'] },
  { key: 'doppler-phase2', name: 'Doppler Phase 2', rarity: 'Covert', advice: 'P2签粉紫很出片，但别光顾着截图。', avoid: '别截图比补枪还快。', line: 'Doppler P2签，颜值先顶住。', fileSuffixes: ['Doppler_Phase_2', 'Doppler_Phase2', 'doppler_phase2'] },
  { key: 'doppler-phase3', name: 'Doppler Phase 3', rarity: 'Covert', advice: 'P3签有点冷门质感，今天靠细节赢。', avoid: '别冷门到队友都跟不上节奏。', line: 'Doppler P3签，懂的人会懂。', fileSuffixes: ['Doppler_Phase_3', 'Doppler_Phase3', 'doppler_phase3'] },
  { key: 'doppler-phase4', name: 'Doppler Phase 4', rarity: 'Covert', advice: 'P4签蓝调很稳，今天架枪也稳一点。', avoid: '别蓝得好看，人却急得发红。', line: 'Doppler P4签，冷静就完事。', fileSuffixes: ['Doppler_Phase_4', 'Doppler_Phase4', 'doppler_phase4'] },
  { key: 'doppler-ruby', name: 'Doppler Ruby', rarity: 'Covert', advice: '红宝石签是大货，回合也得打出大货样。', avoid: '别刀像红宝石，经济像碎玻璃。', line: 'Ruby签，群里可以短暂安静一下。', fileSuffixes: ['Doppler_Ruby', 'Ruby', 'doppler_ruby'] },
  { key: 'doppler-sapphire', name: 'Doppler Sapphire', rarity: 'Covert', advice: '蓝宝石签压迫感够，今天别乱送节奏。', avoid: '别蓝宝石拿着，蓝屏操作打着。', line: 'Sapphire签，冷贵冷贵的。', fileSuffixes: ['Doppler_Sapphire', 'Sapphire', 'doppler_sapphire'] },
  { key: 'doppler-black-pearl', name: 'Doppler Black Pearl', rarity: 'Covert', advice: '黑珍珠签很稀，今天别把机会打稀碎。', avoid: '别黑珍珠配黑色幽默。', line: 'Black Pearl签，有点传家宝味。', fileSuffixes: ['Doppler_Black_Pearl', 'Black_Pearl', 'doppler_black_pearl'] },
  { key: 'gamma-doppler', name: 'Gamma Doppler', rarity: 'Covert', advice: '绿宝石气质拉满，但回合别绿。', avoid: '别为了看颜色忘了看包点。', line: 'Gamma Doppler签，今天有点贵气。', fileSuffixes: ['Gamma_Doppler', 'gamma_doppler'] },
  { key: 'gamma-doppler-phase1', name: 'Gamma Doppler Phase 1', rarity: 'Covert', advice: 'Gamma P1签偏沉稳，今天信息别断。', avoid: '别绿光一闪，人就没了。', line: 'Gamma P1签，稳里带亮。', fileSuffixes: ['Gamma_Doppler_Phase_1', 'Gamma_Doppler_Phase1', 'gamma_doppler_phase1'] },
  { key: 'gamma-doppler-phase2', name: 'Gamma Doppler Phase 2', rarity: 'Covert', advice: 'Gamma P2签更亮，今天正面可以硬一点。', avoid: '别亮刀亮到暴露timing。', line: 'Gamma P2签，亮得有攻击性。', fileSuffixes: ['Gamma_Doppler_Phase_2', 'Gamma_Doppler_Phase2', 'gamma_doppler_phase2'] },
  { key: 'gamma-doppler-phase3', name: 'Gamma Doppler Phase 3', rarity: 'Covert', advice: 'Gamma P3签有层次，今天别一条路走黑。', avoid: '别颜色有层次，打法没层次。', line: 'Gamma P3签，细节派。', fileSuffixes: ['Gamma_Doppler_Phase_3', 'Gamma_Doppler_Phase3', 'gamma_doppler_phase3'] },
  { key: 'gamma-doppler-phase4', name: 'Gamma Doppler Phase 4', rarity: 'Covert', advice: 'Gamma P4签清爽，今天交流也清楚点。', avoid: '别报点比刀纹还模糊。', line: 'Gamma P4签，干净利落。', fileSuffixes: ['Gamma_Doppler_Phase_4', 'Gamma_Doppler_Phase4', 'gamma_doppler_phase4'] },
  { key: 'gamma-doppler-emerald', name: 'Gamma Doppler Emerald', rarity: 'Covert', advice: '绿宝石签到手，今天少犯低级错。', avoid: '别满眼绿宝石，满脑子空枪。', line: 'Emerald签，这把真有点贵。', fileSuffixes: ['Gamma_Doppler_Emerald', 'Emerald', 'gamma_doppler_emerald'] },
  { key: 'fade', name: 'Fade', rarity: 'Covert', advice: '渐变签很顺眼，打法也要顺。', avoid: '别渐变很丝滑，急停很抽象。', line: 'Fade签，老审美不会错。', fileSuffixes: ['Fade'] },
  { key: 'marble-fade', name: 'Marble Fade', rarity: 'Covert', advice: '大理石渐变可以花，回合别花。', avoid: '别花刀配花活，最后花式白给。', line: 'Marble Fade签，颜色先赢了。', fileSuffixes: ['Marble_Fade'] },
  { key: 'marble-fade-fire-ice', name: 'Marble Fade Fire & Ice', rarity: 'Covert', advice: '冰火签看着就狠，今天决策也得干脆。', avoid: '别冰火两重天，上一秒自信下一秒白给。', line: 'Fire & Ice签，节目效果很足。', fileSuffixes: ['Marble_Fade_Fire_And_Ice', 'Marble_Fade_Fire_Ice', 'Fire_And_Ice'] },
  { key: 'tiger-tooth', name: 'Tiger Tooth', rarity: 'Covert', advice: '虎牙签就是锋利，今天正面可以硬一点。', avoid: '别虎牙变乳牙。', line: 'Tiger Tooth签，咬住别松。', fileSuffixes: ['Tiger_Tooth'] },
  { key: 'case-hardened', name: 'Case Hardened', rarity: 'Covert', advice: '淬火签看脸，回合可不能全看脸。', avoid: '别蓝顶没出，红温先出。', line: 'Case Hardened签，赌狗气质来了。', fileSuffixes: ['Case_Hardened', 'case_hardened'] },
  { key: 'case-hardened-blue-gem', name: 'Case Hardened Blue Gem', rarity: 'Covert', advice: '蓝宝石淬火签拉满，今天别把好签打成坏账。', avoid: '别蓝顶在手，脑子离线。', line: 'Blue Gem签，懂价的已经开始算了。', fileSuffixes: ['Case_Hardened_Blue_Gem', 'Blue_Gem', 'case_hardened_blue_gem'] },
  { key: 'blue-steel', name: 'Blue Steel', rarity: 'Covert', advice: '蓝钢签低调耐看，今天靠纪律和补枪吃饭。', avoid: '别冷色刀配热头打法。', line: 'Blue Steel签，稳里带一点冷。', fileSuffixes: ['Blue_Steel', 'blue_steel'] },
  { key: 'crimson-web', name: 'Crimson Web', rarity: 'Covert', advice: '红网签压迫感强，但别自己陷进去。', avoid: '别卡在自己编的网里。', line: 'Crimson Web签，红得有道理。', fileSuffixes: ['Crimson_Web', 'Crimson_web'] },
  { key: 'crimson-web-centered', name: 'Crimson Web Centered', rarity: 'Covert', advice: '正网签讲究一个位置，今天站位也讲究点。', avoid: '别网居中，人站歪。', line: 'Centered Web签，强迫症舒服了。', fileSuffixes: ['Crimson_Web_Centered', 'Centered_Web', 'crimson_web_centered'] },
  { key: 'slaughter', name: 'Slaughter', rarity: 'Covert', advice: '屠夫签要狠，但狠之前先确认队友位置。', avoid: '别屠的是队伍经济。', line: 'Slaughter签，今天别手软也别上头。', fileSuffixes: ['Slaughter'] },
  { key: 'lore', name: 'Lore', rarity: 'Covert', advice: '传说签有味，今天拿信息要有耐心。', avoid: '别传说没打出来，笑话先出来。', line: 'Lore签，老金色排面。', fileSuffixes: ['Lore'] },
  { key: 'lore-gold', name: 'Lore Gold', rarity: 'Covert', advice: '金色传说签，今天少说多赢。', avoid: '别金得晃眼，枪线晃没。', line: 'Lore Gold签，排面是够的。', fileSuffixes: ['Lore_Gold', 'Golden_Lore', 'lore_gold'] },
  { key: 'autotronic', name: 'Autotronic', rarity: 'Covert', advice: '自动化签很硬，打法别像没上电。', avoid: '别机械感有了，判断没了。', line: 'Autotronic签，红银硬货。', fileSuffixes: ['Autotronic', 'autotronic'] },
  { key: 'black-laminate', name: 'Black Laminate', rarity: 'Covert', advice: '黑层压低调，今天就靠纪律说话。', avoid: '别低调到队友找不到你。', line: 'Black Laminate签，冷静派。', fileSuffixes: ['Black_Laminate', 'black_laminate'] },
  { key: 'black-laminate-clean', name: 'Black Laminate Clean', rarity: 'Covert', advice: '干净黑层压签，今天操作也干净点。', avoid: '别刀面干净，残局脏乱。', line: 'Clean Black Laminate签，耐看。', fileSuffixes: ['Black_Laminate_Clean', 'Clean_Black_Laminate', 'black_laminate_clean'] },
  { key: 'boreal-forest', name: 'Boreal Forest', rarity: 'Covert', advice: '北方森林签主打隐蔽，别先把脚步送出去。', avoid: '别迷彩没藏住，意图先暴露。', line: 'Boreal Forest签，朴素但能活。', fileSuffixes: ['Boreal_Forest', 'boreal_forest'] },
  { key: 'damascus', name: 'Damascus Steel', rarity: 'Covert', advice: '大马士革签要稳，细节纹路别打散。', avoid: '别刀纹很细，枪法很粗。', line: 'Damascus Steel签，老工艺感。', fileSuffixes: ['Damascus_Steel'] },
  { key: 'damascus-bright', name: 'Damascus Steel Bright', rarity: 'Covert', advice: '亮面大马士革签，今天少犯暗亏。', avoid: '别刀面有光，思路没光。', line: 'Bright Damascus签，质感在线。', fileSuffixes: ['Damascus_Steel_Bright', 'Bright_Damascus', 'damascus_bright'] },
  { key: 'forest-ddpat', name: 'Forest DDPAT', rarity: 'Covert', advice: '森林数码签很实用，今天多拿信息少赌命。', avoid: '别伪装得很好，回合目标也跟着消失。', line: 'Forest DDPAT签，低调务实派。', fileSuffixes: ['Forest_DDPAT', 'forest_ddpat'] },
  { key: 'night', name: 'Night', rarity: 'Covert', advice: '夜色签很沉，今天别急着亮自己位置。', avoid: '别黑刀配黑屏操作。', line: 'Night签，暗得有气质。', fileSuffixes: ['Night'] },
  { key: 'night-stripe', name: 'Night Stripe', rarity: 'Covert', advice: '夜色条纹签冷静一点，先打信息再打人。', avoid: '别条纹很稳，人先乱了。', line: 'Night Stripe签，干净低调。', fileSuffixes: ['Night_Stripe', 'night_stripe'] },
  { key: 'scorched', name: 'Scorched', rarity: 'Covert', advice: '焦炭签很硬核，今天别怕脏活，但别白给。', avoid: '别刀像打过仗，人像刚睡醒。', line: 'Scorched签，糙但有味。', fileSuffixes: ['Scorched'] },
  { key: 'stained', name: 'Stained', rarity: 'Covert', advice: '表面淬色签耐看，今天每个peek都要有理由。', avoid: '别刀面有痕，思路也有坑。', line: 'Stained签，老派稳定。', fileSuffixes: ['Stained'] },
  { key: 'ultraviolet', name: 'Ultraviolet', rarity: 'Covert', advice: '紫外线签低调酷，今天少嘴硬多补枪。', avoid: '别紫得发黑，回合也发黑。', line: 'Ultraviolet签，冷色但别冷场。', fileSuffixes: ['Ultraviolet'] },
  { key: 'freehand', name: 'Freehand', rarity: 'Covert', advice: '自由手签可以飘，但打法别飘。', avoid: '别自由到没有队形。', line: 'Freehand签，花纹随意，人别随意。', fileSuffixes: ['Freehand'] },
  { key: 'freehand-purple', name: 'Freehand Purple', rarity: 'Covert', advice: '紫手绘签很有辨识度，今天别打成随手。', avoid: '别自由手变随便手。', line: 'Purple Freehand签，花得有分寸。', fileSuffixes: ['Freehand_Purple', 'Purple_Freehand', 'freehand_purple'] },
  { key: 'rust-coat', name: 'Rust Coat', rarity: 'Covert', advice: '锈蚀签很接地气，今天别嫌，赢回合才香。', avoid: '别刀生锈，脑子也生锈。', line: 'Rust Coat签，穷也穷得有态度。', fileSuffixes: ['Rust_Coat'] },
  { key: 'bright-water', name: 'Bright Water', rarity: 'Covert', advice: '澄澈之水签，今天信息也要清楚。', avoid: '别水很亮，人很迷。', line: 'Bright Water签，清爽但要能打。', fileSuffixes: ['Bright_Water'] },
  { key: 'safari-mesh', name: 'Safari Mesh', rarity: 'Covert', advice: '狩猎网格签朴素，朴素不是白给。', avoid: '别被对面当猎物。', line: 'Safari Mesh签，主打实用主义。', fileSuffixes: ['Safari_Mesh'] },
  { key: 'urban-masked', name: 'Urban Masked', rarity: 'Covert', advice: '都市伪装签适合稳扎稳打，先清近点再动。', avoid: '别伪装了半天，自己先迷路。', line: 'Urban Masked签，城市老兵味。', fileSuffixes: ['Urban_Masked', 'urban_masked'] },
  { key: 'urban-masked-clean', name: 'Urban Masked Clean', rarity: 'Covert', advice: '干净都市伪装签，今天清点别拖。', avoid: '别清清爽爽进点，稀里糊涂掉包。', line: 'Clean Urban Masked签，朴素但顺眼。', fileSuffixes: ['Urban_Masked_Clean', 'Clean_Urban_Masked', 'urban_masked_clean'] },
  { key: 'vanilla-pristine', name: 'Vanilla Pristine', rarity: 'Covert', advice: '原版满状态签，今天少整花的，把基本功打漂亮。', avoid: '别刀很新，人很旧习惯。', line: 'Pristine Vanilla签，干净就是排面。', fileSuffixes: ['Vanilla_Pristine', 'Pristine', 'Factory_New', 'Vanilla'] },
  { key: 'fade-99', name: 'Fade 99%', rarity: 'Covert', advice: '高渐变签很扎眼，今天优势局要收干净。', avoid: '别渐变接近满，回合收尾接近零。', line: 'Fade 99签，颜色快拉满了。', fileSuffixes: ['Fade_99', '99_Fade', 'Fade_Max', 'Full_Fade'] },
  { key: 'fade-80', name: 'Fade 80%', rarity: 'Covert', advice: '中高渐变签也够看，别为了追满渐变忘了赢。', avoid: '别审美在线，补枪掉线。', line: 'Fade 80签，够亮也够稳。', fileSuffixes: ['Fade_80', '80_Fade', 'Fade'] },
  { key: 'crimson-web-triple-web', name: 'Crimson Web Triple Web', rarity: 'Covert', advice: '三网签讲究细节，今天站位和清点也要讲究。', avoid: '别网多，人先被网住。', line: 'Triple Web签，红网党开始鉴定。', fileSuffixes: ['Crimson_Web_Triple_Web', 'Triple_Web', '3_Web'] },
  { key: 'case-hardened-gold-gem', name: 'Case Hardened Gold Gem', rarity: 'Covert', advice: '金顶淬火签少见，今天别把少见好签打成常见白给。', avoid: '别金顶在手，经济见底。', line: 'Gold Gem签，另一种赌狗审美。', fileSuffixes: ['Case_Hardened_Gold_Gem', 'Gold_Gem', 'case_hardened_gold_gem'] },
  { key: 'case-hardened-purple-gem', name: 'Case Hardened Purple Gem', rarity: 'Covert', advice: '紫宝石淬火签有点邪门好看，今天节奏别邪门。', avoid: '别刀面玄学，打法也玄学。', line: 'Purple Gem签，冷门鉴赏家上线。', fileSuffixes: ['Case_Hardened_Purple_Gem', 'Purple_Gem', 'case_hardened_purple_gem'] },
  { key: 'marble-fade-tricolor', name: 'Marble Fade Tricolor', rarity: 'Covert', advice: '三色大理石签够花，今天战术别花。', avoid: '别颜色三段，思路断三次。', line: 'Tricolor Marble签，屏幕先热闹起来。', fileSuffixes: ['Marble_Fade_Tricolor', 'Tricolor_Marble', 'Marble_Fade'] },
  { key: 'tiger-tooth-max-yellow', name: 'Tiger Tooth Max Yellow', rarity: 'Covert', advice: '满黄虎牙签很干脆，今天第一枪也干脆点。', avoid: '别虎牙很猛，peek很虚。', line: 'Max Yellow Tiger Tooth签，亮黄大货味。', fileSuffixes: ['Tiger_Tooth_Max_Yellow', 'Max_Yellow', 'Tiger_Tooth'] },
  { key: 'slaughter-diamond', name: 'Slaughter Diamond', rarity: 'Covert', advice: '钻石屠夫签靠纹路吃饭，今天靠纪律吃分。', avoid: '别盯纹路盯到忘了包点。', line: 'Slaughter Diamond签，鉴赏局来了。', fileSuffixes: ['Slaughter_Diamond', 'Diamond', 'Slaughter'] },
  { key: 'slaughter-angel', name: 'Slaughter Angel', rarity: 'Covert', advice: '天使纹签有说法，但别指望天使替你补枪。', avoid: '别图案像天使，操作像梦游。', line: 'Slaughter Angel签，玄学审美到位。', fileSuffixes: ['Slaughter_Angel', 'Angel', 'Slaughter'] },
  { key: 'slaughter-phoenix', name: 'Slaughter Phoenix', rarity: 'Covert', advice: '凤凰纹签很有节目，逆风也别急着飞。', avoid: '别凤凰没起，人先坠了。', line: 'Slaughter Phoenix签，翻盘味先有了。', fileSuffixes: ['Slaughter_Phoenix', 'Phoenix', 'Slaughter'] },
  { key: 'damascus-black', name: 'Damascus Steel Black', rarity: 'Covert', advice: '黑大马士革签很冷，今天心态也冷一点。', avoid: '别冷静外观配热头操作。', line: 'Black Damascus签，低调硬货。', fileSuffixes: ['Damascus_Steel_Black', 'Black_Damascus', 'Damascus_Steel'] },
  { key: 'stained-blue', name: 'Stained Blue', rarity: 'Covert', advice: '蓝淬色签耐看，今天慢慢拿信息别乱赌。', avoid: '别蓝得漂亮，回合处理发紫。', line: 'Blue Stained签，老派里带点冷光。', fileSuffixes: ['Stained_Blue', 'Blue_Stained', 'Stained'] },
  { key: 'scorched-clean', name: 'Scorched Clean', rarity: 'Covert', advice: '干净焦炭签比想象中顺眼，今天脏活也打干净。', avoid: '别外观干净，清点马虎。', line: 'Clean Scorched签，糙里有细。', fileSuffixes: ['Scorched_Clean', 'Clean_Scorched', 'Scorched'] },
  { key: 'boreal-forest-clean', name: 'Boreal Forest Clean', rarity: 'Covert', advice: '干净北方森林签适合稳扎稳打，别乱露信息。', avoid: '别迷彩干净，默认脏乱。', line: 'Clean Boreal Forest签，朴素党舒服了。', fileSuffixes: ['Boreal_Forest_Clean', 'Clean_Boreal_Forest', 'Boreal_Forest'] },
];

const legacyKnifeKeys = new Set(['bayonet', 'm9-bayonet', 'karambit', 'butterfly', 'flip', 'gut', 'huntsman', 'falchion', 'bowie', 'shadow-daggers']);
const limitedKnifeKeys = new Set(['classic', 'kukri']);
const legacyOnlyKnifeSkinKeys = new Set([
  'autotronic',
  'black-laminate',
  'black-laminate-clean',
  'bright-water',
  'freehand',
  'freehand-purple',
  'gamma-doppler',
  'gamma-doppler-phase1',
  'gamma-doppler-phase2',
  'gamma-doppler-phase3',
  'gamma-doppler-phase4',
  'gamma-doppler-emerald',
  'lore',
  'lore-gold',
  'night',
]);
const limitedKnifeSkinKeys = new Set(['vanilla', 'blue-steel', 'boreal-forest', 'case-hardened', 'crimson-web', 'fade', 'forest-ddpat', 'night-stripe', 'safari-mesh', 'scorched', 'slaughter', 'stained', 'urban-masked']);

export function knifeSkinAvailableFor(knife: KnifeCard, skin: KnifeSkin): boolean {
  if (limitedKnifeKeys.has(knife.key)) return limitedKnifeSkinKeys.has(skin.key);
  if (legacyKnifeKeys.has(knife.key)) return skin.key !== 'night-stripe';
  return !legacyOnlyKnifeSkinKeys.has(skin.key);
}

export function knifeSkinPoolFor(knife: KnifeCard): KnifeSkin[] {
  const pool = knifeSkins.filter((skin) => knifeSkinAvailableFor(knife, skin));
  return pool.length > 0 ? pool : knifeSkins;
}

export const dailyCharacters: DailyCharacter[] = [
  { key: 'tomori', title: '每日木柜子', name: '高松灯 / Takamatsu Tomori', band: 'MyGO!!!!!', role: 'Vocal', voice: '羊宫妃那', note: '今天是灯签，慢热但真诚，别把话说太满。', page: 'Takamatsu Tomori', aliases: ['Tomori', 'Takamatsu Tomori', '高松燈', '灯'], era: 'MyGO!!!!! / CRYCHIC', imageMood: '蓝色舞台、独白、星空感卡面' },
  { key: 'anon', title: '每日木柜子', name: '千早爱音 / Chihaya Anon', band: 'MyGO!!!!!', role: 'Guitar', voice: '立石凛', note: '今天是爱音签，社交能量有了，但别把自己安排太满。', page: 'Chihaya Anon', aliases: ['Anon', 'Chihaya Anon', '千早愛音', '爱音'], era: 'MyGO!!!!!', imageMood: '粉色、自拍感、轻快日常卡面' },
  { key: 'rana', title: '每日木柜子', name: '要乐奈 / Kaname Rana', band: 'MyGO!!!!!', role: 'Guitar', voice: '青木阳菜', note: '今天是乐奈签，自由发挥可以，但别突然消失。', page: 'Kaname Raana', aliases: ['Raana', 'Rana', 'Kaname Raana', 'Kaname Rana', '要楽奈', '乐奈'], era: 'MyGO!!!!!', imageMood: '猫、绿色、随性演奏卡面' },
  { key: 'soyo', title: '每日木柜子', name: '长崎爽世 / Nagasaki Soyo', band: 'MyGO!!!!!', role: 'Bass', voice: '小日向美香', note: '今天是爽世签，温柔可以，别把心事全憋成战术。', page: 'Nagasaki Soyo', aliases: ['Soyo', 'Nagasaki Soyo', '長崎そよ', '爽世'], era: 'MyGO!!!!! / CRYCHIC', imageMood: '柔光、贝斯、微笑但有距离感卡面' },
  { key: 'taki', title: '每日木柜子', name: '椎名立希 / Shiina Taki', band: 'MyGO!!!!!', role: 'Drums', voice: '林鼓子', note: '今天是立希签，嘴硬归嘴硬，节奏要稳。', page: 'Shiina Taki', aliases: ['Taki', 'Shiina Taki', '椎名立希', '立希'], era: 'MyGO!!!!! / CRYCHIC', imageMood: '鼓、冷色灯、认真表情卡面' },
  { key: 'uika', title: '每日木柜子', name: '三角初华 / Misumi Uika', band: 'Ave Mujica', role: 'Doloris / Guitar & Vocal', voice: '佐佐木李子', note: '今天是初华签，舞台感拉满，但别把真实心情全藏起来。', page: 'Misumi Uika', aliases: ['Uika', 'Misumi Uika', 'Doloris', '初华', '初華'], era: 'Ave Mujica / Sumimi', imageMood: '聚光灯、面具、华丽暗色卡面' },
  { key: 'mutsumi', title: '每日木柜子', name: '若叶睦 / Wakaba Mutsumi', band: 'Ave Mujica', role: 'Mortis / Guitar', voice: '渡濑结月', note: '今天是睦签，安静不是没想法，别急着替她下结论。', page: 'Wakaba Mutsumi', aliases: ['Mutsumi', 'Wakaba Mutsumi', 'Mortis', '若葉睦', '睦'], era: 'Ave Mujica / CRYCHIC', imageMood: '绿色、沉默、暗场吉他卡面' },
  { key: 'umiri', title: '每日木柜子', name: '八幡海铃 / Yahata Umiri', band: 'Ave Mujica', role: 'Timoris / Bass', voice: '冈田梦以', note: '今天是海铃签，可靠但有距离感，做事别拖。', page: 'Yahata Umiri', aliases: ['Umiri', 'Yahata Umiri', 'Timoris', '八幡海鈴', '海铃'], era: 'Ave Mujica', imageMood: '蓝黑、贝斯、冷静站姿卡面' },
  { key: 'nyamu', title: '每日木柜子', name: '祐天寺若麦 / Yutenji Nyamu', band: 'Ave Mujica', role: 'Amoris / Drums', voice: '米泽茜', note: '今天是若麦签，镜头感很强，但别只顾节目效果。', page: 'Yuutenji Nyamu', aliases: ['Nyamu', 'Yutenji Nyamu', 'Yuutenji Nyamu', 'Amoris', '祐天寺にゃむ', '若麦'], era: 'Ave Mujica', imageMood: '镜头、紫粉、鼓手偶像感卡面' },
  { key: 'sakiko', title: '每日木柜子', name: '丰川祥子 / Togawa Sakiko', band: 'Ave Mujica', role: 'Oblivionis / Keyboard', voice: '高尾奏音', note: '今天是祥子签，计划感很强，但别把自己逼太紧。', page: 'Togawa Sakiko', aliases: ['Sakiko', 'Togawa Sakiko', 'Oblivionis', '豊川祥子', '祥子'], era: 'Ave Mujica / CRYCHIC', imageMood: '键盘、金色、剧场感卡面' },
];

function keyFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const genshinCharacterNames = [
  'Traveler', 'Albedo', 'Alhaitham', 'Aino', 'Aloy', 'Amber', 'Arataki Itto', 'Arlecchino', 'Baizhu', 'Barbara', 'Beidou',
  'Bennett', 'Candace', 'Charlotte', 'Chasca', 'Chevreuse', 'Chiori', 'Chongyun', 'Citlali', 'Clorinde', 'Collei',
  'Columbina', 'Cyno', 'Dahlia', 'Dehya', 'Diluc', 'Diona', 'Dori', 'Durin', 'Emilie', 'Escoffier', 'Eula', 'Faruzan', 'Fischl',
  'Flins', 'Freminet', 'Furina', 'Gaming', 'Ganyu', 'Gorou', 'Hu Tao', 'Iansan', 'Ifa', 'Illuga', 'Ineffa', 'Jahoda', 'Jean', 'Kachina',
  'Kaedehara Kazuha', 'Kaeya', 'Kamisato Ayaka', 'Kamisato Ayato', 'Kaveh', 'Keqing', 'Kinich', 'Kirara', 'Klee', 'Kujou Sara',
  'Kuki Shinobu', 'Lan Yan', 'Lauma', 'Layla', 'Linnea', 'Lisa', 'Lohen', 'Lynette', 'Lyney', 'Mavuika', 'Mika', 'Mona', 'Mualani',
  'Nahida', 'Navia', 'Nefer', 'Neuvillette', 'Nicole', 'Nilou', 'Ningguang', 'Noelle', 'Ororon', 'Prune', 'Qiqi', 'Raiden Shogun', 'Razor',
  'Rosaria', 'Sangonomiya Kokomi', 'Sayu', 'Sethos', 'Shenhe', 'Shikanoin Heizou', 'Sigewinne', 'Skirk', 'Sucrose', 'Tartaglia',
  'Thoma', 'Tighnari', 'Varesa', 'Varka', 'Venti', 'Wanderer', 'Wonderland Manekin', 'Wriothesley', 'Xiangling', 'Xianyun', 'Xiao', 'Xilonen',
  'Xingqiu', 'Xinyan', 'Yae Miko', 'Yanfei', 'Yaoyao', 'Yelan', 'Yoimiya', 'Yumemizuki Mizuki', 'Yun Jin', 'Zhongli', 'Zibai',
];

const genshinNotes = [
  '今天适合慢慢攒资源，别一口气把树脂和摩拉都花空。',
  '今天适合补一个长期队伍短板，圣遗物别上头。',
  '今天适合做探索和收集，路线比蛮跑更重要。',
  '今天适合把天赋、武器、等级这种硬提升补一补。',
  '今天适合换个配队思路，别只盯着同一套循环。',
  '今天适合清任务和图鉴，细碎进度也算进度。',
  '今天适合打深渊前先热手，别第一间就交学费。',
  '今天适合留一点材料余量，未来的你会感谢今天的你。',
];

const genshinTags = ['探索签', '养成签', '配队签', '剧情签', '深渊签', '收集签', '材料签', '手感签'];

const genshinCharacterProfiles: Record<string, Partial<DailyGenshinCharacter>> = {
  traveler: { cn: '旅行者', element: '多元素', region: '异世旅人', weapon: '单手剑', aliases: ['空', '荧', '主角', '爷'] },
  albedo: { cn: '阿贝多', element: '岩', region: '蒙德', weapon: '单手剑', aliases: ['白垩之子'] },
  alhaitham: { cn: '艾尔海森', element: '草', region: '须弥', weapon: '单手剑', aliases: ['海哥'] },
  amber: { cn: '安柏', element: '火', region: '蒙德', weapon: '弓', aliases: ['侦察骑士'] },
  'arataki-itto': { cn: '荒泷一斗', element: '岩', region: '稻妻', weapon: '双手剑', aliases: ['一斗', '荒泷天下第一斗'] },
  arlecchino: { cn: '阿蕾奇诺', element: '火', region: '至冬 / 枫丹', weapon: '长柄武器', aliases: ['仆人', '父亲'] },
  baizhu: { cn: '白术', element: '草', region: '璃月', weapon: '法器', aliases: ['白老板'] },
  barbara: { cn: '芭芭拉', element: '水', region: '蒙德', weapon: '法器', aliases: ['偶像牧师'] },
  beidou: { cn: '北斗', element: '雷', region: '璃月', weapon: '双手剑', aliases: ['大姐头'] },
  bennett: { cn: '班尼特', element: '火', region: '蒙德', weapon: '单手剑', aliases: ['班神', '点赞哥'] },
  candace: { cn: '坎蒂丝', element: '水', region: '须弥', weapon: '长柄武器', aliases: ['阿如村守护者'] },
  charlotte: { cn: '夏洛蒂', element: '冰', region: '枫丹', weapon: '法器', aliases: ['记者'] },
  chasca: { cn: '恰斯卡', element: '风', region: '纳塔', weapon: '弓', aliases: ['调停人'] },
  chevreuse: { cn: '夏沃蕾', element: '火', region: '枫丹', weapon: '长柄武器', aliases: ['特巡队队长'] },
  chiori: { cn: '千织', element: '岩', region: '稻妻 / 枫丹', weapon: '单手剑', aliases: ['千织屋'] },
  chongyun: { cn: '重云', element: '冰', region: '璃月', weapon: '双手剑', aliases: ['方士'] },
  citlali: { cn: '茜特菈莉', element: '冰', region: '纳塔', weapon: '法器', aliases: ['奶奶', '黑曜石奶奶'] },
  clorinde: { cn: '克洛琳德', element: '雷', region: '枫丹', weapon: '单手剑', aliases: ['决斗代理人'] },
  collei: { cn: '柯莱', element: '草', region: '须弥', weapon: '弓', aliases: ['见习巡林员'] },
  cyno: { cn: '赛诺', element: '雷', region: '须弥', weapon: '长柄武器', aliases: ['大风纪官'] },
  dehya: { cn: '迪希雅', element: '火', region: '须弥', weapon: '双手剑', aliases: ['炽鬃之狮'] },
  diluc: { cn: '迪卢克', element: '火', region: '蒙德', weapon: '双手剑', aliases: ['卢姥爷', '暗夜英雄'] },
  diona: { cn: '迪奥娜', element: '冰', region: '蒙德', weapon: '弓', aliases: ['调酒师'] },
  dori: { cn: '多莉', element: '雷', region: '须弥', weapon: '双手剑', aliases: ['桑歌玛哈巴依老爷'] },
  emilie: { cn: '艾梅莉埃', element: '草', region: '枫丹', weapon: '长柄武器', aliases: ['调香师'] },
  escoffier: { cn: '爱可菲', element: '冰', region: '枫丹', weapon: '长柄武器', aliases: ['料理人'] },
  eula: { cn: '优菈', element: '冰', region: '蒙德', weapon: '双手剑', aliases: ['浪花骑士'] },
  faruzan: { cn: '珐露珊', element: '风', region: '须弥', weapon: '弓', aliases: ['前辈'] },
  fischl: { cn: '菲谢尔', element: '雷', region: '蒙德', weapon: '弓', aliases: ['皇女', '断罪皇女'] },
  freminet: { cn: '菲米尼', element: '冰', region: '枫丹', weapon: '双手剑', aliases: ['潜水员'] },
  furina: { cn: '芙宁娜', element: '水', region: '枫丹', weapon: '单手剑', aliases: ['水神', '芙芙'] },
  gaming: { cn: '嘉明', element: '火', region: '璃月', weapon: '双手剑', aliases: ['舞兽少年'] },
  ganyu: { cn: '甘雨', element: '冰', region: '璃月', weapon: '弓', aliases: ['椰羊'] },
  gorou: { cn: '五郎', element: '岩', region: '稻妻', weapon: '弓', aliases: ['大将'] },
  'hu-tao': { cn: '胡桃', element: '火', region: '璃月', weapon: '长柄武器', aliases: ['堂主'] },
  iansan: { cn: '伊安珊', element: '雷', region: '纳塔', weapon: '长柄武器', aliases: ['健身教练'] },
  ifa: { cn: '伊法', element: '风', region: '纳塔', weapon: '法器', aliases: ['兽医'] },
  jean: { cn: '琴', element: '风', region: '蒙德', weapon: '单手剑', aliases: ['代理团长'] },
  kachina: { cn: '卡齐娜', element: '岩', region: '纳塔', weapon: '长柄武器', aliases: ['小卡'] },
  'kaedehara-kazuha': { cn: '枫原万叶', element: '风', region: '稻妻', weapon: '单手剑', aliases: ['万叶'] },
  kaeya: { cn: '凯亚', element: '冰', region: '蒙德', weapon: '单手剑', aliases: ['骑兵队长'] },
  'kamisato-ayaka': { cn: '神里绫华', element: '冰', region: '稻妻', weapon: '单手剑', aliases: ['绫华', '大小姐'] },
  'kamisato-ayato': { cn: '神里绫人', element: '水', region: '稻妻', weapon: '单手剑', aliases: ['绫人', '家主'] },
  kaveh: { cn: '卡维', element: '草', region: '须弥', weapon: '双手剑', aliases: ['建筑师'] },
  keqing: { cn: '刻晴', element: '雷', region: '璃月', weapon: '单手剑', aliases: ['玉衡星'] },
  kinich: { cn: '基尼奇', element: '草', region: '纳塔', weapon: '双手剑', aliases: ['猎龙人'] },
  kirara: { cn: '绮良良', element: '草', region: '稻妻', weapon: '单手剑', aliases: ['快递员'] },
  klee: { cn: '可莉', element: '火', region: '蒙德', weapon: '法器', aliases: ['火花骑士'] },
  'kujou-sara': { cn: '九条裟罗', element: '雷', region: '稻妻', weapon: '弓', aliases: ['天狗大将'] },
  'kuki-shinobu': { cn: '久岐忍', element: '雷', region: '稻妻', weapon: '单手剑', aliases: ['阿忍'] },
  'lan-yan': { cn: '蓝砚', element: '风', region: '璃月', weapon: '法器', aliases: ['藤人'] },
  layla: { cn: '莱依拉', element: '冰', region: '须弥', weapon: '单手剑', aliases: ['熬夜学生'] },
  lisa: { cn: '丽莎', element: '雷', region: '蒙德', weapon: '法器', aliases: ['图书管理员'] },
  lynette: { cn: '琳妮特', element: '风', region: '枫丹', weapon: '单手剑', aliases: ['助手'] },
  lyney: { cn: '林尼', element: '火', region: '枫丹', weapon: '弓', aliases: ['魔术师'] },
  mavuika: { cn: '玛薇卡', element: '火', region: '纳塔', weapon: '双手剑', aliases: ['火神'] },
  mika: { cn: '米卡', element: '冰', region: '蒙德', weapon: '长柄武器', aliases: ['测绘员'] },
  mona: { cn: '莫娜', element: '水', region: '蒙德', weapon: '法器', aliases: ['占星术士'] },
  mualani: { cn: '玛拉妮', element: '水', region: '纳塔', weapon: '法器', aliases: ['冲浪', '鲨鱼妹'] },
  nahida: { cn: '纳西妲', element: '草', region: '须弥', weapon: '法器', aliases: ['草神', '小吉祥草王'] },
  navia: { cn: '娜维娅', element: '岩', region: '枫丹', weapon: '双手剑', aliases: ['刺玫会会长'] },
  neuvillette: { cn: '那维莱特', element: '水', region: '枫丹', weapon: '法器', aliases: ['龙王', '审判官'] },
  nilou: { cn: '妮露', element: '水', region: '须弥', weapon: '单手剑', aliases: ['舞者'] },
  ningguang: { cn: '凝光', element: '岩', region: '璃月', weapon: '法器', aliases: ['天权星'] },
  noelle: { cn: '诺艾尔', element: '岩', region: '蒙德', weapon: '双手剑', aliases: ['女仆'] },
  ororon: { cn: '欧洛伦', element: '雷', region: '纳塔', weapon: '弓', aliases: ['烟谜主'] },
  qiqi: { cn: '七七', element: '冰', region: '璃月', weapon: '单手剑', aliases: ['小僵尸'] },
  'raiden-shogun': { cn: '雷电将军', element: '雷', region: '稻妻', weapon: '长柄武器', aliases: ['影', '雷神'] },
  razor: { cn: '雷泽', element: '雷', region: '蒙德', weapon: '双手剑', aliases: ['狼少年'] },
  rosaria: { cn: '罗莎莉亚', element: '冰', region: '蒙德', weapon: '长柄武器', aliases: ['修女'] },
  'sangonomiya-kokomi': { cn: '珊瑚宫心海', element: '水', region: '稻妻', weapon: '法器', aliases: ['心海', '军师'] },
  sayu: { cn: '早柚', element: '风', region: '稻妻', weapon: '双手剑', aliases: ['终末番忍者'] },
  sethos: { cn: '赛索斯', element: '雷', region: '须弥', weapon: '弓', aliases: ['缄默之殿'] },
  shenhe: { cn: '申鹤', element: '冰', region: '璃月', weapon: '长柄武器', aliases: ['仙家弟子'] },
  'shikanoin-heizou': { cn: '鹿野院平藏', element: '风', region: '稻妻', weapon: '法器', aliases: ['侦探'] },
  sigewinne: { cn: '希格雯', element: '水', region: '枫丹', weapon: '弓', aliases: ['护士长'] },
  skirk: { cn: '丝柯克', element: '冰', region: '深渊 / 至冬', weapon: '单手剑', aliases: ['师父'] },
  sucrose: { cn: '砂糖', element: '风', region: '蒙德', weapon: '法器', aliases: ['炼金术士'] },
  tartaglia: { cn: '达达利亚', element: '水', region: '至冬', weapon: '弓', aliases: ['公子', '鸭鸭'] },
  thoma: { cn: '托马', element: '火', region: '稻妻', weapon: '长柄武器', aliases: ['家政官'] },
  tighnari: { cn: '提纳里', element: '草', region: '须弥', weapon: '弓', aliases: ['巡林官'] },
  varesa: { cn: '瓦雷莎', element: '雷', region: '纳塔', weapon: '法器', aliases: ['角逐火山'] },
  varka: { cn: '法尔伽', element: '未知', region: '蒙德', weapon: '未知', aliases: ['大团长'] },
  venti: { cn: '温迪', element: '风', region: '蒙德', weapon: '弓', aliases: ['风神', '巴巴托斯'] },
  wanderer: { cn: '流浪者', element: '风', region: '须弥 / 稻妻', weapon: '法器', aliases: ['散兵', '阿帽'] },
  wriothesley: { cn: '莱欧斯利', element: '冰', region: '枫丹', weapon: '法器', aliases: ['公爵'] },
  xiangling: { cn: '香菱', element: '火', region: '璃月', weapon: '长柄武器', aliases: ['万民堂厨师'] },
  xianyun: { cn: '闲云', element: '风', region: '璃月', weapon: '法器', aliases: ['留云借风真君', '鸟'] },
  xiao: { cn: '魈', element: '风', region: '璃月', weapon: '长柄武器', aliases: ['降魔大圣'] },
  xilonen: { cn: '希诺宁', element: '岩', region: '纳塔', weapon: '单手剑', aliases: ['锻名师'] },
  xingqiu: { cn: '行秋', element: '水', region: '璃月', weapon: '单手剑', aliases: ['古华派'] },
  xinyan: { cn: '辛焱', element: '火', region: '璃月', weapon: '双手剑', aliases: ['摇滚'] },
  'yae-miko': { cn: '八重神子', element: '雷', region: '稻妻', weapon: '法器', aliases: ['神子', '狐狸'] },
  yanfei: { cn: '烟绯', element: '火', region: '璃月', weapon: '法器', aliases: ['律法咨询师'] },
  yaoyao: { cn: '瑶瑶', element: '草', region: '璃月', weapon: '长柄武器', aliases: ['月桂'] },
  yelan: { cn: '夜兰', element: '水', region: '璃月', weapon: '弓', aliases: ['兰姐'] },
  yoimiya: { cn: '宵宫', element: '火', region: '稻妻', weapon: '弓', aliases: ['烟花店长'] },
  'yumemizuki-mizuki': { cn: '梦见月瑞希', element: '风', region: '稻妻', weapon: '法器', aliases: ['瑞希'] },
  'yun-jin': { cn: '云堇', element: '岩', region: '璃月', weapon: '长柄武器', aliases: ['云先生'] },
  zhongli: { cn: '钟离', element: '岩', region: '璃月', weapon: '长柄武器', aliases: ['岩王爷', '摩拉克斯'] },
};

export const dailyGenshinCharacters: DailyGenshinCharacter[] = genshinCharacterNames.map((name, index) => {
  const key = keyFromName(name);
  const profile = genshinCharacterProfiles[key] || {};
  return {
    key,
    title: '每日原神角色',
    name,
    page: name,
    note: genshinNotes[index % genshinNotes.length],
    tag: genshinTags[index % genshinTags.length],
    ...profile,
  };
});

export const dailyFacts: DailyTextCard[] = [
  { key: 'octopus-heart', title: '每日冷知识', name: '章鱼有三颗心', subtitle: '生物 / 海洋', body: '两颗心负责把血送到鳃，一颗负责把血送到全身；游泳时全身那颗会短暂停工。', advice: '今天遇到复杂系统，先分清每个部件在干什么。', line: '冷知识的重点不是怪，是结构真的很会分工。', scoreLabel: '新鲜度' },
  { key: 'honey-stable', title: '每日冷知识', name: '蜂蜜很难变质', subtitle: '食物 / 化学', body: '低含水量、高糖和酸性环境让多数微生物难以生长，所以考古样本里的蜂蜜常能保存很久。', advice: '今天做东西也一样，环境条件对了，稳定性会自己长出来。', line: '甜不是重点，重点是微生物住不舒服。', scoreLabel: '新鲜度' },
  { key: 'banana-berry', title: '每日冷知识', name: '香蕉在植物学里算浆果', subtitle: '植物 / 分类', body: '植物学分类看果实结构，不看日常叫法；香蕉符合浆果的一些结构标准。', advice: '今天别被名字骗了，先看定义。', line: '生活常识和学科定义，偶尔会互相拆台。', scoreLabel: '新鲜度' },
  { key: 'strawberry-not-berry', title: '每日冷知识', name: '草莓反而不算真正浆果', subtitle: '植物 / 分类', body: '草莓表面的“小籽”才是一个个小果，红色部分更像膨大的花托。', advice: '今天看热闹前先看结构，别只看表面红不红。', line: '草莓：我只是长得很像答案。', scoreLabel: '新鲜度' },
  { key: 'venus-day', title: '每日冷知识', name: '金星的一天比一年还长', subtitle: '天文 / 行星', body: '金星自转很慢，绕太阳一圈反而更快，所以它的恒星日长过公转周期。', advice: '今天别只看速度，方向和尺度更要命。', line: '慢到极致，日历都开始拧巴。', scoreLabel: '新鲜度' },
  { key: 'shark-old', title: '每日冷知识', name: '鲨鱼比树更古老', subtitle: '演化 / 时间尺度', body: '鲨鱼类群出现得非常早，比现代意义上大规模森林扩张还早。', advice: '今天遇到老东西，先尊重它的版本历史。', line: '它不是复古，它是一直没下线。', scoreLabel: '新鲜度' },
  { key: 'water-hot-freeze', title: '每日冷知识', name: '热水有时会比冷水先结冰', subtitle: '物理 / 姆潘巴效应', body: '在特定条件下，蒸发、对流和容器影响会让热水先结冰，但这不是随便都成立的魔法。', advice: '今天别把例外当万能规律，条件要写清。', line: '物理最会说：看情况。', scoreLabel: '新鲜度' },
  { key: 'cloud-weight', title: '每日冷知识', name: '云可以很重', subtitle: '气象 / 水滴', body: '一朵积云里有大量微小水滴，总质量可能达到数十万公斤，只是分布得足够稀。', advice: '今天别低估“分散的小东西”，堆起来也很可怕。', line: '看着轻，是因为摊得开。', scoreLabel: '新鲜度' },
  { key: 'wombat-cube', title: '每日冷知识', name: '袋熊会排出近似方形的便便', subtitle: '动物 / 结构', body: '肠道弹性和收缩差异会把内容物塑成近似立方形，方便它们标记领地时不乱滚。', advice: '今天奇怪的问题可能有很现实的用途。', line: '自然界的设计感，有时非常朴素。', scoreLabel: '新鲜度' },
  { key: 'library-smell', title: '每日冷知识', name: '旧书味来自纸张老化', subtitle: '材料 / 气味', body: '纸张里的木质素和纤维素分解会释放多种挥发物，混在一起就是熟悉的旧书气味。', advice: '今天怀旧可以，但也要知道它背后的化学。', line: '书香有时是真的分子在说话。', scoreLabel: '新鲜度' },
  { key: 'alphabet-order', title: '每日冷知识', name: '字母顺序非常古老', subtitle: '文字 / 传承', body: '许多字母系统的排序能追溯到更早的闪米特文字传统，顺序比很多语言本身还耐活。', advice: '今天别小看约定俗成，它可能比你想的更有历史。', line: 'A 在前面，不只是因为它爱卷。', scoreLabel: '新鲜度' },
  { key: 'cleopatra-pyramid', title: '每日冷知识', name: '埃及艳后离登月更近', subtitle: '历史 / 时间感', body: '克娄巴特拉生活的年代距离现代登月，比距离胡夫金字塔建成更近。', advice: '今天看历史别只凭“古埃及”三个字打包。', line: '时间轴一拉开，直觉经常输。', scoreLabel: '新鲜度' },
  { key: 'roman-concrete', title: '每日冷知识', name: '古罗马混凝土很耐久', subtitle: '材料 / 建筑', body: '火山灰和石灰等成分让部分古罗马混凝土在海水环境里形成稳定矿物，越泡越结实。', advice: '今天做底层结构，材料选对比后期补救强。', line: '真正的老工程，靠配方说话。', scoreLabel: '新鲜度' },
  { key: 'map-projection', title: '每日冷知识', name: '世界地图会变形', subtitle: '地理 / 投影', body: '把球面铺到平面必然变形，常见地图会放大高纬地区。', advice: '今天看图先问投影，别把显示方式当现实。', line: '地图不是撒谎，它只是压不平地球。', scoreLabel: '新鲜度' },
  { key: 'coffee-bean', title: '每日冷知识', name: '咖啡豆其实是种子', subtitle: '植物 / 饮料', body: '日常说的咖啡豆来自咖啡果实内部的种子，烘焙后才变成熟悉的“豆”。', advice: '今天别被行业叫法骗了，名字常常很随意。', line: '豆不豆的，好喝就行，但它确实是种子。', scoreLabel: '新鲜度' },
  { key: 'glass-liquid', title: '每日冷知识', name: '玻璃不是普通液体', subtitle: '材料 / 非晶态', body: '老窗玻璃下厚上薄更多来自制造工艺，不是玻璃在室温下慢慢流下去。', advice: '今天听到经典说法，先查机制再转述。', line: '流言最喜欢穿科学外套。', scoreLabel: '新鲜度' },
  { key: 'sleep-clean', title: '每日冷知识', name: '睡眠会帮大脑清理代谢废物', subtitle: '神经科学 / 睡眠', body: '睡眠中脑脊液流动和胶质淋巴系统活动会增强，帮助清走一些代谢产物。', advice: '今天别硬熬，清缓存也是战斗力。', line: '困不是废，可能是在催你维护系统。', scoreLabel: '新鲜度' },
  { key: 'mushroom-network', title: '每日冷知识', name: '菌根网络会连接植物', subtitle: '生态 / 真菌', body: '真菌和植物根系共生，能在土壤里形成物质和信号交换网络。', advice: '今天别只看地面，真正的关系可能在底下。', line: '森林的群聊，不一定在树冠上。', scoreLabel: '新鲜度' },
  { key: 'paper-fold', title: '每日冷知识', name: '对折纸很快会变厚', subtitle: '数学 / 指数增长', body: '纸每对折一次厚度翻倍，指数增长会很快超过直觉。', advice: '今天别小看复利和累积，倍增最会吓人。', line: '薄纸的野心，比看起来大。', scoreLabel: '新鲜度' },
  { key: 'north-pole-move', title: '每日冷知识', name: '磁北极会移动', subtitle: '地球物理 / 磁场', body: '指南针指向的是磁北附近，而磁北极会随地球内部活动缓慢移动。', advice: '今天别把参照物当永恒，基准也会跑。', line: '连北都会动，人别太死板。', scoreLabel: '新鲜度' },
];

export const dailyBookExcerpts: DailyTextCard[] = [
  { key: 'analects-learning', title: '每日书摘', name: '《论语》', subtitle: '学而时习之', body: '学而时习之，不亦说乎。', advice: '今天挑一件小事反复练，别只收藏方法。', line: '复习不是重复，是给理解续命。', scoreLabel: '共鸣度' },
  { key: 'laozi-water', title: '每日书摘', name: '《道德经》', subtitle: '上善若水', body: '上善若水，水善利万物而不争。', advice: '今天能顺势就顺势，别每一步都硬顶。', line: '柔不是弱，是知道往哪流。', scoreLabel: '共鸣度' },
  { key: 'zhuangzi-free', title: '每日书摘', name: '《庄子》', subtitle: '逍遥游', body: '至人无己，神人无功，圣人无名。', advice: '今天少一点表演欲，多一点真松弛。', line: '不被评价牵着走，也是一种本事。', scoreLabel: '共鸣度' },
  { key: 'mencius-heart', title: '每日书摘', name: '《孟子》', subtitle: '尽心', body: '尽信书，则不如无书。', advice: '今天读东西要带脑子，别把文字当遥控器。', line: '好书也怕照单全收。', scoreLabel: '共鸣度' },
  { key: 'xunzi-step', title: '每日书摘', name: '《荀子》', subtitle: '劝学', body: '不积跬步，无以至千里。', advice: '今天做一点能累积的事，别嫌它小。', line: '千里路最怕第一步也想豪华。', scoreLabel: '共鸣度' },
  { key: 'sunzi-know', title: '每日书摘', name: '《孙子兵法》', subtitle: '谋攻', body: '知彼知己，百战不殆。', advice: '今天先收集信息，再下判断。', line: '莽之前先侦察。', scoreLabel: '共鸣度' },
  { key: 'caigentan-quiet', title: '每日书摘', name: '《菜根谭》', subtitle: '静中见真境', body: '静中静非真静，动处静得来，才是性天之真境。', advice: '今天练在杂事里稳住，不要只在安静时才安静。', line: '真正的稳，是吵的时候也不乱。', scoreLabel: '共鸣度' },
  { key: 'shishuo-snow', title: '每日书摘', name: '《世说新语》', subtitle: '咏雪', body: '未若柳絮因风起。', advice: '今天表达可以轻一点，画面感比解释更有力。', line: '好比喻一出来，空气都亮了。', scoreLabel: '共鸣度' },
  { key: 'dream-red', title: '每日书摘', name: '《红楼梦》', subtitle: '好了歌注', body: '乱哄哄你方唱罢我登场。', advice: '今天看热闹别太入戏，台上台下都会换人。', line: '人生舞台最稳定的部分，是换场。', scoreLabel: '共鸣度' },
  { key: 'journey-mountain', title: '每日书摘', name: '《西游记》', subtitle: '山高自有客行路', body: '山高自有客行路，水深自有渡船人。', advice: '今天遇到难题先找路径，别只盯着山高。', line: '路不是没有，是还没走到拐弯处。', scoreLabel: '共鸣度' },
  { key: 'water-margin', title: '每日书摘', name: '《水浒传》', subtitle: '世情', body: '人无千日好，花无百日红。', advice: '今天顺风也别飘，逆风也别把话说死。', line: '涨落是常态，心态别跟着过山车。', scoreLabel: '共鸣度' },
  { key: 'three-kingdoms', title: '每日书摘', name: '《三国演义》', subtitle: '开篇', body: '分久必合，合久必分。', advice: '今天看局势别只看当下，结构会自己找平衡。', line: '天下大势，最会提醒人别站太死。', scoreLabel: '共鸣度' },
  { key: 'fusheng', title: '每日书摘', name: '《浮生六记》', subtitle: '闲情', body: '情之所钟，虽丑不嫌。', advice: '今天珍惜自己的偏爱，它未必需要别人审核。', line: '审美有时就是偏心的证据。', scoreLabel: '共鸣度' },
  { key: 'xiaochuang', title: '每日书摘', name: '《小窗幽记》', subtitle: '醒句', body: '宠辱不惊，看庭前花开花落。', advice: '今天别让一条消息决定全天心情。', line: '花开花落都很忙，你也不用一直紧绷。', scoreLabel: '共鸣度' },
  { key: 'renjian-cihua', title: '每日书摘', name: '《人间词话》', subtitle: '境界', body: '词以境界为最上。', advice: '今天做表达先有画面，再讲道理。', line: '境界一出来，句子就站住了。', scoreLabel: '共鸣度' },
  { key: 'letter-family', title: '每日书摘', name: '《曾国藩家书》', subtitle: '勤与恒', body: '天下古今之庸人，皆以一惰字致败。', advice: '今天少拖一个小任务，别让惰性滚雪球。', line: '勤不一定轰烈，但很克制。', scoreLabel: '共鸣度' },
  { key: 'tang-caizi', title: '每日书摘', name: '《唐才子传》', subtitle: '诗心', body: '诗者，志之所之也。', advice: '今天写一句真实的话，胜过憋十句漂亮话。', line: '表达先有心，修辞后面再说。', scoreLabel: '共鸣度' },
  { key: 'wenxin', title: '每日书摘', name: '《文心雕龙》', subtitle: '神思', body: '寂然凝虑，思接千载。', advice: '今天给自己十分钟安静，别让灵感一直被通知切断。', line: '好想法需要一点无人打扰的深水区。', scoreLabel: '共鸣度' },
  { key: 'guwen', title: '每日书摘', name: '《古文观止》', subtitle: '读文', body: '文章千古事，得失寸心知。', advice: '今天做输出别急着讨好所有人，先对得起自己的判断。', line: '写得好不好，心里常有第一裁判。', scoreLabel: '共鸣度' },
  { key: 'mingxian', title: '每日书摘', name: '《名贤集》', subtitle: '惜时', body: '一寸光阴一寸金。', advice: '今天把最清醒的一小时留给最重要的事。', line: '时间不吵，但它很会结账。', scoreLabel: '共鸣度' },
];

export const dailyPoems: DailyTextCard[] = [
  { key: 'li-bai-night', title: '每日古诗词', name: '李白《静夜思》', subtitle: '唐诗 / 思乡', body: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', advice: '今天给远处的人发句话，别只在心里想。', line: '月光最会把距离照出来。', scoreLabel: '诗意值' },
  { key: 'du-fu-spring', title: '每日古诗词', name: '杜甫《春望》', subtitle: '唐诗 / 家国', body: '国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。', advice: '今天看见细小变化，也别忘了它背后的重量。', line: '草木很轻，时代很重。', scoreLabel: '诗意值' },
  { key: 'wang-wei-bird', title: '每日古诗词', name: '王维《鸟鸣涧》', subtitle: '唐诗 / 山水', body: '人闲桂花落，夜静春山空。月出惊山鸟，时鸣春涧中。', advice: '今天留一点安静给自己，别把空白全填满。', line: '静下来，声音反而更清楚。', scoreLabel: '诗意值' },
  { key: 'meng-spring', title: '每日古诗词', name: '孟浩然《春晓》', subtitle: '唐诗 / 春日', body: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', advice: '今天别急着赶路，先看看昨夜留下了什么。', line: '春天最会轻轻提醒人。', scoreLabel: '诗意值' },
  { key: 'liu-willow', title: '每日古诗词', name: '贺知章《咏柳》', subtitle: '唐诗 / 春景', body: '碧玉妆成一树高，万条垂下绿丝绦。', advice: '今天适合修整外在，也适合整理心情。', line: '新绿一出来，世界就有了发型。', scoreLabel: '诗意值' },
  { key: 'wang-lushan', title: '每日古诗词', name: '李白《望庐山瀑布》', subtitle: '唐诗 / 壮景', body: '飞流直下三千尺，疑是银河落九天。', advice: '今天给目标留一点想象力，别把自己算太小。', line: '夸张用得好，世界会变高。', scoreLabel: '诗意值' },
  { key: 'wang-bo', title: '每日古诗词', name: '王勃《送杜少府之任蜀州》', subtitle: '唐诗 / 送别', body: '海内存知己，天涯若比邻。', advice: '今天别怕距离，真正的关系不只靠定位。', line: '远不远，有时看心有没有在线。', scoreLabel: '诗意值' },
  { key: 'gao-shi', title: '每日古诗词', name: '高适《别董大》', subtitle: '唐诗 / 赠别', body: '莫愁前路无知己，天下谁人不识君。', advice: '今天给自己一点底气，别把未知都想成坏消息。', line: '离别也可以很有劲。', scoreLabel: '诗意值' },
  { key: 'bai-juyi-grass', title: '每日古诗词', name: '白居易《赋得古原草送别》', subtitle: '唐诗 / 离别', body: '野火烧不尽，春风吹又生。', advice: '今天允许自己重来，生命力不靠一次胜负定义。', line: '草最懂复盘。', scoreLabel: '诗意值' },
  { key: 'li-shangyin-rain', title: '每日古诗词', name: '李商隐《夜雨寄北》', subtitle: '唐诗 / 相思', body: '何当共剪西窗烛，却话巴山夜雨时。', advice: '今天把想见的人放进计划里，别只放进情绪里。', line: '夜雨很会替人攒话。', scoreLabel: '诗意值' },
  { key: 'du-mu-autumn', title: '每日古诗词', name: '杜牧《山行》', subtitle: '唐诗 / 秋色', body: '停车坐爱枫林晚，霜叶红于二月花。', advice: '今天慢一点，可能会看到赶路看不到的颜色。', line: '秋天不是结束，也可能是高光。', scoreLabel: '诗意值' },
  { key: 'wang-changling', title: '每日古诗词', name: '王昌龄《出塞》', subtitle: '唐诗 / 边塞', body: '秦时明月汉时关，万里长征人未还。', advice: '今天做难事要看长期，不要只看眼前一段路。', line: '边关的月亮，照的是很长的时间。', scoreLabel: '诗意值' },
  { key: 'cen-shen-snow', title: '每日古诗词', name: '岑参《白雪歌送武判官归京》', subtitle: '唐诗 / 边塞雪', body: '忽如一夜春风来，千树万树梨花开。', advice: '今天别急着给坏天气下结论，它可能换个样子很好看。', line: '雪一认真，也能开花。', scoreLabel: '诗意值' },
  { key: 'su-shi-moon', title: '每日古诗词', name: '苏轼《水调歌头》', subtitle: '宋词 / 中秋', body: '但愿人长久，千里共婵娟。', advice: '今天把祝愿说出口，别只藏在节日里。', line: '月亮最擅长做共享屏幕。', scoreLabel: '诗意值' },
  { key: 'su-shi-river', title: '每日古诗词', name: '苏轼《念奴娇》', subtitle: '宋词 / 怀古', body: '大江东去，浪淘尽，千古风流人物。', advice: '今天别被一时得失困住，时间会冲刷很多东西。', line: '江水一开口，人就小了。', scoreLabel: '诗意值' },
  { key: 'li-qingzhao', title: '每日古诗词', name: '李清照《如梦令》', subtitle: '宋词 / 春游', body: '争渡，争渡，惊起一滩鸥鹭。', advice: '今天可以有点冒失的快乐，但别忘了看路。', line: '热闹到惊起一滩，说明真的活过。', scoreLabel: '诗意值' },
  { key: 'xin-qiji', title: '每日古诗词', name: '辛弃疾《青玉案》', subtitle: '宋词 / 元夕', body: '众里寻他千百度，蓦然回首，那人却在灯火阑珊处。', advice: '今天别只往最亮的地方找答案。', line: '答案有时很低调，站在灯火边上。', scoreLabel: '诗意值' },
  { key: 'yue-fei', title: '每日古诗词', name: '岳飞《满江红》', subtitle: '宋词 / 壮怀', body: '莫等闲，白了少年头，空悲切。', advice: '今天别空耗，做一件能让明天少后悔的事。', line: '热血不是喊出来的，是别等闲。', scoreLabel: '诗意值' },
  { key: 'lu-you', title: '每日古诗词', name: '陆游《游山西村》', subtitle: '宋诗 / 柳暗花明', body: '山重水复疑无路，柳暗花明又一村。', advice: '今天卡住也别急，先多走两步看看。', line: '转机常常躲在弯后面。', scoreLabel: '诗意值' },
  { key: 'yang-wanli', title: '每日古诗词', name: '杨万里《小池》', subtitle: '宋诗 / 夏日', body: '小荷才露尖尖角，早有蜻蜓立上头。', advice: '今天保护刚冒头的小想法，别急着批评它。', line: '新东西刚露头，也值得被看见。', scoreLabel: '诗意值' },
];

dailyFacts.push(...extraDailyFactsA);
dailyPoems.push(...extraDailyPoemsA);

export const duelWeapons: DailyDuelWeapon[] = [
  { key: 'deagle', name: '沙鹰', style: '一发入魂', power: 92, tempo: 45, line: '准了封神，空了当场沉默。', fandomFile: 'CS2_Desert_Eagle_Inventory.png' },
  { key: 'awp', name: '大狙', style: '架点审判', power: 98, tempo: 32, line: '一枪一个道理，前提是别空。', fandomFile: 'CS2_AWP_Inventory.png' },
  { key: 'ak47', name: 'AK-47', style: '正面压制', power: 88, tempo: 72, line: '第一发稳住，后面才有故事。', fandomFile: 'CS2_AK-47_Inventory.png' },
  { key: 'm4a1s', name: 'M4A1-S', style: '消音偷人', power: 82, tempo: 68, line: '低调开枪，高调拿分。', fandomFile: 'CS2_M4A1-S_Inventory.png' },
  { key: 'glock', name: '格洛克', style: '近点抱团', power: 48, tempo: 85, line: '不贵，但很会把人冲乱。', fandomFile: 'CS2_Glock-18_Inventory.png' },
  { key: 'usp', name: 'USP-S', style: '手枪点头', power: 60, tempo: 58, line: '慢一点，第一发会说话。', fandomFile: 'CS2_USP-S_Inventory.png' },
  { key: 'flash', name: '闪光弹', style: '白屏武学', power: 70, tempo: 90, line: '不杀人，但能让对面忘了自己是谁。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'smoke', name: '烟雾弹', style: '切割战场', power: 58, tempo: 64, line: '看不见，也是一种压迫。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'zeus', name: '电击枪', style: '贴脸天雷', power: 95, tempo: 25, line: '距离到了就很不讲理。', fandomFile: 'CS2_Zeus_x27_Inventory.png' },
  { key: 'knife', name: '小刀', style: '精神羞辱', power: 100, tempo: 18, line: '赢了上嘴脸，输了上素材。', fandomFile: 'Cs2-knife-bayonet-stock-market.png' },
  { key: 'p90', name: 'P90', style: '横冲直撞', power: 62, tempo: 96, line: '不解释，先跑起来。', fandomFile: 'CS2_P90_Inventory.png' },
  { key: 'nova', name: 'Nova', style: '近点伏击', power: 76, tempo: 38, line: '距离对了就是答案。', fandomFile: 'CS2_Nova_Inventory.png' },
  { key: 'negev', name: '内格夫', style: '弹幕压制', power: 84, tempo: 30, line: '扫得很热闹，命中就更热闹。', fandomFile: 'CS2_Negev_Inventory.png' },
  { key: 'r8', name: '左轮', style: '慢热怪力', power: 90, tempo: 22, line: '枪声很大，责任也很大。', fandomFile: 'CS2_R8_Revolver_Inventory.png' },
  { key: 'folding-chair', name: '折凳', style: '江湖暗器', power: 73, tempo: 70, line: '朴素，但是很有画面。' },
  { key: 'keyboard', name: '机械键盘', style: '键气外放', power: 66, tempo: 88, line: '手速起来了，谁都别想说完整话。' },
  { key: 'thermos', name: '保温杯', style: '养生重击', power: 59, tempo: 40, line: '看着温和，砸下来很现实。' },
  { key: 'mouse', name: '鼠标', style: '微操决胜', power: 55, tempo: 94, line: 'DPI 一拉，气势先到。' },
  { key: 'baguette', name: '法棍', style: '长枪替身', power: 52, tempo: 62, line: '硬度和节目效果都在线。' },
  { key: 'slipper', name: '拖鞋', style: '家庭秘传', power: 80, tempo: 76, line: '出手很轻，威慑很重。' },
];

dailyFacts.push(
  { key: 'pencil-space', title: '每日冷知识', name: '铅笔不能在太空随便替代钢笔', subtitle: '航天 / 材料', body: '铅笔碎屑和石墨粉在失重环境里可能带来导电、吸入和漂浮污染风险，所以航天书写工具要考虑很多安全细节。', advice: '今天别把“简单替代”想得太简单，环境一变，风险也会变。', line: '不是铅笔不行，是太空不吃这一套。', scoreLabel: '新鲜度' },
  { key: 'blue-blood', title: '每日冷知识', name: '鲎的血液呈蓝色', subtitle: '生物 / 医学', body: '鲎血里含有以铜为核心的血蓝蛋白，遇氧后呈蓝色；相关试剂还曾被广泛用于检测细菌内毒素。', advice: '今天看见奇怪颜色，先问它背后的元素。', line: '蓝不是滤镜，是化学在营业。', scoreLabel: '新鲜度' },
  { key: 'rain-smell', title: '每日冷知识', name: '雨后土味有名字', subtitle: '气味 / 微生物', body: '雨后泥土气味常和土壤细菌产生的土臭素有关，雨滴把它带进空气里，人就闻到了“下雨味”。', advice: '今天别小看气味，它常常是环境的消息推送。', line: '雨味不是玄学，是土壤在发通知。', scoreLabel: '新鲜度' },
  { key: 'penguin-knees', title: '每日冷知识', name: '企鹅其实有膝盖', subtitle: '动物 / 骨骼', body: '企鹅短腿外观下藏着完整腿骨结构，膝关节被羽毛和身体轮廓遮住了。', advice: '今天别只看外形，结构可能藏得很深。', line: '看着没腿，不代表没有关节。', scoreLabel: '新鲜度' },
  { key: 'moon-leaving', title: '每日冷知识', name: '月球正在慢慢远离地球', subtitle: '天文 / 潮汐', body: '潮汐相互作用让月球平均每年远离地球约几厘米，尺度很小，但长期很有戏。', advice: '今天别忽略慢变量，它们最会改写长期结局。', line: '有些告别慢到像没发生，但一直在发生。', scoreLabel: '新鲜度' },
  { key: 'tongue-map', title: '每日冷知识', name: '舌头味觉地图并不准确', subtitle: '人体 / 味觉', body: '甜酸苦咸鲜不是严格分区感知，舌头很多区域都能感受多种味道。', advice: '今天遇到老图老说法，别急着当真。', line: '教材图有时也会被时代修正。', scoreLabel: '新鲜度' },
  { key: 'paper-cuts', title: '每日冷知识', name: '纸割伤格外疼', subtitle: '人体 / 材料', body: '纸边缘会造成浅而不整齐的切口，手指神经末梢密集，又常接触空气和水，所以疼得很有存在感。', advice: '今天别低估小伤害，细碎但持续的东西最烦。', line: '纸很薄，但它很会找痛点。', scoreLabel: '新鲜度' },
  { key: 'ants-sleep', title: '每日冷知识', name: '蚂蚁会短时多次休息', subtitle: '动物 / 行为', body: '一些蚂蚁会用大量短暂休息片段拼出睡眠，不像人类这样整块睡。', advice: '今天精力不够就拆小段恢复，不一定非要等大块空闲。', line: '碎片化休息，也是休息。', scoreLabel: '新鲜度' },
  { key: 'eiffel-summer', title: '每日冷知识', name: '埃菲尔铁塔会热胀冷缩', subtitle: '工程 / 材料', body: '金属受温度影响会膨胀收缩，埃菲尔铁塔高度会随季节和温度发生小幅变化。', advice: '今天别把测量结果看成绝对静止，环境会动手脚。', line: '钢铁也有热胀冷缩的小情绪。', scoreLabel: '新鲜度' },
  { key: 'sound-mars', title: '每日冷知识', name: '火星上的声音传播不一样', subtitle: '行星 / 声学', body: '火星大气稀薄且成分不同，声音传播速度、衰减和高低频表现都和地球不同。', advice: '今天换了环境，就别沿用旧耳朵。', line: '同一句话，到火星也会变味。', scoreLabel: '新鲜度' },
  { key: 'salt-salary', title: '每日冷知识', name: 'salary 与盐有历史关系', subtitle: '词源 / 文化', body: '英语 salary 常被认为和拉丁语 salarium 有关，背后连着盐在古代经济里的重要性。', advice: '今天看一个词，可以顺手翻出一段生活史。', line: '工资和盐，曾经离得很近。', scoreLabel: '新鲜度' },
  { key: 'mammoth-pyramid', title: '每日冷知识', name: '金字塔时代仍有猛犸象', subtitle: '历史 / 演化', body: '部分孤岛猛犸象存活到约四千年前，和埃及金字塔时期在时间上有重叠。', advice: '今天别把远古生物都塞进同一个“很久以前”。', line: '时间线一对齐，世界会突然很魔幻。', scoreLabel: '新鲜度' },
  { key: 'barcode-country', title: '每日冷知识', name: '条形码前三位不等于产地', subtitle: '商业 / 编码', body: '条形码前缀通常对应编码组织，不一定代表商品真实生产地。', advice: '今天看标签要看完整信息，别用一个数字下结论。', line: '编码不是户口本。', scoreLabel: '新鲜度' },
  { key: 'ice-clear', title: '每日冷知识', name: '透明冰和冻结方向有关', subtitle: '物理 / 生活', body: '家用冰块常因气泡和杂质被困住而发白，定向冻结能把气泡挤到一侧，冰就更透明。', advice: '今天想要结果干净，过程方向也要设计。', line: '清澈不是运气，是气泡被安排明白了。', scoreLabel: '新鲜度' },
  { key: 'spider-silk', title: '每日冷知识', name: '蜘蛛丝强韧但难量产', subtitle: '材料 / 生物', body: '蜘蛛丝性能优秀，但蜘蛛领地性强、产量和加工难度高，工业化复制一直不简单。', advice: '今天别只看材料参数，也要看生产系统。', line: '好东西不一定好量产。', scoreLabel: '新鲜度' },
  { key: 'earwax-types', title: '每日冷知识', name: '耳屎有干湿类型', subtitle: '遗传 / 人体', body: '耳垢干湿和 ABCC11 基因变体有关，不同人群分布差异明显。', advice: '今天别把身体小差异都当习惯问题，有些写在基因里。', line: '连耳垢都有遗传路线。', scoreLabel: '新鲜度' },
  { key: 'blue-sky', title: '每日冷知识', name: '天空蓝来自散射', subtitle: '物理 / 光', body: '大气分子更容易散射短波长蓝光，所以晴天天空常呈蓝色。', advice: '今天看见日常现象，别忘了它背后也有公式。', line: '蓝天不是背景板，是光在拐弯。', scoreLabel: '新鲜度' },
  { key: 'seed-vault', title: '每日冷知识', name: '世界上有种子库', subtitle: '农业 / 保存', body: '斯瓦尔巴全球种子库储存大量作物种子样本，用于保护农业遗传多样性。', advice: '今天做备份别嫌麻烦，未来最怕没有备用方案。', line: '真正的安全感，有时是一粒种子。', scoreLabel: '新鲜度' },
  { key: 'train-track', title: '每日冷知识', name: '铁轨之间要留伸缩缝', subtitle: '工程 / 热胀冷缩', body: '钢轨受温度变化会伸缩，工程上要通过缝隙、扣件和无缝线路设计处理热应力。', advice: '今天给系统留余量，别把所有东西卡死。', line: '不给伸缩空间，就等着变形。', scoreLabel: '新鲜度' },
  { key: 'soap-clean', title: '每日冷知识', name: '肥皂靠两亲结构清洁', subtitle: '化学 / 生活', body: '肥皂分子一头亲水一头亲油，能把油污包进胶束里带走。', advice: '今天解决矛盾，找一个能同时牵住两边的结构。', line: '会清洁，是因为它左右逢源。', scoreLabel: '新鲜度' },
);

dailyBookExcerpts.push(
  { key: 'shijing-deer', title: '每日书摘', name: '《诗经》', subtitle: '鹿鸣', body: '呦呦鹿鸣，食野之苹。', advice: '今天可以主动招呼朋友，别总等别人开口。', line: '好关系也需要一点邀请。', scoreLabel: '共鸣度' },
  { key: 'chuci-road', title: '每日书摘', name: '《楚辞》', subtitle: '离骚', body: '路漫漫其修远兮，吾将上下而求索。', advice: '今天别怕路长，先把下一步走实。', line: '求索不是鸡血，是长期动作。', scoreLabel: '共鸣度' },
  { key: 'shiji-life', title: '每日书摘', name: '《史记》', subtitle: '报任安书', body: '人固有一死，或重于泰山，或轻于鸿毛。', advice: '今天做判断时，想想什么值得认真。', line: '分量感，是选择给出来的。', scoreLabel: '共鸣度' },
  { key: 'han-shu', title: '每日书摘', name: '《汉书》', subtitle: '艺文志', body: '河出图，洛出书。', advice: '今天看知识体系，先找源头和脉络。', line: '传统里常藏着一张地图。', scoreLabel: '共鸣度' },
  { key: 'tao-peach', title: '每日书摘', name: '陶渊明《桃花源记》', subtitle: '忽逢桃花林', body: '芳草鲜美，落英缤纷。', advice: '今天给自己留一小段不被打扰的地方。', line: '桃花源不一定远，可能只是十分钟安静。', scoreLabel: '共鸣度' },
  { key: 'wang-xizhi', title: '每日书摘', name: '王羲之《兰亭集序》', subtitle: '俯仰之间', body: '仰观宇宙之大，俯察品类之盛。', advice: '今天把视角拉远一点，小烦恼会变小。', line: '一仰一俯，格局就换了。', scoreLabel: '共鸣度' },
  { key: 'han-yu', title: '每日书摘', name: '韩愈《师说》', subtitle: '闻道有先后', body: '闻道有先后，术业有专攻。', advice: '今天别拿自己短板硬比别人的长项。', line: '专业分工，不是认输。', scoreLabel: '共鸣度' },
  { key: 'liu-zongyuan', title: '每日书摘', name: '柳宗元《小石潭记》', subtitle: '清冽', body: '潭中鱼可百许头，皆若空游无所依。', advice: '今天看事物可以慢一点，细节会自己浮出来。', line: '透明感来自观察，不来自滤镜。', scoreLabel: '共鸣度' },
  { key: 'ouyang', title: '每日书摘', name: '欧阳修《醉翁亭记》', subtitle: '山水之乐', body: '醉翁之意不在酒，在乎山水之间也。', advice: '今天做事别只看表面目标，真正想要的也许在旁边。', line: '借酒说山水，高手。', scoreLabel: '共鸣度' },
  { key: 'fan-zhongyan', title: '每日书摘', name: '范仲淹《岳阳楼记》', subtitle: '忧乐', body: '先天下之忧而忧，后天下之乐而乐。', advice: '今天多承担一点，但别把自己耗空。', line: '大格局也需要好体力。', scoreLabel: '共鸣度' },
  { key: 'zhou-dunyi', title: '每日书摘', name: '周敦颐《爱莲说》', subtitle: '莲', body: '出淤泥而不染，濯清涟而不妖。', advice: '今天守住一点清爽，不必跟着环境变浑。', line: '干净不是脆弱，是有边界。', scoreLabel: '共鸣度' },
  { key: 'sima-guang', title: '每日书摘', name: '《资治通鉴》', subtitle: '鉴前世', body: '鉴前世之兴衰，考当今之得失。', advice: '今天做决定前，翻翻旧账不是坏事。', line: '历史不是答案库，是避坑图。', scoreLabel: '共鸣度' },
  { key: 'zhuzi', title: '每日书摘', name: '《朱子家训》', subtitle: '黎明即起', body: '黎明即起，洒扫庭除。', advice: '今天先整理环境，再整理心情。', line: '房间一清，脑子也少堵一点。', scoreLabel: '共鸣度' },
  { key: 'liaozhai', title: '每日书摘', name: '《聊斋志异》', subtitle: '异事', body: '有花有酒春常在，无烛无灯夜自明。', advice: '今天给生活留点奇气，别太平铺直叙。', line: '怪谈也懂浪漫。', scoreLabel: '共鸣度' },
  { key: 'rulin', title: '每日书摘', name: '《儒林外史》', subtitle: '世相', body: '功名富贵无凭据，费尽心情，总把流光误。', advice: '今天别为了虚名错过真实进度。', line: '最贵的是被误掉的流光。', scoreLabel: '共鸣度' },
  { key: 'jinghua', title: '每日书摘', name: '《镜花缘》', subtitle: '见闻', body: '学问无大小，能者为尊。', advice: '今天多向会的人学，少纠结资历排序。', line: '会就是会，很朴素。', scoreLabel: '共鸣度' },
  { key: 'sun-bin', title: '每日书摘', name: '《孙膑兵法》', subtitle: '势备', body: '胜不可一。', advice: '今天别指望一种方法打所有局。', line: '策略最怕一招鲜硬吃天下。', scoreLabel: '共鸣度' },
  { key: 'mozi', title: '每日书摘', name: '《墨子》', subtitle: '兼爱', body: '兼相爱，交相利。', advice: '今天合作先看互利结构，别只靠情绪推动。', line: '关系稳定，常常因为彼此都有得。', scoreLabel: '共鸣度' },
  { key: 'guanzi', title: '每日书摘', name: '《管子》', subtitle: '仓廪', body: '仓廪实而知礼节。', advice: '今天先补基础资源，很多状态问题会跟着好转。', line: '底盘稳了，体面才站得住。', scoreLabel: '共鸣度' },
  { key: 'yanzi', title: '每日书摘', name: '《晏子春秋》', subtitle: '橘枳', body: '橘生淮南则为橘，生于淮北则为枳。', advice: '今天别只怪个人，环境也会塑形。', line: '换个土壤，结果可能完全不同。', scoreLabel: '共鸣度' },
);

dailyPoems.push(
  { key: 'wang-zhihuan-tower', title: '每日古诗词', name: '王之涣《登鹳雀楼》', subtitle: '唐诗 / 登临', body: '欲穷千里目，更上一层楼。', advice: '今天想看远一点，就先把自己抬高一点。', line: '视野问题，有时是楼层问题。', scoreLabel: '诗意值' },
  { key: 'li-bai-baidi', title: '每日古诗词', name: '李白《早发白帝城》', subtitle: '唐诗 / 轻快', body: '两岸猿声啼不住，轻舟已过万重山。', advice: '今天顺起来就别回头怀疑，先过山。', line: '轻舟的爽感，是困难突然被甩在后面。', scoreLabel: '诗意值' },
  { key: 'du-fu-mountain', title: '每日古诗词', name: '杜甫《望岳》', subtitle: '唐诗 / 登高', body: '会当凌绝顶，一览众山小。', advice: '今天给自己一个高一点的目标，但脚下要实。', line: '豪气也要爬台阶。', scoreLabel: '诗意值' },
  { key: 'wang-wei-deer', title: '每日古诗词', name: '王维《鹿柴》', subtitle: '唐诗 / 空山', body: '空山不见人，但闻人语响。', advice: '今天别只看有没有人，听听回声里有什么。', line: '空，不等于没有内容。', scoreLabel: '诗意值' },
  { key: 'liu-yuxi-autumn', title: '每日古诗词', name: '刘禹锡《秋词》', subtitle: '唐诗 / 秋气', body: '晴空一鹤排云上，便引诗情到碧霄。', advice: '今天别把秋天当低落，抬头看看。', line: '一只鹤就能把情绪拉高。', scoreLabel: '诗意值' },
  { key: 'jia-dao', title: '每日古诗词', name: '贾岛《寻隐者不遇》', subtitle: '唐诗 / 寻访', body: '只在此山中，云深不知处。', advice: '今天找不到答案也别急，至少方向已经接近。', line: '云深不知处，也是一种线索。', scoreLabel: '诗意值' },
  { key: 'meng-haoran-old-friend', title: '每日古诗词', name: '孟浩然《过故人庄》', subtitle: '唐诗 / 田园', body: '待到重阳日，还来就菊花。', advice: '今天把“下次再聚”落实成真的日期。', line: '好友情需要下一次。', scoreLabel: '诗意值' },
  { key: 'zhang-ji', title: '每日古诗词', name: '张继《枫桥夜泊》', subtitle: '唐诗 / 夜泊', body: '姑苏城外寒山寺，夜半钟声到客船。', advice: '今天夜里别硬撑，听到钟声就收一收。', line: '夜半的声音最容易进心里。', scoreLabel: '诗意值' },
  { key: 'li-he', title: '每日古诗词', name: '李贺《雁门太守行》', subtitle: '唐诗 / 边塞', body: '黑云压城城欲摧，甲光向日金鳞开。', advice: '今天压力很重，也要把自己的亮面撑出来。', line: '黑云越厚，甲光越显眼。', scoreLabel: '诗意值' },
  { key: 'wen-tingyun', title: '每日古诗词', name: '温庭筠《商山早行》', subtitle: '唐诗 / 早行', body: '鸡声茅店月，人迹板桥霜。', advice: '今天早一点动身，路上的细节会多。', line: '清晨自带电影感。', scoreLabel: '诗意值' },
  { key: 'yan-shu', title: '每日古诗词', name: '晏殊《浣溪沙》', subtitle: '宋词 / 惜春', body: '无可奈何花落去，似曾相识燕归来。', advice: '今天接受一点失去，也等一点回来。', line: '生活很会一边落花一边归燕。', scoreLabel: '诗意值' },
  { key: 'qin-guan', title: '每日古诗词', name: '秦观《鹊桥仙》', subtitle: '宋词 / 相会', body: '两情若是久长时，又岂在朝朝暮暮。', advice: '今天别用频率替代质量。', line: '久长不是天天刷存在感。', scoreLabel: '诗意值' },
  { key: 'zhou-bangyan', title: '每日古诗词', name: '周邦彦《苏幕遮》', subtitle: '宋词 / 夏夜', body: '叶上初阳干宿雨，水面清圆，一一风荷举。', advice: '今天把昨夜的湿气晾一晾，再重新站起来。', line: '荷叶最懂清爽开局。', scoreLabel: '诗意值' },
  { key: 'jiang-kui', title: '每日古诗词', name: '姜夔《扬州慢》', subtitle: '宋词 / 怀古', body: '二十四桥仍在，波心荡，冷月无声。', advice: '今天路过旧地方，允许自己沉默一下。', line: '有些月亮冷，是因为它照过太多事。', scoreLabel: '诗意值' },
  { key: 'li-yu', title: '每日古诗词', name: '李煜《虞美人》', subtitle: '词 / 春花秋月', body: '问君能有几多愁，恰似一江春水向东流。', advice: '今天情绪很满就找出口，别堵在心里。', line: '愁一多，就会自己成河。', scoreLabel: '诗意值' },
  { key: 'yan-jidao', title: '每日古诗词', name: '晏几道《临江仙》', subtitle: '宋词 / 记梦', body: '落花人独立，微雨燕双飞。', advice: '今天适合安静一点，不必把孤独说得太大声。', line: '微雨很轻，但画面很重。', scoreLabel: '诗意值' },
  { key: 'lu-you-mei', title: '每日古诗词', name: '陆游《卜算子》', subtitle: '宋词 / 咏梅', body: '零落成泥碾作尘，只有香如故。', advice: '今天守住一点底色，别被环境磨没。', line: '真正的香气，落地也还在。', scoreLabel: '诗意值' },
  { key: 'xin-qiji-village', title: '每日古诗词', name: '辛弃疾《西江月》', subtitle: '宋词 / 夜行', body: '稻花香里说丰年，听取蛙声一片。', advice: '今天别只看结果，过程里的声音也很踏实。', line: '丰年有时先从蛙声里冒头。', scoreLabel: '诗意值' },
  { key: 'ma-zhiyuan', title: '每日古诗词', name: '马致远《天净沙》', subtitle: '元曲 / 秋思', body: '夕阳西下，断肠人在天涯。', advice: '今天想家就承认，不必假装很潇洒。', line: '天涯两个字，最会让人安静。', scoreLabel: '诗意值' },
  { key: 'yu-qian', title: '每日古诗词', name: '于谦《石灰吟》', subtitle: '明诗 / 气节', body: '粉骨碎身浑不怕，要留清白在人间。', advice: '今天守住原则，别为了省事把底线卖了。', line: '清白两个字，很硬。', scoreLabel: '诗意值' },
);

export const dailyMovieQuotes: DailyTextCard[] = [
  { key: 'ip-man-wing-chun', title: '今日影视台词', name: '《叶问》', subtitle: '动作 / 气节', body: '我要打十个。', advice: '今天自信可以，但先热身。', line: '这句话轻，但气场很重。', scoreLabel: '共鸣度' },
  { key: 'ne-zha-fate', title: '今日影视台词', name: '《哪吒之魔童降世》', subtitle: '动画 / 命运', body: '我命由我不由天。', advice: '今天被说不行，就多做一次试试。', line: '说这句话之前，得先炼三年丹。', scoreLabel: '共鸣度' },
  { key: 'wandering-earth', title: '今日影视台词', name: '《流浪地球》', subtitle: '科幻 / 希望', body: '无论最终结果如何，请记住，希望是我们回家的方向。', advice: '今天事情不顺也别断希望，方向先别丢。', line: '带着地球走，也是一种不放弃。', scoreLabel: '共鸣度' },
  { key: 'crazy-stone', title: '今日影视台词', name: '《疯狂的石头》', subtitle: '喜剧 / 命运', body: '别跟我谈钱，谈钱伤感情。', advice: '今天利益讲清楚反而不伤感情，前提是要讲。', line: '这句台词最能反客为主。', scoreLabel: '共鸣度' },
  { key: 'long-way-home', title: '今日影视台词', name: '《漫长的季节》', subtitle: '剧集 / 放下', body: '往前看，别回头。', advice: '今天允许自己结案，往前走。', line: '有些结局需要自己宣布。', scoreLabel: '共鸣度' },
  { key: 'hidden-blade', title: '今日影视台词', name: '《无名》', subtitle: '谍战 / 信念', body: '每一个人都有自己要守护的东西。', advice: '今天想清楚自己守的是什么，再决定用多大力气。', line: '守护的方向对了，消耗才有意义。', scoreLabel: '共鸣度' },
  { key: 'better-days', title: '今日影视台词', name: '《少年的你》', subtitle: '青春 / 守护', body: '你保护世界，我保护你。', advice: '今天看见需要帮助的人，别假装没看见。', line: '这句话轻，但扛着很重的东西。', scoreLabel: '共鸣度' },
  { key: 'detective-dee', title: '今日影视台词', name: '《大明王朝1566》', subtitle: '历史剧 / 清醒', body: '这世上没有救世主，有的只是不得不担的责任。', advice: '今天别等有人出来扛，自己先动一下。', line: '等救世主，经常等到天黑。', scoreLabel: '共鸣度' },
  { key: 'farewell-concubine', title: '今日影视台词', name: '《霸王别姬》', subtitle: '文艺 / 执着', body: '说的是一辈子，差一年、一个月、一天、一个时辰，都不算一辈子。', advice: '今天要承诺，就说实的，说不到就别说一辈子。', line: '一辈子的重量，在细节里。', scoreLabel: '共鸣度' },
  { key: 'red-cliff', title: '今日影视台词', name: '《赤壁》', subtitle: '历史 / 胆气', body: '万事俱备，只欠东风。', advice: '今天差的那阵风，可能只是你还没开口。', line: '东风不自来，得等人借。', scoreLabel: '共鸣度' },
  { key: 'my-people', title: '今日影视台词', name: '《我的团长我的团》', subtitle: '战争剧 / 信念', body: '没有人天生就能死得其所，死的时候找得到地方就够了。', advice: '今天把能做的做到位，不必追求每件事都完美。', line: '把该做的做了，就算找到地方了。', scoreLabel: '共鸣度' },
  { key: 'nacf-light', title: '今日影视台词', name: '《中国合伙人》', subtitle: '励志 / 成长', body: '改变不了世界，就改变自己。', advice: '今天先把能改的那部分改了。', line: '从自己开始，边界才会慢慢往外推。', scoreLabel: '共鸣度' },
  { key: 'alive-zhang', title: '今日影视台词', name: '《活着》', subtitle: '文艺 / 韧性', body: '人是为了活着本身而活着的，不是为了活着之外的任何事物而活着。', advice: '今天别把活着的意义复杂化，先把今天过好。', line: '活着这件事，本身就够沉。', scoreLabel: '共鸣度' },
  { key: 'summer-bubble', title: '今日影视台词', name: '《夏日大作战》', subtitle: '动画 / 家庭', body: '家人的力量，是最难被打败的东西。', advice: '今天遇到难事，试试找家人或最近的人说一声。', line: '不是一个人的故事，才更能接住意外。', scoreLabel: '共鸣度' },
  { key: 'spirited-away', title: '今日影视台词', name: '《千与千寻》', subtitle: '动画 / 成长', body: '不管前方的路有多苦，只要走的方向是对的，都比站在原地更接近幸福。', advice: '今天走一步，哪怕步子小。', line: '方向这件事，一旦对了，很多东西会跟上来。', scoreLabel: '共鸣度' },
  { key: 'your-name', title: '今日影视台词', name: '《你的名字》', subtitle: '动画 / 相遇', body: '我在寻找一个人，寻找那个我心中重要到不行的人。', advice: '今天想起谁，去联系一下。', line: '很多缘分是主动找来的。', scoreLabel: '共鸣度' },
  { key: 'princess-mononoke', title: '今日影视台词', name: '《幽灵公主》', subtitle: '动画 / 共存', body: '即使如此，仍要活下去。', advice: '今天不管多乱，先让自己活得清醒一点。', line: '即使如此，是一种很高级的态度。', scoreLabel: '共鸣度' },
  { key: 'howl-moving', title: '今日影视台词', name: '《哈尔的移动城堡》', subtitle: '动画 / 勇气', body: '有些事现在不做，就永远不会做了。', advice: '今天有想做的，先动一步。', line: '拖延最喜欢待在"以后再说"里。', scoreLabel: '共鸣度' },
  { key: 'eva-rebuild', title: '今日影视台词', name: '《新世纪福音战士》', subtitle: '动画 / 羁绊', body: '逃避虽然可耻，但有用。', advice: '今天撤退也没关系，先搞清楚再回来。', line: '有时候退一步，不是认输，是重新选位。', scoreLabel: '共鸣度' },
  { key: 'mushi-shi', title: '今日影视台词', name: '《虫师》', subtitle: '动画 / 存在', body: '活着就是这件事情本身的意义。', advice: '今天轻一点，不必给每件事安上大意义。', line: '虫师说话慢，但每句都扎。', scoreLabel: '共鸣度' },
];

export const dailyMusicFacts: DailyTextCard[] = [
  { key: 'beethoven-deaf', title: '今日音乐知识', name: '贝多芬失聪后的创作', subtitle: '古典 / 意志', body: '贝多芬在严重失聪后仍完成了《第九交响曲》，据说他通过咬住钢琴感受共鸣来感知音律。', advice: '今天遇到障碍，看看能不能换一个感知方式。', line: '听不见，但也挡不住。', scoreLabel: '共鸣度' },
  { key: 'mozart-memory', title: '今日音乐知识', name: '莫扎特超强听觉记忆', subtitle: '古典 / 天赋', body: '据记载，莫扎特14岁时听了一遍格雷戈里奥·阿莱格里的弥撒曲，便凭记忆完整记录了下来。', advice: '今天认真听一件事，别一边听一边刷手机。', line: '注意力是有限资源，别乱消耗。', scoreLabel: '共鸣度' },
  { key: 'happy-birthday-copyright', title: '今日音乐知识', name: '生日歌版权历史', subtitle: '版权 / 冷知识', body: '《生日快乐歌》长期存在版权争议，经过诉讼，2016年被美国法院判定进入公共领域。', advice: '今天了解一下版权常识，用前先想想权属。', line: '一首歌唱了多少年，官司也打了多少年。', scoreLabel: '共鸣度' },
  { key: 'guitar-strings', title: '今日音乐知识', name: '吉他弦的张力', subtitle: '乐器 / 材料', body: '标准调弦的电吉他六根弦总张力约40-50千克，好的琴颈设计才能长期扛住这个应力。', advice: '今天扛压力时，看看自己的结构够不够稳。', line: '能承受才叫在弦上。', scoreLabel: '共鸣度' },
  { key: 'absolute-pitch', title: '今日音乐知识', name: '绝对音感的分布', subtitle: '感知 / 神经科学', body: '绝对音感在普通人群中比较罕见，但在从小开始专业音乐训练的群体中出现率更高。', advice: '今天别羡慕天赋，看看早期训练留下了什么。', line: '有些能力是习惯先到，意识后到的。', scoreLabel: '共鸣度' },
  { key: 'tuning-440hz', title: '今日音乐知识', name: 'A4=440Hz是如何定下来的', subtitle: '标准 / 协作', body: '440Hz作为国际标准音高是1939年经国际会议确定的，在此之前各地乐团音高不统一，合作起来会有困难。', advice: '今天团队协作，先对齐一个基准，省得各自跑偏。', line: '没有共同音高，乐团会很难听。', scoreLabel: '共鸣度' },
  { key: 'vinyl-warmth', title: '今日音乐知识', name: '黑胶的"温暖感"从何而来', subtitle: '音频 / 感知', body: '黑胶唱片的模拟特性和非线性失真在某些频段会产生特定泛音，很多人感知为更"温暖"的音色。', advice: '今天听点不完美的声音，反而可能更有质感。', line: '完美的格式，不一定出最有温度的声音。', scoreLabel: '共鸣度' },
  { key: 'music-brainwave', title: '今日音乐知识', name: '音乐影响大脑活动', subtitle: '神经科学 / 感知', body: '研究表明节奏、旋律等音乐元素会激活大脑多个区域，包括奖励、记忆和运动相关区域。', advice: '今天学习前播一首让你集中的曲子，不是玄学。', line: '音乐不只在耳朵里，它同时在好几个地方。', scoreLabel: '共鸣度' },
  { key: 'opera-bel-canto', title: '今日音乐知识', name: '美声唱法的共鸣腔', subtitle: '声乐 / 技术', body: '美声唱法利用头腔、胸腔等共鸣腔放大声音，训练有素的歌手不用麦克风就能盖过管弦乐团。', advice: '今天让自己的表达找到共鸣，别光靠音量。', line: '真正的穿透力，来自共鸣，不来自喊。', scoreLabel: '共鸣度' },
  { key: 'silence-4min', title: '今日音乐知识', name: '约翰·凯奇的《4分33秒》', subtitle: '先锋 / 概念', body: '《4分33秒》要求演奏者在全程保持沉默，让听众感知周围环境音作为音乐本身。', advice: '今天安静几分钟，听听身边的声音。', line: '先锋艺术最擅长提问，最不擅长让人舒服。', scoreLabel: '共鸣度' },
  { key: 'improvisation-jazz', title: '今日音乐知识', name: '爵士乐的即兴结构', subtitle: '爵士 / 创作', body: '爵士即兴不是乱弹，它建立在和弦走向、调式和乐手间的对话之上，即兴的是旋律，不是结构。', advice: '今天灵活发挥也要有底层逻辑，别把即兴当随便。', line: '最自由的表达，背后藏着最扎实的规则。', scoreLabel: '共鸣度' },
  { key: 'chinese-pentatonic', title: '今日音乐知识', name: '五声调式与中国音乐', subtitle: '中国音乐 / 理论', body: '宫商角徵羽五声调式是中国传统音乐的基础，其结构与西方七声音阶不同，听感上有独特的开放性。', advice: '今天听首国风曲子，听听那个开阔感。', line: '五个音，有时比七个音更空旷。', scoreLabel: '共鸣度' },
  { key: 'drummer-metronome', title: '今日音乐知识', name: '鼓手和节拍器的关系', subtitle: '节奏 / 训练', body: '职业鼓手既要能完美跟节拍器，也要能在演出时让节奏"呼吸"、微微摇摆，两者都是能力。', advice: '今天的工作既要守规范，也要给它一点活气。', line: '死准和活准，都是准，方向不一样。', scoreLabel: '共鸣度' },
  { key: 'earworm', title: '今日音乐知识', name: '脑海中挥不去的旋律', subtitle: '认知 / 神经科学', body: '耳虫（earworm）是大脑对不完整音乐模式的自动补完反应，越短越重复的旋律越容易触发。', advice: '今天注意自己脑子里在循环什么，可能反映了你在想什么。', line: '大脑的播放列表，不是随机的。', scoreLabel: '共鸣度' },
  { key: 'music-therapy', title: '今日音乐知识', name: '音乐治疗的实证应用', subtitle: '医学 / 应用', body: '音乐治疗在疼痛管理、焦虑缓解和某些神经康复场景中有经过研究支持的效果。', advice: '今天状态不好时，别只刷手机，先换一首歌。', line: '音乐不是万能药，但它真的有用。', scoreLabel: '共鸣度' },
  { key: 'perfect-fifth', title: '今日音乐知识', name: '纯五度与泛音列', subtitle: '乐理 / 物理', body: '纯五度是自然泛音列中最早出现的音程之一，这就是为什么它听起来格外协和，几乎所有文化的音乐里都有它。', advice: '今天找那个合得来的人或事，别只找差距。', line: '协和不是妥协，是频率刚好合上了。', scoreLabel: '共鸣度' },
  { key: 'bach-fugue', title: '今日音乐知识', name: '巴赫赋格的结构美学', subtitle: '古典 / 对位', body: '赋格曲让同一主题在不同声部先后进入、交织展开，整体结构精密到像数学，但听感可以很流畅。', advice: '今天复杂的问题试着拆成几条线分头推进。', line: '多声部也能和谐，前提是每条线都清楚自己在哪。', scoreLabel: '共鸣度' },
  { key: 'synthesizer-history', title: '今日音乐知识', name: '合成器改变了音乐生产方式', subtitle: '电子音乐 / 技术', body: '合成器让不依赖传统乐器的声音创作成为可能，从Moog到软件插件，大幅降低了音乐制作门槛。', advice: '今天看看有没有新工具能帮你做过去很难做的事。', line: '门槛降了，做出好东西的难度其实没降。', scoreLabel: '共鸣度' },
  { key: 'acoustic-concert-hall', title: '今日音乐知识', name: '音乐厅的声学设计', subtitle: '建筑 / 声学', body: '顶级音乐厅的形状、材质和座位布局都经过声学设计，让声音在衰减前有合适的混响时间和扩散路径。', advice: '今天做汇报或沟通前，先想想环境适不适合。', line: '内容再好，场合不对也会折半。', scoreLabel: '共鸣度' },
  { key: 'world-music-gamelan', title: '今日音乐知识', name: '加美兰与集体演奏哲学', subtitle: '世界音乐 / 印尼', body: '加美兰是印尼传统打击乐群奏，强调整体融合而非个人炫技，演奏者的目标是让自己的声音"消失"进整体里。', advice: '今天团队场合，想想自己是不是抢了不该抢的声部。', line: '有时候最好的贡献，是刚好不多不少。', scoreLabel: '共鸣度' },
];

export const dailyHistoryEvents: DailyTextCard[] = [
  { key: 'moon-landing', title: '历史上的今天', name: '人类首次登月', subtitle: '1969年7月20日', body: '阿波罗11号，阿姆斯特朗踏上月球："这是个人一小步，人类一大步。"', advice: '今天做点没人做过的，哪怕很小。', line: '月球那一步，从火箭底下开始。', scoreLabel: '历史感' },
  { key: 'titanic-sinks', title: '历史上的今天', name: '泰坦尼克号沉没', subtitle: '1912年4月15日', body: '撞冰山后两个半小时沉没，1500多人遇难，"永不沉没"破灭。', advice: '今天别把自信当保险。', line: '最硬的船也怕看不见的冰。', scoreLabel: '历史感' },
  { key: 'berlin-wall-fall', title: '历史上的今天', name: '柏林墙倒塌', subtitle: '1989年11月9日', body: '东德开放边境，柏林墙被推倒，冷战象征消失。', advice: '今天看似坚固的，可能一夜就变。', line: '墙能挡人，挡不住时代。', scoreLabel: '历史感' },
  { key: 'first-flight', title: '历史上的今天', name: '莱特兄弟首飞', subtitle: '1903年12月17日', body: '飞行者一号首飞12秒，36米，人类进入航空时代。', advice: '今天的12秒，可能是以后的12小时。', line: '飞不远不丢人，不敢飞才丢。', scoreLabel: '历史感' },
  { key: 'penicillin-discovered', title: '历史上的今天', name: '青霉素被发现', subtitle: '1928年9月28日', body: '弗莱明注意到培养皿污染抑制细菌，偶然开启抗生素时代。', advice: '今天别急着扔意外，可能藏答案。', line: '实验室最值钱的，有时是那盘废料。', scoreLabel: '历史感' },
  { key: 'first-email', title: '历史上的今天', name: '第一封电子邮件', subtitle: '1971年', body: 'Ray Tomlinson发出第一封网络邮件，选择@作为分隔符。', advice: '今天小决定，可能被用几十年。', line: '@符号：随便选的。', scoreLabel: '历史感' },
  { key: 'einstein-paper', title: '历史上的今天', name: '爱因斯坦发表相对论', subtitle: '1905年', body: '26岁专利局职员发表狭义相对论，重新定义时空。', advice: '今天别因没名气就不敢发声。', line: '物理学最大革命，来自三等公务员。', scoreLabel: '历史感' },
  { key: 'first-www', title: '历史上的今天', name: '万维网向公众开放', subtitle: '1991年8月6日', body: 'Tim Berners-Lee在CERN开发的WWW向公众开放。', advice: '今天开放比独占更有价值。', line: '网页最初是为了方便物理学家看论文。', scoreLabel: '历史感' },
  { key: 'first-photo', title: '历史上的今天', name: '世界第一张照片', subtitle: '1826年', body: 'Nicéphore Niépce用日光蚀刻法拍窗外，曝光8小时。', advice: '今天慢点没关系，开创比完美重要。', line: '第一张照片：模糊，但划时代。', scoreLabel: '历史感' },
  { key: 'dna-structure', title: '历史上的今天', name: 'DNA双螺旋结构发现', subtitle: '1953年', body: 'Watson和Crick在《自然》发表DNA双螺旋结构。', advice: '今天看复杂问题，试试找基本结构。', line: '生命的秘密，藏在螺旋里。', scoreLabel: '历史感' },
  { key: 'first-computer', title: '历史上的今天', name: 'ENIAC计算机诞生', subtitle: '1946年2月14日', body: '世界第一台通用电子计算机，重30吨，占地167平米。', advice: '今天的笨重，是明天轻便的起点。', line: '手机算力吊打它，但没它就没手机。', scoreLabel: '历史感' },
  { key: 'first-transpacific-flight', title: '历史上的今天', name: '首次跨太平洋飞行', subtitle: '1928年', body: 'Charles Kingsford Smith驾"南十字星"从美国飞到澳洲。', advice: '今天距离不是障碍，勇气和准备才是。', line: '太平洋：能飞过去的都是狠人。', scoreLabel: '历史感' },
  { key: 'first-heart-transplant', title: '历史上的今天', name: '首例心脏移植手术', subtitle: '1967年12月3日', body: '南非医生Christiaan Barnard完成首例心脏移植，患者存活18天。', advice: '今天第一次尝试不需要完美。', line: '18天不算成功，但打开了门。', scoreLabel: '历史感' },
  { key: 'chernobyl', title: '历史上的今天', name: '切尔诺贝利核事故', subtitle: '1986年4月26日', body: '4号反应堆爆炸，成为史上最严重核电站事故。', advice: '今天别在安全上省预算和流程。', line: '核能最怕的不是技术，是侥幸。', scoreLabel: '历史感' },
  { key: 'first-sound-recording', title: '历史上的今天', name: '人类首次录音', subtitle: '1860年', body: 'Édouard-Léon Scott用声波记录仪录下声音，但无法回放。', advice: '今天记录下来，哪怕暂时用不上。', line: '最早录音：能存不能听，但够先锋。', scoreLabel: '历史感' },
  { key: 'first-tv-broadcast', title: '历史上的今天', name: '首次电视广播', subtitle: '1936年', body: 'BBC在伦敦开始世界首个定期电视广播。', advice: '今天做的事，可能会变成新日常。', line: '电视刚出来，没人想到它会统治客厅。', scoreLabel: '历史感' },
  { key: 'mount-everest-summit', title: '历史上的今天', name: '人类首登珠峰', subtitle: '1953年5月29日', body: 'Edmund Hillary和Tenzing Norgay登顶珠峰。', advice: '今天往高处走，别怕路难。', line: '顶峰的风景，留给爬上去的人。', scoreLabel: '历史感' },
  { key: 'first-blood-transfusion', title: '历史上的今天', name: '首次成功输血', subtitle: '1818年', body: 'James Blundell完成首次人体输血，救了产后大出血产妇。', advice: '今天能救命的技术，一开始都很冒险。', line: '输血之前，失血几乎等于死亡。', scoreLabel: '历史感' },
  { key: 'sputnik', title: '历史上的今天', name: '人造卫星上天', subtitle: '1957年10月4日', body: '苏联发射斯普特尼克1号，第一颗人造卫星入轨。', advice: '今天把想法送上天，别只在地上画图。', line: '卫星一上天，太空竞赛停不下来。', scoreLabel: '历史感' },
  { key: 'first-vaccine', title: '历史上的今天', name: '牛痘疫苗诞生', subtitle: '1796年', body: 'Edward Jenner给男孩接种牛痘，证明可预防天花。', advice: '今天大胆假设，小心求证。', line: '疫苗之父，一开始也是在赌。', scoreLabel: '历史感' },
  { key: 'first-automobile', title: '历史上的今天', name: '第一辆汽车诞生', subtitle: '1886年', body: 'Karl Benz获汽车专利，Benz Patent-Motorwagen成第一辆汽车。', advice: '今天造出来，比画在纸上强。', line: '汽车刚出来，还没马车快，但方向对了。', scoreLabel: '历史感' },
  { key: 'first-telephone-call', title: '历史上的今天', name: '第一通电话', subtitle: '1876年3月10日', body: 'Alexander Graham Bell打通第一通电话："Watson先生，快来，我需要你。"', advice: '今天试试新工具，哪怕还不完美。', line: '人类第一通电话，内容很实在。', scoreLabel: '历史感' },
  { key: 'atomic-bomb', title: '历史上的今天', name: '首颗原子弹试爆', subtitle: '1945年7月16日', body: '美国新墨西哥州三位一体试验，奥本海默："我成了死神。"', advice: '今天创造力也要带着责任。', line: '最强的发明，往往最难收回去。', scoreLabel: '历史感' },
  { key: 'printing-press', title: '历史上的今天', name: '古登堡印刷机', subtitle: '1450年左右', body: 'Johannes Gutenberg发明活字印刷机，知识传播新纪元。', advice: '今天让信息流动起来，别藏着。', line: '印刷术：知识从此不再是贵族特权。', scoreLabel: '历史感' },
  { key: 'first-powered-airplane', title: '历史上的今天', name: '动力飞行成功', subtitle: '1903年', body: '莱特兄弟飞行者一号，第一次有动力、可控、持续飞行。', advice: '今天控制比速度重要。', line: '飞起来不难，难的是飞哪都听你的。', scoreLabel: '历史感' },
  { key: 'first-radio-broadcast', title: '历史上的今天', name: '首次无线电广播', subtitle: '1906年', body: 'Reginald Fessenden在圣诞夜首次无线电语音和音乐广播。', advice: '今天传播不只靠吼，要靠技术。', line: '电波穿墙，声音到家。', scoreLabel: '历史感' },
  { key: 'independence-day-us', title: '历史上的今天', name: '美国独立宣言', subtitle: '1776年7月4日', body: '大陆会议通过《独立宣言》，宣布脱离英国。', advice: '今天敢说出口的决定，要有承担结果的准备。', line: '独立不是喊口号，是干出来的。', scoreLabel: '历史感' },
  { key: 'french-revolution', title: '历史上的今天', name: '攻占巴士底狱', subtitle: '1789年7月14日', body: '巴黎民众攻占巴士底狱，法国大革命爆发。', advice: '今天积压的矛盾，总有爆发的一天。', line: '革命不是请客吃饭，是墙倒了。', scoreLabel: '历史感' },
  { key: 'first-olympics', title: '历史上的今天', name: '现代奥运会开幕', subtitle: '1896年4月6日', body: '第一届现代奥运会在雅典举办，重启古代传统。', advice: '今天复兴传统，也是创新。', line: '奥运：古代仪式，现代玩法。', scoreLabel: '历史感' },
  { key: 'apollo-13', title: '历史上的今天', name: '阿波罗13号事故', subtitle: '1970年4月13日', body: '氧气罐爆炸，登月取消，但全体机组成功返回。', advice: '今天计划失败了，保命比目标重要。', line: '成功的失败：活着回来就是赢。', scoreLabel: '历史感' },
];

export const dailyScienceFacts: DailyTextCard[] = [
  { key: 'black-hole-photo', title: '每日科学知识', name: '首张黑洞照片', subtitle: '2019年', body: '事件视界望远镜拍摄M87星系中心黑洞，验证爱因斯坦广义相对论。', advice: '今天做的事，可能要很久才能看到结果。', line: '黑洞照片：拍了两年，冲洗了一年。', scoreLabel: '科学值' },
  { key: 'crispr-gene', title: '每日科学知识', name: 'CRISPR基因编辑', subtitle: '生物技术', body: 'CRISPR-Cas9能精确编辑DNA序列，2020年诺贝尔化学奖，但伦理争议巨大。', advice: '今天技术能做到，不代表应该做。', line: '基因剪刀：最强工具，最大责任。', scoreLabel: '科学值' },
  { key: 'quantum-supremacy', title: '每日科学知识', name: '量子霸权', subtitle: '2019年', body: 'Google量子计算机200秒完成超算需1万年的任务，但实际应用还很远。', advice: '今天突破和落地之间，还有一段路。', line: '量子计算：理论牛逼，实用还早。', scoreLabel: '科学值' },
  { key: 'higgs-boson', title: '每日科学知识', name: '希格斯玻色子', subtitle: '2012年', body: 'LHC对撞机发现"上帝粒子"，解释物质质量来源，验证标准模型最后一块拼图。', advice: '今天找答案，有时要砸几十亿。', line: '上帝粒子：找了50年，终于逮到。', scoreLabel: '科学值' },
  { key: 'gravitational-wave', title: '每日科学知识', name: '引力波探测', subtitle: '2015年', body: 'LIGO首次探测到引力波，爱因斯坦百年预言被证实，开启引力波天文学。', advice: '今天坚持的方向，可能要等很久才验证。', line: '引力波：爱因斯坦说有，100年后证实。', scoreLabel: '科学值' },
  { key: 'dark-matter', title: '每日科学知识', name: '暗物质之谜', subtitle: '宇宙学', body: '宇宙85%是暗物质，但至今没人知道它是什么，只能通过引力效应推断存在。', advice: '今天看不见的，不代表不存在。', line: '暗物质：宇宙大部分，但看不见摸不着。', scoreLabel: '科学值' },
  { key: 'neuron-plasticity', title: '每日科学知识', name: '神经可塑性', subtitle: '神经科学', body: '大脑能通过学习重新布线，成年后也能建立新神经连接，"用进废退"是真的。', advice: '今天开始练，大脑会跟着变。', line: '神经可塑：脑子不是固定的，是能练的。', scoreLabel: '科学值' },
  { key: 'antibiotic-resistance', title: '每日科学知识', name: '抗生素耐药性', subtitle: '医学危机', body: '细菌进化速度超过新药研发，滥用抗生素导致超级细菌，可能回到无药可用时代。', advice: '今天方便的，明天可能没用。', line: '抗生素：用多了，细菌就不怕了。', scoreLabel: '科学值' },
  { key: 'gut-microbiome', title: '每日科学知识', name: '肠道菌群', subtitle: '微生物学', body: '人体肠道有上万亿细菌，影响消化、免疫、情绪甚至大脑，被称为"第二大脑"。', advice: '今天善待肚子里的小伙伴。', line: '肠道菌群：你以为是你在活，其实是你们在活。', scoreLabel: '科学值' },
  { key: 'epigenetics', title: '每日科学知识', name: '表观遗传学', subtitle: '基因调控', body: 'DNA序列不变，但基因表达可被环境改变，饮食、压力会影响基因开关，甚至遗传给下一代。', advice: '今天的生活方式，可能写进基因。', line: '表观遗传：基因是剧本，表达是演法。', scoreLabel: '科学值' },
  { key: 'photosynthesis', title: '每日科学知识', name: '光合作用效率', subtitle: '植物生物学', body: '植物光合效率只有1-2%，远低于太阳能电池板，但养活了地球生命。', advice: '今天效率不是唯一标准。', line: '光合作用：效率低，但靠谱。', scoreLabel: '科学值' },
  { key: 'telomere', title: '每日科学知识', name: '端粒与衰老', subtitle: '细胞生物学', body: '染色体端粒每次分裂变短，像保护帽磨损，细胞分裂50-70次就停止，这是衰老机制之一。', advice: '今天细胞在偷偷变老，但心态可以年轻。', line: '端粒：细胞的倒计时条。', scoreLabel: '科学值' },
  { key: 'placebo-effect', title: '每日科学知识', name: '安慰剂效应', subtitle: '心理医学', body: '假药能产生真疗效，大脑预期会触发生理变化，甚至在患者知道是假药后仍有效。', advice: '今天心理暗示很强，别小看念头。', line: '安慰剂：假药真效果，脑子很诚实。', scoreLabel: '科学值' },
  { key: 'caffeine-mechanism', title: '每日科学知识', name: '咖啡因机制', subtitle: '神经药理', body: '咖啡因阻断腺苷受体，腺苷本来让你困，被挡住后你就不困了，但不是真的不累。', advice: '今天提神是假象，补觉才是真需求。', line: '咖啡因：不是给能量，是屏蔽困意。', scoreLabel: '科学值' },
  { key: 'circadian-rhythm', title: '每日科学知识', name: '生物钟', subtitle: '生理学', body: '人体24小时节律由SCN（视交叉上核）控制，蓝光会抑制褪黑素分泌，打乱生物钟。', advice: '今天睡前少看屏幕，生物钟会感谢你。', line: '生物钟：不是玄学，是SCN在管。', scoreLabel: '科学值' },
  { key: 'moore-law', title: '每日科学知识', name: '摩尔定律', subtitle: '计算机科学', body: '芯片晶体管数量每18-24个月翻倍，支撑了50年，但物理极限快到了，3nm以下越来越难。', advice: '今天指数增长总有天花板。', line: '摩尔定律：曾经牛逼，现在快到头。', scoreLabel: '科学值' },
  { key: 'nuclear-fusion', title: '每日科学知识', name: '核聚变能源', subtitle: '物理工程', body: '太阳的能量来源，人类想复制但太难，"永远还差30年"的梗已经说了60年。', advice: '今天最难的，往往是看起来最简单的。', line: '核聚变：太阳天天搞，人类还在试。', scoreLabel: '科学值' },
  { key: 'fermi-paradox', title: '每日科学知识', name: '费米悖论', subtitle: '天文学', body: '宇宙这么大这么老，外星文明应该到处都是，但为什么我们什么都没看到？', advice: '今天保持好奇，但别急着下结论。', line: '费米悖论：宇宙空荡荡，是我们太早还是他们都死了？', scoreLabel: '科学值' },
  { key: 'double-slit', title: '每日科学知识', name: '双缝干涉实验', subtitle: '量子力学', body: '光子/电子同时穿过两条缝，观测它就塌缩成一条，不观测就保持波态，挑战常识。', advice: '今天观察会改变结果，测不准是物理定律。', line: '双缝实验：你一看，它就变了。', scoreLabel: '科学值' },
  { key: 'protein-folding', title: '每日科学知识', name: '蛋白质折叠', subtitle: '生物化学', body: '氨基酸链折叠成特定3D结构才有功能，折错了就是病，AlphaFold2用AI预测结构破解了50年难题。', advice: '今天结构决定功能，形状很重要。', line: '蛋白质折叠：折对了是药，折错了是病。', scoreLabel: '科学值' },
];

duelWeapons.push(
  { key: 'he-grenade', name: '高爆雷', style: '抛物线审判', power: 78, tempo: 64, line: '丢得准叫预判，丢歪了叫给地板听响。', fandomFile: 'HEgrenadehud_csgo.png' },
  { key: 'molotov', name: '燃烧瓶', style: '封路烤场', power: 83, tempo: 55, line: '不一定杀人，但很会让人换路线。', fandomFile: 'Molotovhud_csgo.png' },
  { key: 'incendiary', name: '燃烧弹', style: '防守火墙', power: 80, tempo: 52, line: '火一铺，急的人先露馅。', fandomFile: 'Incgrenadehud_csgo.png' },
  { key: 'c4', name: 'C4', style: '倒计时压迫', power: 97, tempo: 20, line: '没开枪也能让全场心跳变快。', fandomFile: 'C4hud_csgo.png' },
  { key: 'defuse-kit', name: '拆弹钳', style: '五秒逆天改命', power: 74, tempo: 98, line: '平时不起眼，残局里比枪还贵。', fandomFile: 'Defuserhud_csgo.png' },
  { key: 'decoy', name: '诱饵弹', style: '假装有人', power: 41, tempo: 77, line: '骗到就是心理学，没骗到就是声音污染。', fandomFile: 'Decoyhud_csgo.png' },
  { key: 'tactical-pause', name: '战术暂停', style: '时间冻结术', power: 68, tempo: 12, line: '不动手，但能把上头的人按回椅子。' },
  { key: 'scoreboard', name: '计分板', style: '数据公开处刑', power: 63, tempo: 40, line: '一打开，全队都知道谁在嘴硬。' },
  { key: 'microphone', name: '麦克风', style: '指挥声波', power: 57, tempo: 86, line: '喊得清楚是信息，喊得太急是噪声。' },
  { key: 'notebook', name: '小本本', style: '赛前记仇', power: 54, tempo: 30, line: '伤害不高，但会把你的失误写得很完整。' },
  { key: 'umbrella', name: '黑伞', style: '雨夜格挡', power: 61, tempo: 58, line: '不够锋利，但很有决战画面。' },
  { key: 'brick', name: '板砖', style: '朴素真伤', power: 86, tempo: 35, line: '没有皮肤，没有磨损，只有重量。' },
);

duelWeapons.push(
  { key: 'bayonet-duel', name: '刺刀', style: '老派直刺', power: 91, tempo: 44, line: '不花哨，但每一下都很实在。', fandomFile: 'Cs2-knife-bayonet-stock-market.png' },
  { key: 'butterfly-duel', name: '蝴蝶刀', style: '花式压迫', power: 88, tempo: 74, line: '转起来很帅，打空也很显眼。', fandomFile: 'Cs2-knife-butterfly-stock-market.png' },
  { key: 'karambit-duel', name: '爪子刀', style: '弧线背刺', power: 94, tempo: 66, line: '贴身之后，话就不多了。', fandomFile: 'Cs2-knife-karambit-stock.png' },
  { key: 'm9-duel', name: 'M9刺刀', style: '重量压场', power: 93, tempo: 42, line: '排面够，手也得稳。', fandomFile: 'Cs2-knife-m9-bayonet-stock.png' },
  { key: 'kukri-duel', name: '廓尔喀刀', style: '新刀劈山', power: 89, tempo: 52, line: '新鲜感不是护身符，但很有画面。', fandomFile: 'CS2_weapon_knife_kukri.png' },
  { key: 'ssg08-duel', name: '鸟狙', style: '轻狙偷命', power: 79, tempo: 81, line: '轻是轻，打头也一样很重。', fandomFile: 'CS2_SSG_08_Inventory.png' },
  { key: 'xm1014-duel', name: '连喷', style: '近点碎纸机', power: 82, tempo: 69, line: '距离对了，礼貌就没了。', fandomFile: 'CS2_XM1014_Inventory.png' },
  { key: 'mag7-duel', name: 'MAG-7', style: '拐角判官', power: 81, tempo: 48, line: '贴脸这一块，真能让人不讲武德。', fandomFile: 'CS2_MAG-7_Inventory.png' },
  { key: 'mp9-duel', name: 'MP9', style: '经济局撕咬', power: 67, tempo: 98, line: '跑得快，赚得也快，送得更快。', fandomFile: 'CS2_MP9_Inventory.png' },
  { key: 'mac10-duel', name: 'MAC-10', style: '冲锋开门', power: 64, tempo: 99, line: '先把门撞开，后面再谈姿势。', fandomFile: 'CS2_MAC-10_Inventory.png' },
  { key: 'famas-duel', name: 'FAMAS', style: '半甲硬撑', power: 71, tempo: 63, line: '预算有限，尊严不能有限。', fandomFile: 'CS2_FAMAS_Inventory.png' },
  { key: 'galil-duel', name: '加利尔', style: '穷哥们正义', power: 72, tempo: 67, line: '便宜枪也有脾气。', fandomFile: 'CS2_Galil_AR_Inventory.png' },
  { key: 'dual-berettas-duel', name: '双枪', style: '左右开花', power: 61, tempo: 92, line: '弹幕很多，准不准另说。', fandomFile: 'CS2_Dual_Berettas_Inventory.png' },
  { key: 'molotov-bucket', name: '一桶燃烧瓶', style: '火海劝退', power: 90, tempo: 38, line: '紫禁之巅突然开始消防演练。', fandomFile: 'Molotovhud.png' },
  { key: 'flashbang-chain', name: '三连闪', style: '白屏连招', power: 77, tempo: 100, line: '看不见的人，嘴一般最硬。', fandomFile: 'Flashbanghud_csgo.png' },
  { key: 'smoke-oneway', name: '单向烟', style: '灰色魔法', power: 75, tempo: 57, line: '公平不公平先放一边，能看见就是优势。', fandomFile: 'Smokegrenadehud_csgo.png' },
  { key: 'monitor', name: '显示器', style: '物理开屏', power: 69, tempo: 31, line: '画面很大，代价也很大。' },
  { key: 'router', name: '路由器', style: '断网封印', power: 96, tempo: 11, line: '不用击杀，对面先掉线。' },
  { key: 'watermelon', name: '西瓜', style: '夏日重击', power: 58, tempo: 34, line: '清爽，但砸人也很清楚。' },
  { key: 'hotpot-ladle', name: '火锅漏勺', style: '捞人出局', power: 56, tempo: 49, line: '能捞菜，也能捞节目效果。' },
  { key: 'metro-card', name: '地铁卡', style: '刷卡进攻', power: 44, tempo: 95, line: '伤害不高，但进站很快。' },
  { key: 'rulebook', name: '比赛规则书', style: '文本压制', power: 65, tempo: 24, line: '一页翻过去，对面先被判负。' },
);

dailyFacts.push(
  { key: 'egyptian-blue-ir', title: '每日冷知识', name: '埃及蓝会在红外下发光', subtitle: '颜料 / 考古', body: '古代颜料埃及蓝在可见光下很低调，却能在近红外成像里显出亮度，因此常被用来识别残留颜料。', advice: '今天看不见的线索，换一种观察方式可能就出来了。', line: '有些颜色白天沉默，换个波段就开口。', scoreLabel: '新鲜度' },
  { key: 'purple-trade', title: '每日冷知识', name: '泰尔紫曾贵到离谱', subtitle: '染料 / 古代贸易', body: '古代泰尔紫需要大量海螺分泌物制成，成本极高，颜色也因此和权力、身份绑定在一起。', advice: '今天别只看成品好看，稀缺性常常藏在供应链里。', line: '一抹紫色，背后可能是一整条海岸线。', scoreLabel: '新鲜度' },
  { key: 'quipu-record', title: '每日冷知识', name: '结绳也能记账', subtitle: '信息 / 安第斯', body: '印加帝国使用奇普结绳记录数量和分类信息，不同绳色、位置和结法都可能承载含义。', advice: '今天别把“文字”当成信息的唯一形态。', line: '数据不一定写在纸上，也可能打在绳上。', scoreLabel: '新鲜度' },
  { key: 'palimpsest', title: '每日冷知识', name: '羊皮纸会被刮掉重写', subtitle: '文献 / 复用', body: '中世纪羊皮纸昂贵，人们会刮去旧文本再写新内容，现代成像有时能读出底下的旧字。', advice: '今天看一个结果，也要想想它下面覆盖过什么。', line: '纸面安静，不代表历史没叠层。', scoreLabel: '新鲜度' },
  { key: 'tin-pest', title: '每日冷知识', name: '锡会“生病”变脆', subtitle: '材料 / 低温', body: '纯锡在低温下可能发生晶型转变，变得粉化和脆弱，这种现象常被叫作锡疫。', advice: '今天别忽略环境温度，材料脾气也会变。', line: '金属看着硬，也怕冷到变性格。', scoreLabel: '新鲜度' },
  { key: 'obsidian-glass', title: '每日冷知识', name: '黑曜石是天然玻璃', subtitle: '地质 / 火山', body: '黑曜石来自富硅熔岩快速冷却，来不及形成晶体，所以呈现类似玻璃的非晶结构。', advice: '今天速度快不一定粗糙，有时会凝出另一种形态。', line: '火山也会做玻璃，只是脾气比较大。', scoreLabel: '新鲜度' },
  { key: 'gecko-feet', title: '每日冷知识', name: '壁虎脚靠微结构贴墙', subtitle: '仿生 / 表面', body: '壁虎脚趾上密集细毛能利用分子间作用力贴附表面，不是靠胶水。', advice: '今天解决问题，微小接触面积也可能很关键。', line: '会贴墙，不一定是黏，是细节足够密。', scoreLabel: '新鲜度' },
  { key: 'miracle-berry', title: '每日冷知识', name: '神秘果会改写酸味', subtitle: '味觉 / 蛋白', body: '神秘果里的神秘果蛋白会影响味觉受体，让酸味食物短时间内尝起来偏甜。', advice: '今天同一件事换个受体，也许完全不同。', line: '柠檬没变，舌头的解释器变了。', scoreLabel: '新鲜度' },
  { key: 'blue-structural', title: '每日冷知识', name: '很多蓝色来自动物结构', subtitle: '光学 / 结构色', body: '一些羽毛和鳞片的蓝色不是普通色素，而是微结构散射和干涉造成的结构色。', advice: '今天别只问“涂了什么色”，也问“结构怎么反光”。', line: '蓝可以是材料，也可以是几何。', scoreLabel: '新鲜度' },
  { key: 'aphantasia', title: '每日冷知识', name: '有人脑内几乎没有画面感', subtitle: '认知 / 想象', body: '心盲症人群在想象时可能很难生成清晰视觉图像，但并不等于没有记忆或创造力。', advice: '今天别把自己的思考方式当成所有人的默认设置。', line: '想象力不一定开投影仪。', scoreLabel: '新鲜度' },
  { key: 'saffron-stigma', title: '每日冷知识', name: '藏红花来自花柱头', subtitle: '香料 / 农业', body: '藏红花取自番红花的柱头，采摘和分拣高度依赖人工，所以价格长期很高。', advice: '今天看一个小东西贵，先看看它要多少手工时间。', line: '一小撮香气，背后是一大片耐心。', scoreLabel: '新鲜度' },
  { key: 'lacquer-humidity', title: '每日冷知识', name: '天然漆靠湿度固化', subtitle: '工艺 / 材料', body: '传统漆器使用的天然漆需要合适湿度和温度才能更好固化，太干反而不利。', advice: '今天别迷信越干越好，有些系统需要湿润才能成型。', line: '漆的耐心，写在空气湿度里。', scoreLabel: '新鲜度' },
  { key: 'indigo-vat', title: '每日冷知识', name: '靛蓝染色要先“还原”', subtitle: '染织 / 化学', body: '靛蓝不易直接溶于水，传统染色会先把它还原成可溶形态，出缸接触空气后再氧化变蓝。', advice: '今天有些成果，要先经过看不见的中间态。', line: '布不是一进缸就蓝，蓝是在空气里醒来的。', scoreLabel: '新鲜度' },
  { key: 'calcite-double', title: '每日冷知识', name: '方解石会让字重影', subtitle: '矿物 / 光学', body: '透明方解石具有强双折射，把它放在文字上会看到两套偏移图像。', advice: '今天看见两个答案，先确认是不是介质在分光。', line: '有时不是你眼花，是石头会拆光。', scoreLabel: '新鲜度' },
  { key: 'basalt-column', title: '每日冷知识', name: '玄武岩能冷成柱状', subtitle: '地质 / 裂隙', body: '熔岩冷却收缩时会形成规则裂隙，常出现六边形柱状节理。', advice: '今天压力释放得有方向，纹理就会有规律。', line: '石头的几何，是冷却留下的签名。', scoreLabel: '新鲜度' },
  { key: 'ambergis', title: '每日冷知识', name: '龙涎香来自海上漂流物', subtitle: '香料 / 海洋', body: '龙涎香与抹香鲸消化系统分泌物有关，经过海水和阳光长期变化后形成特殊香气材料。', advice: '今天别急着给怪东西下结论，时间可能会改写它的用途。', line: '有些香气，前传相当离谱。', scoreLabel: '新鲜度' },
  { key: 'sundial-equation', title: '每日冷知识', name: '日晷时间和钟表会有差', subtitle: '天文 / 计时', body: '地球轨道和自转轴倾角会让真太阳时与平均太阳时产生差异，这叫均时差。', advice: '今天用自然当时钟，也要知道自然不是匀速播放器。', line: '太阳很准，但不是按机械表准。', scoreLabel: '新鲜度' },
  { key: 'seawater-sound', title: '每日冷知识', name: '海里有声音通道', subtitle: '海洋 / 声学', body: '海水温度、压力和盐度会影响声速，在特定深度形成能远距离传播声音的声道。', advice: '今天信息传得远，往往是环境帮它开了通道。', line: '海水不只传浪，也传声音。', scoreLabel: '新鲜度' },
  { key: 'pumice-float', title: '每日冷知识', name: '浮石能漂在水上', subtitle: '火山 / 孔隙', body: '浮石内部充满气孔，整体密度可低于水，因此能短时间漂浮。', advice: '今天别只看材料本身，内部空隙也会改变命运。', line: '石头会漂，是因为里面装着很多空。', scoreLabel: '新鲜度' },
  { key: 'timeball', title: '每日冷知识', name: '港口曾用落球报时', subtitle: '航海 / 计时', body: '一些港口设置报时球，到点落下供船只校准航海钟，方便计算经度。', advice: '今天同步时间很普通，但以前它能决定航线。', line: '一颗球落下，船上的时间就对齐了。', scoreLabel: '新鲜度' },
);

dailyBookExcerpts.push(
  { key: 'daxue-renew', title: '每日书摘', name: '《大学》', subtitle: '日新', body: '苟日新，日日新，又日新。', advice: '今天改一点点，不用等一个盛大的重新开始。', line: '更新自己，也可以按日更来。', scoreLabel: '共鸣度' },
  { key: 'zuozhuan-duty', title: '每日书摘', name: '《左传》', subtitle: '义与后果', body: '多行不义必自毙。', advice: '今天别拿侥幸当策略，结构性的亏迟早会回头。', line: '坏路走多了，会自己塌。', scoreLabel: '共鸣度' },
  { key: 'zhanguoce-memory', title: '每日书摘', name: '《战国策》', subtitle: '前事之师', body: '前事之不忘，后事之师。', advice: '今天把踩过的坑写下来，别让经验只疼一次。', line: '记性好，是给未来省医药费。', scoreLabel: '共鸣度' },
  { key: 'lushi-spring', title: '每日书摘', name: '《吕氏春秋》', subtitle: '常动', body: '流水不腐，户枢不蠹。', advice: '今天让停住的事动一动，哪怕只推进一小格。', line: '不动最容易生锈。', scoreLabel: '共鸣度' },
  { key: 'huainanzi-lost-horse', title: '每日书摘', name: '《淮南子》', subtitle: '塞翁', body: '塞翁失马，焉知非福。', advice: '今天先别急着给坏事盖章，时间还没写完。', line: '转折常常迟到，但不一定缺席。', scoreLabel: '共鸣度' },
  { key: 'shuoyuan-study', title: '每日书摘', name: '《说苑》', subtitle: '好学', body: '少而好学，如日出之阳。', advice: '今天给一个新技能开个头，早一点总有早一点的光。', line: '学习的早晨感，很提气。', scoreLabel: '共鸣度' },
  { key: 'yanshi-skill', title: '每日书摘', name: '《颜氏家训》', subtitle: '薄技在身', body: '积财千万，不如薄技在身。', advice: '今天练一个能带走的本事，比囤焦虑有用。', line: '技能是随身行李。', scoreLabel: '共鸣度' },
  { key: 'mengxi-needle', title: '每日书摘', name: '《梦溪笔谈》', subtitle: '指南', body: '以磁石磨针锋，则能指南。', advice: '今天把小观察记下来，朴素实验也能打开世界。', line: '科学感有时从一根针开始。', scoreLabel: '共鸣度' },
  { key: 'muting-love', title: '每日书摘', name: '汤显祖《牡丹亭》', subtitle: '情起', body: '情不知所起，一往而深。', advice: '今天承认自己的在意，不必把每份喜欢都解释成逻辑。', line: '心动常常不写说明书。', scoreLabel: '共鸣度' },
  { key: 'west-chamber', title: '每日书摘', name: '王实甫《西厢记》', subtitle: '有情人', body: '愿天下有情人都成了眷属。', advice: '今天把祝福说出来，别只在心里点头。', line: '古人的糖，也挺直接。', scoreLabel: '共鸣度' },
  { key: 'peach-fan-tower', title: '每日书摘', name: '孔尚任《桃花扇》', subtitle: '兴亡', body: '眼看他起朱楼，眼看他宴宾客，眼看他楼塌了。', advice: '今天看热闹要带一点距离，繁华也会换场。', line: '舞台越亮，退场越响。', scoreLabel: '共鸣度' },
  { key: 'weiluyahua', title: '每日书摘', name: '《围炉夜话》', subtitle: '缓处', body: '处事最当熟思缓处。', advice: '今天遇到急事，先给自己一个慢半拍。', line: '慢不是拖，是让判断落地。', scoreLabel: '共鸣度' },
  { key: 'youmengying', title: '每日书摘', name: '《幽梦影》', subtitle: '山泉', body: '花不可以无蝶，山不可以无泉。', advice: '今天给重要的东西配上合适的环境。', line: '美感常常来自互相成全。', scoreLabel: '共鸣度' },
  { key: 'geyanlianbi', title: '每日书摘', name: '《格言联璧》', subtitle: '省身', body: '静坐常思己过，闲谈莫论人非。', advice: '今天少聊一个八卦，多修一个小毛病。', line: '嘴闲的时候，脑子最好别闲。', scoreLabel: '共鸣度' },
  { key: 'shenyin-soft', title: '每日书摘', name: '《呻吟语》', subtitle: '责人', body: '责人要含蓄，忌太尽。', advice: '今天提醒别人留点余地，话说满了反而难改。', line: '锋利不等于有效。', scoreLabel: '共鸣度' },
  { key: 'chuanxilu', title: '每日书摘', name: '《传习录》', subtitle: '知行', body: '知是行之始，行是知之成。', advice: '今天别让懂了停在嘴上，动一下才算数。', line: '知道和做到，中间隔着一双手。', scoreLabel: '共鸣度' },
  { key: 'jin-si-lu', title: '每日书摘', name: '《近思录》', subtitle: '为学', body: '学者须是务实。', advice: '今天少一点玄想，多一个能落地的动作。', line: '务实不是无趣，是能交账。', scoreLabel: '共鸣度' },
  { key: 'rongzhai', title: '每日书摘', name: '《容斋随笔》', subtitle: '随读', body: '读书贵有疑。', advice: '今天读到顺滑处，也问一句它凭什么。', line: '好问题会让书重新发声。', scoreLabel: '共鸣度' },
  { key: 'suiyuan', title: '每日书摘', name: '《随园诗话》', subtitle: '性情', body: '性情以外本无诗。', advice: '今天表达先保真，再求漂亮。', line: '没有真心，修辞只是在装修空房。', scoreLabel: '共鸣度' },
  { key: 'taiping', title: '每日书摘', name: '《太平广记》', subtitle: '异闻', body: '物各有灵，事各有因。', advice: '今天对怪事多留一层好奇，别一眼盖棺。', line: '异闻好看，是因为世界不止一层。', scoreLabel: '共鸣度' },
);

dailyPoems.push(
  { key: 'li-bai-wine', title: '每日古诗词', name: '李白《将进酒》', subtitle: '唐诗 / 豪情', body: '君不见黄河之水天上来，奔流到海不复回。', advice: '今天把气势拿出来，但别把计划也冲走。', line: '豪情可以大，落点要稳。', scoreLabel: '诗意值' },
  { key: 'bai-juyi-west-lake', title: '每日古诗词', name: '白居易《钱塘湖春行》', subtitle: '唐诗 / 春景', body: '几处早莺争暖树，谁家新燕啄春泥。', advice: '今天看见一点新气象，就顺手接住。', line: '春天常从很小的动作开始。', scoreLabel: '诗意值' },
  { key: 'du-mu-mountain', title: '每日古诗词', name: '杜牧《山行》', subtitle: '唐诗 / 秋山', body: '停车坐爱枫林晚，霜叶红于二月花。', advice: '今天别急着赶路，值得停下的景色就停一下。', line: '晚一点，也可能正好。', scoreLabel: '诗意值' },
  { key: 'du-mu-qinhuai', title: '每日古诗词', name: '杜牧《泊秦淮》', subtitle: '唐诗 / 夜泊', body: '烟笼寒水月笼沙，夜泊秦淮近酒家。', advice: '今天热闹里也留一点清醒。', line: '灯火越近，水色越冷。', scoreLabel: '诗意值' },
  { key: 'li-shangyin-jinse', title: '每日古诗词', name: '李商隐《锦瑟》', subtitle: '唐诗 / 追忆', body: '锦瑟无端五十弦，一弦一柱思华年。', advice: '今天想起旧事，可以温柔一点，不必硬解释。', line: '有些回忆适合弹，不适合拆。', scoreLabel: '诗意值' },
  { key: 'wang-wei-red-beans', title: '每日古诗词', name: '王维《相思》', subtitle: '唐诗 / 相思', body: '红豆生南国，春来发几枝。', advice: '今天把想念落到一个小动作里，不必声势很大。', line: '相思最会借小东西说话。', scoreLabel: '诗意值' },
  { key: 'wang-changling-border', title: '每日古诗词', name: '王昌龄《出塞》', subtitle: '唐诗 / 边塞', body: '秦时明月汉时关，万里长征人未还。', advice: '今天做长期事，别忘了它连接着多少旧问题。', line: '明月一照，年代都站到一起。', scoreLabel: '诗意值' },
  { key: 'wang-bo-friend', title: '每日古诗词', name: '王勃《送杜少府之任蜀州》', subtitle: '唐诗 / 送别', body: '海内存知己，天涯若比邻。', advice: '今天联系一个远处的人，距离不该全由地图决定。', line: '知己会把天涯压缩。', scoreLabel: '诗意值' },
  { key: 'du-fu-quatrain', title: '每日古诗词', name: '杜甫《绝句》', subtitle: '唐诗 / 春景', body: '两个黄鹂鸣翠柳，一行白鹭上青天。', advice: '今天把视线抬起来，明快的东西也需要被看见。', line: '好天气有时就是一副工整对联。', scoreLabel: '诗意值' },
  { key: 'gao-shi-farewell', title: '每日古诗词', name: '高适《别董大》', subtitle: '唐诗 / 壮别', body: '莫愁前路无知己，天下谁人不识君。', advice: '今天把胆子带上，别提前替未来唱衰。', line: '真正的鼓励，听起来很有风。', scoreLabel: '诗意值' },
  { key: 'he-zhizhang-willow', title: '每日古诗词', name: '贺知章《咏柳》', subtitle: '唐诗 / 春柳', body: '碧玉妆成一树高，万条垂下绿丝绦。', advice: '今天把普通景物看细一点，它可能比你想得会打扮。', line: '春天的审美，先从一树绿开始。', scoreLabel: '诗意值' },
  { key: 'luo-binwang-goose', title: '每日古诗词', name: '骆宾王《咏鹅》', subtitle: '唐诗 / 童趣', body: '鹅鹅鹅，曲项向天歌。白毛浮绿水，红掌拨清波。', advice: '今天给自己一点简单快乐，别什么都追求复杂。', line: '童诗的厉害，是几笔就亮。', scoreLabel: '诗意值' },
  { key: 'xin-qiji-sword', title: '每日古诗词', name: '辛弃疾《破阵子》', subtitle: '宋词 / 壮怀', body: '醉里挑灯看剑，梦回吹角连营。', advice: '今天把理想擦亮一点，但记得醒来还要做事。', line: '梦里有剑，白天要有行动。', scoreLabel: '诗意值' },
  { key: 'su-shi-storm', title: '每日古诗词', name: '苏轼《定风波》', subtitle: '宋词 / 风雨', body: '竹杖芒鞋轻胜马，谁怕。', advice: '今天装备不豪华也没关系，脚步稳就行。', line: '洒脱不是没雨，是雨里还走。', scoreLabel: '诗意值' },
  { key: 'li-qingzhao-dream', title: '每日古诗词', name: '李清照《如梦令》', subtitle: '宋词 / 昨夜', body: '昨夜雨疏风骤，浓睡不消残酒。', advice: '今天承认疲惫，别用硬撑装清醒。', line: '风雨过去，身体还记得。', scoreLabel: '诗意值' },
  { key: 'li-qingzhao-slow', title: '每日古诗词', name: '李清照《声声慢》', subtitle: '宋词 / 秋愁', body: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。', advice: '今天低落就慢一点，不必立刻恢复成热闹的人。', line: '叠字一多，心事就有了回声。', scoreLabel: '诗意值' },
  { key: 'lu-you-village', title: '每日古诗词', name: '陆游《游山西村》', subtitle: '宋诗 / 转机', body: '山重水复疑无路，柳暗花明又一村。', advice: '今天卡住了也再走几步，转弯处可能有路。', line: '绝路感常常败给下一步。', scoreLabel: '诗意值' },
  { key: 'yang-wanli-pond', title: '每日古诗词', name: '杨万里《小池》', subtitle: '宋诗 / 初夏', body: '小荷才露尖尖角，早有蜻蜓立上头。', advice: '今天保护刚冒头的想法，别急着拿它比赛。', line: '新东西很小，但已经被世界看见。', scoreLabel: '诗意值' },
  { key: 'wang-anshi-guazhou', title: '每日古诗词', name: '王安石《泊船瓜洲》', subtitle: '宋诗 / 归心', body: '春风又绿江南岸，明月何时照我还。', advice: '今天想回到某个地方，就先确认自己真正想回什么。', line: '一个“绿”字，能把岸写活。', scoreLabel: '诗意值' },
  { key: 'nalan-first', title: '每日古诗词', name: '纳兰性德《木兰花令》', subtitle: '清词 / 初见', body: '人生若只如初见，何事秋风悲画扇。', advice: '今天珍惜开始时的清亮，也接受后来会变复杂。', line: '初见很美，但日子会继续写。', scoreLabel: '诗意值' },
);

csSkins.push(
  { key: 'm4a4-asiimov', title: '今日CS皮肤', name: 'M4A4 | Asiimov', weapon: 'M4A4', rarity: 'Covert', subtitle: '白橙科幻 / 老牌大枪皮', scoreLabel: '出货指数', advice: '弹量优势用来转移和压制，别扫到自己都慌。', avoid: '别皮肤很科幻，打法很原始。', line: 'M4A4二西莫夫签，干净点。', fandomFile: 'M4A4_Asiimov.png', fandomPage: 'Asiimov' },
  { key: 'm4a4-desolate-space', title: '今日CS皮肤', name: 'M4A4 | Desolate Space', weapon: 'M4A4', rarity: 'Classified', subtitle: '荒凉太空 / 冷色压迫', scoreLabel: '出货指数', advice: '今天别站桩，打完一波马上换位。', avoid: '别荒凉的是队伍经济。', line: '荒凉太空签，画面可以冷，人别冷场。', fandomFile: 'M4A4_Desolate_Space.png' },
  { key: 'usp-orion', title: '今日CS皮肤', name: 'USP-S | Orion', weapon: 'USP-S', rarity: 'Classified', subtitle: '猎户 / 经典手枪皮', scoreLabel: '出货指数', advice: '手枪局第一枪别急，头线放稳。', avoid: '别猎户没猎到，自己先被点。', line: 'Orion签，老手枪味。', fandomFile: 'USP-S_Orion.png' },
  { key: 'usp-printstream', title: '今日CS皮肤', name: 'USP-S | Printstream', weapon: 'USP-S', rarity: 'Classified', subtitle: '印花集 / 黑白珍珠', scoreLabel: '出货指数', advice: '点射要干净，别连续peek送第二枪。', avoid: '别皮肤极简，操作极乱。', line: 'USP印花集签，干净就完事。', fandomFile: 'USP-S_Printstream.png', fandomPage: 'Printstream' },
  { key: 'glock-water-elemental', title: '今日CS皮肤', name: 'Glock-18 | Water Elemental', weapon: 'Glock-18', rarity: 'Classified', subtitle: '水灵 / 手枪局老朋友', scoreLabel: '出货指数', advice: '抱团近点集火，别远点单点硬耗。', avoid: '别水灵变水枪。', line: '水灵签，手枪局别散。', fandomFile: 'Glock-18_Water_Elemental.png' },
  { key: 'glock-vogue', title: '今日CS皮肤', name: 'Glock-18 | Vogue', weapon: 'Glock-18', rarity: 'Classified', subtitle: '时尚 / 高饱和配色', scoreLabel: '出货指数', advice: '提速可以，但要有补枪，不要一个人开秀。', avoid: '别时尚走秀走到包点门口倒了。', line: 'Vogue签，节目效果先到。', fandomFile: 'Glock-18_Vogue.png' },
  { key: 'deagle-printstream', title: '今日CS皮肤', name: 'Desert Eagle | Printstream', weapon: 'Desert Eagle', rarity: 'Covert', subtitle: '印花集沙鹰 / 一发头信仰', scoreLabel: '出货指数', advice: '等停稳再开枪，别让皮肤替你瞄准。', avoid: '别七发全空还在看珍珠光。', line: '沙鹰印花集签，一发有说法。', fandomFile: 'Desert_Eagle_Printstream.png', fandomPage: 'Printstream' },
  { key: 'deagle-code-red', title: '今日CS皮肤', name: 'Desert Eagle | Code Red', weapon: 'Desert Eagle', rarity: 'Covert', subtitle: '红色代号 / 高压单点', scoreLabel: '出货指数', advice: '别急，沙鹰越急越没戏。', avoid: '别红色代号变红温代号。', line: 'Code Red签，先稳第一发。', fandomFile: 'Desert_Eagle_Code_Red.png' },
  { key: 'galil-chatterbox', title: '今日CS皮肤', name: 'Galil AR | Chatterbox', weapon: 'Galil AR', rarity: 'Covert', subtitle: '喧闹骷髅 / 穷哥们也有排面', scoreLabel: '出货指数', advice: '便宜枪也要控好前十发，别嫌弃。', avoid: '别嘴比枪还碎。', line: '喋喋不休签，枪别碎。', fandomFile: 'Galil_AR_Chatterbox.png' },
  { key: 'galil-eco', title: '今日CS皮肤', name: 'Galil AR | Eco', weapon: 'Galil AR', rarity: 'Classified', subtitle: '经济环保 / 性价比精神', scoreLabel: '出货指数', advice: '今天主打性价比，能换一个就不亏。', avoid: '别经济枪打成捐款枪。', line: 'Eco签，很符合钱包。', fandomFile: 'Galil_AR_Eco.png' },
  { key: 'famas-mecha', title: '今日CS皮肤', name: 'FAMAS | Mecha Industries', weapon: 'FAMAS', rarity: 'Classified', subtitle: '机械工业 / 半甲局硬撑', scoreLabel: '出货指数', advice: '靠位置和交叉火力打，别正面硬碰AK。', avoid: '别枪机械，人没脑。', line: 'FAMAS机械签，会过日子。', fandomFile: 'FAMAS_Mecha_Industries.png' },
  { key: 'famas-commemoration', title: '今日CS皮肤', name: 'FAMAS | Commemoration', weapon: 'FAMAS', rarity: 'Covert', subtitle: '纪念碑 / 金色压迫', scoreLabel: '出货指数', advice: '经济枪也要打出仪式感，第一波别掉。', avoid: '别纪念的是自己白给。', line: '纪念碑签，别让队友给你立碑。', fandomFile: 'FAMAS_Commemoration.png' },
  { key: 'aug-chameleon', title: '今日CS皮肤', name: 'AUG | Chameleon', weapon: 'AUG', rarity: 'Covert', subtitle: '变色龙 / 开镜稳定', scoreLabel: '出货指数', advice: '长枪线拿完优势就换位，别一直开镜发呆。', avoid: '别变色龙变成固定靶。', line: 'AUG变色龙签，别站死。', fandomFile: 'AUG_Chameleon.png' },
  { key: 'aug-bengal', title: '今日CS皮肤', name: 'AUG | Bengal Tiger', weapon: 'AUG', rarity: 'Classified', subtitle: '孟加拉虎 / 老皮肤气质', scoreLabel: '出货指数', advice: '开镜架点可以，但换位要快。', avoid: '别虎皮披上，打法像猫步。', line: '孟加拉虎签，有点老派。', fandomFile: 'AUG_Bengal_Tiger.png' },
  { key: 'sg-integrale', title: '今日CS皮肤', name: 'SG 553 | Integrale', weapon: 'SG 553', rarity: 'Classified', subtitle: '整合 / 稀有感强', scoreLabel: '出货指数', advice: '远点拿信息和首杀，别开镜走太慢。', avoid: '别走位慢到像没加载完。', line: 'Integrale签，懂的都懂。', fandomFile: 'SG_553_Integrale.png' },
  { key: 'sg-cyrex', title: '今日CS皮肤', name: 'SG 553 | Cyrex', weapon: 'SG 553', rarity: 'Classified', subtitle: '红黑科技 / 远点压制', scoreLabel: '出货指数', advice: '开镜打一枪就走，别在同一条线等复仇。', avoid: '别科技感有了，撤退键没了。', line: 'Cyrex签，红黑经典。', fandomFile: 'SG_553_Cyrex.png' },
  { key: 'p250-see-ya', title: '今日CS皮肤', name: 'P250 | See Ya Later', weapon: 'P250', rarity: 'Covert', subtitle: '鳄鱼 / 低成本狠活', scoreLabel: '出货指数', advice: '贴近点第一枪，杀一个就是赚。', avoid: '别还没later，自己先see ya。', line: 'P250鳄鱼签，小枪也能咬人。', fandomFile: 'P250_See_Ya_Later.png' },
  { key: 'p250-asiimov', title: '今日CS皮肤', name: 'P250 | Asiimov', weapon: 'P250', rarity: 'Classified', subtitle: '小二西莫夫 / 经济局科幻', scoreLabel: '出货指数', advice: '别贪远点，贴近打破甲价值。', avoid: '别皮肤比eco计划更完整。', line: 'P250二西莫夫签，穷但帅。', fandomFile: 'P250_Asiimov.png', fandomPage: 'Asiimov' },
  { key: 'five-seven-hyper-beast', title: '今日CS皮肤', name: 'Five-SeveN | Hyper Beast', weapon: 'Five-SeveN', rarity: 'Covert', subtitle: '暴怒野兽 / CT近点爆发', scoreLabel: '出货指数', advice: '等对面进距离再开火，别远点对步枪。', avoid: '别野兽没咬到，人先倒。', line: '57暴怒野兽签，近点有说法。', fandomFile: 'Five-SeveN_Hyper_Beast.png', fandomPage: 'Hyper Beast' },
  { key: 'five-seven-monkey-business', title: '今日CS皮肤', name: 'Five-SeveN | Monkey Business', weapon: 'Five-SeveN', rarity: 'Classified', subtitle: '猴戏 / 近点整活', scoreLabel: '出货指数', advice: '近点打交叉，别真的开始猴。', avoid: '别整活整到队友沉默。', line: '猴戏签，节目效果很足。', fandomFile: 'Five-SeveN_Monkey_Business.png' },
  { key: 'tec9-fuel-injector', title: '今日CS皮肤', name: 'Tec-9 | Fuel Injector', weapon: 'Tec-9', rarity: 'Classified', subtitle: '燃料喷射 / 提速硬冲', scoreLabel: '出货指数', advice: '吃闪提速，第一身位要换到空间。', avoid: '别喷射到半路没人补。', line: 'Tec-9燃料签，冲但别孤独。', fandomFile: 'Tec-9_Fuel_Injector.png' },
  { key: 'tec9-decimator', title: '今日CS皮肤', name: 'Tec-9 | Decimator', weapon: 'Tec-9', rarity: 'Classified', subtitle: '屠杀者 / 紫粉科技', scoreLabel: '出货指数', advice: '近点硬一点，死也要给信息。', avoid: '别紫粉很亮，信息很暗。', line: 'Decimator签，提速有画面。', fandomFile: 'Tec-9_Decimator.png' },
  { key: 'p90-death-by-kitty', title: '今日CS皮肤', name: 'P90 | Death by Kitty', weapon: 'P90', rarity: 'Covert', subtitle: '喵喵杀机 / 老牌整活', scoreLabel: '出货指数', advice: '近点压迫可以，别中远距离硬扫。', avoid: '别猫还没出手，自己先倒。', line: 'P90猫猫签，欢乐但别乱。', fandomFile: 'P90_Death_by_Kitty.png' },
  { key: 'p90-asiimov', title: '今日CS皮肤', name: 'P90 | Asiimov', weapon: 'P90', rarity: 'Covert', subtitle: 'P90二西莫夫 / 跑打科幻', scoreLabel: '出货指数', advice: '打近点压迫，杀一个就换位。', avoid: '别科幻冲锋变科幻白给。', line: 'P90二西莫夫签，节目和火力都有。', fandomFile: 'P90_Asiimov.png', fandomPage: 'Asiimov' },
  { key: 'xm-tranquility', title: '今日CS皮肤', name: 'XM1014 | Tranquility', weapon: 'XM1014', rarity: 'Classified', subtitle: '宁静 / 近点不宁静', scoreLabel: '出货指数', advice: '守窄口和近点，打完马上换位。', avoid: '别追出去和步枪讲道理。', line: '连喷宁静签，名字越静越脏。', fandomFile: 'XM1014_Tranquility.png' },
  { key: 'xm-seasons', title: '今日CS皮肤', name: 'XM1014 | Seasons', weapon: 'XM1014', rarity: 'Restricted', subtitle: '四季 / 霰弹小清新', scoreLabel: '出货指数', advice: '今天用近点和道具偷价值，别贪远。', avoid: '别四季轮换，经济也轮没。', line: 'XM四季签，近点等人来。', fandomFile: 'XM1014_Seasons.png' },
  { key: 'ssg-dragonfire', title: '今日CS皮肤', name: 'SSG 08 | Dragonfire', weapon: 'SSG 08', rarity: 'Covert', subtitle: '龙火 / 轻狙威胁', scoreLabel: '出货指数', advice: '打一枪就走，靠机动性赚信息。', avoid: '别轻狙重站桩。', line: '鸟狙龙火签，轻但有火。', fandomFile: 'SSG_08_Dragonfire.png' },
  { key: 'ssg-bloodshot', title: '今日CS皮肤', name: 'SSG 08 | Bloodshot', weapon: 'SSG 08', rarity: 'Classified', subtitle: '血腥快照 / 经济局威慑', scoreLabel: '出货指数', advice: '第一枪压住，空了就撤，别留第二枪给对面。', avoid: '别截图没截到，自己先上镜。', line: 'Bloodshot签，打一枪就跑。', fandomFile: 'SSG_08_Bloodshot.png' },
);

csTeams.push(
  { key: 'nip', title: '今日CS队伍', name: 'Ninjas in Pyjamas', subtitle: '老牌豪门 / 体系重塑', scoreLabel: '签位强度', advice: '先把默认和补枪做完整，别只靠队名加成。', avoid: '别老牌味只剩回忆。', line: 'NiP签有历史包袱，今天得靠回合说话。', liquipediaPage: 'Ninjas in Pyjamas', playerImageFallback: 'f0rest' },
  { key: 'fnatic', title: '今日CS队伍', name: 'fnatic', subtitle: '经典豪门 / 中期调整', scoreLabel: '签位强度', advice: '少乱转，多确认信息，别把老经验打成老问题。', avoid: '别优势局先怀旧。', line: 'fnatic签老味很足，细节也得跟上。', liquipediaPage: 'Fnatic', playerImageFallback: 'olofmeister' },
  { key: 'cloud9', title: '今日CS队伍', name: 'Cloud9', subtitle: '北美名门 / 国际阵容语境', scoreLabel: '签位强度', advice: '靠个人能力开局面，但别让回合结构散掉。', avoid: '别打着打着像临时组队。', line: 'C9签有流量，流量不能替你补枪。', liquipediaPage: 'Cloud9', playerImageFallback: 'sh1ro' },
  { key: 'ence', title: '今日CS队伍', name: 'ENCE', subtitle: '欧洲体系 / 默认和纪律', scoreLabel: '签位强度', advice: '今天慢控要有目的，拿到信息再提速。', avoid: '别默认默认到时间没了。', line: 'ENCE签就是把小细节磨出来。', liquipediaPage: 'ENCE', playerImageFallback: 'gla1ve' },
  { key: 'gamerlegion', title: '今日CS队伍', name: 'GamerLegion', subtitle: '黑马气质 / 执行和韧性', scoreLabel: '签位强度', advice: '别怕强队，先把自己回合打完整。', avoid: '别领先后突然不会收。', line: 'GL签经常有惊喜，但惊喜要靠纪律。', liquipediaPage: 'GamerLegion', playerImageFallback: 'siuhy' },
  { key: 'saw', title: '今日CS队伍', name: 'SAW', subtitle: '葡萄牙体系 / 团队执行', scoreLabel: '签位强度', advice: '道具和同步要打满，靠团队交换磨回合。', avoid: '别单点硬拉把体系拆了。', line: 'SAW签不花，但很讲耐心。', liquipediaPage: 'SAW' },
  { key: 'flyquest', title: '今日CS队伍', name: 'FlyQuest', subtitle: '大洋洲代表 / 冲击节奏', scoreLabel: '签位强度', advice: '正面可以敢打，但补枪距离别断。', avoid: '别打快变成送快。', line: 'FlyQuest签有冲劲，先别自己断电。', liquipediaPage: 'FlyQuest' },
  { key: 'mibr', title: '今日CS队伍', name: 'MIBR', subtitle: '巴西传统 / 情绪和枪法', scoreLabel: '签位强度', advice: '气势要有，细节也要有，别只靠吼。', avoid: '别第一波没换到就红温。', line: 'MIBR签一出，巴西味到位了。', liquipediaPage: 'MIBR', playerImageFallback: 'coldzera' },
  { key: 'm80', title: '今日CS队伍', name: 'M80', subtitle: '北美新锐 / 正面交换', scoreLabel: '签位强度', advice: '打出年轻队的速度，但别把站位拉散。', avoid: '别年轻气盛变成年轻白给。', line: 'M80签有劲，劲要往回合目标上使。', liquipediaPage: 'M80' },
  { key: 'betboom', title: '今日CS队伍', name: 'BetBoom Team', subtitle: '独联体枪男 / 节奏爆发', scoreLabel: '签位强度', advice: '用枪法拿首杀后马上收口，别贪第二波。', avoid: '别优势枪位打成赌博。', line: 'BetBoom签很敢打，敢打也要敢收。', liquipediaPage: 'BetBoom Team', playerImageFallback: 'Jame' },
  { key: 'b8', title: '今日CS队伍', name: 'B8', subtitle: '东欧韧性 / 回合阅读', scoreLabel: '签位强度', advice: '中期别断信息，人数劣势也要找交换窗口。', avoid: '别小劣势直接散架。', line: 'B8签主打韧性，急了就没味。', liquipediaPage: 'B8' },
  { key: 'rare-atom', title: '今日CS队伍', name: 'Rare Atom', subtitle: '中国CS语境 / 枪感和执行', scoreLabel: '签位强度', advice: '先把默认控图做细，机会来了再提速。', avoid: '别对枪敢了，补枪忘了。', line: 'RA签抽到，今天给点CNCS期待。', liquipediaPage: 'Rare Atom', playerImageFallback: 'JamYoung' },
);

csMaps.push(
  { key: 'agency', title: '今日CS地图', name: 'Agency', subtitle: '人质图 / 多层结构和近点清理', scoreLabel: '手感指数', advice: '先用道具切空间，楼梯和近点别硬闯。', avoid: '别把人质图打成无道具冲锋。', line: 'Agency签很考沟通，沉默就容易迷路。', fandomPage: 'Agency', fandomFile: 'Cs_agency.png' },
  { key: 'assault', title: '今日CS地图', name: 'Assault', subtitle: '仓库人质 / 长枪线和突破口', scoreLabel: '手感指数', advice: '进仓库前先清关键架点，别一个门排队进。', avoid: '别冲进去才想起来没人补闪。', line: 'Assault签很老派，白给也很复古。', fandomPage: 'Assault', fandomFile: 'Cs_assault.png' },
  { key: 'militia', title: '今日CS地图', name: 'Militia', subtitle: '野外和房区 / 信息搜集', scoreLabel: '手感指数', advice: '慢慢拿外场信息，进房区前先处理近点。', avoid: '别逛图逛到时间没了。', line: 'Militia签像郊游，问题是对面有枪。', fandomPage: 'Militia', fandomFile: 'Cs_militia.png' },
  { key: 'aztec', title: '今日CS地图', name: 'Aztec', subtitle: '经典雨林 / 长廊和桥位', scoreLabel: '手感指数', advice: '长枪线别硬赌，先用烟闪切角度。', avoid: '别把经典图打成经典白给。', line: 'Aztec签老古董，但枪线一点不客气。', fandomPage: 'Aztec', fandomFile: 'De_aztec.png' },
);

csWeapons.push(
  { key: 'p2000', title: '今日CS武器', name: 'P2000', subtitle: 'CT手枪 / 稳定点射', scoreLabel: '爆头指数', advice: '头线放稳，别连续peek，打完马上换位。', avoid: '别把备用手枪打成备用人生。', line: 'P2000签低调，低调也能点头。', fandomPage: 'P2000', fandomFile: 'CS2_P2000_Inventory.png' },
  { key: 'dual-berettas', title: '今日CS武器', name: 'Dual Berettas', subtitle: '双持手枪 / 近点火力', scoreLabel: '爆头指数', advice: '贴近打人数和弹量优势，别远点乱泼。', avoid: '别两把枪打出半把效果。', line: '双枪签节目感很强，但准星也得有。', fandomPage: 'Dual Berettas', fandomFile: 'CS2_Dual_Berettas_Inventory.png' },
  { key: 'cz75', title: '今日CS武器', name: 'CZ75-Auto', subtitle: '自动手枪 / 近点爆发', scoreLabel: '爆头指数', advice: '等对面进距离再泼，杀一个就撤，子弹很贵。', avoid: '别第一梭空了还想续命。', line: 'CZ签就是一波流，犹豫就没了。', fandomPage: 'CZ75-Auto', fandomFile: 'CS2_CZ75-Auto_Inventory.png' },
  { key: 'r8', title: '今日CS武器', name: 'R8 Revolver', subtitle: '左轮 / 慢热高伤害', scoreLabel: '爆头指数', advice: '预瞄提前，别临脸才想起来蓄力。', avoid: '别枪声很大，作用很小。', line: '左轮签很有性格，性格别大过回合。', fandomPage: 'R8 Revolver', fandomFile: 'CS2_R8_Revolver_Inventory.png' },
  { key: 'ump45', title: '今日CS武器', name: 'UMP-45', subtitle: '稳健SMG / 近中距离', scoreLabel: '爆头指数', advice: '打近中距离和补枪，杀一个就赚经济。', avoid: '别拿UMP远点对AK讲道理。', line: 'UMP签朴实，朴实也能赚钱。', fandomPage: 'UMP-45', fandomFile: 'CS2_UMP-45_Inventory.png' },
  { key: 'pp-bizon', title: '今日CS武器', name: 'PP-Bizon', subtitle: '大弹鼓 / 低甲压制', scoreLabel: '爆头指数', advice: '靠弹量压近点，别把扫射当战术全部。', avoid: '别一梭子热闹完没有击杀。', line: '野牛签很欢乐，但欢乐要换人头。', fandomPage: 'PP-Bizon', fandomFile: 'CS2_PP-Bizon_Inventory.png' },
  { key: 'mp7', title: '今日CS武器', name: 'MP7', subtitle: '均衡SMG / 经济滚雪球', scoreLabel: '爆头指数', advice: '贴近打干净交换，别贪远点。', avoid: '别花钱买了枪，打法还像无甲。', line: 'MP7签稳，稳里也得有杀意。', fandomPage: 'MP7', fandomFile: 'CS2_MP7_Inventory.png' },
  { key: 'mp5sd', title: '今日CS武器', name: 'MP5-SD', subtitle: '消音SMG / 偷人和转点', scoreLabel: '爆头指数', advice: '用消音和近点位偷节奏，打完换位置。', avoid: '别偷人偷成自己失踪。', line: 'MP5签很轻，轻到队友可能忘了你在。', fandomPage: 'MP5-SD', fandomFile: 'CS2_MP5-SD_Inventory.png' },
  { key: 'nova', title: '今日CS武器', name: 'Nova', subtitle: '经济喷子 / 近点一枪', scoreLabel: '爆头指数', advice: '卡窄口，等近点，打完就跑。', avoid: '别拿喷子追远点长枪。', line: 'Nova签很现实，距离对了才有道理。', fandomPage: 'Nova', fandomFile: 'CS2_Nova_Inventory.png' },
  { key: 'mag7', title: '今日CS武器', name: 'MAG-7', subtitle: 'CT近点喷子 / 跳打和压迫', scoreLabel: '爆头指数', advice: '守近点和拐角，利用移动优势偷第一枪。', avoid: '别跳出去发现距离不对。', line: 'MAG-7签很脏，脏得有位置才行。', fandomPage: 'MAG-7', fandomFile: 'CS2_MAG-7_Inventory.png' },
  { key: 'sawedoff', title: '今日CS武器', name: 'Sawed-Off', subtitle: 'T方短喷 / 近点伏击', scoreLabel: '爆头指数', advice: '贴脸才有威胁，别提前露声音和位置。', avoid: '别手短还站远点。', line: '截短喷签，距离就是生命线。', fandomPage: 'Sawed-Off', fandomFile: 'CS2_Sawed-Off_Inventory.png' },
  { key: 'm249', title: '今日CS武器', name: 'M249', subtitle: '重机枪 / 价格和节目效果', scoreLabel: '爆头指数', advice: '真起了就架住关键口，别移动扫射当烟花。', avoid: '别钱花最多，作用最少。', line: 'M249签一出，队伍经济开始冒汗。', fandomPage: 'M249', fandomFile: 'CS2_M249_Inventory.png' },
  { key: 'negev', title: '今日CS武器', name: 'Negev', subtitle: '压制机枪 / 火力封锁', scoreLabel: '爆头指数', advice: '提前架住窄口压制，别临场才开始预热弹道。', avoid: '别扫得很热闹，包点没人看。', line: 'Negev签主打弹幕，别真把自己当弹幕。', fandomPage: 'Negev', fandomFile: 'CS2_Negev_Inventory.png' },
  { key: 'g3sg1', title: '今日CS武器', name: 'G3SG1', subtitle: 'T方连狙 / 高压长枪线', scoreLabel: '爆头指数', advice: '架住关键长线，拿到优势就别贪。', avoid: '别连狙起出来还被沙鹰一发收。', line: 'G3SG1签很招恨，招恨前先打中。', fandomPage: 'G3SG1', fandomFile: 'CS2_G3SG1_Inventory.png' },
  { key: 'scar20', title: '今日CS武器', name: 'SCAR-20', subtitle: 'CT连狙 / 封锁和压迫', scoreLabel: '爆头指数', advice: '控长线和回防入口，别站死等对面道具清你。', avoid: '别连狙没打出压迫，只打出骂声。', line: 'SCAR签，火力压迫可以，别压迫队友钱包。', fandomPage: 'SCAR-20', fandomFile: 'CS2_SCAR-20_Inventory.png' },
  { key: 'zeus-x27', title: '今日CS武器', name: 'Zeus x27', subtitle: '电击枪 / 贴脸胆量测试', scoreLabel: '爆头指数', advice: '藏近点，听脚步，距离到了再出手。', avoid: '别没电到人，自己先成素材。', line: '电击枪签很短，也很刺激。', fandomPage: 'Zeus x27', fandomFile: 'CS2_Zeus_x27_Inventory.png' },
);

csSkins.push(
  { key: 'p2000-fire-elemental', title: '今日CS皮肤', name: 'P2000 | Fire Elemental', weapon: 'P2000', rarity: 'Covert', subtitle: '火灵 / CT手枪压迫感', scoreLabel: '出货指数', advice: '手枪局先稳第一枪，别被皮肤烧上头。', avoid: '别火灵变火葬。', line: 'P2000火灵签，老手枪也有排面。' },
  { key: 'dual-berettas-melondrama', title: '今日CS皮肤', name: 'Dual Berettas | Melondrama', weapon: 'Dual Berettas', rarity: 'Classified', subtitle: '瓜戏 / 双持整活', scoreLabel: '出货指数', advice: '近点用弹量压人，别远点乱点。', avoid: '别戏很多，击杀很少。', line: 'Melondrama签，节目效果先满。' },
  { key: 'cz75-victoria', title: '今日CS皮肤', name: 'CZ75-Auto | Victoria', weapon: 'CZ75-Auto', rarity: 'Covert', subtitle: '维多利亚 / 自动手枪老贵气', scoreLabel: '出货指数', advice: '第一梭要打出价值，打完赶紧撤。', avoid: '别贵气没了，子弹也没了。', line: 'CZ维多利亚签，开局就得讲效率。' },
  { key: 'r8-fade', title: '今日CS皮肤', name: 'R8 Revolver | Fade', weapon: 'R8 Revolver', rarity: 'Covert', subtitle: '渐变左轮 / 慢枪也有排面', scoreLabel: '出货指数', advice: '预瞄提前，别临脸才慢悠悠蓄力。', avoid: '别渐变很丝滑，开枪很拖沓。', line: 'R8渐变签，帅但要命中。' },
  { key: 'ump-primal-saber', title: '今日CS皮肤', name: 'UMP-45 | Primal Saber', weapon: 'UMP-45', rarity: 'Classified', subtitle: '原始剑齿虎 / SMG硬派皮', scoreLabel: '出货指数', advice: '近中距离打干净交换，别贪远点。', avoid: '别剑齿虎变家猫。', line: 'UMP剑齿虎签，有点凶。' },
  { key: 'bizon-judgement', title: '今日CS皮肤', name: 'PP-Bizon | Judgement of Anubis', weapon: 'PP-Bizon', rarity: 'Covert', subtitle: '阿努比斯审判 / 大弹鼓仪式感', scoreLabel: '出货指数', advice: '靠弹量压近点，但别忘了停枪换位。', avoid: '别审判的是自己经济。', line: '野牛审判签，名字比枪还狠。' },
  { key: 'mp7-bloodsport', title: '今日CS皮肤', name: 'MP7 | Bloodsport', weapon: 'MP7', rarity: 'Covert', subtitle: '血腥运动 / SMG红白科技', scoreLabel: '出货指数', advice: '打经济局要收干净，别送钱。', avoid: '别运动起来只剩跑。', line: 'MP7血腥运动签，干净利落。' },
  { key: 'mp5-phosphor', title: '今日CS皮肤', name: 'MP5-SD | Phosphor', weapon: 'MP5-SD', rarity: 'Classified', subtitle: '磷光 / 消音流光', scoreLabel: '出货指数', advice: '用消音偷节奏，别一直站同一个点。', avoid: '别光很亮，信息很暗。', line: 'MP5磷光签，低调里带点骚。' },
  { key: 'nova-hyper-beast', title: '今日CS皮肤', name: 'Nova | Hyper Beast', weapon: 'Nova', rarity: 'Classified', subtitle: '暴怒野兽 / 喷子也有名皮', scoreLabel: '出货指数', advice: '卡近点一枪说话，别追远点。', avoid: '别野兽还没咬，人先送了。', line: 'Nova暴怒野兽签，近点别手软。' },
  { key: 'mag7-justice', title: '今日CS皮肤', name: 'MAG-7 | Justice', weapon: 'MAG-7', rarity: 'Classified', subtitle: '正义 / CT近点判官', scoreLabel: '出货指数', advice: '等距离到了再开火，杀完就撤。', avoid: '别正义没来，经济先没。', line: 'MAG-7正义签，判得准才算数。' },
  { key: 'sawedoff-kraken', title: '今日CS皮肤', name: 'Sawed-Off | The Kraken', weapon: 'Sawed-Off', rarity: 'Covert', subtitle: '海怪 / 短喷经典', scoreLabel: '出货指数', advice: '贴脸伏击，打一枪就换位置。', avoid: '别海怪上岸就搁浅。', line: '截短喷海怪签，近点有故事。' },
  { key: 'm249-nebula-crusader', title: '今日CS皮肤', name: 'M249 | Nebula Crusader', weapon: 'M249', rarity: 'Restricted', subtitle: '星云十字军 / 重机枪科幻感', scoreLabel: '出货指数', advice: '架住窄口打压制，别移动泼水。', avoid: '别花最多的钱打最少的作用。', line: 'M249星云签，钱包先敬礼。' },
  { key: 'negev-mjolnir', title: '今日CS皮肤', name: 'Negev | Mjolnir', weapon: 'Negev', rarity: 'Covert', subtitle: '雷神之锤 / 稀有重火力', scoreLabel: '出货指数', advice: '提前压枪线，别临时抱枪乱扫。', avoid: '别锤的是队伍经济。', line: 'Negev雷锤签，贵得很有存在感。' },
  { key: 'g3sg1-executioner', title: '今日CS皮肤', name: 'G3SG1 | The Executioner', weapon: 'G3SG1', rarity: 'Classified', subtitle: '行刑者 / T方连狙压迫', scoreLabel: '出货指数', advice: '架住长线，拿到击杀别贪同角度。', avoid: '别行刑者先被处刑。', line: 'G3SG1行刑者签，很招恨也很有用。' },
  { key: 'scar20-bloodsport', title: '今日CS皮肤', name: 'SCAR-20 | Bloodsport', weapon: 'SCAR-20', rarity: 'Classified', subtitle: '血腥运动 / CT连狙红白科技', scoreLabel: '出货指数', advice: '封锁入口，别站死吃道具。', avoid: '别连狙起出来只贡献音效。', line: 'SCAR血腥运动签，压迫感拉满。' },
  { key: 'zeus-olympus', title: '今日CS皮肤', name: 'Zeus x27 | Olympus', weapon: 'Zeus x27', rarity: 'Classified', subtitle: '奥林匹斯 / 贴脸闪电', scoreLabel: '出货指数', advice: '等距离，听脚步，一下就要电中。', avoid: '别闪电没劈到，自己先倒。', line: 'Zeus奥林匹斯签，短但刺激。' },
);
