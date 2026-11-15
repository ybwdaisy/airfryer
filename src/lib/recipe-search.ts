import {createFoodSearch,normalizeSearch,type SearchFood} from './food-search.ts';
import type {Variant} from './schema.ts';

type StartingState = 'fresh'|'frozen'|'reheat';
export type RecipeSearchFood = SearchFood & {state:Variant['state']};
const qualifiers:{state:StartingState;start:RegExp;end:RegExp}[] = [
  {state:'frozen',start:/^(?:冷冻|速冻|冰冻)(?:的)?\s*|^frozen\s+/u,end:/\s*(?:冷冻|速冻|冰冻)$|\s+frozen$/u},
  {state:'fresh',start:/^(?:新鲜|冷藏|已解冻|解冻)(?:的)?\s*|^(?:fresh|chilled|thawed)\s+/u,end:/\s*(?:新鲜|冷藏|已解冻|解冻)$|\s+(?:fresh|chilled|thawed)$/u},
  {state:'reheat',start:/^(?:复热|剩菜)(?:的)?\s*|^(?:reheat|leftover)\s+/u,end:/\s*(?:复热|剩菜)$|\s+(?:reheat|leftover)$/u},
];

/** Recognize bounded starting-state terms; never drop an unmatched raw/cooked qualifier. */
export function parseRecipeQuery(raw:string) {
  let foodQuery=normalizeSearch(raw);
  const states=new Set<StartingState>();
  for(let pass=0;pass<4;pass++) {
    const previous=foodQuery;
    for(const q of qualifiers) {
      if(q.start.test(foodQuery)||q.end.test(foodQuery)) {
        states.add(q.state);foodQuery=foodQuery.replace(q.start,'').replace(q.end,'').trim();
      }
    }
    if(foodQuery===previous)break;
  }
  return {foodQuery,state:states.size===1?[...states][0]:null,conflict:states.size>1};
}

export function createRecipeSearch<T extends RecipeSearchFood>(items:T[]) {
  const foodSearch=createFoodSearch(items);
  return (raw:string)=>{
    const query=parseRecipeQuery(raw);
    if(query.conflict)return {...query,matches:[] as T[],alternatives:[] as T[]};
    const foods=foodSearch(query.foodQuery);
    return {...query,
      matches:foods.filter(food=>!query.state||food.state===query.state),
      alternatives:query.state?foods.filter(food=>food.state!==query.state):[],
    };
  };
}
