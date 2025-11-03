// ==UserScript==
// @name         Cofka
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @icon         https://dscs.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_snob.png
// @author       ***
// @match        https://*/game.php?*
// @grant        none
// @icon         https://dscs.innogamescdn.com/asset/34f6b4c7/graphic/unit/unit_snob.png
// ==/UserScript==

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const isNumber = d => '0' <= d && d <= '9';
const getDate = date => {
    return {
        h: date.getHours().toString().padStart(2, 0),
        m: date.getMinutes().toString().padStart(2, 0),
        s: date.getSeconds().toString().padStart(2, 0),
        ms: date.getMilliseconds().toString().padStart(3, 0)
    }
}


let formData = {}
let time = {};
let troopsEscaping = {};

let year = (new Date()).getFullYear();
let month = (new Date()).getMonth();
let day = (new Date()).getDate();

function setParam(name, value) {
    localStorage.setItem(name, value);
}

let attacks = document.getElementById('commands_incomings').getElementsByClassName('command-row no_ignored_command');

let x;
for(var i = 0; i < attacks.length; i++){
    x = attacks[i].insertCell(1);
    x.setAttribute('style','width:5px');
    x.innerHTML= '<span><button id="atk'+i+'" name="sendSnipe"><img class="quickbar_image"'
        +'data-src="https://dspl.innogamescdn.com/asset/28fc2c0/graphic//buildings/barracks.png" alt=""'+
        'src="https://dspl.innogamescdn.com/asset/28fc2c0/graphic//buildings/barracks.png"></button></span>';
    k = 'atk'+i;
    document.getElementById(k).addEventListener('click', command);
}

$('button[name=sendSnipe]').click(function(e){
    e.preventDefault();
});

function command(ind){
    let idss = ind.srcElement.offsetParent.innerHTML;
    let ids = idss.match(/atk(\d+)/)[1];
    let id = 'atk'+ids;
    $('#serverTime').click();
    if(id == '') id = ind.path[0].id;
    let command_row = document.getElementById(id).closest('.command-row');
    let command_url = command_row.querySelector('.quickedit-content a').getAttribute('href');
    let time_aux = document.querySelector(`#${id}`).closest('tr').children[2].innerText.match(/[+-]?\d+(?:\.\d+)?/g);

    time.hour = parseInt(time_aux[0]);
    time.minute = parseInt(time_aux[1]);
    time.second = parseInt(time_aux[2]);
    time.millisecond = parseInt(time_aux[3]);

    $.ajax({
        type: 'GET',
        url: command_url + "&client_time=" + Math.round(Timing.getCurrentServerTime() / 1e3),
        headers: {
            "TribalWars-Ajax": 1
        },
        success: function (data) {
            let it = 0;
            let troop_command = $(data).find('.unit-item');
            for(let i = 0; i < troop_command.length; i++) {
                let name = troop_command[i].parentElement.parentElement.children[0].children[it++].children[0].getAttribute('data-unit');
                troopsEscaping[name] = +troop_command[i].innerText;
            }


            var coord = [], villageToAttackId;
            coord = $(data).find('span.village_anchor:eq(0) a').text().match(/(\d\d\d)(\d\d\d)*(?!.*(\d\d\d)\|(\d\d\d))/g);
            villageToAttackId = parseInt($(data).find('span.village_anchor:eq(0)').data('id'));
            formData.x = coord[0];
            formData.y = coord[1];
            formData.source_village = game_data.village.id;
            firstRequest(villageToAttackId);
        },
        error: function(data){
        }
    });
}


let unitsOffId = ['axe', 'spy', 'light', 'ram', 'snob', 'knight'];
let unitsDeffId = ['spear', 'sword', 'archer', 'marcher', 'heavy', 'catapult'];

function fillInFormData(data) {
    unitsOffId.forEach(unit => {
        formData[unit] = $(`#unit_input_${unit}`, data).data('all-count');
        if(isNaN(formData[unit])) formData[unit] = 0;
    });
    unitsDeffId.forEach(unit => {
        formData[unit] = $(`#unit_input_${unit}`, data).data('all-count');
        if(isNaN(formData[unit])) formData[unit] = 0;
    });

    formData.attack = 'l';
}

function firstRequest(villageToAttackId) {
    $.ajax({
        type: "GET",
        url: "/game.php?village=" + formData.source_village + "&screen=place&ajax=command&target=" + villageToAttackId + "&client_time=" + Math.round(Timing.getCurrentServerTime() / 1e3),
        data: {},
        dataType: "json",
        headers: {
            "TribalWars-Ajax": 1
        },
        success: function (data) {
            if (!data.error) {
                data = $(data.response.dialog);
                fillInFormData(data);
                secondRequest();
            }
        },
        error: function (data) {
        }
    });
}

function secondRequest() {
    $.ajax({
        type: "POST",
        url: "/game.php?village=" + formData.source_village + "&screen=place&ajax=confirm&h=" + csrf_token + "&client_time=" + Math.round(Timing.getCurrentServerTime() / 1e3),
        data: formData,
        dataType: "json",
        headers: {
            "TribalWars-Ajax": 1
        },
        success: function (data) {
            if (!data.error) {
                var duration, data_aux;
                data_aux = $(data.response.dialog);
                duration = $('span.relative_time', data_aux).data('duration');
                formData.data = data_aux.serialize();
                let date_attack = (new Date(year, month, day, time.hour, time.minute, time.second));
                let date_attack_time = date_attack.getTime()

                setInterval(function () {
                    let date = new Date(Timing.getCurrentServerTime());
                    let m = date.getMinutes(), s = date.getSeconds(), ms = date.getMilliseconds();
                    let isSecondOkay = (time.second + s) % 2 == 0;
                    let isMillisecondOkay = time.millisecond + 55 < ms && ms < time.millisecond + 90;

                    if(isSecondOkay && isMillisecondOkay) {
                        let nametime = new Date(date.getTime() + Math.round((date_attack_time - date.getTime()) / 2));
                        $('#attack_name', data_aux).val(getDate(nametime).h + ':' + getDate(nametime).m + ':' + getDate(nametime).s);
                        formData.data = data_aux.serialize();

                        thirdRequest();
                    }
                }, 30);
                find();
            }
        },
        error: function (data) {
        }
    });
}

function thirdRequest() {
    setTimeout(function () {
        $.ajax({
            url: "/game.php?village=" + formData.source_village + "&screen=place&ajaxaction=popup_command&h=" + csrf_token + "&client_time=" + Math.round(Timing.getCurrentServerTime() / 1e3),
            data: formData.data,
            type: "POST",
            dataType: "json",
            headers: {
                "TribalWars-Ajax": 1
            },
            success: function () {
                location.reload();
            },
            error: function (data) {
            }
        });
    }, 10);
}
