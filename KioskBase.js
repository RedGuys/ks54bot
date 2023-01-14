const mysql = require('mysql2/promise');
const stringSimilarity = require('string-similarity');
const axios = require('axios');

class KioskBase {

    staff = [];

    constructor() {
        //TODO move to api
        /*let reg = /(?<user>.+):(?<password>.+)@(?<host>.+):(?<port>\d+)\/(?<base>.+)/gm.exec(connectionStr);
        this.pool = mysql.createPool({
            host:reg.groups.host, user: reg.groups.user, database: reg.groups.base, password: reg.groups.password, port: reg.groups.port, connectionLimit:2
        });
        this.pool.query("SELECT * FROM staff;").then((res) => {
            this.staff = res[0];
        });*/
    }

    async getOPs() {
        let req = await axios.get("https://kioskapi.ru/wp-json/wp/v2/categories");
        let categories = req.data;
        categories = categories.filter((item) => item.id !== 14);
        return categories;
    }

    async getScheduleCalls(op) {
        /*let req = await axios.get("https://kioskapi.ru/wp-json/wp/v2/categories");
        let categories = req.data;
        categories;*/
    }

    searchStaff(text) {
        //return staff object with max name similarity
        /*let max = 0;
        let maxStaff = null;
        for (let staff of this.staff) {
            let similarity = stringSimilarity.compareTwoStrings(text, staff.name);
            if (similarity > max) {
                max = similarity;
                maxStaff = staff;
            }
        }
        if(max < 0.4) return null;
        return maxStaff;*/
        return null;
    }
}

module.exports = KioskBase;