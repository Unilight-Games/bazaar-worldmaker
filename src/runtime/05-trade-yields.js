// ---------- trade: what the ground around each city yields, what each city needs, and how the goods travel ----------
// Every city works the hexes nearest to it, a wider ring for a bigger city. Each kind of ground yields its own goods and each zone
// adds its own: the mines of the Karahara, the phantom haze of Grandfall, the dwarves under Handerlaw, the elves of Qredens who
// will not dig. A city keeps what it needs and sells the rest to whoever can fetch it cheapest. Boats carry most of it: a load on
// a lake, the sea or a navigable river costs a fraction of what it costs a caravan, and a caravan on a road a fraction of one off it.
// Workshops in the bigger cities turn ore, fuel, timber and mana into tools, arms, devices, ships and books.
const ECAT = {   // name, colour, value of a load, bulk (what a load pays per unit of travel)
  grain: { name: 'ธัญพืชและอาหารหลัก', col: '#e3c46a', v: 1, bulk: 1 },
  protein: { name: 'เนื้อ ปลา นม และไข่', col: '#e0896a', v: 1.6, bulk: 0.9 },
  salt: { name: 'เกลือ', col: '#ece6d8', v: 2.2, bulk: 0.8 },
  herbs: { name: 'เห็ด สมุนไพร และเครื่องเทศ', col: '#93c46e', v: 4, bulk: 0.3 },
  timber: { name: 'ไม้', col: '#a37b4c', v: 1.1, bulk: 1.4 },
  fuel: { name: 'เชื้อเพลิงและยางไม้', col: '#8a735c', v: 1, bulk: 1.2 },
  stone: { name: 'หินและดินปั้น', col: '#b9ae9a', v: 0.7, bulk: 1.6 },
  ore: { name: 'แร่', col: '#9a9aa6', v: 1.4, bulk: 1.3 },
  cloth: { name: 'เส้นใย หนัง และเชือก', col: '#c9a0d0', v: 3, bulk: 0.45 },
  mana: { name: 'ศิลาเวทและวัสดุมานา', col: '#7fb6ff', v: 6, bulk: 0.35 },
  rare: { name: 'โลหะมีค่าและโลหะหายาก', col: '#f2d48a', v: 10, bulk: 0.35 },
  luxury: { name: 'ของหายาก', col: '#e58fb8', v: 8, bulk: 0.15 },
  tools: { name: 'เครื่องมือโลหะ', col: '#aab5c3', v: 4, bulk: 0.6, made: true },
  arms: { name: 'อาวุธและชุดเกราะ', col: '#d26a5a', v: 6, bulk: 0.7, made: true },
  tech: { name: 'เครื่องกลและอุปกรณ์เวท', col: '#6ad0c8', v: 10, bulk: 0.4, made: true },
  ships: { name: 'เรือ', col: '#5a90b4', v: 8, bulk: 0.05, made: true },
  books: { name: 'ตำราและความรู้', col: '#dccca2', v: 6, bulk: 0.2, made: true },
  labor: { name: 'แรงงาน (ทาส)', col: '#d0343c', v: 1, bulk: 0.5, people: true },   // people bought and sold (v0.13.0): no ground yields it and no workshop makes it; the year's slave trade fills its books
};
// on a map of our own world the class that is mana in Gresland is crude oil, priced with gems and gold as the owner ruled; coal burns with the other fuels
if (BLANK) { ECAT.mana.name = 'น้ำมันดิบ'; ECAT.mana.v = ECAT.rare.v; ECAT.fuel.name = 'เชื้อเพลิง ถ่านหิน และยางไม้'; ECAT.tech.name = 'เครื่องจักรและเครื่องกล'; ECAT.rare.name = 'โลหะมีค่าและอัญมณี'; ECAT.herbs.name = 'สมุนไพร เครื่องเทศ และน้ำผึ้ง'; }
const ECATS = Object.keys(ECAT), ERAW = ECATS.filter(c => !ECAT[c].made && !ECAT[c].people), EMADEC = ECATS.filter(c => ECAT[c].made);
const KIX = { capital: 0, city: 1, town: 2, fort: 3, village: 4 };
const EPOP = [12, 7, 4, 3, 1.6];                   // heads of a capital, a city, a town, a fort, a village
const EREACH = [7, 6, 5, 4, 4];                    // how far out each works the land, in hexes of open ground
const EIND = [1, 0.8, 0.4, 0.35, 0.1];             // workshops per head
const ENEED = {                                    // loads a head needs a year, capital, city, town, fort, village
  grain: [1, 1, 1, 1, 1], protein: [0.5, 0.45, 0.4, 0.5, 0.35], salt: [0.09, 0.08, 0.08, 0.08, 0.07], herbs: [0.08, 0.06, 0.04, 0.03, 0.02],
  timber: [0.3, 0.25, 0.2, 0.25, 0.15], fuel: [0.25, 0.2, 0.18, 0.2, 0.15], stone: [0.2, 0.15, 0.08, 0.2, 0.04], ore: [0, 0, 0, 0, 0],
  cloth: [0.18, 0.15, 0.12, 0.12, 0.08], mana: [0.16, 0.1, 0.04, 0.08, 0.01], rare: [0.05, 0.03, 0.01, 0.01, 0], luxury: [0.14, 0.08, 0.03, 0.02, 0.01],
  tools: [0.1, 0.1, 0.1, 0.08, 0.1], arms: [0.12, 0.08, 0.03, 0.35, 0.01], tech: [0.06, 0.04, 0.01, 0.04, 0], ships: [0.04, 0.03, 0.015, 0.01, 0.01],
  books: [0.03, 0.02, 0.005, 0.004, 0], labor: [0, 0, 0, 0, 0],
};
// the workshops: loads a head turns out at full supply, and what one load takes
const EWORK = {
  tools: { base: 0.11, in: { ore: 1, fuel: 0.5 } },
  arms: { base: 0.14, in: { ore: 0.9, fuel: 0.4, timber: 0.3 } },
  tech: { base: 0.05, in: { mana: 0.8, ore: 0.3, rare: 0.2 } },
  ships: { base: 0.05, in: { timber: 2, fuel: 0.4, cloth: 0.3 } },
  books: { base: 0.04, in: { timber: 0.3, cloth: 0.05 } },
};
if (BLANK) { ENEED.mana = ENEED.mana.map(x => x * 0.4); EWORK.tech.in = { mana: 0.3, fuel: 0.5, ore: 0.3, rare: 0.2 }; }   // oil is dear and scarce: a head burns less of it, and machines run on coal too (my numbers)
const SB = (H, s) => { let t = 0; for (const ch of s) t += H.b[ch] || 0; return t; };                   // land of these kinds
const SZ = (H, s, z) => { let t = 0; for (const ch of s) t += H.bz[ch + z] || 0; return t; };          // the same within one zone
const NOQ = (H, s) => SB(H, s) - SZ(H, s, 'Q');                                                        // the elves of Qredens dig no mines
const SBA = (H, s) => { let t = 0; for (const ch of s) t += H.ba[ch] || 0; return t; };              // the same, each hex weighed by the rain-fed grain it can grow
