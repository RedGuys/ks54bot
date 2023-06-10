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
}