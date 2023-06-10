const axios = require("axios");
const Cache = require('rgcache').Cache;
const StringSimilarity = require('string-similarity');

module.exports = class YouTrack {
    cache = new Cache({
        ttl: 300, loadStrategy: "one", thisArg: this, loader: async (key, payload) => {
            let tokenInfo = await this.database.getToken(key);
            if (!tokenInfo) return null;
            //if token expired or will expire in 5 minutes, refresh it
            if (tokenInfo.expires_at < Date.now() + 300000) {
                let params = new (require('url').URLSearchParams)();
                params.set("grant_type", "refresh_token");
                params.set("refresh_token", tokenInfo.refresh_token);
                let resp = await axios.post("https://yt.kioskapi.ru/hub/api/rest/oauth2/token", params.toString(), {
                    auth: {
                        username: "ece4c096-1a40-4021-9a9c-84cbab5e4755",
                        password: process.env.YOUTRACK_SECRET
                    },
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                });
                await this.database.setToken(key, resp.data.access_token, tokenInfo.refresh_token);
                return resp.data.access_token;
            }
            return tokenInfo.access_token;
        }
    });

    constructor(baseUrl, database) {
        this.baseUrl = baseUrl;
        this.database = database;
    }

    /**
     *
     * @param userId number
     * @return {Promise<{
     *   "leader": {
     *     "login": string,
     *     "name": string,
     *     "id": string,
     *     "$type": string
     *   },
     *   "shortName": string,
     *   "name": string,
     *   "id": string,
     *   "$type": string,
     * }[]>}
     */
    async getProjects(userId) {
        let res = await axios.get(this.baseUrl + `/admin/projects?fields=id,name,shortName,createdBy(login,name,id),leader(login,name,id),key`, {
            headers: {
                authorization: `Bearer ${await this.cache.get(userId)}`
            }
        })
        return res.data;
    }

    /**
     *
     * @param userId
     * @param project
     * @return {Promise<{
     *   "leader": {
     *     "login": string,
     *     "name": string,
     *     "id": string,
     *     "$type": string
     *   },
     *   "shortName": string,
     *   "name": string,
     *   "id": string,
     *   "$type": string,
     * }>}
     */
    async searchProject(userId, project) {
        let projects = await this.getProjects(userId);
        let id = null;
        if (/^[A-z]{1,4}$/.test(project)) { //short name
            let match = StringSimilarity.findBestMatch(project, projects.map(p => p.shortName)).bestMatch.target;
            id = projects.find(p => p.shortName === match);
        } else { //name
            let match = StringSimilarity.findBestMatch(project, projects.map(p => p.name)).bestMatch.target;
            id = projects.find(p => p.name === match);
        }
        return id;
    }

    async createIssue(userId, project, summary, description) {
        let res = await axios.post(this.baseUrl + `/issues?fields=idReadable`, {
                summary,
                description,
                project: {
                    id: project
                }
            },
            {
                headers: {
                    authorization: `Bearer ${await this.cache.get(userId)}`
                }
            });
        return res.data.idReadable;
    }

    /**
     *
     * @param userId
     * @param query
     * @return {Promise<{error: null|string, results: {idReadable:string,summary:string,description:string,reporter:string,project:string,assignee:string,priority:string,state:string,dueDate:string|number}[]}>}
     */
    async searchIssues(userId, query) {
        let res = await axios.get(this.baseUrl + `/issues?query=${encodeURIComponent(query)}&fields=id,summary,description,reporter(login),project(id,name,shortName),idReadable,customFields(name,value(name))&customFields=assignee&customFields=priority&customFields=state&customFields=due%20date`,
            {
                headers: {
                    authorization: `Bearer ${await this.cache.get(userId)}`
                },
                validateStatus: (status) => status < 300 || status >= 400 && status < 500
            });
        if (res.data.error) {
            return {
                results: [],
                error: res.data.error_children[0].error
            };
        } else {
            return {
                results: res.data.map(issue => {
                    return {
                        idReadable: issue.idReadable,
                        summary: issue.summary,
                        description: issue.description,
                        reporter: issue.reporter.login,
                        project: issue.project.name,
                        assignee: issue.customFields.find(f => f.name === "Assignee")?.value?.map(u => u.name).join(", ") || "Нет",
                        priority: issue.customFields.find(f => f.name === "Priority")?.value?.name,
                        state: issue.customFields.find(f => f.name === "State")?.value?.name,
                        dueDate: issue.customFields.find(f => f.name === "Due Date")?.value || "Нет",
                    }
                }),
                error: null
            }
        }
    }
}