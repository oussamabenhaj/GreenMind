import test from 'node:test';
import assert from 'node:assert/strict';
import { interpret } from '../src/modules/search/search.service.js';
import { QueryBuilder } from '../src/utils/queryBuilder.js';
import { paginated, paginationOf } from '../src/utils/pagination.js';
import { gouvernorat, lat } from '../src/utils/schemas.js';

const categories = [
  { id: 1, name: 'Grignons d\'olive', keywords: ['grignon', 'grignons', 'olive'] },
  { id: 2, name: 'Huiles alimentaires usagées', keywords: ['huile', 'friture'] },
];

test('smart search extracts quantity, governorate, category and price', () => {
  const r = interpret('Je cherche 2 tonnes de grignons à Sfax moins de 0,5 dt pas cher', categories);
  assert.equal(r.filters.min_quantity, 2000);
  assert.equal(r.filters.gouvernorat, 'Sfax');
  assert.equal(r.filters.category_id, 1);
  assert.equal(r.filters.max_price, 0.5);
  assert.equal(r.filters.sort, 'price_asc');
});

test('smart search detects discounts, nearby intent and residual keywords', () => {
  const r = interpret('huile de friture en promo près de moi qualité premium', categories);
  assert.equal(r.filters.category_id, 2);
  assert.equal(r.filters.has_discount, true);
  assert.equal(r.wantsNearby, true);
  assert.ok(r.keywords.includes('premium'));
});

test('QueryBuilder numbers parameters in call order', () => {
  const qb = new QueryBuilder();
  qb.where(`a = ${qb.param(1)}`).whereIf(undefined, (p) => `b = ${p}`).whereIf(false, (p) => `c = ${p}`);
  const distance = qb.near('x', { lat: 36.8, lng: 10.1, radius_km: 5 });
  assert.equal(qb.whereSql().startsWith('WHERE a = $1 AND c = $2 AND ST_DWithin'), true);
  assert.match(distance, /\$3, \$4/);
  assert.deepEqual(qb.params, [1, false, 10.1, 36.8, 5000]);
});

test('pagination helpers', () => {
  assert.deepEqual(paginationOf({ page: '3', limit: '500' }), { page: 3, limit: 100, offset: 200 });
  const result = paginated([{ id: 1, total_count: 41 }], { page: 1, limit: 20 });
  assert.deepEqual(result, { data: [{ id: 1 }], meta: { page: 1, limit: 20, total: 41, total_pages: 3 } });
});

test('schemas enforce Tunisian governorates and bounds', () => {
  assert.equal(gouvernorat.safeParse('Sidi Bouzid').success, true);
  assert.equal(gouvernorat.safeParse('Paris').success, false);
  assert.equal(lat.safeParse('36.8').success, true);
  assert.equal(lat.safeParse('48.8').success, false);
});
