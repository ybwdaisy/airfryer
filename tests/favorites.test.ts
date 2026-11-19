import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFavorites} from '../src/lib/favorites.ts';
test('favorites restore only a bounded versioned set of recipe identifiers',()=>{
  assert.deepEqual(parseFavorites(JSON.stringify({version:1,ids:['cn-orleans-wings','broccoli','broccoli','private@example.com','<script>',42]})),['cn-orleans-wings','broccoli']);
  assert.deepEqual(parseFavorites('{bad'),[]);
  assert.deepEqual(parseFavorites(JSON.stringify({version:2,ids:['broccoli']})),[]);
  assert.deepEqual(parseFavorites(JSON.stringify({version:1,ids:Array(301).fill('broccoli')})),[]);
});
