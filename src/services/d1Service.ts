/**
 * Cloudflare D1 Database Service
 * Handles all database operations using D1
 */

export interface D1Context {
  DB: D1Database;
}

export class D1Service {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // Create a new record
  async create(table: string, data: Record<string, any>) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(',');
    
    const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    
    return await this.db.prepare(query).bind(...values).run();
  }

  // Read records
  async read(table: string, where?: Record<string, any>) {
    let query = `SELECT * FROM ${table}`;
    const values: any[] = [];

    if (where) {
      const conditions = Object.entries(where)
        .map(([key, value]) => {
          values.push(value);
          return `${key} = ?`;
        })
        .join(' AND ');
      query += ` WHERE ${conditions}`;
    }

    return await this.db.prepare(query).bind(...values).all();
  }

  // Update a record
  async update(table: string, data: Record<string, any>, where: Record<string, any>) {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(',');
    
    const values = [...Object.values(data), ...Object.values(where)];
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((key) => `${key} = ?`).join(' AND ');

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

    return await this.db.prepare(query).bind(...values).run();
  }

  // Delete a record
  async delete(table: string, where: Record<string, any>) {
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map((key) => `${key} = ?`).join(' AND ');
    const values = Object.values(where);

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;

    return await this.db.prepare(query).bind(...values).run();
  }

  // Execute custom query
  async query(sql: string, params: any[] = []) {
    return await this.db.prepare(sql).bind(...params).all();
  }
}
