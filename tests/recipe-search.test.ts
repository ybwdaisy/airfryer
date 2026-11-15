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
