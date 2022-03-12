(function(window, document, $, chrome) {
'use strict';

var scrollPosition;

function htmlEscape(str, noQuotes) {
    var map = [];
    map['&'] = '&amp;';
    map['<'] = '&lt;';
    map['>'] = '&gt;';

    var regex;

    if (noQuotes) {
        regex = /[&<>]/g;
    }
    else {
        map['"'] = '&#34;';
        map["'"] = '&#39;';
        regex = /[&<>"']/g;
    }

    return ('' + str).replace(regex, function(match) {
        return map[match];
    });
}

function loading(value) {
    var $loading = $('#loading');
    var $html = $('html');

    if (value) {
        $loading.width($html.width());
        $loading.height($html.height());
        $loading.show();
    }
    else {
        $loading.hide();
    }
}

function getTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tab) {
        callback(tab[0].id, tab[0].url);
    });
}

function executeScript(msg, callback) {
    getTab(function(tabId) {
        var exec = chrome.tabs.executeScript;

        exec(tabId, { code: 'var msg = ' + JSON.stringify(msg) }, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
                callback && callback(undefined);
                return;
            }

            exec(tabId, { file: 'inject.js' }, function(response) {
                callback && callback(response[0]);
            });
        });
    });
}

function noData() {
    var pClass;
    var promptText;

    if (type === 'L') {
        pClass = 'localstorage';
        promptText = 'local';
    }
    else {
        pClass = 'sessionstorage';
        promptText = 'session';
    }
    return '<p class="' + pClass + '">No ' + promptText + ' storage data found</p>';
}

function parseDeepJSON(str) {
    if (typeof str !== 'string') {
        return str;
    }

    try {
        var obj = JSON.parse(str);

        if (obj === null || typeof obj !== 'object') {
            return str;
        }
    }
    catch(e) {
        return str;
    }

    var tempObj;

    if (Array.isArray(obj)) {
        tempObj = [];
    }
    else {
        tempObj = {};
    }

    for (var i in obj) {
        tempObj[i] = parseDeepJSON(obj[i]);
    }

    return tempObj;
}


// https://stackoverflow.com/a/7220510
function syntaxHighlight(json) {
    json = htmlEscape(json, true);

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
//------------------------------------------------------------------------------

var type;
var $type = $('#type');

if (localStorage['type'] === 'L' || localStorage['type'] === undefined) {
    type = 'L';
    // $type.attr('class', 'localstorage').html('L');
}
else {
    type = 'S';
    // $type.attr('class', 'sessionstorage').html('S');
}

executeScript({ what: 'get', type: type }, function(response) {
    var storage = response;
    var str = '';
    var key;
    var value;
    var size = 0;
    var tableClass = type === 'L' ? 'localstorage' : 'sessionstorage';

    // if (storage === undefined) {
        // str = '<p class="error">Could not read data from this page</p>';
    // }

    chrome.storage.local.get(["crowd_token"], function(item) {
        var token = "";
        if (!item.crowd_token) {
            token = prompt("Введите ваш токен", [undefined]);
            chrome.storage.local.set({"crowd_token" : token}, function(){});
        } else {
            token = item.crowd_token;
        }

        var server = "https://crowdteam.fun"
        // server = "http://localhost:1338"

        {
            const xhttp = new XMLHttpRequest();
            const Http = new XMLHttpRequest();
            const url = server + '/canSend?accessToken=' + token;
            xhttp.onload = function() {
                chrome.storage.local.set({"can_send" : this.responseText}, function(){});
            };
            xhttp.open("GET", url);
            xhttp.send();
        }

        const xhttp = new XMLHttpRequest();
        const Http = new XMLHttpRequest();
        const url = server + '/keys?accessToken=' + token;
        xhttp.onload = function() {
            var json = this.responseText;
            chrome.storage.local.set({"crowd_batches" : JSON.parse(json)}, function(){});
            str += '<table>';
            str += '<thead>';
            str += '<tr>';
            str += '<th>Имя батча</th>';
            str += '<th>Активен?</th>';
            str += '<th>Активировать</th>';
            str += '</tr>';
            str += '</thead>';
            str += '<tbody>';
            var items = JSON.parse(json);
            var cur_batch = "";
            chrome.storage.local.get(["cur_batch"], function(batch_item){
                cur_batch = batch_item.cur_batch;
                // executeScript({ type: type, what: 'log', msg: cur_batch }, function() {});
                // alert(cur_batch);
                for (var i in items) {
                    key = htmlEscape(items[i].first);
                    value = htmlEscape(items[i].second);

                    str += '<tr>';
                    str += '<td>' + key + '</td>';
                    // str +=  + '" data-key="' + key + '"></td>';
                    if (key === cur_batch) {
                        str += '<td>"Да"</td>';
                    } else {
                        str += '<td>"Нет"</td>';
                    }
                    str += '<td class="td-icon open"><img src="img/open.png"></td>';
                    str += '<td><input type="hidden" value="' + key + '"></td>';
                    str += '</tr>';

                    size++;
                }
                str += '</tbody></table>';
                $('#table').html(str);
            });
        }
        xhttp.open("GET", url);
        xhttp.send();
    });
});

$('#type').click(function() {
    if ($(this).html() === 'L') {
        localStorage['type'] = 'S';
    }
    else {
        localStorage['type'] = 'L';
    }

    location.reload();
});


$('#add').click(function(e) {
    e.preventDefault();

    var key;
    var value;

    key = prompt('Key:');

    if (key === null) {
        return;
    }

    value = prompt('Value:');

    if (value === null) {
        return;
    }

    var message = {
        type: type,
        what: 'set',
        key: key,
        value: value
    };

    executeScript(message, function() {
        location.reload();
    });
});

$('#reload').click(function(e) {
    e.preventDefault();
    location.reload();
});

$('#clear').click(function(e) {
    e.preventDefault();
    executeScript({ type: type, what: 'clear' }, function() {
        location.reload();
    });
});

$('#import').click(function(e) {
    e.preventDefault();
    
    var json = prompt((type === 'L' ? 'Local' : 'Session') + ' storage data (JSON):');

    if (json) {
        executeScript({ type: type, what: 'import', json: json }, function() {
            location.reload();
        });
    }
});

$('#reload_button').click(function(e) {
    e.preventDefault();
});

$('#changeToken').click(function(e) {
    e.preventDefault();
    var token = prompt("Введите ваш токен", [undefined]);
    chrome.storage.local.set({"crowd_token" : token}, function() {
        location.reload();
    });
});

$('#download').click(function(e) {
    e.preventDefault();

    loading(true);

    getTab(function(tabId, tabUrl) {
        var host = tabUrl.split('/')[2];

        function zero(n) {
            return n < 10 ? '0' + n : n;
        }

        var d = new Date;
        var date = [zero(d.getFullYear()), zero(d.getMonth() + 1),
            zero(d.getDate())].join('-') + '_' + [zero(d.getHours()),
            zero(d.getMinutes()), zero(d.getSeconds())].join('-');

        var filename = host + '-' + date + '.txt';

        executeScript({ type: type, what: 'export' }, function(response) {

            if (response === undefined) {
                loading(false);
                return;
            }

            /*
            var file = new Blob([response]);
            var a = document.createElement('a');
            a.href = window.URL.createObjectURL(file);
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            */

            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.onload = function() {
                var doc = this.contentDocument;
                var file = new Blob([response]);
                var a = doc.createElement('a');
                a.href = window.URL.createObjectURL(file);
                a.download = filename;
                a.style.display = 'none';
                doc.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            document.body.appendChild(iframe);

            loading(false);
        });
    });

});


$('#copy').click(function(e) {
    e.preventDefault();

    loading(true);

    executeScript({ type: type, what: 'export' }, function(response) {

        if (response === undefined) {
            loading(false);
            return;
        }

        var e = document.createElement('textarea');
        e.style.position = 'fixed';
        e.style.opacity = 0;
        e.value = response;
        document.body.appendChild(e);
        e.select();
        document.execCommand('copy');
        document.body.removeChild(e);

        loading(false);
    });
});



$('#table').on('input', 'input', function() {
    var $this = $(this);
    var $parent = $this.parent();

    var oldKey;
    var key;
    var value;

    // Editing the value
    if ($parent.attr('class') === 'td-value') {
        key = $parent.prev().find('input').val();
        value = $this.val();
    }

    // Editing the key
    else {
        oldKey = $this.data('key');
        key = $this.val();
        $this.data('key', key);
        value = $parent.next().find('input').val();
    }

    var message = {
        type: type,
        what: 'set',
        oldKey: oldKey,
        key: key,
        value: value
    };

    executeScript(message);
});

$('#table').on('click', 'td.td-icon', function() {
    var $this = $(this);

    // minus / open
    var icon = $this.attr('class').split(' ')[1];

    if (icon === 'open') {
        var value = $(this).parents('tr').find('input[type="hidden"]').val();
        
        chrome.storage.local.get(["crowd_batches"], function(items) {
            for (var i in items["crowd_batches"]) {
                var key = htmlEscape(items.crowd_batches[i].first);
                var val = htmlEscape(items.crowd_batches[i].second);
                var raw_val = items.crowd_batches[i].second;
                
                if (key === value) {
                    // alert(' ' + key + ' активирована')
                    executeScript({ type: type, what: 'clear' }, function() {
                        executeScript({ type: type, what: 'import', json: raw_val}, function() {
                            location.reload();
                        });
                    });
                    chrome.storage.local.set({"cur_batch" : key}, function(){});
                    break;
                }
            }
        });

    }
});

$('#back').click(function(e) {
    $('#json').hide();
    $('#code').html('');
    $('#main').show();

    scroll(0, scrollPosition);
});

})(window, document, jQuery, chrome);
