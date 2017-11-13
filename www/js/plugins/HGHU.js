/*:
 *
 * @plugindesc Allow to update game from github.
 * Free for non-commercial, for commercial write me on strelokhalfer@gmail.com
 *
 * @author strelokhalfer
 *
 * @help Read params description.
 * You need to know how to create GitHub repository
 * (My English isn't perfect, i can't create guide at this time)
 * 
 * Version 1.1 - At now deleted files will be deleted and checking updates will work only from Title menu button
 * Version 1.0 - Release
 *
 * @param GitName
 * @desc Github username
 *
 * @param GitRepo
 * @desc Github repository name
 *
 * @param ForceCommit
 * @desc Only for first launch
 * Full commit hash.
 *
 * @param UpdateYes
 * @text Update Message
 * @type note
 * @desc Message if updates has exists
 * @default "Updates was found!\nFor install, relaunch this game!"
 *
 * @param UpdateNo
 * @text No updates
 * @type note
 * @desc Message if updates hasn't exists
 * @default "No updates was detected!"
 *
 * @param UpdateButtonLabel
 * @text Button label
 * @desc Update Button Label
 * @default Check updates
 * 
 * @param UpdateButtonPos
 * @text Button Position
 * @type number
 * @min 1
 * @desc Update Button position in the Title commands list
 * @default 4
 *
 */

/*:ru
 *
 * @plugindesc Позволяет обновить игру с github.
 * Бесплатно для бесплатных проектов, по коммерческим писать на strelokhalfer@gmail.com
 *
 * @author strelokhalfer
 *
 * @help Прочитай описание параметров.
 * http://strelokhalfer.github.io/HGHU-help/ - создание своего репозитория
 *
 * Version 1.1 - Теперь удалённые файлы будут удаляться, а так же проверка 
 * будет работать только через пункт главного меню.
 * Version 1.0 - Релиз
 *
 * @param GitName
 * @text Логин GitHub
 * @desc Логин на гитхабе
 *
 * @param GitRepo
 * @text Репозиторий игры
 * @desc Название репозитория с игрой
 *
 * @param ForceCommit
 * @text Последний коммит
 * @desc Только при первом запуске, изначальный коммит
 * Указывайте полный хеш!
 *
 * @param UpdateYes
 * @text Текст обновления
 * @type note
 * @desc Текст при наличии обновления
 * @default "Доступно обновление игры!\nДля установки обновления перезапустите игру!"
 *
 * @param UpdateNo
 * @text Отсутствие обновления
 * @type note
 * @desc Текст при отсутствии обновления
 * @default "Обновлений не обнаружено"
 *
 * @param UpdateButtonLabel
 * @text Текст кнопки
 * @desc Текст кнопки обновления
 * @default Проверить обновление
 * 
 * @param UpdateButtonPos
 * @text Позиция кнопки
 * @type number
 * @min 1
 * @desc Позиция кнопки в меню обновлений
 * @default 4
 *
 */
 
//В браузере скрипт не будет работать совсем. На сайте сам автор и так обновит.
if (StorageManager.isLocalMode()){
    //Получаем параметры плагина
    var HGHU_params = PluginManager.parameters('HGHU');
    var HGHU_GitName = HGHU_params["GitName"];
    var HGHU_GitRepo = HGHU_params["GitRepo"];
    var HGHU_Commit = HGHU_params["ForceCommit"];
    var HGHU_UpdateYes = HGHU_params["UpdateYes"];
    var HGHU_UpdateNo = HGHU_params["UpdateNo"];
    var HGHU_UpdateButtonLabel = HGHU_params["UpdateButtonLabel"];
    var HGHU_UpdateButtonPos = HGHU_params["UpdateButtonPos"];
    //Некоторые параметры лежат в JSON
    HGHU_UpdateYes = JSON.parse(HGHU_UpdateYes);
    HGHU_UpdateNo = JSON.parse(HGHU_UpdateNo);
    //Индексация в коде начинается с ноля, потому вычитаем единицу
    HGHU_UpdateButtonPos--;
    
    //Рекурсивно создать пути, если их нет
    var MakeFolder = function(top_path){
        //Для создания папок
        var fs = require('fs');
        //А этим путь получать
        var path = require('path');
        
        //Если нету папки
        if (!fs.existsSync(top_path)){
            //Проверяем родительскую, если и её нет, углубляемся ещё дальше.
            MakeFolder(path.dirname(top_path));
            //И когда все папки до конечной созданы, создаём и эту
            fs.mkdirSync(top_path);
        }
    };
    
    //Добавляем нашу команду в окно команд
    HGHU_Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function() {
        //Генерируем список команд
        HGHU_Window_TitleCommand_makeCommandList.call(this);
        //И создаем параметры своей. Текст команды, имя в коде и то что её можно нажать.
        var update_button = { name: HGHU_UpdateButtonLabel, symbol: "HGHU_update", enabled: true};
        //Как ни странно, просто вставлять что то по позиции js не умеет, есть общая функция на вставить и/или удалить по позиции
        //Позиция, ничего не удаляем, что вставляем
        this._list.splice(HGHU_UpdateButtonPos, 0, update_button);
    };
    
    //Добавляем функцию комманды в список хендлеров
    HGHU_Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        //Сначалу пусть добавятся другие
        HGHU_Scene_Title_createCommandWindow.call(this);
        //А теперь и наша функция
        this._commandWindow.setHandler("HGHU_update", this.commandCheckUpdate.bind(this));
    };
    
    //Наша функция
    Scene_Title.prototype.commandCheckUpdate = function() {
		//Подготавливаем запрос
		var xhr_master = new XMLHttpRequest();
		//Базовая ссылка на репозиторий
		var url_base = `https://api.github.com/repos/${HGHU_GitName}/${HGHU_GitRepo}`;
        //Ссылка на объект последнего коммита
		var url = `${url_base}/commits/master`;
        //Модуль файловой системы
        var fs = require('fs');
        //Модуль путей
        var path = require('path');
        //Получаем папку проекта
        var game_folder = path.dirname(process.mainModule.filename);
		//Достраиваем путь к файлу коммита
		file_path = path.join(game_folder, 'data/Commit.json');
            
		//Коллбек срабатывающий когда запрос свершается
		xhr_master.onreadystatechange = function() {
			//Если он успешный, конечно же
			if (this.readyState == 4 && this.status == 200) {
				//Парсим JSON последнего коммита
				var last_commit = JSON.parse(this.responseText);
				//И получаем из него хеш коммита
				last_commit = last_commit["sha"];
				
				//Если версия последняя
                if (last_commit == HGHU_Commit){
                    alert(HGHU_UpdateNo);
                } else {
					//Конвертируем хеш в json строку.
					var jdata = JSON.stringify(last_commit);
					//Сохраняем в файл
					fs.writeFileSync(file_path, jdata);
					
					//Подготавливаем запрос
					var xhr_files = new XMLHttpRequest();
					//Сюда запишем файлы что нам нужно будет обновить
					var update_files = {};
					//Генерируем ссылку на обьект сравнения двух коммитов
					url = `${url_base}/compare/${HGHU_Commit}...${last_commit}`;
					
					//Когда запрос завершён
                    xhr_files.onreadystatechange = function() {
                        //И он успешен
                        if (this.readyState == 4 && this.status == 200) {
                            //Получаем данные в json и парсим их
                            var compare = JSON.parse(this.responseText);
                            //Обрабатываем каждый файл
                            compare["files"].forEach(function(file){
                                //Если файл удален
                                if(file["status"] == "removed"){
                                    //То и у игроков его надо будет удалить
                                    update_files[file["filename"]] = "EXTERMINATE";
                                    //Иначе добавляем ссылку на файл
                                } else {                            
                                    //в объекте есть строка с "прямой" ссылкой, но по факту она редиректная, а https модуль в такое не умеет, потому опять литералы...
                                    update_files[file["filename"]] = `https://raw.githubusercontent.com/${HGHU_GitName}/${HGHU_GitRepo}/master/${file["filename"]}`;
                                }
                            });
							//Конвертируем объект в JSON
							var jdata = JSON.stringify(update_files);
							//Полный путь до нового файла
							file_path = path.join(game_folder, 'Update.json');
							//Записываем файл, синхронно.
							fs.writeFileSync(file_path, jdata);
							//Показываем сообщение о том что доступна новая версия
                            alert(HGHU_UpdateYes);
                        }
                    };
					//Открываем запрос
					xhr_files.open("GET", url, true);
					//И отсылаем его
					xhr_files.send();
                }
            }
        };
		//Открываем запрос
		xhr_master.open("GET", url, true);
		//И отсылаем его
        xhr_master.send();
        //Очищаем
        TouchInput.clear();
        Input.clear();
        //Реактивируем меню.
        this._commandWindow.activate();
    };
        
    //Копируем оригинальную функцию. Использую её, ибо нужно обработать файлы до загрузки бд.
    var HGHU_Scene_Boot_create = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function() {
        //Этим модулем будем качать файлы
        var https = require('https');
        //А этим сохранять
        var fs = require('fs');
        //А этим путь получать
        var path = require('path');
        //Получаем папку проекта
        var game_folder = path.dirname(process.mainModule.filename);
        //Путь до файла обновлений
        var file_path = path.join(game_folder, 'Update.json');
        //Сюда считаем файл обновления
        var file_update;
        
        //У синхронного чтения функций срабатывающих при готовности нет, используем блок обработки ошибок.
        try {
            //Пытаемся прочесть файл
            file_update = fs.readFileSync(file_path);
            //Перехват ошибки
        } catch (err) {
                //Если файла нет
            if (err.code === 'ENOENT') {
                //То значит обновления пока нет, или мы его ещё не получили.
                //Подготавливаем запрос
                var xhr_master = new XMLHttpRequest();
                //Базовая ссылка на репозиторий
                var url_base = `https://api.github.com/repos/${HGHU_GitName}/${HGHU_GitRepo}`;
                //Достраиваем путь к файлу коммита
                file_path = path.join(game_folder, 'data/Commit.json');
                //Проверка на то, нужно ли считать хеш из файла
                var need_read = true;
                
                //У синхронного чтения функций срабатывающих при готовности нет, используем блок обработки ошибок.
                try {
                    //Пытаемся прочесть файл
                    file_update = fs.readFileSync(file_path);
                    //Перехват ошибки
                } catch (err) {
                    //Если файла нет
                    if (err.code === 'ENOENT') {
                        //Конвертируем массив в json строку.
                        var jdata = JSON.stringify(HGHU_Commit);
                        //Сохраняем в файл
                        fs.writeFileSync(file_path, jdata);
                        //Загружать из файла не надо, мы только что его создали.
                        need_read = false;
                    }
                }
                //Если надо, считываем из файла
                if (need_read){
                    //Синхронно
                    HGHU_Commit = fs.readFileSync(file_path);
                    //Конвертируем в строку
                    HGHU_Commit = JSON.parse(HGHU_Commit);
                }
                //Продолжаем запуск игры
                HGHU_Scene_Boot_create.call(this);
                //И не обрабатываем код ниже(можно и через условие, но зачем нагружать?)
                return;
            }
        }
        //Парсим JSON
        var update_data = JSON.parse(file_update);
        //Счётчик файлов, так как качаем асинхронно
        var count = 0;
        //Сколько всего файлов
        var file_count = Object.keys(update_data).length;
        //Запоминаем контекст(ибо this в джаве крайне странный объект, вроде бы есть 
        //а вроде и уже другой, потому не стоит в функциях вызывать другие через this)
        var real_this = this;
        
        //Обрабатываем каждый файл
        Object.keys(update_data).forEach(function(key) {
            //Обрезаем www/ ибо путь проекта и так включает в себя её
            var valid_path = key.substring(3);
            //Получаем полный путь до файла
            file_path = path.join(game_folder, key);
            //Конечная папка файла, нужно для того, что бы не вывалилось, если папки нет
            var file_folder = path.dirname(file_path);
            //Рекурсивно создадим недостающие папки.
            MakeFolder(file_folder);
            //Удаляем файл если нужно
            if (update_data[key] == "EXTERMINATE"){
                fs.unlink(file_path);
                //Или закачиваем
            } else {
                //Открываем потоковую запись файла
                var file = fs.createWriteStream(file_path);
                //Когда весь файл получен
                file.on('close', function() {
                    //Увеличиваем счетчик
                    count++;
                    
                    //Если все файлы получены
                    if (count == file_count){
                        //Удаляем файл обновлений 
                        file_path = path.join(game_folder, 'Update.json');
                        //Синхронно конечно, будет быстро и нет лишнего геморроя с коллбеками
                        fs.unlinkSync(file_path);
                        
                        //Грузим игру, если обработали все файлы.
                        HGHU_Scene_Boot_create.call(real_this);
                    }
                });
                //Грузим файл
                var request = https.get(update_data[key], function (response) {
                    response.pipe(file);
                });
            }
        });
    };
}
