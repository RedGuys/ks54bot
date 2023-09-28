const Telegraf = require('telegraf');
const session = require('telegraf/session');
const Database = require('./Database');
const Api = require('./Api');
const kisok = require('./KioskBase');
const cron = require('node-cron');
const log4js = require('log4js');
const logger = log4js.getLogger("Main");
const Express = require("express");
const axios = require("axios");
const YouTrack = require("./YouTrack");
const MarkdownIt = require("markdown-it");
let md = new MarkdownIt({});

log4js.configure({
    appenders: {
        out: {
            type: 'stdout'
        }, redguy: {
            type: "node-redguy-api/lib/Logs/Log4js", token: process.env.LOGS_TOKEN, service: 3
        }
    }, categories: {default: {appenders: ['out', 'redguy'], level: 'info'}}
});

let kioskBase = new kisok();
let bot = new Telegraf.Telegraf(process.env.TOKEN);
bot.use(session());
let database = new Database(process.env.DATABASE_URL);
let keyboards = require("./Keyboards");
let site = Express();
let youtrack = new YouTrack("https://yt.kioskapi.ru/api", database);

bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    if (!ctx.from.id) return;
    let start = new Date();
    ctx.userdata = await database.prepareUser(ctx.from.id);
    await next();
    let ms = new Date() - start;
    try {
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith("/")) {
            logger.log("Command " + ctx.message.text.split(" ")[0].substring(1) + " processed in " + ms + "ms");
        }
        if (ctx.message && ctx.message.text && !ctx.message.text.startsWith("/")) {
            logger.log("Message " + ctx.message.text + " processed in " + ms + "ms");
        }
        if (ctx.message && ctx.message.sticker) {
            logger.log("Sticker " + ctx.message.sticker.file_unique_id + " processed in " + ms + "ms");
        }
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            logger.log("Callback " + ctx.callbackQuery.data + " processed in " + ms + "ms");
        }
        if (ctx.inlineQuery) {
            logger.log("Inline " + ctx.inlineQuery.query + " processed in " + ms + "ms");
        }
    } catch (e) {
        logger.log(e)
    }
});

bot.start(async (ctx) => {
    if (/ (\w+)/.test(ctx.message.text)) {
        let rg = / (?<data>\w+)/.exec(ctx.message.text);
        let parts = rg.groups.data.split("_");
        switch (parts[0]) {
            case "token": {
                let token = await database.getTemporalToken(parts[1]);
                if (!token) return;
                await database.setToken(ctx.from.id, token.access_token, token.refresh_token);
                await ctx.reply("Вы успешно авторизовались");
                break;
            }
        }
    } else {
        await ctx.reply("Привет, я бот Коллежда Связи 54 им. П. М. Вострухина.\n\nЯ помогу тебе ориентироваться в учебном здании и твоём расписании.",
            Telegraf.Extra.markup(m => m.inlineKeyboard(keyboards.populateMainMenuKeyboard(ctx))));
    }
});

bot.command("authorize", async (ctx) => {
    await ctx.reply("Для авторизации нажмите на кнопку", {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "Авторизоваться",
                    url: "https://yt.kioskapi.ru/hub/api/rest/oauth2/auth?client_id=ece4c096-1a40-4021-9a9c-84cbab5e4755&response_type=code&scope=YouTrack&redirect_uri=https://ks54.redguy.ru/redirect/&access_type=offline"
                }]
            ]
        }
    })
});

bot.command("issue", async (ctx) => {
    let regex = /issue (?<project>[^ ]+) (?<name>.+)\n?(?<description>.+)?/.exec(ctx.message.text);
    if (!regex) return;
    let project = await youtrack.searchProject(ctx.from.id, regex.groups.project);
    let name = regex.groups.name;
    let description = regex.groups.description || "";
    if (ctx.message.reply_to_message) {
        description += "\n\n" + ctx.message.reply_to_message.text;
    }
    description = description.trim();
    let issueId = await youtrack.createIssue(ctx.from.id, project.id, name, description);
    await ctx.reply(`${issueId}: Задача "${name}" создана в проекте ${project.name}\n<a href="https://yt.kioskapi.ru/issue/${issueId}">Открыть</a>`, {parse_mode: "HTML"});
});

bot.command("test", async (ctx) => {
    await youtrack.searchProject(ctx.from.id, "SH");
});

bot.on("inline_query", async (ctx) => {
    let results = await youtrack.searchIssues(ctx.inlineQuery.from.id, ctx.inlineQuery.query);
    let answer = [];
    if (results.error) {
        answer.push({
            type: "article",
            id: "error",
            title: results.error,
            input_message_content: {
                message_text: `Ошибка в запросе ${results.error}`
            }
        });
    } else {
        for (let result of results.results.slice(0, 50)) {
            let dateStr = "";
            if (Number.isInteger(result.dueDate)) {
                let date = new Date(result.dueDate);
                dateStr = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
            }
            result.description = result.description?.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
            answer.push({
                type: "article",
                id: result.idReadable,
                title: result.idReadable + ": " + result.summary.slice(0, 100),
                input_message_content: {
                    message_text: `${result.idReadable}: <a href="https://yt.kioskapi.ru/issue/${result.idReadable}">${result.summary}</a> (${result.state})\nПроект: ${result.project}\nАвтор: ${result.reporter}\nИсполнители: ${result.assignee}\nПриоритет: ${result.priority}\nДедлайн: ${dateStr}\n\n${md.renderInline(result.description)}`,
                    parse_mode: "HTML"
                },
                description: result.description?.slice(0, 100),
            });
        }
    }
    await ctx.answerInlineQuery(answer, {
        cache_time: 60,
        is_personal: true
    });
});

bot.action(/^menu/, async (ctx) => {
    await ctx.editMessageText("Привет, я бот Коллежда Связи 54 им. П. М. Вострухина.\n\nЯ помогу тебе ориентироваться в учебном здании и твоём расписании.",
        Telegraf.Extra.markup(m => m.inlineKeyboard(keyboards.populateMainMenuKeyboard(ctx))));
    await ctx.answerCbQuery();
});

bot.action(/aero_menu/, async (ctx) => {
    let row = [];
    let keyboard = [];
    row.push(Telegraf.Markup.callbackButton("Записаться на аэрохоккей", "aero_register_start"));
    keyboard.push(row);
    row = [];
    row.push(Telegraf.Markup.callbackButton("Мои записи", "aero_registers"));
    keyboard.push(row);
    row = [];
    row.push(Telegraf.Markup.callbackButton("Назад", "menu"));
    keyboard.push(row);
    await ctx.editMessageText("Запись на аэрохоккей.", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery();
});

bot.action(/aero_registers/, async (ctx) => {
    let row = [];
    let keyboard = [];
    let registers = await database.getRecordsByUser(ctx.from.id);
    for (let register of registers) {
        let time = await database.getTime(register.time_id);
        row.push(Telegraf.Markup.callbackButton(time.start_time + " - " + time.end_time, "aero_info_" + register.record_id));
        if (row.length === 3) {
            keyboard.push(row);
            row = [];
        }
    }
    if (row.length !== 0) {
        keyboard.push(row);
    }
    row = [];
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_menu"));
    keyboard.push(row);
    await ctx.editMessageText("Мои записи.", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery();
});

bot.action(/aero_info_(\d+)/, async (ctx) => {
    let record_id = ctx.match[1];
    let register = await database.getRecord(record_id);
    let time = await database.getTime(register.time_id);
    let row = [];
    let keyboard = [];
    if (register.state === 0) {
        row.push(Telegraf.Markup.callbackButton("Получить инвентарь", "aero_take_" + record_id));
    } else if (register.state === 1) {
        row.push(Telegraf.Markup.callbackButton("Сдать инвентарь", "aero_back_" + record_id));
    }
    keyboard.push(row);
    row = [];
    row.push(Telegraf.Markup.callbackButton("Отменить запись", "aero_unregister_" + record_id));
    keyboard.push(row);
    row = [];
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_registers"));
    keyboard.push(row);
    await ctx.editMessageText(`Запись на ${time.desk} ${time.start_time} - ${time.end_time} на имя ${register.by_name}, группа ${register.by_group}`, Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
});

bot.action(/aero_back_(\d+)/, async (ctx) => {
    let record_id = ctx.match[1];
    let register = await database.getRecord(record_id);
    let time = await database.getTime(register.time_id);
    let row = [];
    let keyboard = [];
    await database.setState(record_id, 2)
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_registers"));
    keyboard.push(row);
    await bot.telegram.sendMessage(-1001819504528, `Запись на ${time.desk} ${time.start_time} - ${time.end_time}\n${register.by_name}, группа ${register.by_group}\n\nИнвентарь сдан`);
    await ctx.editMessageText(`Инвентарь сдан, спасибо!`, Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
});

bot.action(/aero_take_(\d+)/, async (ctx) => {
    let record_id = ctx.match[1];
    let register = await database.getRecord(record_id);
    let time = await database.getTime(register.time_id);
    let row = [];
    let keyboard = [];
    await database.setState(record_id, 1)
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_info_" + record_id));
    keyboard.push(row);
    await bot.telegram.sendMessage(-1001819504528, `Запись на ${time.desk} ${time.start_time} - ${time.end_time}\n${register.by_name}, группа ${register.by_group}\n\nИнвентарь получен`);
    await ctx.editMessageText(`Инвентарь получен, не забудьте вернуть его, хорошей игры!`, Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
});

bot.action(/aero_unregister_(\d+)/, async (ctx) => {
    let register_id = ctx.match[1];
    await database.deleteRecord(register_id);
    let register = await database.getRecord(register_id);
    let time = await database.getTime(register.time_id);
    let row = [];
    let keyboard = [];
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_menu"));
    keyboard.push(row);
    await bot.telegram.sendMessage(-1001819504528, `Запись на ${time.desk} ${time.start_time} - ${time.end_time}\n на имя <a href="tg://user?id=${ctx.from.id}">${ctx.session.fio} (${ctx.message.text})</a>, группа ${register.by_group} была отменена`, Telegraf.Extra.HTML(true));
    await ctx.editMessageText("Мои записи.", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery("Запись удалена.");
});

bot.action(/aero_register_start/, async (ctx) => {
    let keyboard = [];
    let row = [];
    let times = await database.getFreeTimes();
    for (let time of times) {
        row.push(Telegraf.Markup.callbackButton(time.desk + " " + time.start_time + " - " + time.end_time, "aero_register_time_" + time.id));
        if (row.length === 3) {
            keyboard.push(row);
            row = [];
        }
    }
    if (row.length > 0) {
        keyboard.push(row);
    }
    row = [];
    row.push(Telegraf.Markup.callbackButton("Назад", "aero_menu"));
    keyboard.push(row);
    await ctx.editMessageText("Выберите время:", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery();
});

bot.action(/aero_register_time_(\d+)/, async (ctx) => {
    let time_id = ctx.match[1];
    if (!await database.isTimeStillFree(time_id)) {
        await ctx.editMessageText("К сожалению, это время уже занято.");
        await ctx.answerCbQuery();
        return;
    }
    ctx.session.time = time_id;
    ctx.session.message = ctx.callbackQuery.message.message_id;
    ctx.session.state = "aero_fio";
    await ctx.editMessageText("Введите ФИО", Telegraf.Extra.markup(m => m.inlineKeyboard([[Telegraf.Markup.callbackButton("Отмена", "aero_menu")]])));
    await ctx.answerCbQuery();
});

bot.action(/select_korpus/, async (ctx) => {
    let ops = await kioskBase.getOPs();
    let keyboard = [];
    let x = 0;
    let row = [];
    for (let i = 0; i < ops.length; i++) {
        row.push(Telegraf.Markup.callbackButton("ОП " + ops[i].id + " - " + ops[i].name, "confirm_korpus_" + ops[i].id));
        x++;
        if (x === 2) {
            keyboard.push(row);
            row = [];
            x = 0;
        }
    }
    if (row.length > 0) {
        keyboard.push(row);
    }
    keyboard.push([Telegraf.Markup.callbackButton("Назад", "menu")]);

    await ctx.editMessageText("Выбери свой корпус:", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery();
});

bot.action(/confirm_korpus_(\d)/, async (ctx) => {
    let korpus = parseInt(ctx.match[1]);
    await database.setUserKorpus(ctx.from.id, korpus);
    await ctx.editMessageText("Корпус успешно выбран!", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
    await ctx.answerCbQuery();
});

bot.action(/cabinets/, async (ctx) => {
    let keyboard = [];
    let cabinets = await database.getCabinets(ctx.userdata.korpus);

    let row = [];
    for (let i = 0; i < cabinets.length; i++) {
        if (row.length === 2) {
            keyboard.push(row);
            row = [];
        }
        row.push(Telegraf.Markup.callbackButton(cabinets[i].name, "cabinet_" + cabinets[i].id));
    }
    keyboard.push(row);

    keyboard.push([Telegraf.Markup.callbackButton("Назад", "menu")]);

    await ctx.editMessageText("Выберите кабинет:", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
    await ctx.answerCbQuery();
});

bot.action(/cabinet_(\d+)/, async (ctx) => {
    let cabinet = await database.getCabinet(ctx.match[1]);
    await ctx.editMessageText(`${cabinet.name} ${(cabinet.number - (Math.floor(cabinet.number / 100) * 100) === 99) ? "" : "(" + cabinet.number + ") "}находится на ${Math.floor(cabinet.number / 100)} этаже:\n${cabinet.path}`,
        Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "cabinets")]])));
    await ctx.answerCbQuery();
});

bot.action(/update_auth/, async (ctx) => {
    ctx.session.message = ctx.callbackQuery.message.message_id;
    ctx.session.state = "wait_username";
    await ctx.editMessageText("Отправьте ваш логин\n\nПродолжая авторизацию вы подтверждаете что согласны с хранением и использованием вашего логина и пароля для предоставления информационных услуг.", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])))
    await ctx.answerCbQuery();
});

bot.action(/get_week_type/, async (ctx) => {
    let week_type = await Api.getWeekType(await Api.login(ctx.userdata.username, ctx.userdata.user_password));
    await ctx.editMessageText(`Тип недели: ${week_type}`, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
    await ctx.answerCbQuery();
});

bot.action(/get_documents/, async (ctx) => {
    let documents = await Api.getDocuments(await Api.login(ctx.userdata.username, ctx.userdata.user_password));
    let text = "Справки:\n";
    for (let i = Math.max(0, documents.length - 5); i < documents.length; i++) {
        text += `${documents[i].id} от ${documents[i].from} ${documents[i].type} для ${documents[i]['for']}: ${documents[i].status}\n`;
    }
    await ctx.editMessageText(text, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
    await ctx.answerCbQuery();
});

bot.action(/get_schedules/, async (ctx) => {
    await ctx.editMessageText("Выберите день недели:", Telegraf.Extra.markup(m => m.inlineKeyboard([[
        m.callbackButton("Понедельник", "get_schedule_0"),
        m.callbackButton("Вторник", "get_schedule_1"),
    ], [
        m.callbackButton("Среда", "get_schedule_2"),
        m.callbackButton("Четверг", "get_schedule_3"),
    ], [
        m.callbackButton("Пятница", "get_schedule_4"),
        m.callbackButton("Суббота", "get_schedule_5"),
    ], [
        m.callbackButton("Назад", "menu")
    ]])));
    await ctx.answerCbQuery();
});

bot.action(/cancel_aero_(\d+)/, async (ctx) => {
    let id = parseInt(ctx.match[1]);
    let record = await database.getRecord(id);
    let time = await database.getTime(record.time_id);
    await database.deleteRecord(id);
    await ctx.telegram.sendMessage(record.by_id, `Ваша запись на ${time.start_time} была отменена администратором!`);
    await ctx.editMessageText(`Запись для <a href="tg://user?id=${ctx.from.id}">${record.by_name} (${record.by_group})</a> на ${time.start_time} была отменена администратором <a href="tg://user?id=${ctx.callbackQuery.from.id}">${ctx.callbackQuery.from.first_name}</a>.`, Telegraf.Extra.HTML(true));
    await ctx.answerCbQuery();
});

bot.action(/get_schedule_(\d)/, async (ctx) => {
    let schedule = await Api.getSchedule(await Api.login(ctx.userdata.username, ctx.userdata.user_password));
    schedule = schedule[parseInt(ctx.match[1])];
    let text = "";
    if (schedule) {
        for (let i = 0; i < schedule.lessons.length; i++) {
            if (schedule.lessons[i].name === undefined) {
                text += "------\n";
            } else {
                text += `${schedule.lessons[i].name} - ${schedule.lessons[i].cabinet.join("/")} (${schedule.lessons[i].teacher})\n`;
            }
            if (schedule.lessons[i].alternative) {
                if (schedule.lessons[i].alternative.name === undefined) {
                    text += " \\ ------\n";
                } else {
                    text += ` \\ ${schedule.lessons[i].alternative.name} - ${schedule.lessons[i].alternative.cabinet.join("/")} (${schedule.lessons[i].alternative.teacher})\n`;
                }
            }
        }
    }
    if (text === "") text = "Нет пар";
    await ctx.editMessageText(text, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "get_schedules")]])));
    await ctx.answerCbQuery();
});

bot.action(/floors/, async (ctx) => {
    await ctx.answerCbQuery("Карты этажей ещё составляются :3", true);
});

bot.action(/deleteMessage/, async (ctx) => {
    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
});

bot.action(/calls/, async (ctx) => {
    let calls = await kioskBase.getScheduleCalls(ctx.userdata.korpus);
    let text = "Расписание звонков:\n";
    for (let call of calls) {
        text += `${call.pair_number} пара: ${call.first_start} - ${call.first_end} | ${call.second_start} - ${call.second_end}\n`;
    }
    await ctx.editMessageText(text, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
});

bot.on("text", async (ctx) => {
    if (!ctx.session.state) {
        if (ctx.message.reply_to_message) {
            if (/^(?<id>\w{1,4}-\d+):/.test(ctx.message.reply_to_message.text)) {
                let id = ctx.message.reply_to_message.text.match(/^(?<id>\w{1,4}-\d+):/).groups.id;
                if (ctx.message.text.startsWith("/")) {

                } else {
                    if (await youtrack.isUserAuthorized(ctx.message.from.id)) {
                        await youtrack.createComment(ctx.message.from.id, id, ctx.message.text);
                    } else {
                        await youtrack.createAnonymousComment(id, `${ctx.from.first_name} ${ctx.from.last_name || ""} (${ctx.from.username || ctx.from.id})`, ctx.message.text);
                    }
                    await ctx.reply("Комментарий добавлен!");
                }
            }
        }
    } else {
        switch (ctx.session.state) {
            case "aero_fio": {
                await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
                if (!await database.isTimeStillFree(ctx.session.time)) {
                    ctx.session.state = undefined;
                    await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "К сожалению время уже занято.", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "aero_menu")]])));
                    return;
                }
                ctx.session.state = "aero_group";
                ctx.session.fio = ctx.message.text;
                await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "Введите номер группы:", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "aero_menu")]])));
                break;
            }
            case "aero_group": {
                await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
                if (!await database.isTimeStillFree(ctx.session.time)) {
                    ctx.session.state = undefined;
                    await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "К сожалению время уже занято.", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "aero_menu")]])));
                    return;
                }
                let time = await database.getTime(ctx.session.time);
                let record = await database.recordOnAero(ctx.session.time, ctx.from.id, ctx.session.fio, ctx.message.text);
                await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null,
                    `Готово, запись для ${ctx.session.fio} на ${time.start_time} создана.`, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "aero_menu")]])));
                await bot.telegram.sendMessage(-1001819504528, `Запись для <a href="tg://user?id=${ctx.from.id}">${ctx.session.fio} (${ctx.message.text})</a> на ${time.start_time} создана.`, Telegraf.Extra.HTML(true).markup(m => m.inlineKeyboard([[m.callbackButton("Отменить", "cancel_aero_" + record)]])));
                break;
            }
            case "wait_username": {
                ctx.session.username = ctx.message.text;
                ctx.session.state = "wait_password";
                await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
                await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "Отправьте ваш пароль", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
                break;
            }
            case "wait_password": {
                let password = ctx.message.text;
                let username = ctx.session.username;
                await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
                await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "Проверка данных...");
                try {
                    await Api.login(username, password);
                } catch (e) {
                    await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "Неверные данные!", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
                    return;
                }
                await database.setUserAuth(ctx.from.id, username, password);
                await bot.telegram.editMessageText(ctx.from.id, ctx.session.message, null, "Авторизация успешна!", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
            }
        }
    }
});

bot.catch((err, ctx) => console.log(err, ctx)) // Print error and error context to console, no crash

bot.startPolling();

site.get("/redirect/", async (req, res) => {
    let code = req.query.code;
    //oauth2 code flow token request
    try {
        let params = new (require('url').URLSearchParams)();
        params.set("grant_type", "authorization_code");
        params.set("code", code);
        params.set("access_type", "offline");
        params.set("scope", "YouTrack");
        params.set("redirect_uri", "https://ks54.redguy.ru/redirect/");
        let resp = await axios.post("https://yt.kioskapi.ru/hub/api/rest/oauth2/token", params.toString(), {
            auth: {
                username: "ece4c096-1a40-4021-9a9c-84cbab5e4755",
                password: process.env.YOUTRACK_SECRET
            },
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });
        let id = await database.addTemporalToken(resp.data.access_token, resp.data.refresh_token);
        res.redirect("https://t.me/rks54bot?start=token_" + id);
    } catch (e) {
        console.log(e);
        res.send("Ошибка авторизации");
    }
});

site.listen(process.env.PORT || 3000);

cron.schedule("0 0 0 * * *", async () => {
    await database.clearAero();
});