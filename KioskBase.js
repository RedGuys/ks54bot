const mysql = require('mysql2/promise');
const stringSimilarity = require('string-similarity');

class KioskBase {

    staff = [];

    constructor(connectionStr) {
        let reg = /(?<user>.+):(?<password>.+)@(?<host>.+):(?<port>\d+)\/(?<base>.+)/gm.exec(connectionStr);
        this.pool = mysql.createPool({
            host:reg.groups.host, user: reg.groups.user, database: reg.groups.base, password: reg.groups.password, port: reg.groups.port, connectionLimit:2
        });
        this.pool.query("SELECT * FROM staff;").then((res) => {
            this.staff = res[0];
        });
    }

    async getOPs() {
        let res = await this.pool.query("SELECT * FROM op;");
        return res[0];
    }

    async getScheduleCalls(op) {
        let res = await this.pool.query("SELECT * FROM schedule_calls WHERE op_number = ?;", [op]);
        return res[0];
    }

    searchStaff(text) {
        //return staff object with max name similarity
        let max = 0;
        let maxStaff = null;
        for (let staff of this.staff) {
            let similarity = stringSimilarity.compareTwoStrings(text, staff.name);
            if (similarity > max) {
                max = similarity;
                maxStaff = staff;
            }
        }
        if(max < 0.4) return null;
        return maxStaff;
    }
}

module.exports = KioskBase;