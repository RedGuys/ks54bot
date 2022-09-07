const Telegraf = require('telegraf'); const session = require('telegraf/session'); const Database = require('./Database'); const Api = require('./Api');

let bot = new Telegraf.Telegraf(process.env.TOKEN);
bot.use(session());
let database = new Database(process.env.DATABASE_URL)

bot.use(async (ctx, next) => {
    ctx.userdata = await database.prepareUser(ctx.from.id);
    await next();
});

bot.start(async (ctx) => {
    let keyboard = [];

    let row = [];
    if (ctx.userdata.korpus === -1) {
        row.push(Telegraf.Markup.callbackButton("Выбать корпус", "select_korpus"));
    } else {
        row.push(Telegraf.Markup.callbackButton("Изменить корпус", "select_korpus"));
        row.push(Telegraf.Markup.callbackButton("Кабинеты", "cabinets"));
        row.push(Telegraf.Markup.callbackButton("Карты этажей", "floors"));
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

bot.action(/menu/, async (ctx) => {
    let keyboard = [];

    let row = [];
    if (ctx.userdata.korpus === -1) {
        row.push(Telegraf.Markup.callbackButton("Выбать корпус", "select_korpus"));
    } else {
        row.push(Telegraf.Markup.callbackButton("Изменить корпус", "select_korpus"));
        row.push(Telegraf.Markup.callbackButton("Кабинеты", "cabinets"));
        row.push(Telegraf.Markup.callbackButton("Карты этажей", "floors"));
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

bot.action(/select_korpus/, async (ctx) => {
    await ctx.editMessageText("Выбери свой корпус:", Telegraf.Extra.markup(m => m.inlineKeyboard([[
        m.callbackButton("Таганское - 1", "confirm_korpus_1"),
        m.callbackButton("Коломенское - 2", "confirm_korpus_2"),
    ], [
        m.callbackButton("Семёновское - 5", "confirm_korpus_5"),
        m.callbackButton("Рязанское - 6", "confirm_korpus_6"),
    ], [
        m.callbackButton("Римское - 7", "confirm_korpus_7"),
        m.callbackButton("Авиамоторное - 8", "confirm_korpus_8"),
    ], [
        m.callbackButton("Назад", "menu")
    ]])));
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
    await ctx.editMessageText(`${cabinet.name} находится на ${Math.floor(cabinet.number / 100)} этаже:\n${cabinet.path}`,
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
    for (let i = Math.max(0,documents.length-5); i < documents.length; i++) {
        text+=`${documents[i].id} от ${documents[i].from} ${documents[i].type} для ${documents[i]['for']}: ${documents[i].status}\n`;
    }
    await ctx.editMessageText(text, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
    await ctx.answerCbQuery();
});

bot.action(/get_schedules/, async (ctx) => {
    await ctx.editMessageText("Выберите тип расписания:", Telegraf.Extra.markup(m => m.inlineKeyboard([[
        m.callbackButton("Понедельник", "get_schedule_0"),
        m.callbackButton("Вторник", "get_schedule_1"),
    ],[
        m.callbackButton("Среда", "get_schedule_2"),
        m.callbackButton("Четверг", "get_schedule_3"),
    ], [
        m.callbackButton("Пятница", "get_schedule_4"),
        m.callbackButton("Суббота", "get_schedule_5"),
    ],[
        m.callbackButton("Назад", "menu")
    ]])));
    await ctx.answerCbQuery();
});

bot.action(/get_schedule_(\d)/, async (ctx) => {
    let schedule = await Api.getSchedule(await Api.login(ctx.userdata.username, ctx.userdata.user_password));
    schedule = schedule[parseInt(ctx.match[1])];
    let text = "";
    if(schedule) {
        for (let i = 0; i < schedule.lessons.length; i++) {
            if (schedule.lessons[i].name === undefined) {
                text += "------\n";
            } else {
                text += `${schedule.lessons[i].name} - ${schedule.lessons[i].cabinet.join("/")} (${schedule.lessons[i].teacher})\n`;
            }
            if (schedule.lessons[i].alternative) {
                text += ` \\ ${schedule.lessons[i].alternative.name} - ${schedule.lessons[i].alternative.cabinet.join("/")} (${schedule.lessons[i].alternative.teacher})\n`;
            }
        }
    }
    if(text === "") text = "Нет пар";
    await ctx.editMessageText(text, Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "get_schedules")]])));
    await ctx.answerCbQuery();
});

bot.action(/floors/, async (ctx) => {
    await ctx.answerCbQuery("Карты этажей ещё составляются :3", true);
});

bot.on("message", async (ctx) => {
    if (!ctx.session.state) return;
    switch (ctx.session.state) {
        case "wait_username": {
            ctx.session.username = ctx.message.text;
            ctx.session.state = "wait_password";
            await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
            await bot.telegram.editMessageText(ctx.from.id, ctx.session.message,null, "Отправьте ваш пароль", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
            break;
        }
        case "wait_password": {
            let password = ctx.message.text;
            let username = ctx.session.username;
            await bot.telegram.deleteMessage(ctx.from.id, ctx.message.message_id);
            await bot.telegram.editMessageText(ctx.from.id,  ctx.session.message, null,  "Проверка данных...");
            try {
                await Api.login(username, password);
            } catch (e) {
                await bot.telegram.editMessageText(ctx.from.id,  ctx.session.message,  null, "Неверные данные!", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
                return;
            }
            await database.setUserAuth(ctx.from.id, username, password);
            await bot.telegram.editMessageText(ctx.from.id,  ctx.session.message, null, "Авторизация успешна!", Telegraf.Extra.markup(m => m.inlineKeyboard([[m.callbackButton("Назад", "menu")]])));
        }
    }
});

bot.catch((err, ctx) => console.log(err, ctx)) // Print error and error context to console, no crash

bot.startPolling();
