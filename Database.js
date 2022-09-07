const pg = require('pg');

class Database {
    constructor(connectionStr) {
        this.pool = new pg.Pool({connectionString: connectionStr});
    }

    async prepareUser(id) {
        let client = await this.pool.connect();
        let user = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            if (res.rowCount === 0) {
                await client.query('INSERT INTO users (id) VALUES ($1)', [id]);
                res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            }
            await client.query('COMMIT');
            user = res.rows[0];
        } finally {
            client.release();
        }
        return user;
    }

    async setUserKorpus(id, korpus) {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE users SET korpus = $1 WHERE id = $2', [korpus, id]);
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    async getCabinets(korpus) {
        let client = await this.pool.connect();
        let cabinets = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM cabinets WHERE korpus = $1', [korpus]);
            await client.query('COMMIT');
            cabinets = res.rows;
        } finally {
            client.release();
        }
        return cabinets;
    }

    async getCabinet(cabinet) {
        let client = await this.pool.connect();
        let v = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM cabinets WHERE id = $1', [cabinet]);
            await client.query('COMMIT');
            v = res.rows[0];
        } finally {
            client.release();
        }
        return v;
    }

    async setUserAuth(id, username, password) {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE users SET username = $1, user_password = $2 WHERE id = $3', [username, password, id]);
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }
}

module.exports = Database;