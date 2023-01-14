const Telegraf = require('telegraf');
const session = require('telegraf/session');
const Database = require('./Database');
const Api = require('./Api');
const kisok = require('./KioskBase');
let axios = require('axios');
const cron = require('node-cron');

let kioskBase = new kisok();
let bot = new Telegraf.Telegraf(process.env.TOKEN);
bot.use(session());
let database = new Database(process.env.DATABASE_URL);

bot.use(async (ctx, next) => {
    let start = new Date();
    ctx.userdata = await database.prepareUser(ctx.from.id);
    await next();
    let ms = new Date() - start;
    try {
        if (ctx.message && ctx.message.text.startsWith("/")) {
            let res = await axios.put("https://api.redguy.ru/v1/logs/", {
                service: 3,
                content: "Command " + ctx.message.text.split(" ")[0].substring(1) + " processed in " + ms + "ms",
                level: "info"
            }, {
                headers: {
                    authorization: "Bearer " + process.env.LOGS_TOKEN
                }
            });
            console.log(res.data)
        }
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            await axios.put("https://api.redguy.ru/v1/logs/", {
                service: 3,
                content: "Callback " + ctx.callbackQuery.data + " processed in " + ms + "ms",
                level: "info"
            }, {
                headers: {
                    authorization: "Bearer " + process.env.LOGS_TOKEN
                }
            });
        }
    } catch (e) {
        console.log(e)
    }
});

bot.start(async (ctx) => {
    let keyboard = [];

    let row = [];
    if (ctx.userdata.korpus === -1) {
        row.push(Telegraf.Markup.callbackButton("Выбать корпус", "select_korpus"));
    } else {
        row.push(Telegraf.Markup.callbackButton("Изменить корпус", "select_korpus"));
        row.push(Telegraf.Markup.callbackButton("Кабинеты", "cabinets"));
        row.push(Telegraf.Markup.callbackButton("Звонки", "calls"));
        keyboard.push(row);
        row = [];
        row.push(Telegraf.Markup.callbackButton("Записаться на аэрохоккей", "aero_menu"));
    }
    keyboard.push(row);
    if (ctx.userdata.username !== "" && ctx.userdata.user_password !== "") {
        row = [];
        row.push(Telegraf.Markup.callbackButton("Тип недели", "get_week_type"));
        row.push(Telegraf.Markup.callbackButton("Расписание", "get_schedule"));
        row.push(Telegraf.Markup.callbackButton("Статус справок", "get_documents"));
        keyboard.push(row);
    }
    keyboard.push([Telegraf.Markup.callbackButton("Обновить авторизацию", "update_auth")]);

    await ctx.reply("Привет, я бот Коллежда Связи 54 им. П. М. Вострухина.\n\nЯ помогу тебе ориентироваться в учебном здании и твоём расписании.", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
});

bot.action(/^menu/, async (ctx) => {
    let keyboard = [];

    let row = [];
    if (ctx.userdata.korpus === -1) {
        row.push(Telegraf.Markup.callbackButton("Выбать корпус", "select_korpus"));
    } else {
        row.push(Telegraf.Markup.callbackButton("Изменить корпус", "select_korpus"));
        row.push(Telegraf.Markup.callbackButton("Кабинеты", "cabinets"));
        row.push(Telegraf.Markup.callbackButton("Звонки", "calls"));
        keyboard.push(row);
        row = [];
        row.push(Telegraf.Markup.callbackButton("Записаться на аэрохоккей", "aero_menu"));
    }
    keyboard.push(row);
    if (ctx.userdata.username !== "" && ctx.userdata.user_password !== "") {
        row = [];
        row.push(Telegraf.Markup.callbackButton("Тип недели", "get_week_type"));
        row.push(Telegraf.Markup.callbackButton("Расписание", "get_schedules"));
        row.push(Telegraf.Markup.callbackButton("Статус справок", "get_documents"));
        keyboard.push(row);
    }
    keyboard.push([Telegraf.Markup.callbackButton("Обновить авторизацию", "update_auth")]);

    await ctx.editMessageText("Привет, я бот Коллежда Связи 54 им. П. М. Вострухина.\n\nЯ помогу тебе ориентироваться в учебном здании и твоём расписании.", Telegraf.Extra.markup(m => m.inlineKeyboard(keyboard)));
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
    if(register.state === 0) {
        row.push(Telegraf.Markup.callbackButton("Получить инвентарь", "aero_take_" + record_id));
    } else if(register.state === 1) {
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
    await bot.telegram.sendMessage(-1001819504528,`Запись на ${time.desk} ${time.start_time} - ${time.end_time}\n${register.by_name}, группа ${register.by_group}\n\nИнвентарь сдан`);
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
    await bot.telegram.sendMessage(-1001819504528,`Запись на ${time.desk} ${time.start_time} - ${time.end_time}\n${register.by_name}, группа ${register.by_group}\n\nИнвентарь получен`);
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
        row.push(Telegraf.Markup.callbackButton(ops[i].name + " - " + ops[i].id, "confirm_korpus_" + ops[i].id));
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
        let staff = kioskBase.searchStaff(ctx.message.text.replaceAll(".", " "));
        if (staff == null) return;
        await ctx.replyWithPhoto("http://old.kioskapi.ru/terminal/media/teachers/" + staff.id, Telegraf.Extra
            .caption(`${staff.name} - ${staff.post}\nКабинет: ${staff.cab}`)
            .markup(m => m.inlineKeyboard([[m.callbackButton("Закрыть", "deleteMessage")]])));
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

cron.schedule("0 0 0 * * *", async () => {
    await database.clearAero();
});