var menu, platform, settings, trading, autoTrading;

main();

function main() {
    //menu = new Menu();
    //platform = new Platform();
    //platform.findPlatformElement();
    //settings = new Settings();
    //trading = new Trading();
    //document.getElementById("start").addEventListener("click", trading.clickButton.bind(trading), false);
    //autoTrading = new Autotrading();
    user = new User();
}
function Trading() {
    this.button = document.getElementById("start");
    this.worker;
    this.bet;
    this.inProcess = false;
    this.start = function () {
        if (platform.wv.src == "" || menu.currency == "" || menu.difference == undefined) { //���� �������� ��������������
            this.inProcess = false;
            this.button.textContent = "Start";
            return;
        }
        this.worker = new Worker('js/worker.js');
        settings.refresh();
        if (settings.mode == "manual")
            platform.getData(this.makeBet);
        else
            platform.getData(autoTrading.start);
    }
    this.stop = function () {
        this.worker.terminate();
        if (settings.mode == "auto")
            autoTrading.setdefaultValues();
    }
    this.clickButton = function () {
        if (this.inProcess) {
            this.stop();
            this.button.textContent = "Start";
            this.inProcess = false;
        }
        else {
            xhr("GET", "http://138.201.88.244/binopt/hs/v1/val/sessionID?user=" + user.userName + "&sessionID=" + user.sessionID + "&param=" + user.userName, function (obj) {
                    this.inProcess = true;
                    this.button.textContent = "Stop";
                    this.start();
            }.bind(this))
        }
    }
    this.makeBet = function () {
        trading.worker.postMessage({
            "user":user,
            "cur": menu.currency,
            "diff": +menu.difference,
            "trend": menu.trend,
            "mode": settings.mode,
            "pause": (platform.data.dealTime*60+settings.pause+10)*1000
        });

        trading.worker.onmessage = function (event) {
            if (event.data == "Call") {
                platform.call();
                if (settings.mode == "auto")
                    autoTrading.data.trend = event.data;
                trading.bet = new Bet(event.data);
                trading.button.disabled = true;
            }
            else if (event.data == "Put") {
                platform.put();
                if (settings.mode == "auto")
                    autoTrading.data.trend = event.data;
                trading.bet = new Bet(event.data);
                trading.button.disabled = true;
            }
            else if (event.data == "pauseOver") {
                //trading.bet.finish();
                //trading.button.disabled = false;
                //if (settings.mode == "auto")
                //    platform.getData(autoTrading.continue);
                //else {
                //    trading.stop();
                //    trading.button.textContent = "Start";
                //    trading.inProcess = false;
                //}
                trading.bet.finish();
                trading.button.disabled = false;
                if (settings.mode == "manual"){
                   trading.stop();
                    trading.button.textContent = "Start";
                    trading.inProcess = false;
                }
            }
        }
    }
}
function Platform(userName) {
    this.wv;
    this.scripts;
    this.data;
    this.callback;
    this.getScripts = function (url) {
        platform.scripts = {};
        xhr("GET", url, function (list) {
            for (var i = 0; i < list.length; i++)
                this.scripts[list[i].name] = list[i].value;
        }.bind(this));
    }
    this.findPlatformElement = function () {
        this.wv = document.getElementById("platform");
    }
    this.refresh = function (broker) {
        if (broker != undefined) {
            this.wv.src = broker.value;
            this.getScripts("http://138.201.88.244/binopt/hs/v1/list/script?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=" + broker.textContent);
        }
    }
    this.getData = function (callback) {
        this.callback = callback;
        this.data = {};

        function executeScript(script) {
            return new Promise(function (resolve, reject) {
                platform.wv.executeJavaScript(script, false,function (arr) {
                    resolve(arr);
                });
            });
        }
        executeScript(this.scripts.getBalance).then(res=> {
            platform.data.balance = res;
            return executeScript(this.scripts.getBetSize);
        }).then(res=> {
            platform.data.betSize = res;
            return executeScript(this.scripts.getPercent);
        }).then(res=> {
            platform.data.percent = res;
            return executeScript(this.scripts.getDealTime);
        }).then(res=> {
            platform.data.dealTime = res;
            platform.callback();
        });
    }
    this.call = function () {
        this.wv.executeJavaScript(this.scripts.callButtonClick);
    }
    this.put = function () {
        this.wv.executeJavaScript(this.scripts.putButtonClick);
    }
    this.setBetSize = function (betSize) {
        this.wv.executeJavaScript(betSize + this.scripts.setBetSize);
    }
}
function Settings(userName) {
    this.mode;
    this.calcFormula;
    this.schedule = new Table("schedule");
    this.balanceBelow = 0;
    this.balanceIncrease = 0;
    this.balanceDecrease = 0;
    this.lossesInRow = 0;
    this.sameTrend;
    this.pause = 0;
    this.bettingStrategies;
    function bind() {

        var arr = document.querySelectorAll("input[name = calc]");
        for (i = 0; i < arr.length; i++) {
            arr[i].onchange = function () {
                if (this.checked)
                    settings.calcFormula = this.id;
            }
        };

        var arr = document.querySelectorAll("input[name = mode]");
        for (i = 0; i < arr.length; i++) {
            arr[i].onchange = function () {
                if (this.checked)
                    settings.mode = this.id;
            }
        };

        document.getElementById("pause").onchange = function () {
            settings.pause = +this.value;
        }
        document.getElementById("balanceDecrease").onchange = function () {
            settings.balanceDecrease = +this.value;
        }
        document.getElementById("balanceIncrease").onchange = function () {
            settings.balanceIncrease = +this.value;
        }
        document.getElementById("percentBelow").onchange = function () {
            settings.percentBelow = +this.value;
        }
        document.getElementById("lossesInRow").onchange = function () {
            settings.lossesInRow = +this.value;
        }
        document.getElementById("sameTrend").onchange = function () {
            settings.sameTrend = this.checked;
        }
    }; bind();
    this.refresh = function () {
        var arr = document.querySelectorAll("#settings *");
        for (i = 0; i < arr.length; i++) {
            evt = document.createEvent("Event");
            evt.initEvent("change", true, false);
            arr[i].dispatchEvent(evt);
        }
    }
    document.getElementById("set").addEventListener("click", function () {
        var style = document.getElementById("settings").style;
        if (style.display == "block")
            style.display = "none";
        else
            style.display = "block"
    })
    xhr("GET", "http://138.201.88.244/binopt/hs/v1/list/strategy?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=", function (list) {
        fillList(list, document.getElementById("strategy"), this);
    }.bind(this));
    this.getStrategy = function () {
        for (var i = 0; i < this.bettingStrategies.length; i++)
            if (this.bettingStrategies[i].name == document.getElementById("strategy").value)
                return this.bettingStrategies[i].value;
    }
    this.setList = function (list) {
        this.bettingStrategies = list;
    }
}
function Menu(userName) {
    this.broker;
    this.currency;
    this.trend;
    this.difference;

    function fill() {
        var currency = document.getElementById("currency");
        var broker = document.getElementById("broker");
        getList("http://138.201.88.244/binopt/hs/v1/list/broker?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=" + broker.textContent, broker);
        getList("http://138.201.88.244/binopt/hs/v1/list/currency?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=" + broker.textContent, currency);
    }
    function getList(url, parent) {
        let xhr = new XMLHttpRequest;
        xhr.open("GET", url, true);
        xhr.send();
        xhr.onload = function () {
            if (xhr.readyState != 4)
                return;
            if (xhr.status != 200) {
                alert(xhr.status + ': ' + xhr.statusText);
            } else {
                let arr = JSON.parse(xhr.responseText);
                arr.forEach(function (item, i, arr) {
                    setOption(item, parent);
                });

                evt = document.createEvent("Event");
                evt.initEvent("change", true, false);
                parent.dispatchEvent(evt);
            }
        }
    }
    function setOption(option, parent) {
        let elem = document.createElement('option');
        elem.value = option.value;
        elem.text = option.name;
        parent.appendChild(elem);
    }
    function bind() {
        document.getElementById("broker").onchange = function () {
            menu.broker = this.value;
            if (platform)
                platform.refresh(this);
        }
        document.getElementById("currency").onchange = function () {
            menu.currency = this.value;
        }
        document.getElementById("trend").onchange = function () {
            menu.trend = this.textContent;
        }
        document.getElementById("difference").onchange = function () {
            menu.difference = this.value;
        }
    }
    bind();
    fill();
}
function Autotrading() {
    this.data = {
        startingBalance: 0, startingBetSize: 0, lostBets: 0, sumOfBets: 0, balanceBeforeBet: 0, balanceAfterBet: 0, trend: undefined
    };
    this.firstTime = true;
    this.start = function () {
        if (autoTrading.firstTime) {
            autoTrading.data.startingBalance = platform.data.balance;
            autoTrading.data.startingBetSize = platform.data.betSize;
            autoTrading.firstTime = false;
        }

        var deny = false;
        if (settings.percentBelow > 0 && settings.percentBelow > platform.data.percent)
            deny = true;

        coll = document.getElementById('schedule').rows;
        if (coll.length > 1 && deny == false) {
            deny = true;
            for (var i = 1, length = coll.length; i < length; i++) {
                var row = settings.schedule.getRow(coll[i].cells);
                if (row == undefined)
                    continue;

                var now = new Date();
                for (key in row) {
                    var time = row[key].split(':');
                    row[key] = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time[0], time[1]);
                }

                if (row.From <= now && now <= row.To) {
                    deny = false;
                    break;
                }
            }
        }
        if (deny) {
            setTimeout(platform.getData.bind(platform), 60 * 1000, autoTrading.start);
            return;
        }
        autoTrading.data.balanceBeforeBet = platform.data.balance;
        trading.makeBet();
    }
    this.continue = function () {
        autoTrading.data.balanceAfterBet = platform.data.balance;

        if (autoTrading.data.balanceAfterBet < autoTrading.data.balanceBeforeBet) {
            autoTrading.data.lostBets++;
            autoTrading.data.sumOfBets += platform.data.betSize;
            platform.setBetSize(calculateBetSize());
        } else if (autoTrading.data.balanceAfterBet > autoTrading.data.balanceBeforeBet) {
            autoTrading.data.lostBets = 0;
            autoTrading.data.sumOfBets = 0;
            //autoTrading.data.newBetSize = autoTrading.data.startingBetSize
            platform.setBetSize("betSize = " + autoTrading.data.startingBetSize + ";");
        }

        if (settings.balanceDecrease > 0 && autoTrading.data.balanceAfterBet <= autoTrading.data.startingBalance - settings.balanceDecrease) {
            autoTrading.finish();
            return;
        }
        else if (settings.balanceIncrease > 0 && autoTrading.data.balanceAfterBet >= autoTrading.data.startingBalance + settings.balanceIncrease) {
            autoTrading.finish();
            return;
        }
        else if (autoTrading.data.lostBets > 0 && autoTrading.data.lostBets == settings.lossesInRow) {
            autoTrading.finish();
            return;
        }
        else if (settings.sameTrend) {
            if (autoTrading.data.balanceAfterBet < autoTrading.data.balanceBeforeBet) {
                menu.trend = autoTrading.data.trend;
            } else if (autoTrading.data.balanceAfterBet > autoTrading.data.balanceBeforeBet) {
                menu.trend = undefined;
            }
        }
        platform.getData(autoTrading.start);
    }
    this.finish = function () {
        this.setdefaultValues();
        trading.stop();
        trading.button.textContent = "Start";
        trading.inProcess = false;
    }
    this.setdefaultValues = function () {
        this.data.startingBalance = this.data.startingBetSize = this.data.lostBets = this.data.sumOfBets = this.data.balanceBeforeBet = this.data.balanceAfterBet = this.data.newBetSize = 0;
        this.trend = undefined;
        this.firstTime = true;
    }
    function calculateBetSize() {
        var code = settings.getStrategy();
        return code.replace("sumOfBets", autoTrading.data.sumOfBets).replace("percent", platform.data.percent).replace("startingBetSize", autoTrading.data.startingBetSize);
    }
}
function Table(id) {
    this.headers = [];
    headersColl = document.getElementById(id).rows[0].cells;
   for (var i = 0; i < headersColl.length; i++)
            this.headers.push(headersColl[i].textContent);

    this.currentRow = 0;
    this.add = function () {
        var t = document.querySelector("table");
        var row = t.insertRow(t.rows.lenght);
        for (var i = 0; i < 2; i++) {
            var cell = row.insertCell(i);
            var inp = document.createElement('input');
            inp.type = 'time';
            cell.appendChild(inp);
        }
        this.currentRow++;
    }
    this.delete = function () {
        if (this.currentRow >= 1) {
            document.querySelector("table").deleteRow(this.currentRow);
            this.currentRow--;
        }
    }
    this.getRow = function (cells) {

        var row = {};
        for (var i = 0; i < cells.length; i++) {
            var data = cells[i].firstChild;
            if (!data.validity.valid || data.value == "")
                return undefined;
            row[this.headers[i]] = data.value;
        }
        return row;
    }
    document.getElementById("addRow").addEventListener("click", this.add.bind(this), false);
    document.getElementById("delRow").addEventListener("click", this.delete.bind(this), false);
}

function xhr(method, url, callback, body) {
    let xhr = new XMLHttpRequest;
    xhr.open(method, url, true);
    if(method == "GET")
        xhr.send();
    else if (method == "POST")
        xhr.send(body);
    xhr.onload = function () {
        if (xhr.readyState != 4)
            return;
        if (xhr.status != 200) {
            alert(xhr.status + ': ' + xhr.statusText);
        } else {
            let obj = JSON.parse(xhr.responseText);
            callback(obj);
        }
    }
}
function addOption(option, parent) {
    let elem = document.createElement('option');
    elem.text = option;
    parent.appendChild(elem);
}
function fillList(list, parent, obj) {
    obj.setList(list);
    list.forEach(function (item, i, arr) {
        addOption(item.name, parent);
    });
}

function User() {
    this.userName;
    this.pass;
    this.sessionID;
    this.plan;
    document.getElementById("login").addEventListener("click", function () {
        var hashObj = new jsSHA("SHA-1","TEXT",{ numRounds: 1 });
        hashObj.update(document.getElementById("password").value);
        this.pass = hashObj.getHash("B64");

        xhr("GET", "http://138.201.88.244/binopt/hs/v1/auth?user=" + document.getElementById("username").value + "&password=" + this.pass, function (obj) {
            if (obj.sessionID) {
                user.sessionID = obj.sessionID;
                user.userName = document.getElementById("username").value;
                document.getElementById("modal").style.display = "none";
                menu = new Menu();
                platform = new Platform();
                platform.findPlatformElement();
                settings = new Settings();
                trading = new Trading();
                document.getElementById("start").addEventListener("click", trading.clickButton.bind(trading), false);
                autoTrading = new Autotrading();
            }
        })
    }.bind(this))
}

function Bet(trend) {
    this.request = {
        data: {
            betSize: undefined,
            balanceBeforeBet: undefined,
            balanceAfterBet: undefined,
            trend: undefined,
            percent: undefined,
            user: undefined,
            currency: undefined,
            mode: undefined,
            result: undefined,
            commission: undefined
        },
        signature:undefined};
    platform.getData(function () {
        this.request.data.balanceBeforeBet = platform.data.balance;
        this.request.data.percent = platform.data.percent;
        this.request.data.betSize = platform.data.betSize;
    }.bind(this));
    this.request.data.trend = trend;
    this.request.data.user = user.userName;
    this.request.data.currency = menu.currency;
    this.request.data.mode = settings.mode;
    
    this.finish = function () {
        platform.getData(function () {
            this.request.data.balanceAfterBet = platform.data.balance;
            this.request.data.result = this.request.data.balanceAfterBet - this.request.data.balanceBeforeBet;
            this.request.data.comission = this.request.data.result * 0.3;
            var sign = user.userName + user.sessionID + JSON.stringify(this.request.data) + user.pass;
            var hashObj = new jsSHA("SHA-1", "TEXT", { numRounds: 1 });
            hashObj.update(sign);
            this.request.signature = hashObj.getHash("B64");

            xhr("POST", "http://138.201.88.244/binopt/hs/v1/doc/bet?user=" + user.userName + "&sessionID=" + user.sessionID, function () { }, JSON.stringify(this.request));

            if (settings.mode == "auto")
                platform.getData(autoTrading.continue);
        }.bind(this))
    }
}