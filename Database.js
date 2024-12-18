const pg = require('pg');
const md5 = require("md5");

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

    /**
     * Get cabinet info
     * @param cabinet Cabinet id
     * @returns {Promise<null|{id:number,number:number,korpus:number,name:string,path:string}>}
     */
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

    /**
     * Get all available times.
     * @returns {Promise<null|{id:number,desk:string,start_time:string,end_time:string}[]>}
     */
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
            v = res.rowCount > 0;
        } finally {
            client.release();
        }
        return v;
    }

    /**
     * Get time by id.
     * @param id time id
     * @returns {Promise<null|{id:number,desk:string,start_time:string,end_time:string}>}
     */
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

    async setState(id, state) {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE aero_records SET state = $1 WHERE record_id = $2', [state, id]);
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    async recordOnAero(time, user, fio, group) {
        let client = await this.pool.connect();
        let id = null;
        try {
            await client.query('BEGIN');
            await client.query('INSERT INTO aero_records (time_id, by_id, by_name, by_group) VALUES ($1, $2, $3, $4)', [time, user, fio, group]);
            let res = await client.query('SELECT * FROM aero_records WHERE time_id = $1 AND by_id = $2 AND by_name = $3 AND by_group = $4', [time, user, fio, group]);
            await client.query('COMMIT');
            id = res.rows[0].record_id;
        } finally {
            client.release();
        }
        return id;
    }

    /**
     * Gets all records created by user
     * @param id User id
     * @returns {Promise<null|{record_id:number,time_id:number,by_id:string,by_name:string,by_group:string,state:number}[]>}
     */
    async getRecordsByUser(id) {
        let client = await this.pool.connect();
        let records = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM aero_records WHERE by_id = $1 AND state != 2', [id]);
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

    async clearAero() {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM aero_records');
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    /**
     * Get record by id
     * @param id Record id
     * @returns {Promise<null|{record_id:number,time_id:number,by_id:string,by_name:string,by_group:string,state:number}>}
     */
    async getRecord(id) {
        let client = await this.pool.connect();
        let v = null;
        try {
            await client.query('BEGIN');
            let res = await client.query('SELECT * FROM aero_records WHERE record_id = $1', [id]);
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

    async addTemporalToken(token, refresh_token) {
        let client = await this.pool.connect();
        try {
            let id = md5(refresh_token + Date.now());
            await client.query('BEGIN');
            await client.query('INSERT INTO temp_tokens (id, access_token, refresh_token) VALUES ($1, $2, $3)', [id, token, refresh_token]);
            await client.query('COMMIT');
            return id;
        } finally {
            client.release();
        }
        return null;
    }

    async getTemporalToken(id) {
        let client = await this.pool.connect();
        try {
            await client.query("DELETE FROM temp_tokens WHERE expires_at < NOW()");
            let response = await client.query('SELECT * FROM temp_tokens WHERE id = $1', [id]);
            if (response.rowCount > 0) {
                await client.query('DELETE FROM temp_tokens WHERE id = $1', [id]);
                return response.rows[0];
            } else {
                return null;
            }
        } finally {
            client.release();
        }
        return null;
    }

    async setToken(id, token, refresh_token) {
        let client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("INSERT INTO tokens (access_token, refresh_token, user_id) VALUES ($1,$2,$3) ON CONFLICT (user_id) do update SET access_token = $1, refresh_token = $2, expires_at = (CURRENT_TIMESTAMP + '00:55:00'::interval) WHERE tokens.user_id = $3", [token, refresh_token, id]);
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    async getToken(id) {
        let client = await this.pool.connect();
        try {
            let response = await client.query('SELECT * FROM tokens WHERE user_id = $1', [id]);
            if (response.rowCount > 0) {
                return response.rows[0];
            } else {
                return null;
            }
        } finally {
            client.release();
        }
        return null;
    }
}

module.exports = Database;