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
        // api are dead, so we use static data
        return [
            {
                id: 1,
                name: "Центр Телекоммуникации",
                address: "улица Большие Каменщики, дом 7",
            },
            {
                id: 2,
                name: "Центр Общеобразовательной подготовки",
                address: "улица Речников, дом 28",
            },
            {
                id: 3,
                name: "Центр Дополнительного образования",
                address: "улица Судакова, дом 18а",
            },
            {
                id: 4,
                name: "Центр Дополнительного образования «Юный Автомобилист»",
                address: "улица Корнейчука, дом 55а",
            },
            {
                id: 5,
                name: "Центр Информационной безопасности",
                address: "улица Кирпичная, дом 33а",
            },
            {
                id: 6,
                name: "Центр Автоматизации и ИТ",
                address: "улица Рязанский проспект, дом 8",
            },
            {
                id: 7,
                name: "Центр Радиоэлектроники",
                address: "улица Рабочая, дом 12"
            },
            {
                id: 8,
                name: "Центр Электроснабжения и Автотранспорта",
                address: "улица Басовская, дом 12"
            }
        ];
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