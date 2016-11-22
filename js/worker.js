var data, oldETag, oldPrice, coefficient, direction, user;

self.addEventListener("message", function (event) {
    data = event.data;
    user = data.user;
    getCoefficient(data.cur);
    direction = data.trend;
    makeBet(data.cur, data.diff);
}, true)

function makeBet(cur, diff) {

    var xhr = new XMLHttpRequest;
    xhr.open("GET", "https://api-fxpractice.oanda.com/v1/prices?instruments=" + cur, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Authorization", "Bearer c5a3ba08e2c1edde097fe6cd52ced0db-f7dcb47485ab421b7e45dbca1fab5605");
    xhr.send();
    //this event called only ones to get first price(oldPrice)
    xhr.onload = function () {
        if (xhr.readyState != 4)
            return;
        if (xhr.status != 200) {
            alert(xhr.status + ': ' + xhr.statusText);
        } else {
            obj = JSON.parse(xhr.responseText);
            oldPrice = (obj.prices[0].ask + obj.prices[0].bid) / 2;

            xhr.open("GET", "https://api-fxpractice.oanda.com/v1/prices?instruments=" + cur, true);
            xhr.setRequestHeader("Authorization", "Bearer c5a3ba08e2c1edde097fe6cd52ced0db-f7dcb47485ab421b7e45dbca1fab5605");
            xhr.send();
            //then we change events function
            xhr.onload = function () {
                if (xhr.readyState != 4)
                    return;
                if (xhr.status != 200) {
                    alert(xhr.status + ': ' + xhr.statusText);
                } else {
                    obj = JSON.parse(xhr.responseText);
                    price = (obj.prices[0].ask + obj.prices[0].bid) / 2;
                    pricesDifference = coefficient * (price - oldPrice);
                    var close = false;
                    switch (direction) {
                        case undefined:
                            if (pricesDifference >= diff) {
                                postMessage("Call");
                                close = true;
                            } else if (pricesDifference <= -diff) {
                                postMessage("Put");
                                close = true;
                            }; break;
                        case "Call":
                            if (pricesDifference >= diff) {
                                postMessage("Call");
                                close = true;
                            }; break;
                        case "Put":
                            if (pricesDifference <= -diff) {
                                postMessage("Put");
                                close = true;
                            }; break;
                    }
                    if (!close) {
                        oldPrice = price;
                        xhr.open("GET", "https://api-fxpractice.oanda.com/v1/prices?instruments=" + cur, true);
                        xhr.setRequestHeader("Authorization", "Bearer c5a3ba08e2c1edde097fe6cd52ced0db-f7dcb47485ab421b7e45dbca1fab5605");
                        xhr.send();
                    } else {
                        setTimeout(closeWorker, data.pause);
                    }
                }
            }
        }
    }
}

function getCoefficient(cur) {
    let xhr = new XMLHttpRequest;
    xhr.open("GET", "http://138.201.88.244/binopt/hs/v1/val/coefficient?user="+user.userName+"&sessionID="+user.sessionID+"&param=" + cur, true);
    xhr.send();
    xhr.onload = function () {
        if (xhr.readyState != 4)
            return;
        if (xhr.status != 200) {
            alert(xhr.status + ': ' + xhr.statusText);
        } else {
            let obj = JSON.parse(xhr.responseText);
            coefficient = obj.coefficient;
        }
    }
}

function closeWorker() {
    postMessage("pauseOver");
    //self.close();
}