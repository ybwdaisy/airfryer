import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFoodSearch,normalizeSearch} from '../src/lib/food-search.ts';
import {readFileSync,readdirSync} from 'node:fs';
import {assembleCatalog} from '../src/lib/catalog.ts';
import {createRecipeSearch} from '../src/lib/recipe-search.ts';
const foods=[
 {slug:'wings',name:'奥尔良鸡中翅',aliases:['Orleans-style mid-joint wings'],category:'meat'},
 {slug:'sweet',name:'整根烤红薯',aliases:['Whole sweet potato'],category:'vegetables'},
 {slug:'ribs',name:'先炖后烤蒜香小排',aliases:['Garlic pork ribs'],category:'meat'},
 {slug:'fries',name:'袋装冷冻细薯条',aliases:['Frozen thin fries','French fries'],category:'frozen'},
 {slug:'broccoli',name:'西兰花',aliases:['Broccoli florets'],category:'vegetables'},
 {slug:'tofu',name:'椒盐老豆腐',aliases:['Firm tofu'],category:'vegetables'},
];
const search=createFoodSearch(foods);
test('Chinese short ingredient names and missing qualifiers find the real dish',()=>{
 for(const [query,slug] of [['鸡翅','wings'],['冷冻薯条','fries'],['排骨','ribs'],['地瓜','sweet'],['蕃薯','sweet'],['青花菜','broccoli']])assert.equal(search(query)[0]?.slug,slug,query);
});
test('traditional, width, punctuation and case normalize consistently',()=>{
 assert.equal(search('雞翅')[0]?.slug,'wings');assert.equal(search('冷凍薯條')[0]?.slug,'fries');assert.equal(search('紅薯')[0]?.slug,'sweet');
 assert.equal(search('ＦＲＥＮＣＨ－ＦＲＩＥＳ')[0]?.slug,'fries');assert.equal(normalizeSearch('  冷凍 薯條 '),'冷冻 薯条');
});
test('real fuzzy spelling and token reordering work in English',()=>{
 assert.equal(search('brocolli')[0]?.slug,'broccoli');assert.equal(search('frise')[0]?.slug,'fries');
 assert.equal(search('fries frozen')[0]?.slug,'fries');
});
test('unknown ingredients stay empty and blank queries preserve catalog order',()=>{
 assert.deepEqual(search('菠菜'),[]);assert.deepEqual(search('zzzzzznonexistent'),[]);assert.deepEqual(search('  '),foods);
 for(const query of ['bacon','chips','rice'])assert.deepEqual(search(query),[],query);
});
test('search does not mix a second food collection or mutate its input',()=>{
 const isolated=createFoodSearch([foods[5]]);assert.deepEqual(isolated('鸡翅'),[]);assert.equal(foods[0].aliases.length,1);
});
test('actual bilingual catalogs reject unrelated ingredients without losing legitimate matches',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(new URL(`../src/data/${name}`,import.meta.url),'utf8'));
 const catalog=assembleCatalog(readdirSync(new URL('../src/data/',import.meta.url)).filter(f=>/^foods-.+\.json$/.test(f)).flatMap(read),read('recipe-overrides.json'));
 const zh=read('zh-foods.json'),regional=read('regional-zh.json');
 const copies=Object.fromEntries(catalog.map(f=>[f.slug,{...zh[f.slug],...regional[f.slug]}]));
 for(const lang of ['en','zh'] as const) {
  const index=(region:'cn'|'us')=>createFoodSearch(catalog.filter(f=>f.region===region).map(food=>({...food,name:lang==='zh'?copies[food.slug].name:food.name,aliases:[food.name,...food.aliases,copies[food.slug].name,...copies[food.slug].aliases]})));
  const cn=index('cn'),us=index('us');
  for(const query of ['beetroot','beets','菠菜'])assert.deepEqual(cn(query),[],`${lang}: ${query}`);
  assert.deepEqual(us('salmon').map(f=>f.slug),['salmon']);
  assert.deepEqual(us('pizza').map(f=>f.slug),['pizza']);
  assert.equal(cn('紅薯')[0]?.slug,'cn-whole-sweet-potato');
  assert.equal(cn('奧爾良雞翅')[0]?.slug,'cn-orleans-wings');
 }
});
test('expanded library resolves everyday names, full pinyin and cooking questions without changing state',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(new URL(`../src/data/${name}`,import.meta.url),'utf8'));
 const catalog=assembleCatalog(readdirSync(new URL('../src/data/',import.meta.url)).filter(f=>/^foods-.+\.json$/.test(f)).flatMap(read),read('recipe-overrides.json'));
 const old=read('zh-foods.json'),zh=read('regional-zh.json');
 const search=createRecipeSearch(catalog.map(f=>({...f,name:zh[f.slug]?.name??old[f.slug].name,aliases:[f.name,...f.aliases,...(zh[f.slug]?.aliases??old[f.slug].aliases)],state:f.variants[0].state})));
 const c=(q:string)=>search(q).matches.filter(f=>f.region==='cn');
 for(const [q,slug]of [['空气炸锅烤藕片多久','cn-lotus-chips'],['氣炸鍋杏鮑菇做法','cn-pepper-king-oyster'],['you tiao','cn-frozen-youtiao'],['jichi','cn-orleans-wings'],['xingbaogu','cn-pepper-king-oyster'],['wu hua rou','cn-honey-pork-belly'],['秋葵','cn-crispy-okra'],['西蓝花','cn-pepper-broccoli'],['mai fen','cn-blueberry-muffins'],['si kang','cn-scones'],['待烤司康','cn-scones'],['ready-to-bake scones','cn-scones']])assert.equal(c(q)[0]?.slug,slug,q);
 for(const q of ['空气炸锅冷冻鸡翅要多久','how long to air fry frozen wings','冷冻鱿鱼','冷冻五花肉','宁波年糕','生汤圆','海绵蛋糕','white rice','不解冻鸡翅'])assert.deepEqual(c(q),[],q);
 for(const q of ['frozen wings','how long to air fry frozen wings']){assert.deepEqual(search(q).matches,[],q);assert.ok(search(q).alternatives.some(f=>f.slug==='chicken-wings'),q);}
 assert.deepEqual(search('fully cooked frozen shrimp recipe').matches,[]);
 assert.equal(c('冷冻').every(f=>f.variants[0].state==='frozen'),true);
});
