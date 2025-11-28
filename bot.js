require('dotenv').config();
const { error, time } = require('console');
const { Bot, GrammyError, HttpError, Keyboard, InlineKeyboard,  session} = require('grammy');
const fs = require('fs').promises;
const { hydrate } = require('@grammyjs/hydrate');
const { conversations } = require('@grammyjs/conversations/out/conversation.js');

// Объявляю переменнную с API бота
const bot = new Bot(process.env.BOT_API_KEY);

// Переменные с директорией к файлам с форматом JSON
const Filedata = "./jsonFile/data.json";
const Resetday = "./jsonFile/saveData.json";

//Используются два плагина для полного функционирования бота
bot.use(hydrate()); 
bot.use(session({
    initial: () => ({step: 0}) // Прописываю шаги для дальших дейсвий бота
})); 
bot.use(conversations());

const ADMIN_ID = process.env.ADMIN_ID; // Объявление переменной с данными админа бота
const Max_Requerts_Day = 5; // Переменная с максимальным кол-вом запросов и использования бота  

// Создается отдельное меню подсказка с командами, на которые бот может реагирует 
bot.api.setMyCommands([
    {
        command: "start", description: "Запуск бота",
    },
    {
        command: "menu", description: "Запуск меню с дейсвиями",
    },
    {
        command: "message", description: " с дейсвиями",
    },
]);

// Запуск бота с помощью команды /start
bot.command('start', async(ctx) => {
    const start_message1 = `👋 Приветсвую! Я бот помощник моего создателя`;
    const start_message2 = `<b>Добро Пожаловать !</b>
    \n<i>🤖 Это <b>бета-версия</b> бота с фунцией обратной связи, и сейчас, вы можете отправить сообщение\n</i>` + 
    `\n<i>💬 Для начала запустите команду /menu</i>`;

    await ctx.reply(start_message1, {
        parse_mode: "Markdown"
    });

    setTimeout(async() => {
        await ctx.reply(start_message2, {
            parse_mode: "HTML"
        });
    }, 3000);
});

// Данная команда еще в стадии настройки
bot.command('reply', async(ctx) => {
    const text = ctx.message.text;
    const form = text.split(" ");

    if (form.length < 3) {
        return ctx.reply("Используйте : /reply <username> <ответ>")
    }

    let username = form[1].replace('@', '')
    const replyText = form.slice(2).join(" ");

    try {
        const users = JSON.parse(await fs.readFile(Filedata, 'utf-8'));
        const [userId, userEntry] = Object.entries(users).find(([, u]) => u.username === username) || [];

        if(!userId) {
            return ctx.reply(`Пользователь ${username} не найден`);
        }

        await  bot.api.sendMessage(userId, `💬 Ответ от админа:\n ${replyText}`)
        await ctx.reply(`✅ Ответ был отправлен пользователю ${username}`);
    } catch (err) {
        console.error("❌ Ошибка при отправке ответа:", err.message)
        await ctx.reply(`❌ Не удалось отправить ответ пользователю: @${username}`)
    }
});

// Запуск команды для вывода меню или с помощью команды /message можно запустить меню
bot.command(["menu", "message"], async(ctx) => {
    await ctx.reply('👇 Выбери одну команду бота: ', {
        reply_markup: menu
    });
})  

//Создаю клавиатуру с кнопками
const menu = new Keyboard()
.text("💬 Отправить сообщение")
.row()
.text('📲 Социальные сети')
.resized()
.oneTime();

// Создаю кнопку для отмены отправки сообщений
const btnCancel = new Keyboard()
.text("❌ Отменить")
.resized()
.oneTime();

// Кнопка позволяет отменить действие
bot.hears("❌ Отменить", async(ctx) => {
    if (ctx.session.step === 1) {
        ctx.session.step = 0;
        
        await ctx.reply('🚫 Вы отменили отправку сообщения', {
            reply_markup: menu
        });
        return;
    }
});

// Происходит обработка текста кнопок, бот реагирует на них обоих, и отправляет пользователю свой  ответ 
bot.hears('💬 Отправить сообщение', async(ctx) => {
    ctx.session.step = 1;

    await ctx.react('🕊')
    await ctx.reply("⌨️ Напишите ваше сообщение автору", {
        reply_markup: btnCancel
    });
});

bot.hears("📲 Социальные сети", async(ctx) => {
    const socialKeyboard = new InlineKeyboard()
    .url("💾 GitHub", "https://github.com/Oleg-lpo")
    .url("✉️ Телеграм", "https://t.me/lion_erem")
    .row()
    .url("🌐 Vk", "https://vk.ru/lion_erem'")
    .url("📹 TikTok", "https://www.tiktok.com/@lion_erem1?_r=1&_t=ZN-91GLR7JBkfu");

    await ctx.react('👨‍💻');
    await ctx.reply("📲 Социальные сети автора:",{
        reply_markup: socialKeyboard
    });
});

// В асинхронной функции происходит сохранение данный в файле JSON 
async function savefeedBackFile (userData) {
    let msg = {};
    
    try {
        const data = await fs.readFile(Filedata, 'utf-8');
        msg = JSON.parse(data);
    
    } catch (err) {
        msg = {};
    }

    msg[userData.id] = {
        username: userData.username
    }

    await fs.writeFile(Filedata, JSON.stringify(msg, null, 2))
} i

//В функции происходит обработка, и происходит проверка файла JSON на ошибки
async function readDataUser() {
    try {
        const data = await fs.readFile(Resetday, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

// В функции происходит сохранение и ответ данных пользователей
async function saveUserRequests(userRequests) {
    try {
        const cleanUserData = {};
        for (const [userId, data] of Object.entries(userRequests)) {
            cleanUserData[userId] = {
                count: data.count,
                data: data.lastDate
            };
        }
        await fs.writeFile(Resetday, JSON.stringify(cleanUserData));
    } catch (err) {
        console.error("Ошибка при сохранении данных", err);
    }
   
}

// Создал обработчик сообщений, и бот отправляет ответ пользователю 
bot.on("message:text", async(ctx) => {
    const userId = ctx.from?.id;
    const text = ctx.message.text;
    const today = new Date().toDateString().slice(0, 10);

    if (text === btnCancel || text === '💬 Отправить сообщение' || text === '📲 Социальные сети') {
        return;
    }


    if (ctx.session.step === 1) {

        let userRequests = await readDataUser();


        if (!userRequests[userId]) {
            userRequests[userId] = { count: 1, lastDate: today }
        } 
        
        else if (userRequests[userId].lastDate !== today) {
            userRequests[userId] = { count: 1, lastDate: today };
        } 

        else if (userRequests[userId].count >= Max_Requerts_Day) {
            await ctx.reply("Вы превысили дневной лимит");
            ctx.session.step = 0;
            return;
        }

        else {
            userRequests[userId].count++;
        }

        await saveUserRequests(userRequests);

        const userData = {
            userId: ctx.from.id,
            username: ctx.from.username,
            text: ctx.message.text,
            time: new Date().toISOString()
        }

       await savefeedBackFile(userData);

        const sendMsg = `🔔 Вам пришло новое сообщение от пользователя:
        \n👤 Имя: @${userData.username}
        \n🆔 ID: ${userData.userId}
        \n💬 Сообщение: ${userData.text}`;
 
        await savefeedBackFile(userData);

        await bot.api.sendMessage(ADMIN_ID, sendMsg);
    };

    if (ctx.session.step !== 1) {
        const replay = `📨 Ваше сообщение давно было отправлено, чтобы написать сообщение ещё раз запустите команду /message`;
        return ctx.reply(replay);
    } 
});

// Обрабочик ошибок 

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}`);
    const e = err.error;
    if (e instanceof HttpError) {
        console.error(`Не удалось связаться с Telegram: ${e}`)
    } else if (e instanceof GrammyError) {
        console.error(`Ошибка в запросе: ${e.description}`);
    } else {
        console.error('Неизвестная ошибка:', e)
    }
});

//Запуск бота
bot.start();
