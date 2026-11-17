import Fuse from 'fuse.js';

export type SearchFood = {slug: string; name: string; aliases: string[]; category: string};
const traditional: Record<string,string> = {'雞':'鸡','凍':'冻','條':'条','饅':'馒','頭':'头','撻':'挞','蝦':'虾','魚':'鱼','飯':'饭','燒':'烧','馬':'马','鈴':'铃','紅':'红','蘭':'兰','奧':'奥','爾':'尔','餅':'饼','鮮':'鲜','復':'复','熱':'热','氣':'气','鍋':'锅','蓮':'莲','鮑':'鲍','腸':'肠','鹽':'盐','醬':'酱','蔥':'葱','蘿':'萝','蔔':'卜','蘋':'苹','鳳':'凤','黃':'黄','帶':'带','麵':'面','薩':'萨','嗎':'吗','點':'点','鴨':'鸭','筍':'笋','絲':'丝','幾':'几','長':'长','時':'时','間':'间'};
export const normalizeSearch = (text: string) => text.normalize('NFKC').toLowerCase().replace(/./gu,c=>traditional[c]??c).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Everyday ingredient names, not alternative cooking conditions or methods.
const synonyms = [
  ['鸡翅','鸡中翅','中翅','鸡翼'], ['红薯','地瓜','番薯','蕃薯'],
  ['土豆','马铃薯','洋芋'], ['排骨','小排','肋排'], ['馒头','馍'],
  ['西兰花','西蓝花','青花菜'], ['茄子','aubergine','eggplant'],
  ['菜花','花菜','花椰菜'], ['莲藕','藕片'], ['口蘑','白蘑菇'],
  ['年糕','rice cakes'], ['菠萝','凤梨','pineapple'],
];
// Explicit full pinyin helps keyboard input without noisy one-letter initials.
const pinyin: [string,string][] = [
  ['鸡翅','ji chi'],['鸡中翅','ji zhong chi'],['奥尔良','ao er liang'],
  ['鸡胸','ji xiong'],['鸡腿','ji tui'],['排骨','pai gu'],['五花肉','wu hua rou'],
  ['红薯','hong shu'],['地瓜','di gua'],['土豆','tu dou'],['薯条','shu tiao'],
  ['豆腐','dou fu'],['西兰花','xi lan hua'],['菜花','cai hua'],['花菜','hua cai'],
  ['三文鱼','san wen yu'],['带鱼','dai yu'],['鱿鱼','you yu'],['虾','xia'],
  ['馒头','man tou'],['油条','you tiao'],['蛋挞','dan ta'],['糍粑','ci ba'],
  ['手抓饼','shou zhua bing'],['南瓜','nan gua'],['金针菇','jin zhen gu'],
  ['杏鲍菇','xing bao gu'],['香菇','xiang gu'],['口蘑','kou mo'],
  ['莲藕','lian ou'],['藕片','ou pian'],['韭菜','jiu cai'],['秋葵','qiu kui'],
  ['板栗','ban li'],['花生','hua sheng'],['腰果','yao guo'],
  ['玉米','yu mi'],['吐司','tu si'],['香蕉','xiang jiao'],['苹果','ping guo'],
  ['菠萝','bo luo'],['凤梨','feng li'],['年糕','nian gao'],['饺子','jiao zi'],
  ['培根','pei gen'],['香肠','xiang chang'],['猪肉肠','zhu rou chang'],
  ['司康','si kang'],['桃子','tao zi'],['黄桃','huang tao'],['麦芬','mai fen'],
  ['华夫饼','hua fu bing'],['贝果','bei guo'],['鲽鱼','die yu'],
  ['包菜','bao cai'],['甘蓝','gan lan'],['芦笋','lu sun'],['茄子','qie zi'],
  ['胡萝卜','hu luo bo'],['洋葱','yang cong'],['甜椒','tian jiao'],
  ['鳕鱼','xue yu'],['扇贝','shan bei'],['肉丸','rou wan'],['披萨','pi sa'],
  ['虾仁','xia ren'],['鸡块','ji kuai'],
];
const compact = (text: string) => text.replaceAll(' ','');
function wordContains(text: string,query: string) {
  if(/[\u3400-\u9fff]/u.test(query)) return compact(text).includes(compact(query));
  return text.split(' ').some((_,i,a)=>a.slice(i).join(' ').startsWith(query));
}
function nearbyChinese(text: string,query: string) {
  if(!/^[\u3400-\u9fff]{2,}$/u.test(query)) return false;
  const q=[...query],t=[...compact(text)];
  // Allow a missing qualifier: 鸡翅 -> 鸡中翅, 冷冻薯条 -> 冷冻细薯条.
  for(let start=0;start<t.length;start++) {
    if(t[start]!==q[0]) continue;
    let at=start+1,matched=1;
    while(at<t.length && at-start<=q.length+2 && matched<q.length) {if(t[at]===q[matched])matched++;at++;}
    if(matched===q.length) return true;
  }
  return false;
}
// Match whole ingredient words, including a transposed pair. A loose substring
// score alone can confuse an absent ingredient (rice) with a real one (fries).
function spellingDistance(a: string,b: string) {
  const d=Array.from({length:a.length+1},()=>Array<number>(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) d[i][0]=i;
  for(let j=0;j<=b.length;j++) d[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+Number(a[i-1]!==b[j-1]));
    if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[a.length][b.length];
}
function plausibleSpelling(terms: string[],tokens: string[]) {
  const words=terms.flatMap(term=>term.split(' '));
  return tokens.every(token=>words.some(word=>{
    if(word.startsWith(token)) return true;
    if(!/^[a-z]{4,}$/u.test(token) || !/^[a-z]+$/u.test(word)) return false;
    const limit=token.length>=7?2:1;
    return Math.abs(word.length-token.length)<=limit && spellingDistance(token,word)<=limit;
  }));
}
export function createFoodSearch<T extends SearchFood>(items: T[]) {
  const records=items.map((item,index)=>{
    const terms=[...new Set([item.name,...item.aliases].map(normalizeSearch).filter(Boolean))];
    const additions=synonyms.filter(group=>group.some(word=>terms.some(term=>term.includes(word)))).flat();
    const spellings=pinyin.filter(([word])=>[...terms,...additions].some(term=>term.includes(word))).flatMap(([,spelling])=>[spelling,compact(spelling)]);
    return {item,index,terms:[...terms,...additions,...spellings]};
  });
  const fuzzy=new Fuse(records,{keys:['terms'],includeScore:true,threshold:0.42,ignoreLocation:true,minMatchCharLength:1,fieldNormWeight:0});
  return (raw: string): T[] => {
    const query=normalizeSearch(raw);
    if(!query) return items;
    const tokens=query.split(/\s+/u),scores=new Map<number,number>();
    for(const record of records) {
      const exact=record.terms.some(term=>term===query);
      const phrase=record.terms.some(term=>wordContains(term,query));
      const allTokens=tokens.length>1 && tokens.every(token=>record.terms.some(term=>wordContains(term,token)));
      const nearby=record.terms.some(term=>nearbyChinese(term,query));
      if(exact || phrase || allTokens || nearby) scores.set(record.index,exact?0:phrase?0.08:allTokens?0.12:0.18);
    }
    // A known ingredient must not acquire other ingredients via spelling repair.
    // Otherwise filtering "frozen wings" by state could leave only onion rings.
    if(scores.size) return [...scores].sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(([index])=>items[index]);
    for(const match of fuzzy.search(query)) {
      if(!plausibleSpelling(match.item.terms,tokens)) continue;
      const score=0.25+(match.score??1);
      if(!scores.has(match.item.index))scores.set(match.item.index,score);
    }
    return [...scores].sort((a,b)=>a[1]-b[1]||a[0]-b[0]).map(([index])=>items[index]);
  };
}
