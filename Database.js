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

    async getFreeTimes() {
        let client = await this.pool.connect();
        let v = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('select * from aero_times where id not in (select time_id from aero_records)', []);
            await client.query('COMMIT');
            v = res.rows;
        } finally {
            client.release();
        }
        return v;
    }

    async isTimeStillFree(time) {
        let client = await this.pool.connect();
        let v = false;
        try {
            await client.query('BEGIN');
            let res = await client.query('select * from aero_times where id = $1 and id not in (select time_id from aero_records)', [time]);
            await client.query('COMMIT');
            if(res.rowCount > 0) v = true;
            else v = false;
        } finally {
            client.release();
        }
        return v;
    }

    async getTime(id) {
        let client = await this.pool.connect();
        let v = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM aero_times WHERE id = $1', [id]);
            await client.query('COMMIT');
            v = res.rows[0];
        } finally {
            client.release();
        }
        return v;
    }

    async recordOnAero(time, user, fio, group) {
        let client = await this.pool.connect();
        let id = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('INSERT INTO aero_records (time_id, by_id, by_name, by_group) VALUES ($1, $2, $3, $4)', [time, user, fio, group]);
            res = await client.query('SELECT * FROM aero_records WHERE time_id = $1 AND by_id = $2 AND by_name = $3 AND by_group = $4', [time, user, fio, group]);
            await client.query('COMMIT');
            id = res.rows[0].record_id;
        } finally {
            client.release();
        }
        return id;
    }

    async getRecordsByUser(id) {
        let client = await this.pool.connect();
        let records = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM aero_records WHERE by_id = $1', [id]);
            await client.query('COMMIT');
            records = res.rows;
        } finally {
            client.release();
        }
        return records;
    }

    async deleteRecord(id) {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM aero_records WHERE record_id = $1', [id]);
            await client.query('COMMIT');
        } finally {
            client.release();
        }
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