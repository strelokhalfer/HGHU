/*:
 *
 * @plugindesc Allow update game from github.
 * Free for non-commercial, for commercial write me on strelokhalfer@gmail.com
 * @author strelokhalfer
 *
 * @help Read params description.
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
 */

/*:ru
 *
 * @plugindesc Позволяет обновить игру с github.
 * Бесплатно для бесплатных проектов, по коммерческим писать на strelokhalfer@gmail.com
 * @author strelokhalfer
 *
 * @help Прочитай описание параметров.
 *
 * @param GitName
 * @desc Логин на гитхабе
 *
 * @param GitRepo
 * @desc Название репозитория с игрой
 *
 * @param ForceCommit
 * @desc Только при первом запуске, изначальный коммит
 * Указывайте полный хеш!
 *
 */

// (function() {
//Получаем параметры плагина
var HGHU_params = PluginManager.parameters('HGHU');
var HGHU_GitName = HGHU_params["GitName"];
var HGHU_GitRepo = HGHU_params["GitRepo"];
var HGHU_Commit = HGHU_params["ForceCommit"];

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
			
			//Ссылка на объект последнего коммита
			var url = `${url_base}/commits/master`;
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
						//TODO
						//Надпись "Последняя версия" или что нибудь ещё, считать бы с коммитов, но есть проблемы с кодировкой...
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
							//Если успешно
							if (this.readyState == 4 && this.status == 200) {
								//Парсим json
								var compare = JSON.parse(this.responseText);
								//Заполняем объект именами файлов и ссылками на их загрузку
								compare["files"].forEach(function(file){
									//в обьекте есть строка с "прямой" ссылкой, но по факту она редиректная, а https модуль в такое не умеет, потому опять литералы...
									update_files[file["filename"]] = `https://raw.githubusercontent.com/${HGHU_GitName}/${HGHU_GitRepo}/master/${file["filename"]}`;
								});
								//Конвертируем объект в JSON
								var jdata = JSON.stringify(update_files);
								//Полный путь до нового файла
								file_path = path.join(game_folder, 'Update.json');
								//Записываем файл, синхронно.
								fs.writeFileSync(file_path, jdata);
								//Показываем сообщение о том что доступна новая версия
								alert("Доступно обновление игры!\nДля установки обновления перезапустите игру!");
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
	//Удаляем лишнюю папку на конце
	game_folder = path.dirname(game_folder);
	
	//Обрабатываем каждый файл
	Object.keys(update_data).forEach(function(key) {
		//Получаем полный путь до файла
		file_path = path.join(game_folder, key);
		//Конечная папка файла, нужно для того, что бы не вывалилось, если папки нет
		var file_folder = path.dirname(file_path);
		//Рекурсивно создадим недостающие папки.
		MakeFolder(file_folder);
		//Открываем потоковую запись файла
		var file = fs.createWriteStream(file_path);
		//Когда весь файл получен
		file.on('close', function() {
			//Увеличиваем счетчик
			count++;
			
			//Если все файлы получены
			if (count == file_count){
				//Удаляем файл обновлений 
				file_path = path.join(game_folder, 'www/Update.json');
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
	});
};