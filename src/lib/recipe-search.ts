import {createFoodSearch,normalizeSearch,type SearchFood} from './food-search.ts';
import type {Variant} from './schema.ts';

type StartingState = Variant['state'];
export type RecipeSearchFood = SearchFood & {state:Variant['state']};
const qualifiers:{state:StartingState;start:RegExp;end:RegExp}[] = [
  {state:'frozen',start:/^(?:冷冻|速冻|冰冻)(?:的)?\s*|^frozen\s+/u,end:/\s*(?:冷冻|速冻|冰冻)$|\s+frozen$/u},
  {state:'fresh',start:/^(?:新鲜|冷藏|已解冻|解冻)(?:的)?\s*|^(?:fresh|chilled|thawed)\s+/u,end:/\s*(?:新鲜|冷藏|已解冻|解冻)$|\s+(?:fresh|chilled|thawed)$/u},
  {state:'reheat',start:/^(?:复热|剩菜)(?:的)?\s*|^(?:reheat|leftover)\s+/u,end:/\s*(?:复热|剩菜)$|\s+(?:reheat|leftover)$/u},
  {state:'ready-to-bake',start:/^(?:待烤|生面团|未烤面团)(?:的)?\s*|^ready to bake\s+/u,end:/\s*(?:待烤|生面团|未烤面团)$|\s+ready to bake$/u},
];

// Strip cooking intent only at query boundaries. Ingredient/state words and
// negations remain searchable constraints, never guessed cooking instructions.
const intentStart = /^(?:(?:请问|请教)\s*|(?:用)?(?:空气|气)炸锅(?:做|烤|炸)?\s*|(?:怎么|如何)(?:用(?:空气|气)炸锅)?(?:做|烤|炸)\s*|(?:how long (?:does it take )?to|how to|how long do i)\s+(?:air fry|cook)\s+|(?:air fryer|airfryer|air fry)\s+)/u;
const intentEnd = /\s*(?:(?:用(?:空气|气)炸锅)?(?:要|需要)?(?:烤|炸|加热)?(?:多久|多长时间|几分钟|多少分钟|多少度)|怎么(?:做|烤|炸)|做法|食谱|(?:air fryer )?(?:cooking time|cook time|recipe|recipes)|in (?:an? )?air ?fryer)(?:呢|啊|呀|吗)?$/u;
function stripIntent(query:string) {
  for(let pass=0;pass<4;pass++) {
    const next=query.replace(intentStart,'').replace(intentEnd,'').trim();
    if(next===query)break;
    query=next;
  }
  return query;
}

/** Recognize bounded starting-state terms; never drop an unmatched raw/cooked qualifier. */
export function parseRecipeQuery(raw:string) {
  let foodQuery=stripIntent(normalizeSearch(raw));
  const states=new Set<StartingState>();
  for(let pass=0;pass<4;pass++) {
    const previous=foodQuery;
    for(const q of qualifiers) {
      if(q.start.test(foodQuery)||q.end.test(foodQuery)) {
        states.add(q.state);foodQuery=stripIntent(foodQuery.replace(q.start,'').replace(q.end,'').trim());
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
