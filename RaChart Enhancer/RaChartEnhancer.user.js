// ==UserScript==
// @name		 RaChart™ Enhancer
// @author       Sighery
// @description  Enhances Rachel's charts in SG by highlighting you the games you own already
// @version	     0.28
// @icon		 http://www.sighery.com/favicon.ico
// @downloadURL  https://github.com/Sighery/RaChart/raw/master/RaChart%20Enhancer/RaChartEnhancer.user.js
// @updateURL	 https://github.com/Sighery/RaChart/raw/master/RaChart%20Enhancer/RaChartEnhancer.meta.js
// @supportURL   https://www.steamgifts.com/discussion/riOvr/
// @namespace	 Sighery
// @match		 https://www.steamgifts.com/*
// @grant		 GM_xmlhttpRequest
// @connect	     api.steampowered.com
// @connect	     store.steampowered.com
// @require      http://www.kryogenix.org/code/browser/sorttable/sorttable.js
// ==/UserScript==

injectInterface();

if ((window.location.href.match(".steamgifts.com/discussion/") || window.location.href.match(".steamgifts.com/giveaway/")) !== null && confirmAuthor() && checkIDAPI()) {
	var apiKey = localStorage.getItem('APIKey');
	var steamID64 = localStorage.getItem('SteamID64');

	var apps = scanTable();
	var appIDs = apps[0];
	var subIDs = apps[1];

	if (appIDs.length > 0) {
		importJSON(appIDs);
	}

	if (subIDs.length > 0) {
		for (i = 0; i < subIDs.length; i++) {
			getApps(subIDs[i]);
		}
	}
}

function checkIDAPI() {
	var bAPIKey = localStorage.getItem("APIKey");
	var bSteamID64 = localStorage.getItem("SteamID64");

	if (bAPIKey === null && bSteamID64 === null) {
		alert("RaChart™ Enhancer: Both API key and Steam ID64 are missing, please add them for the script to work");
		return false;
	} else if (bAPIKey === null) {
		alert("RaChart™ Enhancer: API key missing, please add it for the script to work");
		return false;
	} else if (bSteamID64 === null) {
		alert("RaChart™ Enhancer: Steam ID64 missing, please add it for the script to work");
		return false;
	} else {
		return true;
	}
}

function injectInterface() {
	injectDlgStyle();
	injectDialog();
	injectFunctions();
	injectRow();
}

function injectFunctions() {
	var scriptCode = [
		"function retrieveChecked() {",
		"	if (localStorage.getItem('MBlueTheme') == 'true') {",
		"		document.getElementById('MBlueTheme').checked = true;",
		"	}",
		"	if (localStorage.getItem('MDarkTheme') == 'true') {",
		"		document.getElementById('MDarkTheme').checked = true;",
		"	}",
		"	if (localStorage.getItem('SPDarkTheme') == 'true') {",
		"		document.getElementById('SPDarkTheme').checked = true;",
		"	}",
		"	var primary_color = localStorage.getItem('PrimaryColor');",
		"	var secondary_color = localStorage.getItem('SecondaryColor');",
		"	if (primary_color !== null) {",
		"		document.getElementById('PrimaryColor').value = primary_color;",
		"	}",
		"	if (secondary_color !== null) {",
		"		document.getElementById('SecondaryColor').value = secondary_color;",
		"	}",
		"	var APIKey = localStorage.getItem('APIKey');",
		"	var SteamID64 = localStorage.getItem('SteamID64');",
		"	if (APIKey !== null) {",
		"		document.getElementById('APIKey').value = APIKey;",
		"	}",
		"	if (SteamID64 !== null) {",
		"		document.getElementById('SteamID64').value = SteamID64;",
		"	}",
		"}",
		"",
		"retrieveChecked();"
	].join("\n");
	var node = document.createElement('script');
	node.type = "text/javascript";
	node.appendChild(document.createTextNode(scriptCode));
	document.head.appendChild(node);
}

function injectRow() {
	var discDropdown = document.querySelector("a[class~='nav__button'][href='/discussions']");
	var newRow;

	if (discDropdown.previousElementSibling === null) {
		//Not logged in, create a new button on the header
		newRow = document.createElement("div");
		newRow.className = "nav__button-container";
		newRow.appendChild(document.createElement("a"));
		newRow.children[0].className = "nav__button";
		newRow.children[0].href = "javascript:void(0)";
		newRow.children[0].textContent = "RC Enhancer";

		document.getElementsByClassName("nav__left-container")[0].appendChild(newRow);

	} else {
		newRow = document.createElement('a');
		newRow.setAttribute('class', 'nav__row');
		newRow.href = "javascript:void(0)";

		discDropdown = discDropdown.previousElementSibling.firstElementChild;
		discDropdown.insertBefore(newRow, discDropdown.querySelector("a[class='nav__row'][href='/discussions/created']").nextElementSibling);


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
	}


	newRow.addEventListener('click', function() {
		var blackbg = document.getElementById('black-background');
		var dlg = document.getElementById('dlg-box');
		blackbg.style.display = 'block';
		dlg.style.display = 'block';

		var winWidth = window.innerWidth;
		var winHeight = window.innerHeight;

		dlg.style.left = (winWidth/2) - 500/2 + 'px';
		dlg.style.top = '150px';
	});
}

function injectDialog() {
	var background = document.createElement('div');
	background.setAttribute('id', 'black-background');
	document.body.insertBefore(background, document.body.children[0]);

	var dlg = document.createElement('div');
	dlg.setAttribute('id', 'dlg-box');
	dlg.appendChild(document.createElement('div'));
	dlg.appendChild(document.createElement('div'));
	document.body.insertBefore(dlg, document.body.children[1]);

	var dlgHeader = dlg.children[0];
	dlgHeader.setAttribute('id', 'dlg-header');
	dlgHeader.appendChild(document.createElement('div'));
	dlgHeader.children[0].setAttribute('id', 'dlg-header-title');
	dlgHeader.children[0].innerHTML = "RaChart&trade; Enhancer";
	dlgHeader.appendChild(document.createElement('a'));
	dlgHeader.children[1].setAttribute('id', 'closeRC');
	dlgHeader.children[1].href = "javascript:void(0)";
	dlgHeader.children[1].appendChild(document.createElement('i'));
	dlgHeader.children[1].children[0].setAttribute('class', 'fa fa-times');
	dlgHeader.children[1].children[0].style.fontSize = "25px";
	dlgHeader.children[1].children[0].style.marginTop = "-6px";

	var dlgBody = dlg.children[1];
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
	dlgBody.children[9].style.width = "135px";
	dlgBody.children[9].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[10].setAttribute('class', 'RC-button');
	dlgBody.children[10].innerHTML = "Submit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[11].setAttribute('class', 'RC-button');
	dlgBody.children[11].innerHTML = "Reset colors";
	dlgBody.children[11].style.width = "55px";
	dlgBody.children[11].style.fontSize = "10px";
	dlgBody.children[11].style.marginTop = "15px";
	dlgBody.children[11].style.float = "right";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[13].htmlFor = "SecondaryColor";
	dlgBody.children[13].innerHTML = "Secondary color (for partial rows):";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[14].type = "color";
	dlgBody.children[14].setAttribute('id', 'SecondaryColor');
	dlgBody.children[14].style.width = "114px";
	dlgBody.children[14].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[15].setAttribute('class', 'RC-button');
	dlgBody.children[15].innerHTML = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[17].htmlFor = "MBlueTheme";
	dlgBody.children[17].appendChild(document.createElement("a"));
	dlgBody.children[17].children[0].href = "https://www.steamgifts.com/discussion/62TRf/";
	dlgBody.children[17].children[0].target = "_blank";
	dlgBody.children[17].children[0].textContent = "Check this if you use Mully's Blue Theme ";
	dlgBody.children[17].children[0].style.color = "#115a8e";
	dlgBody.children[17].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[18].setAttribute('id', 'MBlueTheme');
	dlgBody.children[18].type = "checkbox";
	dlgBody.children[18].style.width = "inherit";
	dlgBody.children[18].style.marginTop = "10px";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[20].htmlFor = "MDarkTheme";
	dlgBody.children[20].appendChild(document.createElement("a"));
	dlgBody.children[20].children[0].href = "https://www.steamgifts.com/discussion/62TRf/";
	dlgBody.children[20].children[0].target = "_blank";
	dlgBody.children[20].children[0].textContent = "Check this if you use Mully's Dark Theme ";
	dlgBody.children[20].children[0].style.color = "#115a8e";
	dlgBody.children[20].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[21].setAttribute('id', 'MDarkTheme');
	dlgBody.children[21].type = "checkbox";
	dlgBody.children[21].style.width = "inherit";
	dlgBody.children[21].style.marginTop = "2px";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[23].htmlFor = "SPDarkTheme";
	dlgBody.children[23].appendChild(document.createElement("a"));
	dlgBody.children[23].children[0].href = "https://www.steamgifts.com/discussion/iO230/";
	dlgBody.children[23].children[0].target = "_blank";
	dlgBody.children[23].children[0].textContent = "Check this if you use SquishedPotatoe's Dark Theme ";
	dlgBody.children[23].children[0].style.color = "#115a8e";
	dlgBody.children[23].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[24].setAttribute('id', 'SPDarkTheme');
	dlgBody.children[24].type = "checkbox";
	dlgBody.children[24].style.width = "inherit";
	dlgBody.children[24].style.marginTop = "2px";

	dlgBody.appendChild(document.createElement('h2'));
	dlgBody.children[25].style.float = "right";
	dlgBody.children[25].style.marginTop = "-2px";
	dlgBody.children[25].appendChild(document.createElement('a'));
	dlgBody.children[25].children[0].href = "https://www.steamgifts.com/discussion/riOvr/";
	dlgBody.children[25].children[0].style.color = "#FFFFFF";
	dlgBody.children[25].children[0].style.fontSize = "20px";
	dlgBody.children[25].children[0].style.fontStyle = "italic";
	dlgBody.children[25].children[0].style.textDecoration = "underline";
	dlgBody.children[25].children[0].innerHTML = "Thread";


	background.addEventListener('click', function() {
		var blackbg = document.getElementById('black-background');
		var dlg = document.getElementById('dlg-box');

		blackbg.style.display = 'none';
		dlg.style.display = 'none';
	});

	dlgHeader.children[1].addEventListener('click', function() {
		var blackbg = document.getElementById('black-background');
		var dlg = document.getElementById('dlg-box');

		blackbg.style.display = 'none';
		dlg.style.display = 'none';
	});

	dlgBody.children[2].addEventListener('click', function() {
		var input = document.getElementById('APIKey');
		input.value = input.value.trim();
		if (input.value.length > 25 && input.value === input.value.toUpperCase() && /^[A-Z0-9]+$/.test(input.value)) {
			localStorage.setItem(input.id, input.value);
		} else {
			alert("Not a valid API key (too short, or not fully uppercase, or contains non-alphanumeric characters)");
		}
	});

	dlgBody.children[6].addEventListener('click', function() {
		var input = document.getElementById('SteamID64');
		input.value = input.value.trim();
		if (input.value.length === 17 && /^[0-9]+$/.test(input.value)) {
			localStorage.setItem(input.id, input.value);
		} else {
			alert("Not a valid Steam ID64 (not the correct length, or contains non-numeric characters)");
		}
	});

	dlgBody.children[10].addEventListener('click', function() {
		var input = document.getElementById('PrimaryColor');
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[11].addEventListener('click', function() {
		localStorage.removeItem('PrimaryColor');
		localStorage.removeItem('SecondaryColor');
	});

	dlgBody.children[14].addEventListener('click', function() {
		var input = document.getElementById('SecondaryColor');
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[18].addEventListener('click', function() {
		var input = document.getElementById('MBlueTheme');
		if (input.checked == false) {
			localStorage.removeItem('MBlueTheme');
		} else {
			localStorage.setItem(input.id, true);
		}
	});

	dlgBody.children[21].addEventListener('click', function() {
		var input = document.getElementById('MDarkTheme');
		if (input.checked == false) {
			localStorage.removeItem('MDarkTheme');
		} else {
			localStorage.setItem(input.id, true);
		}
	});

	dlgBody.children[24].addEventListener('click', function() {
		var input = document.getElementById('SPDarkTheme');
		if (input.checked == false) {
			localStorage.removeItem('SPDarkTheme');
		} else {
			localStorage.setItem(input.id, true);
		}
	});
}

function injectDlgStyle() {
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
			"#dlg-box{",
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
			"#dlg-body{",
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
			".RC-button{",
			"  background-color: #fff;",
			"  border: 2px solid #333;",
			"  box-shadow: 1px 1px 0 #333,",
			"			  2px 2px 0 #333,",
			"			  3px 3px 0 #333,",
			"			  4px 4px 0 #333,",
			"			  5px 5px 0 #333;",
			"  color: #333;",
			"  display: inline-block;",
			"  padding: 4px 6px;",
			"  position: relative;",
			"  text-decoration: none;",
			"  text-transform: uppercase;",
			"  -webkit-transition: .1s;",
			"	 -moz-transition: .1s;",
			"	  -ms-transition: .1s;",
			"	   -o-transition: .1s;",
			"		  transition: .1s;",
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
			//For SquishedPotatoe's Dark Theme
			".markdown td {",
			"  background-color: inherit !important;",
			"}"
	].join("\n");
	var node = document.createElement('style');
	node.type = "text/css";
	node.appendChild(document.createTextNode(dialogCSS));
	document.getElementsByTagName('head')[0].appendChild(node);
}

function highlight(row) {
	var rows = document.getElementsByClassName(row);
	for (var i = 0; i < rows.length; i++) {
		rows[i].style.textShadow = "none";
		if (localStorage.getItem('PrimaryColor') !== null) {
			rows[i].style.backgroundColor = localStorage.getItem('PrimaryColor');
		} else if (localStorage.getItem('MBlueTheme') !== null && localStorage.getItem('MBlueTheme') !== undefined && localStorage.getItem('MBlueTheme') != false) {
			rows[i].style.backgroundColor = "#0E4E0E";
		} else if (localStorage.getItem('MDarkTheme') !== null && localStorage.getItem('MDarkTheme') !== undefined && localStorage.getItem('MDarkTheme') != false) {
			rows[i].style.backgroundColor = "#0E4E0E";
		} else if (localStorage.getItem('SPDarkTheme') !== null && localStorage.getItem('SPDarkTheme') !== undefined && localStorage.getItem('SPDarkTheme') != false) {
			rows[i].style.backgroundColor = "#0E4E0E";
		} else {
			rows[i].style.backgroundColor = "#C2FFAD";
		}
	}
}

function highlightSub(row) {
	var rows = document.getElementsByClassName(row);
	for (var i = 0; i < rows.length; i++) {
		rows[i].style.textShadow = "none";
		if (localStorage.getItem('SecondaryColor') !== null) {
			rows[i].style.backgroundColor = localStorage.getItem('PrimaryColor');
		} else if (localStorage.getItem('MBlueTheme') !== null && localStorage.getItem('MBlueTheme') !== undefined && localStorage.getItem('MBlueTheme') != false) {
			rows[i].style.backgroundColor = "rgba(120, 154, 201, 0.70)";
		} else if (localStorage.getItem('MDarkTheme') !== null && localStorage.getItem('MDarkTheme') !== undefined && localStorage.getItem('MDarkTheme') != false) {
			rows[i].style.backgroundColor = "rgba(120, 154, 201, 0.70)";
		} else if (localStorage.getItem('SPDarkTheme') !== null && localStorage.getItem('SPDarkTheme') !== undefined && localStorage.getItem('SPDarkTheme') != false) {
			rows[i].style.backgroundColor = "rgba(255, 112, 67, 0.60)";
		} else {
			rows[i].style.backgroundColor = "#FFD68F";
		}
	}
}

function confirmAuthor() {
	var blacklist = [];
	var author = document.getElementsByClassName('comment__username')[0].children[0].innerHTML;
	if (checkLst(author, blacklist) === false) {
		return true;
	} else {
		return false;
	}
	/* Whitelist method, deprecated
	if (author == "rachellove" || author == "KTS" || author == "devotee" || author == "Sighery") {
		return true;
	}
	else {
		return false;
	}*/
}

function confirmRow(row) {
	if (row.children.length != 1) {
		return false;
	} if (row.getElementsByTagName("A").length < 1) {
		return false;
	} if (/store.steampowered.com/.test(row.getElementsByTagName("A")[0].href) === false) {
		return false;
	}
	/* Old method of checking, deprecated
	if (row.children[0].tagName != "STRONG") {
		return false;
	} if (row.children[0].children.length != 1) {
		return false;
	} if (row.children[0].children[0].tagName != "A") {
		return false;
	} if (row.children[0].children[0].hasAttribute("href") === false) {
		return false;
	} if (/store.steampowered.com/.test(row.children[0].children[0].href) === false) {
		return false;
	}*/
	return true;
}

function scanTable() {
	//Make tables sortable
	var tables = document.getElementsByTagName('table');
	for (var j = 0; j < tables.length; j++) {
		tables[j].className += " sortable";
	}

	var elements = document.getElementsByTagName('td');
	var appIDs = [];
	var subIDs = [];
	for (var i = 0; i < elements.length; i++) {
		if (confirmRow(elements[i]) === false) {
			continue;
		}
		var id;
		var link = elements[i].getElementsByTagName("A")[0].href;
		if(/app/.test(link)) {
			id = /\d+/.exec(link)[0];
			appIDs.push(id);
			elements[i].parentNode.setAttribute('class', "app/" + id);
		} else if(/sub/.test(link)) {
			id = /\d+/.exec(link)[0];
			subIDs.push(id);
			elements[i].parentNode.setAttribute('class', "sub/" + id);
		}
	}
	var array = [appIDs, subIDs];
	return array;
}

function importJSON(appids_filter) {
	//Needs more testing
	/*for (var i= 0; i <appids_filter.length; i++) {
		if (checkApp(appids_filter[i])) {
			highlight('app/' + appids_filter[i]);
			appids_filter.slice(i, 1);
		}
	}*/
	var int_appids_filter = turnToIntArray(appids_filter);
	var link = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apiKey + '&input_json={"steamid":' + steamID64 + ',"appids_filter":' + JSON.stringify(int_appids_filter) + "}";
	var jsonFile;
	GM_xmlhttpRequest ({
		method: "GET",
		url: link,
		timeout: 5000,
		onload: function(response) {
			jsonFile = JSON.parse(response.responseText);
			if (jsonFile.response.game_count > 0) {
				for(var i = 0; i < jsonFile.response.games.length; i++) {
					highlight("app/" + jsonFile['response']['games'][i]['appid']);
					//Needs more testing
					/*saveApp(jsonFile.response.games[i].appid);*/
				}
			}
		},
	});
}

function getApps(subID) {
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
			}
			var int_appids_filter = turnToIntArray(arrayApps);
			var checkGames = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apiKey + '&input_json={"steamid":' + steamID64 + ',"appids_filter":' + JSON.stringify(int_appids_filter) + "}";
			GM_xmlhttpRequest({
				method: "GET",
				url: checkGames,
				onload: function(response) {
					var jsonFile = JSON.parse(response.responseText);
					if (jsonFile['response']['game_count'] == arrayApps.length) {
						highlight("sub/" + subID);
					}
					else if (jsonFile['response']['game_count'] != 0) {
						highlightSub("sub/" + subID);
					}
				}
			});
		}
	});
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
