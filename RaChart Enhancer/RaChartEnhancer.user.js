// ==UserScript==
// @name		RaChart™ Enhancer
// @author		Sighery
// @description	Enhances Rachel's charts in SG by highlighting you the games you own already
// @version		0.32.0
// @downloadURL	https://github.com/Sighery/RaChart/raw/master/RaChart%20Enhancer/RaChartEnhancer.user.js
// @updateURL	https://github.com/Sighery/RaChart/raw/master/RaChart%20Enhancer/RaChartEnhancer.meta.js
// @supportURL	https://www.steamgifts.com/discussion/riOvr/
// @namespace	Sighery
// @match		https://www.steamgifts.com/*
// @grant		GM_xmlhttpRequest
// @grant		GM_notification
// @grant		GM_setValue
// @grant		GM_getValue
// @grant		GM_deleteValue
// @connect		api.steampowered.com
// @connect		store.steampowered.com
// @require		https://www.kryogenix.org/code/browser/sorttable/sorttable.js
// @require		https://gist.githubusercontent.com/Sighery/feddf87a45215ead08ae8c3321a2083d/raw/52294fe11c35bfb20dcfee06a9972e001cbdad31/python-string-format.js
// @require		https://gist.githubusercontent.com/Sighery/d1ea3de4da5ff7e8b36c6ec0ea74a1c2/raw/080107877f9b2ddaebaacc629ce6ee7d6bedb1de/draggable-absolute-dialog.js
// ==/UserScript==


// ==================== CONSTANTS ====================
// For easier remembering
// Types for highlight function
const HIGHLIGHT_OWNED = 0;
const HIGHLIGHT_PARTIALLY_OWNED = 1;
const HIGHLIGHT_WISHLIST = 2;
const HIGHLIGHT_IGNORED = 3;
// Default colors for highlighting rows
const OWNED_DEFAULT = "#C2FFAD";
const OWNED_MBLUE = "#0E4E0E";
const OWNED_MDARK = "#0E4E0E";
const OWNED_SPDARK = "#0E4E0E";
const PARTIALLY_OWNED_DEFAULT = "#FFD68F";
const PARTIALLY_OWNED_MBLUE = "rgba(150, 90, 16, 0.7)";
const PARTIALLY_OWNED_MDARK = "rgba(150, 90, 16, 0.7)";
const PARTIALLY_OWNED_SPDARK = "rgba(255, 112, 67, 0.60)";
const WISHLIST_DEFAULT = "#5DFBF3";
const WISHLIST_MBLUE = "rgba(120, 154, 201, 0.70)";
const WISHLIST_MDARK = "rgba(120, 154, 201, 0.70)";
const WISHLIST_SPDARK = "#408884";
const IGNORED_DEFAULT = "#9E9E9E";
const IGNORED_MBLUE = "rgba(93, 86, 84, 0.9)";
const IGNORED_MDARK = "rgba(93, 86, 84, 0.9)";
const IGNORED_SPDARK = "rgba(93, 86, 84, 0.9)";
// Types of link
const TYPE_APP = 0;
const TYPE_SUB = 1;
const TYPE_BUNDLE = 2;
// Limit time for cached data
const APPS_IN_SUB_LIMIT = 86400000; // 1 day in milliseconds
const APPS_IN_BUNDLE_LIMIT = 86400000; // 1 day in milliseconds



// ==================== MAIN ====================
refactorStorage();
injectInterface();

if ((window.location.href.match("(\.steamgifts\.com\/discussion\/)|(\.steamgifts\.com\/giveaway\/)")) !== null && confirmAuthor()) {
	var apiKey = localStorage.getItem('APIKey');
	var steamID64 = localStorage.getItem('SteamID64');
	var bStoreMethod = localStorage.getItem('RCE-StoreMethod');
	if (bStoreMethod !== undefined && bStoreMethod !== null) bStoreMethod = true;
	var bBundleRequests = localStorage.getItem('RCE-BundleRequests');
	if (bBundleRequests !== undefined && bBundleRequests !== null) bBundleRequests = true;

	var links = scanTable();

	// Add the CSS for being able to highlight rows
	injectHighlightStyle();

	if (links.apps.length > 0 || links.apps.length > 0 || (bBundleRequests && links.bundles.length > 0)) {
		var storedSubs = {};
		var storedBundles = {};

		(async() => {
			// Check and fetch here to avoid repeated code
			if (bBundleRequests && links.bundles.length > 0) {
				// Bundles can have both apps and subs. And the HTML provides
				// the list of appIDs in a sub so if you have a bundle link
				// you might require the cached subs data as well
				storedBundles = JSON.parse(GM_getValue('AppsInBundles', '{}'));
				storedSubs = JSON.parse(GM_getValue('AppsInSubs', '{}'));
			} else if (links.subs.length > 0) {
				storedSubs = JSON.parse(GM_getValue('AppsInSubs', '{}'));
			}

			// If store method is set to false, or if it fails for some reason
			// fallback to normal storefront API and/or HTML
			let storeFallback = true;

			if (bStoreMethod === true) {
				try {
					await storeMethodRequest(links);
					storeFallback = false;
				} catch (err) {
					console.error(err);
				}
			}

			if (storeFallback === true && checkIDAPI()) {
				// First gather the apps in all the packages and add them
				if (links.subs.length > 0 || (bBundleRequests && links.bundles.length > 0)) {
					let packsPromises = [];

					if (links.subs.length > 0) {
						for (let sub of links.subs) {
							packsPromises.push(requestAppsInPack(sub.id, TYPE_SUB)
								.then(subData => {
									let subID = parseInt(Object.keys(subData)[0]);
									links.subs[links.subs_index[subID]].apps = subData[subID];
								})
								.catch(err => err)
							);
						}
					}

					if (bBundleRequests && links.bundles.length > 0) {
						for (let bundle of links.bundles) {
							packsPromises.push(requestAppsInPack(bundle.id, TYPE_BUNDLE)
								.then(bundleData => {
									let bundleID = parseInt(Object.keys(bundleData)[0]);
									let bundleIndex = links.bundles_index[bundleID];
									links.bundles[bundleIndex].apps = bundleData[bundleID].apps;
									links.bundles[bundleIndex].subs = bundleData[bundleID].subs;
								})
								.catch(err => err)
							);
						}
					}

					await Promise.all(packsPromises);
				}

				if (links.apps.length > 0) {
					await webApiOwnedRequest(links);
				}
			}

			// Finally save the cache data after being done with all the reqs
			GM_setValue('AppsInSubs', JSON.stringify(storedSubs));
			GM_setValue('AppsInBundles', JSON.stringify(storedBundles));
		})();
	}
}



// ==================== FUNCTIONALITY ====================
// ========== REQUESTS FUNCTIONS ==========
async function storeMethodRequest(links) {
	try {
		let response = await GM_xmlhttpRequestPromise({
			method: "GET",
			url: "https://store.steampowered.com/dynamicstore/userdata/",
			timeout: 5000,
			headers: {
				"Cache-Control": "no-cache, no-store, must-revalidate"
			}
		});

		let jsonFile = JSON.parse(response.responseText);

		if (checkLoginStoreMethod(jsonFile) === false) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Not logged into the Steam store.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 1.5
			});

			throw new NotLoggedInError();
		}

		if (links.apps.length > 0) {
			let notOwnedApps = orderedMatchingAlgorithm(
				links.apps,
				jsonFile.rgOwnedApps,
				matchingAppID => highlight('app/{0}'.format(matchingAppID), HIGHLIGHT_OWNED)
			);

			if (notOwnedApps.length > 0) {
				let notWishlistApps = orderedMatchingAlgorithm(
					notOwnedApps,
					jsonFile.rgWishlist,
					matchingAppID => highlight('app/{0}'.format(matchingAppID), HIGHLIGHT_WISHLIST)
				);

				if (notWishlistApps.length > 0) {
					// Due to a recent change, Steam now sends rgIgnoredApps
					// as an array of objects such as {284750: 0}
					orderedMatchingAlgorithm(
						notWishlistApps,
						turnToIntArray(Object.keys(jsonFile.rgIgnoredApps)),
						matchingAppID => highlight('app/{0}'.format(matchingAppID), HIGHLIGHT_IGNORED)
					);
				}
			}
		}

		if (bBundleRequests && links.bundles.length > 0) {
			// Request the bundle data
			await Promise.all(links.bundles.map(bundle => requestAppsInPack(bundle.id, TYPE_BUNDLE)
				.then(bundleData => {
					let bundleID = parseInt(Object.keys(bundleData)[0]);
					let bundleIndex = links.bundles_index[bundleID];
					links.bundles[bundleIndex].apps = bundleData[bundleID].apps;
					links.bundles[bundleIndex].subs = bundleData[bundleID].subs;
				})
				.catch(err => err)
			));

			// Try to match or partially match bundles
			for (let bundle of links.bundles) {
				let totalLength = bundle.apps.length + bundle.subs.length;
				let totalMatched = 0;

				let sortedAppIDs = jsonFile.rgOwnedApps.sort((a, b) => a - b);

				if (bundle.apps.length > 0) {
					orderedMatchingAlgorithm(
						bundle.apps,
						sortedAppIDs,
						matchedAppID => totalMatched++
					);
				}

				if (bundle.subs.length > 0) {
					// First check if any of the subs are marked as owned, if so
					// add +1 to totalMatched
					let notOwnedPacks = orderedMatchingAlgorithm(
						bundle.subs,
						jsonFile.rgOwnedPackages,
						matchingSubID => totalMatched++
					);

					if (notOwnedPacks.length > 0) {
						// Get the apps in a given sub now. It should be stored
						// in storedSubs by now. If a sub is only partially
						// owned don't count it towards the totalMatched
						await Promise.all(bundle.subs.map(sub => requestAppsInPack(sub, TYPE_SUB)
							.then(subData => {
								let subID = parseInt(Object.keys(subData)[0]);
								let notMatchedApps = orderedMatchingAlgorithm(subData[subID], sortedAppIDs);

								if (notMatchedApps.length === 0) {
									totalMatched++;
								}
							})
							.catch(err => err)
						));
					}
				}

				if (totalMatched === totalLength && (totalLength !== 0 || totalMatched !== 0)) {
					highlight('bundle/{0}'.format(bundle.id), HIGHLIGHT_OWNED);
				} else if (totalMatched !== totalLength && totalMatched !== 0) {
					highlight('bundle/{0}'.format(bundle.id), HIGHLIGHT_PARTIALLY_OWNED);
				}
			}
		}

		if (links.subs.length > 0) {
			let notOwnedPacks = orderedMatchingAlgorithm(
				links.subs.map(sub => sub.id),
				jsonFile.rgOwnedPackages,
				matchingSubID => highlight('sub/{0}'.format(matchingSubID), HIGHLIGHT_OWNED)
			);

			if (notOwnedPacks.length > 0) {
				await Promise.all(notOwnedPacks.map(
					subID => requestAppsInPack(subID, TYPE_SUB)
						.then(subData => {
							let subID = parseInt(Object.keys(subData)[0]);
							links.subs[links.subs_index[subID]].apps = subData[subID];
						})
						.catch(err => err)
				));

				// Try to match app by app manually now
				for (let subID of notOwnedPacks) {
					let sub = links.subs[links.subs_index[subID]];

					let notMatchedApps = orderedMatchingAlgorithm(sub.apps, jsonFile.rgOwnedApps);

					// If sub.apps.length is 0 it means it was most likely an
					// invalid or non-existent sub

					if (notMatchedApps.length === 0 && sub.apps.length !== 0) {
						highlight('sub/{0}'.format(subID), HIGHLIGHT_OWNED);
					} else if (notMatchedApps.length !== sub.apps.length && sub.apps.length !== 0) {
						highlight('sub/{0}'.format(subID), HIGHLIGHT_PARTIALLY_OWNED);
					} else if (sub.apps.length !== 0) {
						// Check the ignored packages key. Although so far it's
						// not even implemented??
						// Update: No front-end way of doing it but the code is
						// there. Same structure as recent rgIgnoredApps
						orderedMatchingAlgorithm(
							[subID],
							turnToIntArray(Object.keys(jsonFile.rgIgnoredPackages)),
							matchedSubID => highlight('sub/{0}'.format(matchedSubID), HIGHLIGHT_IGNORED)
						);
					}
				}
			}
		}
	} catch (err) {
		if (err instanceof TimeoutError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Store request timed out.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 1.5
			});
		} else if (err instanceof HttpError || err instanceof NetworkError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Unable to make the request to the store.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 1.5
			});
		}

		// Regardless of type of error, rethrow it so it can be catched and
		// logged by the main function
		throw err;
	}
}


async function webApiOwnedRequest(links) {
	let appidsFilter = [];
	appidsFilter.push.apply(appidsFilter, links.apps);
	links.subs.forEach(sub => appidsFilter.push.apply(appidsFilter, sub.apps));
	links.bundles.forEach(bundle => appidsFilter.push.apply(appidsFilter, bundle.apps));

	let link = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={0}&input_json={\"steamid\":{1},\"appids_filter\":{2}}".format(apiKey, steamID64, JSON.stringify(appidsFilter));

	try {
		let response = await GM_xmlhttpRequestPromise({
			method: "GET",
			url: link,
			timeout: 5000
		});

		let jsonFile = JSON.parse(response.responseText);

		if (jsonFile.response.game_count > 0) {
			// To avoid pointless lookups of what apps are matched, just try to
			// highlight every appID given back by the API. If the given appID
			// was requested from a package, then it will simply not exist a
			// matching app/ID row in any of the tables and nothing will happen
			for (let game of jsonFile.response.games) {
				highlight("app/{0}".format(game.appid), HIGHLIGHT_OWNED);
			}

			// Sort JSON response of matched appIDs first to avoid sorting repeatedly later
			let sortedAppIDs = jsonFile.response.games
				.map(game => game.appid)
				.sort((a, b) => a - b);

			// Try to match or partially match subs
			for (let sub of links.subs) {
				let notMatched = orderedMatchingAlgorithm(sub.apps, sortedAppIDs);

				// If sub.apps.length is 0 it means it was most likely an
				// invalid or non-existent sub

				if (notMatched.length !== sub.apps.length && notMatched.length >= 1 && sub.apps.length !== 0) {
					highlight('sub/{0}'.format(sub.id), HIGHLIGHT_PARTIALLY_OWNED);
				} else if (notMatched.length === 0 && sub.apps.length !== 0) {
					highlight('sub/{0}'.format(sub.id), HIGHLIGHT_OWNED);
				}
			}

			// Try to match or partially match bundles
			for (let bundle of links.bundles) {
				let totalLength = bundle.apps.length + bundle.subs.length;
				let totalMatched = 0;

				if (bundle.apps.length > 0) {
					orderedMatchingAlgorithm(
						bundle.apps,
						sortedAppIDs,
						matchedAppID => totalMatched++
					);
				}

				if (bundle.subs.length > 0) {
					// First get the apps in a given sub. It should be stored in
					// storedSubs by now. If a sub is only partially owned don't
					// count it towards the totalMatched
					await Promise.all(bundle.subs.map(sub => requestAppsInPack(sub, TYPE_SUB)
						.then(subData => {
							let subID = parseInt(Object.keys(subData)[0]);
							let notMatchedApps = orderedMatchingAlgorithm(subData[subID], sortedAppIDs);

							if (notMatchedApps.length === 0) {
								totalMatched++;
							}
						})
						.catch(err => err)
					));
				}

				if (totalMatched === totalLength && (totalLength !== 0 || totalMatched !== 0)) {
					highlight('bundle/{0}'.format(bundle.id), HIGHLIGHT_OWNED);
				} else if (totalMatched !== totalLength && totalMatched !== 0) {
					highlight('bundle/{0}'.format(bundle.id), HIGHLIGHT_PARTIALLY_OWNED);
				}
			}
		}
	} catch (err) {
		if (err instanceof TimeoutError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Request for fetching owned apps timed out.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3
			});
		} else if (err instanceof HttpError || err instanceof NetworkError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Could not fetch owned games.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3
			});
		} else if (err instanceof InexistentLinkError) {
			console.warn(err);
		} else {
			console.error(err);
			throw err;
		}
	}
}


async function requestAppsInPack(id, type) {
	try {
		if (type === TYPE_SUB) {
			if (id in storedSubs && (Date.now() - storedSubs[id].checked_time) < APPS_IN_SUB_LIMIT) {
				// Cached data and it seems to still be fresh enough
				if (storedSubs[id].success === false) {
					reportInexistentLink('sub/{0}'.format(id));
					throw new InexistentLinkError(id, TYPE_SUB);
				}

				return {[id]: storedSubs[id].apps};
			} else {
				let response = await GM_xmlhttpRequestPromise({
					method: "GET",
					url: "https://store.steampowered.com/api/packagedetails/?packageids={0}".format(id),
					timeout: 3000
				});

				let jsonFile = JSON.parse(response.responseText);
				if (jsonFile[id].success === false) {
					reportInexistentLink('sub/{0}'.format(id));
					storedSubs[id] = {
						"success": false,
						"checked_time": Date.now()
					}

					throw new InexistentLinkError(id, TYPE_SUB);
				}

				let appsArray = jsonFile[id].data.apps.map(x => x.id);

				// Add the apps to the stored subs object with current timestamp
				storedSubs[id] = {
					"success": true,
					"checked_time": Date.now(),
					"apps": appsArray
				}

				// Return an object with the id and corresponding apps
				return {[id]: appsArray};
			}
		} else if (bBundleRequests && type === TYPE_BUNDLE) {
			// No API method so start parsing HTML like a sucker :^)
			if (id in storedBundles && (Date.now() - storedBundles[id].checked_time) < APPS_IN_BUNDLE_LIMIT) {
				// Cached data and it seems to still be fresh enough
				if (storedBundles[id].success === false) {
					reportInexistentLink('bundle/{0}'.format(id));
					throw new InexistentLinkError(id, TYPE_BUNDLE);
				}

				return {
					[id]: {
						"apps": storedBundles[id].apps,
						"subs": storedBundles[id].subs
					}
				}
			} else {
				try {
					let response = await GM_xmlhttpRequestPromise({
						method: "POST",
						url: "https://store.steampowered.com/bundle/{0}".format(id),
						timeout: 4000
					});

					// If it redirected to the main Steam store page, throw error
					if (response.finalUrl === "https://store.steampowered.com/") {
						response.status = 302;
						throw new HttpError(response);
					}

					let injectedPage = document.createElement('div');
					injectedPage.innerHTML = response.responseText;

					let bundleElems = injectedPage.getElementsByClassName('tab_item');

					let finalResponse = {
						[id]: {
							"apps": [],
							"subs": []
						}
					}

					for (let elem of bundleElems) {
						// If this attribute is non-existent it means this is an app
						let entryType = (elem.hasAttribute('data-ds-packageid')) ? TYPE_SUB : TYPE_APP;

						if (entryType === TYPE_APP) {
							finalResponse[id].apps.push(parseInt(elem.getAttribute('data-ds-appid')));
						} else if (entryType === TYPE_SUB) {
							// Steam provides a list of appIDs in a package as well
							// so let's store that while we're at it
							let subID = parseInt(elem.getAttribute('data-ds-packageid'));
							finalResponse[id].subs.push(subID);

							storedSubs[subID] = {
								"success": true,
								"checked_time": Date.now(),
								"apps": []
							}

							storedSubs[subID].apps.push.apply(
								storedSubs[subID].apps,
								elem.getAttribute('data-ds-appid').split(',').map(x => parseInt(x))
							);
						}
					}

					// Add the fetched data to the cache
					storedBundles[id] = {
						"success": true,
						"checked_time": Date.now(),
						"apps": finalResponse[id].apps,
						"subs": finalResponse[id].subs
					}

					return finalResponse;
				} catch (err) {
					if (err instanceof HttpError && err.response.status === 302) {
						// Seems like non-existent is 302 error code
						reportInexistentLink('bundle/{0}'.format(id));
						storedBundles[id] = {
							"success": false,
							"checked_time": Date.now()
						}

						throw new InexistentLinkError(id, TYPE_BUNDLE);
					} else {
						throw err;
					}
				}
			}
		}
	} catch (err) {
		if (err instanceof TimeoutError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Request for fetching apps in {0} {1} timed out.".format(
					(type === TYPE_SUB) ? "package" : "bundle",
					id
				),
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3
			});
		} else if (err instanceof HttpError || err instanceof NetworkError) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Error: Could not fetch apps in {0} {1}.".format(
					(type === TYPE_SUB) ? "package" : "bundle",
					id
				),
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3
			});
		} else if (err instanceof InexistentLinkError) {
			console.warn(err);
			throw err;
		} else {
			console.error(err);
			throw err;
		}
	}
}



// ========== CHECKING FUNCTIONS ==========
function checkIDAPI(notifications = true) {
	var bdismissed = GM_getValue("DismissedMissing", false);
	if (bdismissed) {
		return false;
	}

	var bAPIKey = localStorage.getItem("APIKey");
	var bSteamID64 = localStorage.getItem("SteamID64");

	if (bAPIKey === null && bSteamID64 === null) {
		if (notifications) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Missing API key and Steam ID64. Click to dismiss and not show again.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3,
				onclick: function() {
					GM_setValue("DismissedMissing", true);
				}
			});
		}

		return false;
	} else if (bAPIKey === null) {
		if (notifications) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Missing API key. Click to dismiss and not show again.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3,
				onclick: function() {
					GM_setValue("DismissedMissing", true);
				}
			});
		}

		return false;
	} else if (bSteamID64 === null) {
		if (notifications) {
			GM_notification({
				title: "RaChart™ Enhancer",
				text: "Missing Steam ID64. Click to dismiss and not show again.",
				image: "http://i.imgur.com/f2OtaSe.png",
				highlight: false,
				timeout: 3,
				onclick: function() {
					GM_setValue("DismissedMissing", true);
				}
			});
		}

		return false;
	} else {
		return true;
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
}


function confirmRow(row) {
	if (row.children.length != 1) {
		return false;
	} if (row.getElementsByTagName("A").length < 1) {
		return false;
	} if (/(store\.steampowered\.com)|(steamdb\.info)/.test(row.getElementsByTagName("A")[0].href) === false) {
		return false;
	}

	return true;
}


function checkLoginStoreMethod(jsonFile) {
	if (jsonFile.rgWishlist.length === 0 && jsonFile.rgOwnedPackages.length === 0 && jsonFile.rgOwnedApps.length === 0) {
		return false;
	}

	return true;
}



// ========== INJECT FUNCTIONS ==========
function injectInterface() {
	injectDlgStyle();
	injectDialog();
	injectFunctions();
	injectRow();
}


function injectFunctions() {
	var scriptCode = [
		"function retrieveChecked() {",
		"	var ownedColorBox = document.getElementById('RCE-OwnedColor');",
		"	var partiallyOwnedColorBox = document.getElementById('RCE-PartiallyOwnedColor');",
		"	var wishlistColorBox = document.getElementById('RCE-WishlistColor');",
		"	var ignoredColorBox = document.getElementById('RCE-IgnoredColor');",
		"	ownedColorBox.value = \"{0}\";".format(OWNED_DEFAULT),
		"	partiallyOwnedColorBox.value = \"{0}\";".format(PARTIALLY_OWNED_DEFAULT),
		"	wishlistColorBox.value = \"{0}\";".format(WISHLIST_DEFAULT),
		"	ignoredColorBox.value = \"{0}\";".format(IGNORED_DEFAULT),
		"	if (localStorage.getItem('MBlueTheme') == 'true') {",
		"		document.getElementById('MBlueTheme').checked = true;",
		"		ownedColorBox.value = \"{0}\";".format(OWNED_MBLUE),
		"		partiallyOwnedColorBox.value = \"{0}\";".format(PARTIALLY_OWNED_MBLUE),
		"		wishlistColorBox.value = \"{0}\";".format(WISHLIST_MBLUE),
		"		ignoredColorBox.value = \"{0}\";".format(IGNORED_MBLUE),
		"	}",
		"	if (localStorage.getItem('MDarkTheme') == 'true') {",
		"		document.getElementById('MDarkTheme').checked = true;",
		"		ownedColorBox.value = \"{0}\";".format(OWNED_MDARK),
		"		partiallyOwnedColorBox.value = \"{0}\";".format(PARTIALLY_OWNED_MDARK),
		"		wishlistColorBox.value = \"{0}\";".format(WISHLIST_MDARK),
		"		ignoredColorBox.value = \"{0}\";".format(IGNORED_MDARK),
		"	}",
		"	if (localStorage.getItem('SPDarkTheme') == 'true') {",
		"		document.getElementById('SPDarkTheme').checked = true;",
		"		ownedColorBox.value = \"{0}\";".format(OWNED_SPDARK),
		"		partiallyOwnedColorBox.value = \"{0}\";".format(PARTIALLY_OWNED_SPDARK),
		"		wishlistColorBox.value = \"{0}\";".format(WISHLIST_SPDARK),
		"		ignoredColorBox.value = \"{0}\";".format(IGNORED_SPDARK),
		"	}",
		"	var ownedColor = localStorage.getItem('RCE-OwnedColor');",
		"	var partiallyOwnedColor = localStorage.getItem('RCE-PartiallyOwnedColor');",
		"	var wishlistColor = localStorage.getItem('RCE-WishlistColor');",
		"	var ignoredColor = localStorage.getItem('RCE-IgnoredColor');",
		"	if (ownedColor !== null) {",
		"		ownedColorBox.value = ownedColor;",
		"	}",
		"	if (partiallyOwnedColor !== null) {",
		"		partiallyOwnedColorBox.value = partiallyOwnedColor;",
		"	}",
		"	if (wishlistColor !== null) {",
		"		wishlistColorBox.value = wishlistColor;",
		"	}",
		"	if (ignoredColor !== null) {",
		"		ignoredColorBox.value = ignoredColor;",
		"	}",
		"	var bStoreMethod = localStorage.getItem('RCE-StoreMethod');",
		"	if (bStoreMethod !== null) {",
		"		document.getElementById('RCE-StoreMethod').checked = true;",
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
		// Not logged in, create a new button on the header
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
		newRow.children[1].children[0].textContent = "RaChart™ Enhancer";

		newRow.children[1].appendChild(document.createElement('p'));
		newRow.children[1].children[1].setAttribute('class', 'nav__row__summary__description');
		newRow.children[1].children[1].textContent = "Change the options for the enhancer.";
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
	dlgHeader.children[0].textContent = "RaChart™ Enhancer";
	dlgHeader.appendChild(document.createElement('a'));
	dlgHeader.children[1].setAttribute('id', 'closeRCE');
	dlgHeader.children[1].href = "javascript:void(0)";
	dlgHeader.children[1].appendChild(document.createElement('i'));
	dlgHeader.children[1].children[0].setAttribute('class', 'fa fa-times');
	dlgHeader.children[1].children[0].style.fontSize = "25px";
	dlgHeader.children[1].children[0].style.marginTop = "-6px";

	var dlgBody = dlg.children[1];
	dlgBody.setAttribute('id', 'dlg-body');
	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[0].htmlFor = "APIKey";
	dlgBody.children[0].textContent = "API Key:";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[1].type = "textarea";
	dlgBody.children[1].setAttribute('id', 'APIKey');
	dlgBody.children[1].style.marginLeft = "35px";
	dlgBody.children[1].style.width = "300px";
	dlgBody.children[1].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[2].setAttribute('class', 'RCE-button');
	dlgBody.children[2].style.marginLeft = "3px";
	dlgBody.children[2].textContent = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[4].htmlFor = "SteamID64";
	dlgBody.children[4].textContent = "Steam ID64:";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[5].type = "textarea";
	dlgBody.children[5].setAttribute('id', 'SteamID64');
	dlgBody.children[5].style.marginLeft = "11px";
	dlgBody.children[5].style.width = "300px";
	dlgBody.children[5].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[6].setAttribute('class', 'RCE-button');
	dlgBody.children[6].style.marginLeft = "3px";
	dlgBody.children[6].textContent = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[8].htmlFor = "RCE-OwnedColor";
	dlgBody.children[8].textContent = "Owned color:";
	dlgBody.children[8].style.marginRight = "8px";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[9].type = "color";
	dlgBody.children[9].setAttribute('id', 'RCE-OwnedColor');
	dlgBody.children[9].style.width = "170px";
	dlgBody.children[9].style.marginLeft = "51px";
	dlgBody.children[9].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[10].setAttribute('class', 'RCE-button');
	dlgBody.children[10].style.marginLeft = "3px";
	dlgBody.children[10].textContent = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[12].htmlFor = "RCE-PartiallyOwnedColor";
	dlgBody.children[12].textContent = "Partially owned color:";
	dlgBody.children[12].style.marginRight = "8px";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[13].type = "color";
	dlgBody.children[13].setAttribute('id', 'RCE-PartiallyOwnedColor');
	dlgBody.children[13].style.width = "170px";
	dlgBody.children[13].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[14].setAttribute('class', 'RCE-button');
	dlgBody.children[14].style.marginLeft = "3px";
	dlgBody.children[14].textContent = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[16].htmlFor = "RCE-WishlistColor";
	dlgBody.children[16].textContent = "Wishlist color:";
	dlgBody.children[16].style.marginRight = "8px";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[17].type = "color";
	dlgBody.children[17].setAttribute('id', 'RCE-WishlistColor');
	dlgBody.children[17].style.width = "170px";
	dlgBody.children[17].style.marginLeft = "47px";
	dlgBody.children[17].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[18].setAttribute('class', 'RCE-button');
	dlgBody.children[18].style.marginLeft = "3px";
	dlgBody.children[18].textContent = "Submit";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[20].htmlFor = "RCE-IgnoredColor";
	dlgBody.children[20].textContent = "Ignored apps color";
	dlgBody.children[20].style.marginRight = "8px";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[21].type = "color";
	dlgBody.children[21].setAttribute('id', 'RCE-IgnoredColor');
	dlgBody.children[21].style.width = "170px";
	dlgBody.children[21].style.marginLeft = "16px";
	dlgBody.children[21].style.lineHeight = "inherit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[22].setAttribute('class', 'RCE-button');
	dlgBody.children[22].style.marginLeft = "3px";
	dlgBody.children[22].textContent = "Submit";

	dlgBody.appendChild(document.createElement('button'));
	dlgBody.children[23].setAttribute('class', 'RCE-button');
	dlgBody.children[23].textContent = "Reset colors";
	dlgBody.children[23].style.width = "70px";
	dlgBody.children[23].style.fontSize = "10px";
	dlgBody.children[23].style.marginTop = "-50px";
	dlgBody.children[23].style.float = "right";

	dlgBody.appendChild(document.createElement('br'));
	dlgBody.children[24].style.lineHeight = "30px";

	dlgBody.appendChild(document.createElement('div'));
	dlgBody.children[25].title = "The store method allows for more accurate fetching (includes packages and DLCs owned, as well as wishlist and ignored apps) but requires you to be logged into the Steam store to work, and will only work with the account logged into the store";
	dlgBody.children[25].appendChild(document.createElement('label'));
	dlgBody.children[25].children[0].htmlFor = "RCE-StoreMethod";
	dlgBody.children[25].children[0].textContent = "Check to use the Steam store method for fetching ";
	dlgBody.children[25].appendChild(document.createElement('input'));
	dlgBody.children[25].children[1].setAttribute('id', 'RCE-StoreMethod');
	dlgBody.children[25].children[1].type = "checkbox";
	dlgBody.children[25].children[1].style.width = "inherit";
	dlgBody.children[25].children[1].style.marginTop = "10px";

	dlgBody.appendChild(document.createElement('div'));
	dlgBody.children[26].title = "With no official API it requests and parses HTML, meaning it's more prone to errors (although the other stuff will still work fine even if this fails) and it will be a bit slower when it has to request fresh data instead of using the cached data";
	dlgBody.children[26].appendChild(document.createElement('label'));
	dlgBody.children[26].children[0].htmlFor = "RCE-BundleRequests";
	dlgBody.children[26].children[0].textContent = "Check to enable experimental detection of bundles ";
	dlgBody.children[26].appendChild(document.createElement('input'));
	dlgBody.children[26].children[1].setAttribute('id', 'RCE-BundleRequests');
	dlgBody.children[26].children[1].type = "checkbox";
	dlgBody.children[26].children[1].style.width = "inherit";
	dlgBody.children[26].children[1].style.marginTop = "10px";


	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[27].htmlFor = "MBlueTheme";
	dlgBody.children[27].appendChild(document.createElement('a'));
	dlgBody.children[27].children[0].href = "https://www.steamgifts.com/discussion/62TRf/";
	dlgBody.children[27].children[0].target = "_blank";
	dlgBody.children[27].children[0].textContent = "Check this if you use Mully's Blue Theme";
	dlgBody.children[27].children[0].style.color = "#115a8e";
	dlgBody.children[27].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[28].setAttribute('id', 'MBlueTheme');
	dlgBody.children[28].type = "checkbox";
	dlgBody.children[28].style.width = "inherit";
	dlgBody.children[28].style.marginTop = "10px";
	dlgBody.children[28].style.marginLeft = "3px";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[30].htmlFor = "MDarkTheme";
	dlgBody.children[30].appendChild(document.createElement("a"));
	dlgBody.children[30].children[0].href = "https://www.steamgifts.com/discussion/62TRf/";
	dlgBody.children[30].children[0].target = "_blank";
	dlgBody.children[30].children[0].textContent = "Check this if you use Mully's Dark Theme";
	dlgBody.children[30].children[0].style.color = "#115a8e";
	dlgBody.children[30].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[31].setAttribute('id', 'MDarkTheme');
	dlgBody.children[31].type = "checkbox";
	dlgBody.children[31].style.width = "inherit";
	dlgBody.children[31].style.marginTop = "2px";
	dlgBody.children[31].style.marginLeft = "3px";

	dlgBody.appendChild(document.createElement('br'));

	dlgBody.appendChild(document.createElement('label'));
	dlgBody.children[33].htmlFor = "SPDarkTheme";
	dlgBody.children[33].appendChild(document.createElement("a"));
	dlgBody.children[33].children[0].href = "https://www.steamgifts.com/discussion/iO230/";
	dlgBody.children[33].children[0].target = "_blank";
	dlgBody.children[33].children[0].textContent = "Check this if you use SquishedPotatoe's Dark Theme";
	dlgBody.children[33].children[0].style.color = "#115a8e";
	dlgBody.children[33].children[0].style.textDecoration = "underline";

	dlgBody.appendChild(document.createElement('input'));
	dlgBody.children[34].setAttribute('id', 'SPDarkTheme');
	dlgBody.children[34].type = "checkbox";
	dlgBody.children[34].style.width = "inherit";
	dlgBody.children[34].style.marginTop = "2px";
	dlgBody.children[34].style.marginLeft = "3px";

	dlgBody.appendChild(document.createElement('h2'));
	dlgBody.children[35].style.float = "right";
	dlgBody.children[35].style.marginTop = "-2px";
	dlgBody.children[35].appendChild(document.createElement('a'));
	dlgBody.children[35].children[0].href = "https://www.steamgifts.com/discussion/riOvr/";
	dlgBody.children[35].children[0].style.color = "#FFFFFF";
	dlgBody.children[35].children[0].style.fontSize = "20px";
	dlgBody.children[35].children[0].style.fontStyle = "italic";
	dlgBody.children[35].children[0].style.textDecoration = "underline";
	dlgBody.children[35].children[0].textContent = "Thread";


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

			GM_deleteValue("DismissedMissing");
		} else {
			alert("Not a valid API key (too short, or not fully uppercase, or contains non-alphanumeric characters)");
		}
	});

	dlgBody.children[6].addEventListener('click', function() {
		var input = document.getElementById('SteamID64');
		input.value = input.value.trim();
		if (input.value.length === 17 && /^[0-9]+$/.test(input.value)) {
			localStorage.setItem(input.id, input.value);

			GM_deleteValue("DismissedMissing");
		} else {
			alert("Not a valid Steam ID64 (not the correct length, or contains non-numeric characters)");
		}
	});

	dlgBody.children[10].addEventListener('click', function() {
		// Owned color
		var input = dlgBody.children[9];
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[14].addEventListener('click', function() {
		// Partially owned color
		var input = dlgBody.children[13];
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[18].addEventListener('click', function () {
		// Wishlist color
		var input = dlgBody.children[17];
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[22].addEventListener('click', function() {
		// Ignored apps color
		var input = dlgBody.children[21];
		localStorage.setItem(input.id, input.value);
	});

	dlgBody.children[23].addEventListener('click', function() {
		localStorage.removeItem('RCE-OwnedColor');
		localStorage.removeItem('RCE-PartiallyOwnedColor');
		localStorage.removeItem('RCE-WishlistColor');
		localStorage.removeItem('RCE-IgnoredColor');
	});

	dlgBody.children[25].children[1].addEventListener('click', function() {
		// Using store method
		var input = dlgBody.children[25].children[1];
		if (input.checked === false) {
			localStorage.removeItem(input.id);
		} else {
			localStorage.setItem(input.id, true);
		}
	});

	dlgBody.children[26].children[1].addEventListener('click', () => {
		// Using experimental bundle detection
		let input = dlgBody.children[26].children[1];
		if (input.checked === false) {
			localStorage.removeItem(input.id);
		} else {
			localStorage.setItem(input.id, true);
		}
	});

	dlgBody.children[28].addEventListener('click', function() {
		// Mully's Blue Theme
		var input = dlgBody.children[28];
		if (input.checked === false) {
			localStorage.removeItem(input.id);
		} else {
			localStorage.setItem(input.id, true);
		}

		// Remove all other themes' checkboxes
		dlgBody.children[31].checked = false;
		localStorage.removeItem(dlgBody.children[30].id);
		dlgBody.children[34].checked = false;
		localStorage.removeItem(dlgBody.children[33].id);
	});

	dlgBody.children[31].addEventListener('click', function() {
		// Mully's Dark Theme
		var input = dlgBody.children[31];
		if (input.checked === false) {
			localStorage.removeItem(input.id);
		} else {
			localStorage.setItem(input.id, true);
		}

		// Remove all other themes' checkboxes
		dlgBody.children[28].checked = false;
		localStorage.removeItem(dlgBody.children[27].id);
		dlgBody.children[34].checked = false;
		localStorage.removeItem(dlgBody.children[33].id);
	});

	dlgBody.children[34].addEventListener('click', function() {
		// SquishedPotatoe's Dark Theme
		var input = dlgBody.children[34];
		if (input.checked === false) {
			localStorage.removeItem(input.id);
		} else {
			localStorage.setItem(input.id, true);
		}

		// Remove all other themes' checkboxes
		dlgBody.children[28].checked = false;
		localStorage.removeItem(dlgBody.children[27].id);
		dlgBody.children[31].checked = false;
		localStorage.removeItem(dlgBody.children[30].id);
	});

	dragElement(dlg);
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
			"  cursor: move;",
			"}",
			"#dlg-header-title {",
			"  float: left;",
			"}",
			"#dlg-body{",
			"  clear: both;",
			"  background-color: #C3C3C3;",
			"  color: #000000;",
			"  font-size: 14px;",
			"  padding: 10px;",
			"  margin: 0px 10px 10px 10px;",
			"}",
			"#closeRCE {",
			"  background-color: transparent;",
			"  color: white;",
			"  float: right;",
			"  border: none;",
			"  font-size: 25px;",
			"  margin-top: -5px;",
			"  opacity: 0.7;",
			"}",
			".RCE-button{",
			"  background-color: #fff;",
			"  border: 2px solid #333;",
			"  box-shadow: 1px 1px 0 #333,",
			"			   2px 2px 0 #333,",
			"			   3px 3px 0 #333,",
			"			   4px 4px 0 #333,",
			"			   5px 5px 0 #333;",
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
			".RCE-button:hover,",
			".RCE-button:focus {",
			"  background-color: #edd;",
			"}",
			".RCE-button:active {",
			"  box-shadow: 1px 1px 0 #333;",
			"  left: 4px;",
			"  top: 4px;",
			"}",
			// For SquishedPotatoe's Dark Theme
			".markdown td {",
			"  background-color: inherit !important;",
			"}"
	].join("\n");
	var node = document.createElement('style');
	node.type = "text/css";
	node.appendChild(document.createTextNode(dialogCSS));
	document.getElementsByTagName('head')[0].appendChild(node);
}


function injectHighlightStyle() {
	var data = {};

	// Get stored values of highlight colours and/or default theme values
	data.OwnedColor = localStorage.getItem('RCE-OwnedColor');
	data.PartiallyOwnedColor = localStorage.getItem('RCE-PartiallyOwnedColor');
	data.WishlistColor = localStorage.getItem('RCE-WishlistColor');
	data.IgnoredColor = localStorage.getItem('RCE-IgnoredColor');
	data.MBlueTheme = localStorage.getItem('MBlueTheme');
	data.MDarkTheme = localStorage.getItem('MDarkTheme');
	data.SPDarkTheme = localStorage.getItem('SPDarkTheme');

	var dialogCSS = [
		".RCE-owned, .RCE-partially-owned, .RCE-wishlist, .RCE-ignored {",
		"  text-shadow: none;",
		"}"
	];

	// Figure out and add owned color
	dialogCSS.push(".RCE-owned {");

	if (data.OwnedColor !== null) {
		dialogCSS.push("  background-color: {0} !important;".format(data.OwnedColor));
	} else if (data.MBlueTheme !== null && data.MBlueTheme !== undefined && data.MBlueTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(OWNED_MBLUE));
	} else if (data.MDarkTheme !== null && data.MDarkTheme !== undefined && data.MDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(OWNED_MDARK));
	} else if (data.SPDarkTheme !== null && data.SPDarkTheme !== undefined && data.SPDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(OWNED_SPDARK));
	} else {
		dialogCSS.push("  background-color: {0} !important;".format(OWNED_DEFAULT));
	}

	dialogCSS.push("}");

	// Figure out and add partially owned color
	dialogCSS.push(".RCE-partially-owned {");

	if (data.PartiallyOwnedColor !== null) {
		dialogCSS.push("  background-color: {0} !important;".format(data.PartiallyOwnedColor));
	} else if (data.MBlueTheme !== null && data.MBlueTheme !== undefined && data.MBlueTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(PARTIALLY_OWNED_MBLUE));
	} else if (data.MDarkTheme !== null && data.MDarkTheme !== undefined && data.MDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(PARTIALLY_OWNED_MDARK));
	} else if (data.SPDarkTheme !== null && data.SPDarkTheme !== undefined && data.SPDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(PARTIALLY_OWNED_SPDARK));
	} else {
		dialogCSS.push("  background-color: {0} !important;".format(PARTIALLY_OWNED_DEFAULT));
	}

	dialogCSS.push("}");

	// Figure out and add wishlist color
	dialogCSS.push(".RCE-wishlist {");

	if (data.WishlistColor !== null) {
		dialogCSS.push("  background-color: {0} !important;".format(data.WishlistColor));
	} else if (data.MBlueTheme !== null && data.MBlueTheme !== undefined && data.MBlueTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(WISHLIST_MBLUE));
	} else if (data.MDarkTheme !== null && data.MDarkTheme !== undefined && data.MDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(WISHLIST_MDARK));
	} else if (data.SPDarkTheme !== null && data.SPDarkTheme !== undefined && data.SPDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(WISHLIST_SPDARK));
	} else {
		dialogCSS.push("  background-color: {0} !important;".format(WISHLIST_DEFAULT));
	}

	dialogCSS.push("}");

	// Figure out and add ignored color
	dialogCSS.push(".RCE-ignored {");

	if (data.IgnoredColor !== null) {
		dialogCSS.push("  background-color: {0} !important;".format(data.IgnoredColor));
	} else if (data.MBlueTheme !== null && data.MBlueTheme !== undefined && data.MBlueTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(IGNORED_MBLUE));
	} else if (data.MDarkTheme !== null && data.MDarkTheme !== undefined && data.MDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(IGNORED_MDARK));
	} else if (data.SPDarkTheme !== null && data.SPDarkTheme !== undefined && data.SPDarkTheme != false) {
		dialogCSS.push("  background-color: {0} !important;".format(IGNORED_SPDARK));
	} else {
		dialogCSS.push("  background-color: {0} !important;".format(IGNORED_DEFAULT));
	}

	dialogCSS.push("}");

	dialogCSS = dialogCSS.join("\n");

	var node = document.createElement('style');
	node.type = 'text/css';
	node.appendChild(document.createTextNode(dialogCSS));
	document.getElementsByTagName('head')[0].appendChild(node);
}



// ========== HIGHLIGHT FUNCTIONS ==========
function highlight(id, type) {
	// Arguments for type:
	//   0 - Owned
	//   1 - Partially owned
	//   2 - Wishlist
	//   3 - Ignored
	// id will be a string such as app/1234

	let rows = document.getElementsByClassName(id);

	for (let row of rows) {
		if (type === 0) {
			row.className += " RCE-owned";
		} else if (type === 1) {
			row.className += " RCE-partially-owned";
		} else if (type === 2) {
			row.className += " RCE-wishlist";
		} else if (type === 3) {
			row.className += " RCE-ignored";
		}
	}
}


function reportInexistentLink(id) {
	// id will be something like app/1234
	var invalids = [];

	// Find links that finish on either a given id, or contains that exact id
	document.querySelectorAll('a[href$="{0}"]'.format(id)).forEach(function(element) {
		invalids.push(element);
	});
	document.querySelectorAll('a[href*="{0}/"]'.format(id)).forEach(function(element) {
		invalids.push(element);
	});

	invalids.forEach(function(element) {
		element.style.backgroundColor = "red";
		element.title += " INVALID LINK";

		// Maybe remove id from classList?
		// element.classList.remove(id);
	});
}



// ========== SCAN FUNCTIONS ==========
function scanTable() {
	// Make tables sortable
	let tables = document.getElementsByTagName('table');
	for (let table of tables) {
		table.className += " sortable";
	}

	let elements = document.getElementsByTagName('td');
	let appIDs = new Set();
	let subIDs = new Set();
	let bundleIDs = new Set();

	let final = {
		apps: [],
		subs: [],
		subs_index: {},
		bundles: [],
		bundles_index: {}
	}


	for (let element of elements) {
		if (confirmRow(element) === false) {
			continue;
		}

		let id;
		let link = element.getElementsByTagName("A")[0].href;

		if (/app/.test(link)) {
			id = /\d+/.exec(link)[0];
			appIDs.add(parseInt(id));
			element.parentNode.setAttribute('class', "app/{0}".format(id));
		} else if (/sub/.test(link)) {
			id = /\d+/.exec(link)[0];
			subIDs.add(parseInt(id));
			element.parentNode.setAttribute('class', "sub/{0}".format(id));
		} else if (/bundle/.exec(link)) {
			id = /\d+/.exec(link)[0];
			bundleIDs.add(parseInt(id));
			element.parentNode.setAttribute('class', "bundle/{0}".format(id));
		}
	}

	final.apps = Array.from(appIDs);
	subIDs = Array.from(subIDs);
	for (let i = 0; i < subIDs.length; i++) {
		final.subs.push({
			id: subIDs[i],
			apps: []
		});
		final.subs_index[subIDs[i]] = i;
	}
	bundleIDs = Array.from(bundleIDs);
	for (let i = 0; i < bundleIDs.length; i++) {
		final.bundles.push({
			id: bundleIDs[i],
			apps: [],
			subs: []
		});
		final.bundles_index[bundleIDs[i]] = i;
	}

	return final;
}



// ========== UTILITY FUNCTIONS ==========
function turnToIntArray(oldArray) {
	return oldArray.map((elem) => parseInt(elem));
}


function checkLst(value, list) {
	return list.indexOf(value) === -1 ? false : true;
}


function refactorStorage() {
	var ownedColor = localStorage.getItem('PrimaryColor');
	var partiallyOwnedColor = localStorage.getItem('SecondaryColor');

	if (ownedColor !== null) {
		localStorage.setItem('RCE-OwnedColor', ownedColor);
		localStorage.removeItem('PrimaryColor');
	}

	if (partiallyOwnedColor !== null) {
		localStorage.setItem('RCE-PartiallyOwnedColor', partiallyOwnedColor);
		localStorage.removeItem('SecondaryColor');
	}

	// Create AppsInSubs GM local storage if it doesn't exist yet
	// Empty object such as but stored as a string:
	//	{"18408": {
	//		"success": true,
	//		"checked_time": unix_timestamp in milliseconds,
	//		"apps": [201270,201277,34343,34342,34345,34348,223180,201279]
	//		}
	//	}
	// If success is false apps will be probably non-existant
	if (GM_getValue('AppsInSubs', false) === false) {
		GM_setValue('AppsInSubs', '{}');
	}

	// Similar thing for bundles, but it will also have a subs array
	//	{"232": {
	//		"success": true,
	//		"checked_time": unix_timestamp in milliseconds,
	//		"apps": [300,20,30,40,50,60,70,130,220,240,400,420,500,550,620],
	//		"subs": [7,38,79,54029]
	//		}
	//	}
	// If success is false apps and subs will probably be non-existant
	if (GM_getValue('AppsInBundles', false) === false) {
		GM_setValue('AppsInBundles', '{}');
	}
}


function orderedMatchingAlgorithm(array1, array2, customFunction = null) {
	// Will return not matched elements of array1 compared to array2
	let notMatched = [];

	array1.sort((a, b) => a - b);

	array2.sort((a, b) => a - b);

	let i = 0;
	let j = 0;

	while (true) {
		if (i >= array1.length || j >= array2.length) {
			if (i < array1.length) {
				for (let z = i; z < array1.length; z++) {
					notMatched.push(array1[z]);
				}
			}

			break;
		}

		if (array1[i] === array2[j]) {
			if (customFunction !== null) {
				customFunction(array1[i]);
			}

			i++;
			j++;
		} else if (array1[i] < array2[j]) {
			notMatched.push(array1[i]);

			i++;
		} else if (array1[i] > array2[j]) {
			j++;
		}
	}

	return notMatched;
}


function GM_xmlhttpRequestPromise(data) {
	// Data can have a special parameter preventredirect to throw an error if
	// final URL doesn't match initial URL (since there's no actual way to block
	// redirections with XMLHttpRequest)
	return new Promise((resolve, reject) => {
		// Match old callback functions to Promise resolve/reject
		data.onload = (response) => {
			if (data.preventredirect === true && data.url !== response.finalUrl) {
				response.url = data.url;
				response.status = 302;
				reject(new HttpError(response));
			} else if (response.status === 200) {
				resolve(response);
			} else {
				// Apparently errors >= 400 do not count to trigger onerror
				response.url = response.finalUrl;
				reject(new HttpError(response));
			}
		}
		data.ontimeout = (response) => {
			// Apparently Tampermonkey provides no response element for ontimeout
			response.url = data.url;
			reject(new TimeoutError(response));
		}
		data.onerror = (response) => {
			// Seems this is only triggered by network errors
			response.url = response.finalUrl;
			reject(new NetworkError(response));
		}

		GM_xmlhttpRequest(data);
	});
}



// ========== EXCEPTIONS ==========
class NetworkError extends Error {
	constructor(response) {
		super('Some kind of network error happened requesting ' + response.url);
		this.name = 'NetworkError';
		this.response = response;
	}
}


class HttpError extends Error {
	constructor(response) {
		super(response.status + ' for ' + response.url);
		this.name = 'HttpError';
		this.response = response;
	}
}


class TimeoutError extends Error {
	constructor(response) {
		super('Timeout for ' + response.url);
		this.name = 'TimeoutError';
		this.response = response;
	}
}


class NotLoggedInError extends Error {
	constructor() {
		super('Not logged into the Steam store');
		this.name = 'NotLoggedInError';
	}
}


class InexistentLinkError extends Error {
	constructor(id, type) {
		let typeStr = "";
		if (type === TYPE_APP) {
			typeStr = "app";
		} else if (type === TYPE_SUB) {
			typeStr = "sub";
		} else if (type === TYPE_BUNDLE) {
			typeStr = "bundle";
		}

		super('Inexistent {0}ID {1}.'.format(typeStr, id));
		this.id = id;
		this.type = type;
	}
}
