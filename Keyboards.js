const Telegraf = require("telegraf");
module.exports = class Keyboard {
    static populateMainMenuKeyboard(ctx) {
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
            row.push(Telegraf.Markup.callbackButton("Статус справок", "get_documents"));
            keyboard.push(row);
        }
        keyboard.push([Telegraf.Markup.callbackButton("Обновить авторизацию", "update_auth")]);

        return keyboard;
    }
}