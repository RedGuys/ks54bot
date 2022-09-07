const axios = require("axios");
const Parser = require("node-html-parser")

module.exports = class Api {
    /**
     * Passes auth form on https://ks54.ru/lk/login
     * @param login user login
     * @param password user password
     * @returns {Promise<string>} Promise with auth cookie
     */
    static async login(login, password) {
        let res = await axios.post("https://www.ks54.ru/lk/login.php",encodeURI("login="+login+"&password="+password), {maxRedirects:0, validateStatus:(num)=>num===302,headers:{'Content-Type':"application/x-www-form-urlencoded"}});
        return res.headers['set-cookie'][0].split(";")[0];
    }

    /**
     * Returns week type (Числитель/Знаменатель)
     * @param auth session cookie
     * @returns {Promise<string>} Числитель/Знаменатель
     */
    static async getWeekType(auth) {
        let res = await axios.get("https://www.ks54.ru/lk/",{headers:{'Cookie':auth}, maxRedirects:0});
        let root = Parser.parse(res.data);
        return root.querySelector("#content > div > div.row > div:nth-child(1) > div > div > div > div.col.mr-2 > div.h5.mb-0.font-weight-bold.text-gray-800").textContent.trim();
    }

    /**
     * Returns schedule for current week
     * @param auth session cookie
     * @returns {Promise<*[]>} Promise with schedule
     */
    static async getSchedule(auth) {
        let res = await axios.get("https://www.ks54.ru/lk/timetable",{headers:{'Cookie':auth}, maxRedirects:0});
        let root = Parser.parse(res.data);
        let days = root.querySelectorAll("#content > div > div.row > div:nth-child(n+1)");
        let schedule = [];
        let dayOfWeek = 0;
        for (let dayData of days) {
            let day = {name:dayData.querySelector("div.card-header.py-3.d-flex.flex-row.align-items-center.justify-content-between > h6").textContent.trim(), id: ++dayOfWeek, lessons: []};
            let lessons = dayData.querySelectorAll("tr");
            lessons = lessons.slice(1,lessons.length);
            for (let lessonData of lessons) {
                let fields = lessonData.querySelectorAll("td");
                switch (fields.length) {
                    case 5: {
                        let lesson = {
                            id: fields[0].textContent.trim(),
                            corpus: fields[1].textContent.trim(),
                            name: fields[2].textContent.trim(),
                            teacher: fields[3].textContent.trim(),
                            cabinet: fields[4].structuredText.trim().split("\n")
                        };
                        day.lessons.push(lesson);
                        break;
                    }
                    case 4: {
                        let lesson = {
                            corpus: fields[0].textContent.trim(),
                            name: fields[1].textContent.trim(),
                            teacher: fields[2].textContent.trim(),
                            cabinet: fields[3].structuredText.trim().split("\n")
                        };
                        day.lessons[day.lessons.length-1].alternative = lesson;
                        break;
                    }
                    case 2: {
                        let lesson = {
                            id: fields[0].textContent.trim()
                        };
                        day.lessons.push(lesson);
                        break;
                    }
                }
            }
            schedule.push(day);
        }
        return schedule;
    }

    /**
     * Gets documents requests
     * @param auth session cookie
     * @returns {Promise<*[]>} Promise with documents requests
     */
    static async getDocuments(auth) {
        let res = await axios.get("https://www.ks54.ru/lk/mysprav",{headers:{'Cookie':auth}, maxRedirects:0});
        let root = Parser.parse(res.data);
        let docsData = root.querySelectorAll("#content > div > div.row > div > div > div.card-body > table > tbody > tr");
        let docs = [];
        for (let docData of docsData) {
            let fields = docData.querySelectorAll("td, th");
            let doc = {
                id: fields[0].textContent.trim(),
                from: fields[1].textContent.trim(),
                type: fields[2].textContent.trim(),
                for: fields[3].textContent.trim(),
                status: fields[4].textContent.trim()
            };
            docs.push(doc);
        }
        return docs;
    }
};