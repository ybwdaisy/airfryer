import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRecipeSearch,parseRecipeQuery} from '../src/lib/recipe-search.ts';
const items=[
  {slug:'thawed-wings',name:'解冻腌制鸡翅',aliases:['chicken wings','wings'],category:'meat',state:'fresh' as const},
  {slug:'fries',name:'冷冻细薯条',aliases:['frozen fries','French fries'],category:'frozen',state:'frozen' as const},
  {slug:'salmon',name:'三文鱼',aliases:['salmon'],category:'seafood',state:'fresh' as const},
  {slug:'dumplings',name:'速冻泡菜饺子',aliases:['dumplings','mandu'],category:'frozen',state:'frozen' as const},
  {slug:'rice',name:'熟饭复热',aliases:['rice'],category:'reheat',state:'reheat' as const},
];
const search=createRecipeSearch(items);
test('frozen wings cannot become an actionable thawed method when the state term is removed',()=>{
  for(const q of ['冷冻鸡翅','冷凍的雞翅','frozen wings','wings frozen']){
    const r=search(q);assert.deepEqual(r.matches,[],q);assert.deepEqual(r.alternatives.map(f=>f.slug),['thawed-wings'],q);
  }
});
test('starting conditions narrow matching foods without changing quantities, settings or records',()=>{
  for(const [q,slug]of [['冷冻薯条','fries'],['fries frozen','fries'],['frozen dumplings','dumplings'],['解冻三文鱼','salmon'],['新鮮三文魚','salmon'],['fresh salmon','salmon'],['rice reheat','rice'],['飯復熱','rice']])assert.equal(search(q).matches[0]?.slug,slug,q);
  assert.equal(search('chickn wings').matches[0],items[0]);
  assert.equal(search('冷冻').matches.length,2);
});
test('unknown ingredients, conflicting states and unmatched raw/cooked qualifiers stay unresolved',()=>{
  assert.deepEqual(search('冷冻菠菜').matches,[]);assert.deepEqual(search('冷冻菠菜').alternatives,[]);
  assert.equal(parseRecipeQuery('frozen thawed wings').conflict,true);assert.deepEqual(search('冷冻解冻鸡翅').matches,[]);
  for(const q of ['raw frozen wings','fully cooked frozen wings','不冷冻的鸡翅'])assert.deepEqual(search(q).matches,[],q);
});
test('cooking questions preserve ingredients and starting-state constraints',()=>{
  for(const [q,slug] of [['空气炸锅烤鸡翅多久','thawed-wings'],['请问空气炸锅冷冻薯条要几分钟','fries'],['如何用空气炸锅烤三文鱼','salmon'],['氣炸鍋三文魚做法','salmon'],['how long to air fry frozen fries','fries'],['how long do I air fry frozen fries','fries'],['salmon in an air fryer','salmon'],['airfryer salmon cooking time','salmon']])assert.equal(search(q).matches[0]?.slug,slug,q);
  for(const q of ['空气炸锅冷冻鸡翅要多久','how long to air fry frozen wings']){
    assert.equal(search(q).matches.length,0,q);assert.equal(search(q).alternatives[0]?.slug,'thawed-wings',q);
  }
  for(const q of ['不要解冻鸡翅怎么做','不冷冻的鸡翅要多久','fully cooked frozen wings recipe','raw salmon cooking time','空气炸锅生鸡翅要多久'])assert.deepEqual(search(q).matches,[],q);
});
