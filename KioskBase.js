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
        switch (op.toString()) {
            case "5": {
                return [
                    {pair_number: 1,first_start: "9:00",first_end: "9:45",second_start: "9:55",second_end: "10:40"},
                    {pair_number: 2,first_start: "11:00",first_end: "11:45",second_start: "12:05",second_end: "12:50"},
                    {pair_number: 3,first_start: "13:10",first_end: "13:55",second_start: "14:15",second_end: "15:00"},
                    {pair_number: 4,first_start: "15:20",first_end: "16:05",second_start: "16:15",second_end: "17:00"},
                    {pair_number: 5,first_start: "17:10",first_end: "17:55",second_start: "18:05",second_end: "18:50"},
                ];
            }
        }
        return [];
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