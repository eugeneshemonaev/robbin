main();

function main() {
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
    };
    this.stop = function () {
        this.worker.terminate();
        if (settings.mode == "auto")
            autoTrading.setdefaultValues();
    };
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
    };
    this.makeBet = function () {
        trading.worker.postMessage({
            "user": user,
            "cur": menu.currency,
            "diff": +menu.difference,
            "trend": menu.trend,
            "mode": settings.mode,
            "pause": (platform.data.dealTime * 60 + settings.pause + 10) * 1000
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
                trading.bet.finish();
                trading.button.disabled = false;
                if (settings.mode == "manual") {
                    trading.stop();
                    trading.button.textContent = "Start";
                    trading.inProcess = false;
                }
            }
        }
    }
}
function Platform() {
    this.wv = document.getElementById("platform");
    this.getScripts = url => {
        this.scripts = {};
        xhr("GET", url, list => {
            for (var i = 0; i < list.length; i++)
                this.scripts[list[i].name] = list[i].value;
        });
    };
    this.refresh = function (broker) {
        if (broker != undefined) {
            this.wv.src = broker.value;
            var url = "http://138.201.88.244/binopt/hs/v1/list/script?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=" + broker.textContent;
            this.getScripts(url);
        }
    };
    this.getData = callback => {
        this.data = {};
        this.wv.executeJavaScript(this.scripts.getData, false, res => {
            this.data = JSON.parse(res);
            if (this.data.balance == this.data.betSize) {
                this.getData(callback);
                return;
            }
            callback();
        });
    };
    this.call = function () {
        this.wv.executeJavaScript(this.scripts.callButtonClick);
    };
    this.put = function () {
        this.wv.executeJavaScript(this.scripts.putButtonClick);
    };
    this.setBetSize = function (betSize) {
        this.wv.executeJavaScript(betSize + this.scripts.setBetSize);
    };
}
function Settings() {
    this.schedule = new Table("schedule");

    var arr = document.querySelectorAll("input[name = calc]");
    for (i = 0; i < arr.length; i++)
        arr[i].onchange = function () {
            if (this.checked)
                settings.calcFormula = this.id;
        }
    arr = document.querySelectorAll("input[name = mode]");
    for (i = 0; i < arr.length; i++)
        arr[i].onchange = function () {
            if (this.checked)
                settings.mode = this.id;
        }
    document.getElementById("pause").onchange = function () {
        settings.pause = +this.value;
    };
    document.getElementById("balanceDecrease").onchange = function () {
        settings.balanceDecrease = +this.value;
    };
    document.getElementById("balanceIncrease").onchange = function () {
        settings.balanceIncrease = +this.value;
    };
    document.getElementById("percentBelow").onchange = function () {
        settings.percentBelow = +this.value;
    };
    document.getElementById("lossesInRow").onchange = function () {
        settings.lossesInRow = +this.value;
    };
    document.getElementById("sameTrend").onchange = function () {
        settings.sameTrend = this.checked;
    };

    this.refresh = function () {
        var arr = document.querySelectorAll("#settings *");
        for (i = 0; i < arr.length; i++) {
            dispatchEvent("change", arr[i]);
        }
    };
    document.getElementById("set").addEventListener("click", function () {
        var style = document.getElementById("settings").style;
        if (style.display == "block")
            style.display = "none";
        else
            style.display = "block"
    });
    xhr("GET", "http://138.201.88.244/binopt/hs/v1/list/strategy?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=", list => {
        let onEvent = {
            type: "change",
            event: "onchange",
            func: function () {
                settings.strategy = this.value;
            }
        };
        tuneList("strategy", list, onEvent);
    });
}
function Menu() {
    new Promise((resolve, reject) => {
        xhr("GET", "http://138.201.88.244/binopt/hs/v1/list/broker?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=", list => {
            let onEvent = {
                type: "change",
                event: "onchange",
                func: function () {
                    menu.broker = this.textContent;
                    if (platform)
                        platform.refresh(this);
                    resolve();
                }
            };
            tuneList("broker", list, onEvent);
        })
    }).then(()=> {
        xhr("GET", "http://138.201.88.244/binopt/hs/v1/list/currency?user=" + user.userName + "&sessionID=" + user.sessionID + "&broker=" + this.broker, list => {
            let onEvent = {
                type: "change",
                event: "onchange",
                func: function () {
                    menu.currency = this.value;
                }
            };
            tuneList("currency", list, onEvent);
        });
    });

    document.getElementById("trend").onchange = function () {
        menu.trend = this.textContent;
    };
    document.getElementById("difference").onchange = function () {
        menu.difference = this.value;
    };
}
function Autotrading() {
    this.data = {
        startingBalance: 0,
        startingBetSize: 0,
        lostBets: 0,
        sumOfBets: 0,
        balanceBeforeBet: 0,
        balanceAfterBet: 0,
        trend: undefined
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
    };
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
    };
    this.finish = function () {
        this.setdefaultValues();
        trading.stop();
        trading.button.textContent = "Start";
        trading.inProcess = false;
    };
    this.setdefaultValues = function () {
        this.data.startingBalance = this.data.startingBetSize = this.data.lostBets = this.data.sumOfBets = this.data.balanceBeforeBet = this.data.balanceAfterBet = this.data.newBetSize = 0;
        this.trend = undefined;
        this.firstTime = true;
    };
    function calculateBetSize() {
        var code = settings.strategy;
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
    };
    this.delete = function () {
        if (this.currentRow >= 1) {
            document.querySelector("table").deleteRow(this.currentRow);
            this.currentRow--;
        }
    };
    this.getRow = function (cells) {

        var row = {};
        for (var i = 0; i < cells.length; i++) {
            var data = cells[i].firstChild;
            if (!data.validity.valid || data.value == "")
                return undefined;
            row[this.headers[i]] = data.value;
        }
        return row;
    };
    document.getElementById("addRow").addEventListener("click", this.add.bind(this), false);
    document.getElementById("delRow").addEventListener("click", this.delete.bind(this), false);
}
function User() {
    this.userName;
    this.pass;
    this.sessionID;
    this.plan;
    document.getElementById("login").addEventListener("click", () => {
        var hashObj = new jsSHA("SHA-1", "TEXT", {numRounds: 1});
        hashObj.update(document.getElementById("password").value);
        this.pass = hashObj.getHash("B64");

        xhr("GET", "http://138.201.88.244/binopt/hs/v1/auth?user=" + document.getElementById("username").value + "&password=" + this.pass, function (obj) {
            if (obj.sessionID) {
                user.sessionID = obj.sessionID;
                user.userName = document.getElementById("username").value;
                document.getElementById("modal").style.display = "none";
                menu = new Menu();
                platform = new Platform();
                settings = new Settings();
                trading = new Trading();
                document.getElementById("start").addEventListener("click", trading.clickButton.bind(trading), false);
                autoTrading = new Autotrading();
            }
        })
    })
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
        signature: undefined
    };
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
            var hashObj = new jsSHA("SHA-1", "TEXT", {numRounds: 1});
            hashObj.update(sign);
            this.request.signature = hashObj.getHash("B64");

            xhr("POST", "http://138.201.88.244/binopt/hs/v1/doc/bet?user=" + user.userName + "&sessionID=" + user.sessionID, function () {
            }, JSON.stringify(this.request));

            if (settings.mode == "auto")
                platform.getData(autoTrading.continue);
        }.bind(this))
    }
}

function dispatchEvent(eventType, elem) {
    let evt = document.createEvent("Event");
    evt.initEvent(eventType, true, false);
    elem.dispatchEvent(evt);
}
function tuneList(elemName, list, onEvent) {
    let elem = document.getElementById(elemName);
    fillList(list, elem);
    elem[onEvent.event] = onEvent.func;
    dispatchEvent(onEvent.type, elem);
}
function xhr(method, url, callback, body) {
    let xhr = new XMLHttpRequest;
    xhr.open(method, url, true);
    if (method == "GET")
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
    elem.value = option.value;
    elem.text = option.name;
    parent.appendChild(elem);
}
function fillList(list, parent) {
    //obj.setList(list);
    list.forEach(function (item, i, arr) {
        addOption(item, parent);
    });
}