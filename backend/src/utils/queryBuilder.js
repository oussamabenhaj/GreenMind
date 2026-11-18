/**
 * Tiny helper to build parameterised WHERE clauses.
 *   const qb = new QueryBuilder();
 *   qb.where(`p.category_id = ${qb.param(5)}`);
 *   query(`SELECT ... ${qb.whereSql()}`, qb.params)
 */
export class QueryBuilder {
  constructor() {
    this.params = [];
    this.conditions = [];
  }

  param(value) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  where(condition) {
    this.conditions.push(condition);
    return this;
  }

  /** Adds `condition` only when `value` is not undefined/null/''. */
  whereIf(value, buildCondition) {
    if (value !== undefined && value !== null && value !== '') {
      this.where(buildCondition(this.param(value)));
    }
    return this;
  }

  whereSql() {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }

  /**
   * Adds an optional radius filter around (lat, lng) and returns the SQL
   * expression of the distance in km (or NULL when no point is given).
   */
  near(alias, { lat, lng, radius_km: radiusKm } = {}) {
    if (lat === undefined || lng === undefined) return 'NULL::numeric';
    const point = `ST_SetSRID(ST_MakePoint(${this.param(lng)}, ${this.param(lat)}), 4326)::geography`;
    if (radiusKm) {
      this.where(`ST_DWithin(${alias}.location::geography, ${point}, ${this.param(radiusKm * 1000)})`);
    }
    return `ROUND((ST_Distance(${alias}.location::geography, ${point}) / 1000)::numeric, 2)`;
  }

  limitOffset({ limit, offset }) {
    return `LIMIT ${this.param(limit)} OFFSET ${this.param(offset)}`;
  }
}
