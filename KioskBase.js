const mysql = require('mysql2/promise');

class KioskBase {
    constructor(connectionStr) {
        let reg = /(?<user>.+):(?<password>.+)@(?<host>.+):(?<port>\d+)\/(?<base>.+)/gm.exec(connectionStr);
        this.pool = mysql.createPool({
            host:reg.groups.host, user: reg.groups.user, database: reg.groups.base, password: reg.groups.password, port: reg.groups.port, connectionLimit:2
        });
    }

    async getOPs() {
        let res = await this.pool.query("SELECT * FROM op;");
        return res[0];
    }
}

module.exports = KioskBase;