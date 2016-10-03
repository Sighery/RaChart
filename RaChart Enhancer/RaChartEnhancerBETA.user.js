// ==UserScript==
// @name         RaChart™ Enhancer
// @namespace    Sighery
// @version      0.27
// @description  Enhances Rachel's charts in SG by highlighting you the games you own already
// @author       Sighery
// @icon         http://www.sighery.com/favicon.ico
// @downloadURL  http://www.sighery.com/code/JavaScript/RaChartEnhancer.user.js
// @updateURL    http://www.sighery.com/code/JavaScript/RaChartEnhancer.meta.js
// @supportURL   https://www.steamgifts.com/discussion/riOvr/
// @match        https://www.steamgifts.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_log
// @connect      api.steampowered.com
// @connect      store.steampowered.com
// ==/UserScript==

injectInterface();

function showKeys() {
	console.log(GM_listValues());
	var storedKeys = GM_listValues();

	for (var key = 0; key < storedKeys.length; key++) {
		console.log("Value of key: " + storedKeys[key] + " is");
		console.log(GM_getValue(storedKeys[key]));
	}
}

//showKeys();

/*var date = new Date();
var time = date.getTime();
saveData(time, "storeDataTime");

var stored = GM_getValue("storeDataTime");
console.log("Stored time equals: " + stored);
if (stored === undefined) {
	return false;
} else {
	return JSON.parse(stored);
}*/

if (window.location.href.match(".steamgifts.com/discussion/") !== null && confirmAuthor()) {
    var apiKey = localStorage.getItem('APIKey');
    var steamID64 = localStorage.getItem('SteamID64');
    appIDs = turnToIntArray(scanTable()[0]);
    subIDs = turnToIntArray(scanTable()[1]);

	var bStore = JSON.parse(localStorage.getItem("RCE-Options-NotStore"));
	console.log("bStore equals " + bStore);
	if (bStore === false) {
		var date = new Date();
		var time = date.getTime();

		var storedTime = getLocalData("storeDataTime");
		console.log("Got into the if of bStore, storedTime equals: " + storedTime);
		if (storedTime !== false) {
			if (((time - storedTime) / 1000) >= 900) {
				console.log("Got into the if of outdated info in cache");
				importStoreJSON(appIDs, subIDs);
			} else {
				console.log("Getting info from the cache");
				console.log("Difference time is: " + ((time - storedTime) / 1000) + " seconds");
				var storedStoreApps = getLocalData("storeDataApps");
				var storedWL = getLocalData("storeDataWL");
				var storedSubs = getLocalData("storeDataSubs");
				var i;
				for (i = 0; i < appIDs.length; i++) {
					if (checkLst(appIDs[i], storedStoreApps)) {
						highlight("app/" + appIDs[i]);
					} else if (checkLst(appIDs[i], storedWL)) {
						highlightWL("app/" + appIDs[i]);
					}
				}
				for (i = 0; i < subIDs.length; i++) {
					modifiedGetApps(subIDs[i], storedStoreApps);
				}
			}
		} else {
			importStoreJSON(appIDs, subIDs);
		}
		//console.log("Reached store part");
	} else if (checkIDAPI()) {
		if (appIDs.length > 0) {
			importJSON(appIDs);
		}
		if (subIDs.length > 0) {
			for (i = 0; i < subIDs.length; i++) {
				getApps(subIDs[i]);
			}
		}
	}
}

function checkIDAPI() {
    var bAPIKey = localStorage.getItem("APIKey");
    var bSteamID64 = localStorage.getItem("SteamID64");

    if (bAPIKey === null && bAPIKey === "" && bSteamID64 === null && bSteamID64 === "") {
        alert("RaChart™ Enhancer: Both API key and Steam ID64 are missing, please add them for the script to work");
        return false;
    } else if (bAPIKey === null || bAPIKey === "") {
        alert("RaChart™ Enhancer: API key missing, please add it for the script to work");
        return false;
    } else if (bSteamID64 === null || bSteamID64 === "") {
        alert("RaChart™ Enhancer: Steam ID64 missing, please add it for the script to work");
        return false;
    } else {
        return true;
    }
}

function initializeStorage() {
	if (localStorage.getItem("RCE-Options-NotStore") === null) {
		localStorage.setItem("RCE-Options-NotStore", false);
	}
	/*if (GM_getValue("storeDataApps") === undefined) {
		GM_setValue("storeDataApps", "[]");
	}
	if (GM_getValue("storeDataWL") === undefined) {
		GM_setValue("storeDataWL", "[]");
	}
	if (GM_getValue("storeDataSubs") === undefined) {
		GM_setValue("storeDataSubs", "[]");
	}
	if (GM_getValue("appsAPI") === undefined) {
		GM_setValue("appsAPI", "[]");
	}*/
}

function injectInterface() {
	initializeStorage();
	injectStyle();
    injectDialog();
    injectFunctions();
    injectRow();
}

function injectRow() {
    var discDropdown = document.getElementsByClassName('nav__left-container')[0].children[3].children[0].children[0];

    var newRow = document.createElement('a');
    newRow.setAttribute('class', 'nav__row');
    newRow.href = "javascript:void(0)";

    if (document.getElementsByClassName('nav__left-container')[0].children[0].tagName == "IMG" || document.getElementsByClassName('SPGG_FixedNavbar') >= 1 || document.getElementsByClassName('sg-info').length >= 1) {
        setTimeout(function() {
            if (document.getElementsByClassName('nav__left-container')[0].children[0].tagName == "IMG" && document.getElementsByClassName('SPGG_FixedNavbar') >= 1 && document.getElementsByClassName('sg-info').length >= 1) {
                //For Extended SteamGifts, SG++ and SGLinkies at the same time
                document.getElementsByClassName('nav__left-container')[0].children[4].children[0].children[0].insertBefore(newRow, discDropdown.children[2]);
            } else if (document.getElementsByClassName('nav__left-container')[0].children[0].tagName == "IMG" && document.getElementsByClassName('sg-info').length >= 1) {
                //For Extended SteamGifts and SGLinkies
                document.getElementsByClassName('nav__left-container')[0].children[4].children[0].children[0].insertBefore(newRow, document.getElementsByClassName('nav__left-container')[0].children[4].children[0].children[0].children[2]);
            } else if (document.getElementsByClassName('sg-info').length >= 1) {
                //For SGLinkies
                discDropdown.insertBefore(newRow, discDropdown.children[2]);
            } else if (document.getElementsByClassName('nav__left-container')[0].children[0].tagName == "IMG") {
                //For Extended SteamGifts
                document.getElementsByClassName('nav__left-container')[0].children[4].children[0].children[0].appendChild(newRow);
            } else {
                discDropdown.appendChild(newRow);
            }
        }, 1000);
    } else {
        discDropdown.appendChild(newRow);
    }

    newRow.appendChild(document.createElement('i'));
    newRow.children[0].setAttribute('class', 'icon-blue fa fa-fw fa-table');

    newRow.appendChild(document.createElement('div'));
    newRow.children[1].setAttribute('class', 'nav__row__summary');

    newRow.children[1].appendChild(document.createElement('p'));
    newRow.children[1].children[0].setAttribute('class', 'nav__row__summary__name');
    newRow.children[1].children[0].innerHTML = "RaChart&trade; Enhancer";

    newRow.children[1].appendChild(document.createElement('p'));
    newRow.children[1].children[1].setAttribute('class', 'nav__row__summary__description');
    newRow.children[1].children[1].innerHTML = "Change the options for the enhancer.";

    newRow.addEventListener('click', function() {
        var blackbg = document.getElementById('black-background');
        var dlg = document.getElementById('dlgbox');
        blackbg.style.display = 'block';
        dlg.style.display = 'block';

        var winWidth = window.innerWidth;
        var winHeight = window.innerHeight;

        dlg.style.left = (winWidth/2) - 500/2 + 'px';
        dlg.style.top = '150px';
    });
}

function injectDialog() {
    var dlg = document.createElement('div');
    dlg.setAttribute('id', 'black-background');
    dlg.appendChild(document.createElement('div'));
    document.body.insertBefore(dlg, document.body.children[0]);

    dlg.children[0].setAttribute('id', 'dlgbox');
    dlg.children[0].appendChild(document.createElement('div'));
    dlg.children[0].appendChild(document.createElement('div'));

    var dlgHeader = dlg.children[0].children[0];
    dlgHeader.setAttribute('id', 'dlg-header');
    dlgHeader.appendChild(document.createElement('div'));
    dlgHeader.children[0].setAttribute('id', 'dlg-header-title');
    dlgHeader.children[0].innerHTML = "RaChart&trade; Enhancer";
    dlgHeader.appendChild(document.createElement('button'));
    dlgHeader.children[1].setAttribute('id', 'closeRC');
    dlgHeader.children[1].appendChild(document.createElement('i'));
    dlgHeader.children[1].children[0].setAttribute('class', 'fa fa-times');
    dlgHeader.children[1].children[0].style.fontSize = "25px";
    dlgHeader.children[1].children[0].style.marginTop = "-6px";

    var dlgBody = dlg.children[0].children[1];
    dlgBody.setAttribute('id', 'dlg-body');
    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[0].htmlFor = "APIKey";
    dlgBody.children[0].innerHTML = "API Key:";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[1].type = "textarea";
    dlgBody.children[1].setAttribute('id', 'APIKey');
    dlgBody.children[1].style.marginLeft = "35px";
    dlgBody.children[1].style.width = "300px";
    dlgBody.children[1].style.lineHeight = "inherit";

    dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[2].setAttribute('class', 'RC-button');
    dlgBody.children[2].innerHTML = "Submit";

    dlgBody.appendChild(document.createElement('br'));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[4].htmlFor = "SteamID64";
    dlgBody.children[4].innerHTML = "Steam ID64:";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[5].type = "textarea";
    dlgBody.children[5].setAttribute('id', 'SteamID64');
    dlgBody.children[5].style.marginLeft = "11px";
    dlgBody.children[5].style.width = "300px";
    dlgBody.children[5].style.lineHeight = "inherit";

    dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[6].setAttribute('class', 'RC-button');
    dlgBody.children[6].innerHTML = "Submit";

    dlgBody.appendChild(document.createElement('br'));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[8].htmlFor = "PrimaryColor";
    dlgBody.children[8].innerHTML = "Primary color (for valid rows):";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[9].type = "color";
    dlgBody.children[9].setAttribute('id', 'PrimaryColor');
    dlgBody.children[9].style.marginLeft = "8px";
    dlgBody.children[9].style.width = "140px";
    dlgBody.children[9].style.lineHeight = "inherit";

    dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[10].setAttribute('class', 'RC-button');
    dlgBody.children[10].innerHTML = "Submit";

    dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[11].setAttribute('class', 'RC-button');
    dlgBody.children[11].innerHTML = "Reset colors";
    dlgBody.children[11].style.width = "55px";
    dlgBody.children[11].style.fontSize = "10px";
    dlgBody.children[11].style.marginTop = "30px";
    dlgBody.children[11].style.float = "right";

    dlgBody.appendChild(document.createElement('br'));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[13].htmlFor = "SecondaryColor";
    dlgBody.children[13].innerHTML = "Secondary color (for partial rows): ";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[14].type = "color";
    dlgBody.children[14].setAttribute('id', 'SecondaryColor');
    dlgBody.children[14].style.width = "114px";
    dlgBody.children[14].style.lineHeight = "inherit";

    dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[15].setAttribute('class', 'RC-button');
    dlgBody.children[15].innerHTML = "Submit";

    dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement("label"));
	dlgBody.children[17].htmlFor = "TertiaryColor";
	dlgBody.children[17].innerHTML = "Tertiary color (for wishlist): ";

	dlgBody.appendChild(document.createElement("input"));
	dlgBody.children[18].type = "color";
	dlgBody.children[18].setAttribute("id", "TertiaryColor");
	dlgBody.children[18].style.width = "163px";
	dlgBody.children[18].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
    dlgBody.children[19].setAttribute('class', 'RC-button');
    dlgBody.children[19].innerHTML = "Submit";

	dlgBody.appendChild(document.createElement("br"));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[21].htmlFor = "RCE-Options-NotStore";
	dlgBody.children[21].innerHTML = "Check this if you don't want to use the store data ";

	dlgBody.appendChild(document.createElement("input"));
	dlgBody.children[22].setAttribute("id", "RCE-Options-NotStore");
	dlgBody.children[22].type = "checkbox";
	dlgBody.children[22].style.width = "inherit";
	dlgBody.children[22].style.marginTop = "10px";

	dlgBody.appendChild(document.createElement("button"));
	dlgBody.children[23].className = "RC-button";
	dlgBody.children[23].innerHTML = "Clean cache";
	dlgBody.children[23].title = "RCE has a cache on the store data and other things like info about packages and apps, clicking this will detele all of those";
	dlgBody.children[23].style.width = "55px";
	dlgBody.children[23].style.fontSize = "10px";
	dlgBody.children[23].style.marginTop = "10px";
	dlgBody.children[23].style.float = "right";

	dlgBody.appendChild(document.createElement("br"));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[25].htmlFor = "MBlueTheme";
    dlgBody.children[25].innerHTML = "Check this if you use Mullins' Blue Theme ";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[26].setAttribute('id', 'MBlueTheme');
    dlgBody.children[26].type = "checkbox";
    dlgBody.children[26].style.width = "inherit";
    dlgBody.children[26].style.marginTop = "2px";

    dlgBody.appendChild(document.createElement('br'));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[28].htmlFor = "MDarkTheme";
    dlgBody.children[28].innerHTML = "Check this if you use Mullins' Dark Theme ";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[29].setAttribute('id', 'MDarkTheme');
    dlgBody.children[29].type = "checkbox";
    dlgBody.children[29].style.width = "inherit";
    dlgBody.children[29].style.marginTop = "2px";

    dlgBody.appendChild(document.createElement('br'));

    dlgBody.appendChild(document.createElement('label'));
    dlgBody.children[31].htmlFor = "SPDarkTheme";
    dlgBody.children[31].innerHTML = "Check this if you use SquishedPotatoe's Dark Theme ";

    dlgBody.appendChild(document.createElement('input'));
    dlgBody.children[32].setAttribute('id', 'SPDarkTheme');
    dlgBody.children[32].type = "checkbox";
    dlgBody.children[32].style.width = "inherit";
    dlgBody.children[32].style.marginTop = "2px";

    dlgBody.appendChild(document.createElement('h2'));
    dlgBody.children[33].style.float = "right";
    dlgBody.children[33].style.marginTop = "-2px";
    dlgBody.children[33].appendChild(document.createElement('a'));
    dlgBody.children[33].children[0].href = "https://www.steamgifts.com/discussion/riOvr/";
    dlgBody.children[33].children[0].style.color = "#FFFFFF";
    dlgBody.children[33].children[0].style.fontSize = "20px";
    dlgBody.children[33].children[0].style.fontStyle = "italic";
    dlgBody.children[33].children[0].style.textDecoration = "underline";
    dlgBody.children[33].children[0].innerHTML = "Thread";


	dlgHeader.children[0].addEventListener('click', function() {
		console.log(GM_listValues());
		var storedKeys = GM_listValues();

		for (var key = 0; key < storedKeys.length; key++) {
			console.log("Value of key: " + storedKeys[key] + " is");
			console.log(GM_getValue(storedKeys[key]));
		}
	});

    document.getElementById('closeRC').addEventListener('click', function() {
        var blackbg = document.getElementById('black-background');
        var dlg = document.getElementById('dlgbox');

        blackbg.style.display = 'none';
        dlg.style.display = 'none';
    });

    dlgBody.children[2].addEventListener('click', function() {
        var input = document.getElementById('APIKey');
        localStorage.setItem(input.id, input.value);
    });

    dlgBody.children[6].addEventListener('click', function() {
        var input = document.getElementById('SteamID64');
        localStorage.setItem(input.id, input.value);
    });

    dlgBody.children[10].addEventListener('click', function() {
        var input = document.getElementById('PrimaryColor');
        localStorage.setItem(input.id, input.value);
    });

    dlgBody.children[11].addEventListener('click', function() {
        localStorage.removeItem('PrimaryColor');
        localStorage.removeItem('SecondaryColor');
		localStorage.removeItem('TertiaryColor');
    });

    dlgBody.children[14].addEventListener('click', function() {
        var input = document.getElementById('SecondaryColor');
        localStorage.setItem(input.id, input.value);
    });

	dlgBody.children[19].addEventListener('click', function() {
		var input = document.getElementById('TertiaryColor');
		localStorage.setItem(input.id, input.value);
	});

    dlgBody.children[22].addEventListener('click', function() {
		var input = document.getElementById("RCE-Options-NotStore");
		if (input.checked == false) {
			localStorage.setItem(input.id, false);
		} else {
			localStorage.setItem(input.id, true);
		}
	});

	dlgBody.children[23].addEventListener('click', function() {
		//alert("Yep,clicked");
		//console.log(GM_listValues());
		var storedKeys = GM_listValues();

		for (var i = 0; i < storedKeys.length; i++) {
			//console.log("Value of key: " + storedKeys[i] + " is");
			//console.log(GM_getValue(storedKeys[i]));
			GM_deleteValue(storedKeys[i]);
		}
	});

    dlgBody.children[26].addEventListener('click', function() {
        var input = document.getElementById('MBlueTheme');
        if (input.checked == false) {
            localStorage.removeItem('MBlueTheme');
        } else {
            localStorage.setItem(input.id, true);
			document.getElementById("MDarkTheme").checked = false;
			localStorage.removeItem("MDarkTheme");
			document.getElementById("SPDarkTheme").checked = false;
			localStorage.removeItem("SPDarkTheme");
        }
    });

    dlgBody.children[29].addEventListener('click', function() {
        var input = document.getElementById('MDarkTheme');
        if (input.checked == false) {
            localStorage.removeItem('MDarkTheme');
        } else {
            localStorage.setItem(input.id, true);
			document.getElementById("MBlueTheme").checked = false;
			localStorage.removeItem("MBlueTheme");
			document.getElementById("SPDarkTheme").checked = false;
			localStorage.removeItem("SPDarkTheme");
        }
    });

    dlgBody.children[32].addEventListener('click', function() {
        var input = document.getElementById('SPDarkTheme');
        if (input.checked == false) {
            localStorage.removeItem('SPDarkTheme');
        } else {
            localStorage.setItem(input.id, true);
			document.getElementById("MBlueTheme").checked = false;
			localStorage.removeItem("MBlueTheme");
			document.getElementById("MDarkTheme").checked = false;
			localStorage.removeItem("MDarkTheme");
        }
    });
}

function injectFunctions() {
    var scriptCode = [
        "function retrieveChecked() {",
		"    if (localStorage.getItem('RCE-Options-NotStore') == 'true') {",
		"        document.getElementById('RCE-Options-NotStore').checked = true;",
		"    }",
        "    if (localStorage.getItem('MBlueTheme') == 'true') {",
        "        document.getElementById('MBlueTheme').checked = true;",
        "    }",
        "    if (localStorage.getItem('MDarkTheme') == 'true') {",
        "        document.getElementById('MDarkTheme').checked = true;",
        "    }",
        "    if (localStorage.getItem('SPDarkTheme') == 'true') {",
        "        document.getElementById('SPDarkTheme').checked = true;",
        "    }",
        "    var APIKey = localStorage.getItem('APIKey');",
        "    var SteamID64 = localStorage.getItem('SteamID64');",
        "    if (APIKey !== null) {",
        "        document.getElementById('APIKey').value = APIKey;",
        "    }",
        "    if (SteamID64 !== null) {",
        "        document.getElementById('SteamID64').value = SteamID64;",
        "    }",
        "}",
        "",
        "retrieveChecked();"
    ].join("\n");
    var node = document.createElement('script');
    node.type = "text/javascript";
    node.className = "RCE-Functions";
    node.appendChild(document.createTextNode(scriptCode));
    document.head.appendChild(node);
}

function injectStyle() {
    var dialogCSS = [
            "#black-background {",
            "  display: none;",
            "  width: 100%;",
            "  height: 100%;",
            "  position: fixed;",
            "  top: 0px;",
            "  left: 0px;",
            "  background-color: rgba(0, 0, 0, 0.75);",
            "  z-index: 8888;",
            "}",
            "#dlgbox {",
            "  display: none;",
            "  position: fixed;",
            "  width: 500px;",
            "  z-index: 9999;",
            "  border-radius: 10px;",
            "  background-color: #7c7d7e;",
            "}",
            "#dlg-header {",
            "  background-color: #6D84B4;",
            "  padding: 10px;",
            "  padding-bottom: 30px;",
            "  margin: 10px 10px 10px 10px;",
            "  color: white;",
            "  font-size: 20px;",
            "}",
            "#dlg-header-title {",
            "  float: left;",
            "}",
            "#dlg-body {",
            "  clear: both;",
            "  background-color: #C3C3C3;",
            "  color: white;",
            "  font-size: 14px;",
            "  padding: 10px;",
            "  margin: 0px 10px 10px 10px;",
            "}",
            "#closeRC {",
            "  background-color: transparent;",
            "  color: white;",
            "  float: right;",
            "  border: none;",
            "  font-size: 25px;",
            "  margin-top: -5px;",
            "  opacity: 0.7;",
            "}",
            ".RC-button {",
            "  background-color: #fff;",
            "  border: 2px solid #333;",
            "  box-shadow: 1px 1px 0 #333,",
            "              2px 2px 0 #333,",
            "              3px 3px 0 #333,",
            "              4px 4px 0 #333,",
            "              5px 5px 0 #333;",
            "  color: #333;",
            "  display: inline-block;",
            "  padding: 4px 6px;",
            "  position: relative;",
            "  text-decoration: none;",
            "  text-transform: uppercase;",
            "  -webkit-transition: .1s;",
            "     -moz-transition: .1s;",
            "      -ms-transition: .1s;",
            "       -o-transition: .1s;",
            "          transition: .1s;",
            "}",
            ".RC-button:hover,",
            ".RC-button:focus {",
            "  background-color: #edd;",
            "}",
            ".RC-button:active {",
            "  box-shadow: 1px 1px 0 #333;",
            "  left: 4px;",
            "  top: 4px;",
            "}",
            ".RCE-Chart-Highlight, .RCE-Chart-HighlightSub, .RCE-Chart-HighlightWL {",
            "  text-shadow: none",
            "}",
            //For SquishedPotatoe's Dark Theme
            //".RCE-Chart-Highlight, .RCE-Chart-HighlightSub, .RCE-Chart-HighlightWL {",
            //"  background-color: inherit !important;",
            //"}"
    ].join("\n");
    var node = document.createElement('style');
    node.type = "text/css";
    node.ClassName = "RCE-Style-Interface";
    node.appendChild(document.createTextNode(dialogCSS));
    document.head.appendChild(node);

    var bMBlueTheme = JSON.parse(localStorage.getItem("MBlueTheme"));
    var bMDarkTheme = JSON.parse(localStorage.getItem("MDarkTheme"));
    var bSPDarkTheme = JSON.parse(localStorage.getItem("SPDarkTheme"));
	var primColor = localStorage.getItem("PrimaryColor");
	var secColor = localStorage.getItem("SecondaryColor");
	var terColor = localStorage.getItem("TertiaryColor");
    var dialogCSS2;
	if (primColor !== null || secColor !== null || terColor !== null) {
		if (primColor !== null && secColor !== null && terColor !== null) {
			dialogCSS2 = [
				".RCE-Chart-Highlight {",
				"  background-color: " + primColor + " !important;",
				"}",
				".RCE-Chart-HighlightSub {",
				"  background-color: " + secColor + " !important;",
				"}",
				".RCE-Chart-HighlightWL {",
				"  background-color: " + terColor + " !important;",
				"}"
			].join("\n");
		} else if (primColor !== null || secColor !== null) {
			if (bMBlueTheme || bMDarkTheme || bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important;",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important;",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #408884 !important;",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #00FFF3 !important",
					"}"
				].join("\n");
			}
		} else if (primColor !== null || terColor !== null) {
			if (bMBlueTheme || bMDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(120, 154, 201, 0.70) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			} else if (bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(255, 112, 67, 0.60) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: #FFD68F !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			}
		} else if (secColor !== null || terColor !== null) {
			if (bMBlueTheme || bMDarkTheme || bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #0E4E0E !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #C2FFAD !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			}
		} else if (primColor !== null) {
			if (bMBlueTheme || bMDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(120, 154, 201, 0.70) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #408884 !important",
					"}"
				].join("\n");
			} else if (bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(255, 112, 67, 0.60) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #408884 !important",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: " + primColor + " !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: #FFD68F !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #00FFF3 !important",
					"}"
				].join("\n");
			}
		} else if (secColor !== null) {
			if (bMBlueTheme || bMDarkTheme || bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #0E4E0E !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #408884 !important",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #C2FFAD !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: " + secColor + " !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: #00FFF3 !important",
					"}"
				].join("\n");
			}
		} else if (terColor !== null) {
			if (bMBlueTheme || bMDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #0E4E0E !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(120, 154, 201, 0.70) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			} else if (bSPDarkTheme) {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #0E4E0E !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: rgba(255, 112, 67, 0.60) !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			} else {
				dialogCSS2 = [
					".RCE-Chart-Highlight {",
					"  background-color: #C2FFAD !important",
					"}",
					".RCE-Chart-HighlightSub {",
					"  background-color: #FFD68F !important",
					"}",
					".RCE-Chart-HighlightWL {",
					"  background-color: " + terColor + " !important",
					"}"
				].join("\n");
			}
		}
	} else if (bMBlueTheme || bMDarkTheme) {
        dialogCSS2 = [
            ".RCE-Chart-Highlight {",
            "  background-color: #0E4E0E !important",
            "}",
            ".RCE-Chart-HighlightSub {",
            "  background-color: rgba(120, 154, 201, 0.70) !important",
            "}",
            ".RCE-Chart-HighlightWL {",
            "  background-color: #408884 !important",
            "}"
        ].join("\n");
    }
    else if (bSPDarkTheme) {
        dialogCSS2 = [
            ".RCE-Chart-Highlight {",
            "  background-color: #0E4E0E !important",
            "}",
            ".RCE-Chart-HighlightSub {",
            "  background-color: rgba(255, 112, 67, 0.60) !important",
            "}",
            ".RCE-Chart-HighlightWL {",
            "  background-color: #408884 !important",
            "}"
        ].join("\n");
    } else {
        dialogCSS2 = [
            ".RCE-Chart-Highlight {",
            "  background-color: #C2FFAD !important",
            "}",
            ".RCE-Chart-HighlightSub {",
            "  background-color: #FFD68F !important",
            "}",
            ".RCE-Chart-HighlightWL {",
            "  background-color: #00FFF3 !important",
            "}"
        ].join("\n");
    }

    var node2 = document.createElement('style');
    node2.type = "text/css";
    node2.ClassName = "RCE-Style-Charts";
    node2.appendChild(document.createTextNode(dialogCSS2));
    document.head.appendChild(node2);
}

function highlight(row) {
    var rows = document.getElementsByClassName(row);
    for (var i = 0; i < rows.length; i++) {
        rows[i].className += " RCE-Chart-Highlight";
    }
}

function highlightSub(row) {
    var rows = document.getElementsByClassName(row);
    for (var i = 0; i < rows.length; i++) {
        rows[i].className += " RCE-Chart-HighlightSub";
    }
}

function confirmAuthor() {
    var author = document.getElementsByClassName('comment__username')[0].children[0].innerHTML;
    if (author == "rachellove" || author == "KTS") {
        return true;
    }
    else {
        return false;
    }
}

function confirmRow(row) {
    if (row.children.length != 1) {
        return false;
    } if (row.children[0].tagName != "STRONG") {
        return false;
    } if (row.children[0].children.length != 1) {
        return false;
    } if (row.children[0].children[0].tagName != "A") {
        return false;
    } if (row.children[0].children[0].hasAttribute("href") === false) {
        return false;
    } if (/store.steampowered.com/.test(row.children[0].children[0].href) === false) {
        return false;
    }
    return true;
}

function scanTable() {
    var elements = document.getElementsByTagName('td');
    var appIDs = [];
    var subIDs = [];
    for (var i = 0; i < elements.length; i++) {
        if (confirmRow(elements[i]) === false) {
            continue;
        }
        var id;
        if(/app/.test(elements[i].children[0].children[0].href)) {
            id = /\d+/.exec(elements[i].children[0].children[0].href)[0];
            appIDs.push(id);
            elements[i].parentNode.setAttribute('class', "app/" + id);
        } else if(/sub/.test(elements[i].children[0].children[0].href)) {
            id = /\d+/.exec(elements[i].children[0].children[0].href)[0];
            subIDs.push(id);
            elements[i].parentNode.setAttribute('class', "sub/" + id);
        }
    }
    var array = [appIDs, subIDs];
    return array;
}

function checkStoreJSON(jsonf) {
    if (jsonf["rgOwnedApps"].length === 0) {
        return false;
    } else {
		return true;
    }
}

function importStoreJSON(appids, subids) {
    GM_xmlhttpRequest ({
        method: "GET",
        url: "https://store.steampowered.com/dynamicstore/userdata/",
        timeout: 5000,
        onload: function(response) {
            var jsonf = JSON.parse(response.responseText);
            if (checkStoreJSON(jsonf)) {
                var i;
                var wantedApps = jsonf["rgWishlist"];
                var ownedApps = jsonf["rgOwnedApps"];
				//console.log("Got the list of owned apps: " + ownedApps);
                for (i = 0; i < appids.length; i++) {
					//console.log("Going through the apps loop, current appID: " + appids[i]);
                    if (checkLst(appids[i], ownedApps)) {
						//console.log("Found appID " + appids[i] + " in the ownedApps list");
                        highlight("app/" + appids[i]);
						//console.log("Succesfully highlighted the row");
                    } else if (checkLst(appids[i], wantedApps)) {
                        highlightWL("app/" + appids[i]);
                    }
                }
                var ownedSubs = jsonf["rgOwnedPackages"];
				//console.log("Got the list of owned subs: " + ownedSubs);
                for (i = 0; i < subids.length; i++) {
					var subID = subids[i];
					//console.log("Type of subID: " + typeof subID);
					//console.log("Going through the packages loop, current subID: " + subID);
                    if (checkLst(subID, ownedSubs)) {
						//console.log("Found subID " + subID + " in the ownedSubs list");
                        highlight("sub/" + subID);
						//console.log("Succesfully highlighted the row");
                    } else {
						modifiedGetApps(subID, ownedApps);
					}
                }
				saveData(ownedApps, "storeDataApps");
				saveData(wantedApps, "storeDataWL");
				saveData(ownedSubs, "storeDataSubs");
				var date = new Date();
				var time = date.getTime();
				saveData(time, "storeDataTime");
            } else {
				var j = 0;
				if (appids.length > 0) {
					importJSON(appids);
				}
				if (subids.length > 0) {
					for (j = 0; j < subids.length; j++) {
						getApps(subids[j]);
					}
				}
			}
        }
    });
}

function modifiedGetApps(subID, ownedApps) {
	var storedSub = getLocalData("sub/" + subID);
	console.log("modiefiedGetApps. storedSub equals: " + storedSub);
	if (storedSub !== false) {
		console.log("modifiedGetApps. First conditional (if), storedSub doesn't equal false");
		var count = 0;
		for (var i = 0; i < storedSub.length; i++) {
			console.log("modifiedGetApps. First conditional (if). For loop, element: " + storedSub[i]);
			if (checkLst(storedSub[i], ownedApps)) {
				count += 1;
				console.log("modifiedGetApps. First conditional (if). For loop. First conditional (if), storedSub[i] was in ownedApps, added to count, current count: " + count);
			}
		} console.log("modifiedGetApps. First conditional (if). After for loop. Final count is: " + count);
		if (count == storedSub.length) {
			highlight("app/" + subID);
		} else if (count !== 0) {
			highlightSub("sub/" + subID);
		}
	} else {
		GM_xmlhttpRequest({
			method: "GET",
			url: "https://store.steampowered.com/api/packagedetails/?packageids=" + subID,
			timeout: 3000,
			onload: function(response) {
				var jsonf = JSON.parse(response.responseText);
				var arrayApps = [];
				for (var j = 0; j < jsonf[subID]['data']['apps'].length; j++) {
					arrayApps.push(jsonf[subID]['data']['apps'][j]['id']);
				}
				saveData(arrayApps, "sub/" + subID);
				var count = 0;
				for (var z = 0; z < arrayApps.length; z++) {
					if (checkLst(arrayApps[z], ownedApps)) {
						count += 1;
					}
				}
				if (count == arrayApps.length) {
					highlight("app/" + subID);
				} else {
					highlightSub("sub/" + subID);
				}
			}
		});
	}
}

function highlightWL(row) {
    var rows = document.getElementsByClassName(row);
    for (var i = 0; i < rows.length; i++) {
        if (!(rows[i].classList.contains("RCE-Chart-Highlight") || rows[i].classList.contains("RCE-Chart-HighlightSub"))) {
            rows[i].className += " RCE-Chart-HighlightWL";
        }
    }
}

function importJSON(appids_filter) {
    var storedApps = GM_getValue("appsAPI");
	var storedStoreApps = GM_getValue("storeDataApps");
	if (storedApps !== false || storedStoreApps !== false) {
		if (storedApps.length === 0) {
			storedApps = [];
		} else if (storedStoreApps.length === 0) {
			storedStoreApps = [];
		}
		var new_appids_filter = [];
		for (var i = 0; i < appids_filter.length; i++) {
			if (checkLst(appids_filter[i], storedApps) || checkLst(appids_filter[i], storedStoreApps)) {
				highlight("app/" + appids_filter[i]);
			} else {
				new_appids_filter.push(appids_filter[i]);
			}
		}
		appids_filter = new_appids_filter;

	} else if (appids_filter.length > 0) {
		var link = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apiKey + '&input_json={"steamid":' + steamID64 + ',"appids_filter":' + JSON.stringify(appids_filter) + "}";
		var jsonFile;
		GM_xmlhttpRequest ({
			method: "GET",
			url: link,
			timeout: 3000,
			onload: function(response) {
				jsonFile = JSON.parse(response.responseText);
				if (jsonFile.response.game_count > 0) {
					var newArray = [];
					for(var i = 0; i < jsonFile.response.games.length; i++) {
						highlight("app/" + jsonFile['response']['games'][i]['appid']);
						//Needs more testing
						/*saveApp(jsonFile.response.games[i].appid);*/
						newArray.push(jsonFile['response']['games'][i]['appid']);
					}
					saveData(newArray, "appsAPI");
				}
			},
		});
	}
}

function getApps(subID) {
	var storedSub = getLocalData("sub/" + subID);
	var storedStoreSubs = getLocalData("storeDataSubs");
	if (checkLst(subID, storedStoreSubs)) {
		highlight("sub/" + subID);
	} else if (storedSub !== false) {
		var storedApps = getLocalData("appsAPI");
		if (storedApps !== false) {
			var count = 0;
			for (var i = 0; i < storedSub.length; i++) {
				if (checkLst(storedSub[i], storedApps)) {
					count += 1;
				}
			}
			if (count == storedSub.length) {
				highlight("sub/" + subID);
			} else if (count !== 0) {
				highlightSub("sub/" + subID);
			}
		} else {
			var checkGames = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apiKey + '&input_json={"steamid":' + steamID64 + ',"appids_filter":' + JSON.stringify(storedSub) + "}";
			GM_xmlhttpRequest({
                method: "GET",
                url: checkGames,
                onload: function(response) {
                    var jsonFile = JSON.parse(response.responseText);
                    if (jsonFile['response']['game_count'] == arrayApps.length) {
                        highlight("app/" + subID);
                    }
                    else if (jsonFile['response']['game_count'] != 0) {
                        highlightSub("sub/" + subID);
                    }
					var newArray = [];
					for(var i = 0; i < jsonFile.response.games.length; i++) {
						newArray.push(jsonFile['response']['games'][i]['appid']);
					}
					if (newArray.length > 0) {
						saveData(newArray, "appsAPI");
					}
                }
            });
		}
	} else {
		var link = "https://store.steampowered.com/api/packagedetails/?packageids=" + subID;
		GM_xmlhttpRequest({
			method: "GET",
			url: link,
			timeout: 3000,
			onload: function(response) {
				var jsonFile = JSON.parse(response.responseText);
				var arrayApps = [];
				for (var j = 0; j < jsonFile[subID]['data']['apps'].length; j++) {
					arrayApps.push(jsonFile[subID]['data']['apps'][j]['id']);
				} saveData(arrayApps, "sub/" + subID);
				var checkGames = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apiKey + '&input_json={"steamid":' + steamID64 + ',"appids_filter":' + JSON.stringify(arrayApps) + "}";
				GM_xmlhttpRequest({
					method: "GET",
					url: checkGames,
					onload: function(response) {
						var jsonFile = JSON.parse(response.responseText);
						if (jsonFile['response']['game_count'] == arrayApps.length) {
							highlight("app/" + subID);
						}
						else if (jsonFile['response']['game_count'] != 0) {
							highlightSub("sub/" + subID);
						}
						var newArray = [];
						for(var i = 0; i < jsonFile.response.games.length; i++) {
							newArray.push(jsonFile['response']['games'][i]['appid']);
						}
						if (newArray.length > 0) {
							saveData(newArray, "appsAPI");
						}
					}
				});
			}
		});
	}
}

function turnToIntArray(oldArray) {
    var newArray = [];
    for (var i = 0; i < oldArray.length; i++) {
        newArray.push(parseInt(oldArray[i]));
    }
    return newArray;
}

function checkLst(value, list) {
    if (list.indexOf(value) == -1) {
        return false;
    } else {
        return true;
    }
}

function saveData(element, name) {
	var stored = GM_getValue(name);
	console.log("saveData. stored is " + stored);
	var newArray;
	if (element.length === undefined) {
		console.log("saveData. First conditional (if)");
		newArray = [element];
	} else {
		console.log("saveData. First conditional (else)");
		newArray = element;
	}
	if (stored !== undefined) {
		console.log("saveData. Second conditional (if)");
		if (name !== "storeDataTime" && name !== "appsAPI") {
			//newArray = addToArray(newArray, stored);
			GM_setValue(name, JSON.stringify(element));
			console.log("saveData. Second conditional (if). If. Set value of " + JSON.stringify(element));
		} else if (name == "storeDataTime") {
			GM_setValue("storeDataTime", element);
			console.log("saveData. Second conditional (if). Else if 1. Set value of " + element);
		} else if (name == "appsAPI") {
			newArray = addToArray(newArray, stored);
			GM_setValue("appsAPI", JSON.stringify(newArray));
			console.log("saveData. Second conditional (if). Else if 2. Set value of " + JSON.stringify(newArray));
		}
	} else {
		console.log("saveData. Second conditional (else)");
		if (name !== "storeDataTime" && name !== "appsAPI") {
			//newArray = addToArray(newArray, element);
			GM_setValue(name, JSON.stringify(element));
			console.log("saveData. Second conditional (else). If. Set value of " + JSON.stringify(element));
		} else if (name == "storeDataTime") {
			GM_setValue("storeDataTime", element);
			console.log("saveData. Second conditional (else). Else if 1. Set value of " + element);
		} else if (name == "appsAPI") {
			//newArray = addToArray(newArray, stored);
			GM_setValue("appsAPI", JSON.stringify(element));
			console.log("saveData. Second conditional (else). Else if 2. Set value of " + JSON.stringify(element));
		}
	}
}

function getLocalData(name) {
	var stored = GM_getValue(name);
	if (stored === undefined) {
		return false;
	} else {
		return JSON.parse(stored);
	}
}

function addToArray(oldArray, arrayToAdd) {
	var newArray = oldArray;
	if (arrayToAdd.length === undefined) {
		newArray.push(arrayToAdd);
	} else {
		for (var i = 0; i < arrayToAdd.length; i++) {
			newArray.push(arrayToAdd[i]);
		}
	}
	return newArray;
}

/* Unused for now
function pickColor() {
    var test = document.getElementById('Test');
    var color = document.getElementById('ColorInput').value;
    test.style.backgroundColor = color;
}*/

//These two functions need more testing, to implement
/*
function checkApp(appID) {
    if ((GM_getValue('appids') !== null) && GM_getValue('appids') !== undefined) {
        var array = JSON.parse(GM_getValue('appids'));
        if (array.indexOf(appID) >= 0) {
            return true;
        } else {
            return false;
        }
    }
    return false;
}

function saveApp(appID) {
    if ((GM_getValue('appids') !== null) && GM_getValue('appid') !== undefined) {
        var array = JSON.parse(GM_getValue('appids'));
        array.push(appID);
        GM_setValue('appids', JSON.stringify(array));
    } else {
        var array = [appID];
        GM_setValue('appids', JSON.stringify(array));
    }
}
*/