# -*- coding: utf-8 -*-
import urllib
import urllib2
import json
from bs4 import BeautifulSoup
import requests
import re
import logging

# Create a JSON file with a key "ITAD" and value API key. The key will be
# fetched from it. The syntax for the file should look similar to this:
# {"ITAD": "API-Key-Here"}

ITADKey = ""
with open("keys.json") as keys_file:
    keys = json.load(keys_file)
    ITADKey = keys['ITAD']

invalidBundles = ["DailyIndieGame", "Chrono.GG", "Chrono.gg", "Ikoid", "Humble Mobile Bundle", "PlayInjector", "Vodo",
"Get Loaded", "GreenMan Gaming", "Indie Ammo Box", "MacGameStore", "PeonBundle", "Select n'Play", "StackSocial",
"StoryBundle", "Bundle Central", "Cult of Mac", "GOG", "Gram.pl", "Indie Fort", "IUP Bundle", "Paddle",
"SavyGamer", "Shinyloot", "Sophie Houlden", "Unversala", "Indie Game Stand"]


def itad_plain(appID):
    string = "https://api.isthereanydeal.com/v01/game/plain/id/?key=" + ITADKey + "&shop=steam&ids=app/" + str(appID)
    jsonFile = json.loads(urllib.urlopen(string).read())
    return jsonFile['data']['app/' + str(appID)]



def itad_sub_plain(subID):
    string = "https://api.isthereanydeal.com/v01/game/plain/id/?key=" + ITADKey + "&shop=steam&ids=sub/" + str(subID)
    jsonFile = json.loads(urllib.urlopen(string).read())
    return jsonFile['data']['sub/' + str(subID)]


# This function is DEPRECATED. Used ITAD but it's not always recent and
# there is no need for it anymore with the new review system
def retrieve_percentage(plain):
    string = "https://api.isthereanydeal.com/v01/game/info/?key=" + ITADKey + "&plains=" + plain
    jsonFile = json.loads(urllib.urlopen(string).read())
    if jsonFile['data'][plain]['reviews'] != None:
        percentage = str(jsonFile['data'][plain]['reviews']['steam']['perc_positive']) + "% of *" + "{:,}".format(jsonFile['data'][plain]['reviews']['steam']['total']) + " Reviews*"
        return percentage
    else:
        return "-"



def steam_rating(appID):
    URL = requests.get("http://store.steampowered.com/appreviews/" + str(appID) + "?start_offset=0&day_range=30&filter=summary&language=all&review_type=all&purchase_type=all")

    jsonf = URL.json()

    # Case to handle removed games that have no store page anymore or simply don't exist
    if jsonf['success'] == 2:
        return "-"

    soup = BeautifulSoup(jsonf['review_score'], 'html.parser')
    percentage = soup.find_all('span')[1]

    # In case the game has no reviews or hasn't been released yet:
    if percentage['data-store-tooltip'] == "No user reviews":
        return "-"

    percentage = re.findall("(\d+)%", percentage['data-store-tooltip'])[0]
    total = soup.find_all('span')[0]
    total = total.string.replace(",", "")
    total = re.findall('(\d+)\s', total)[0]
    total = "{:,}".format(int(total))

    return u"%s%% of *%s Reviews*" % (percentage, total)

    # Deprecated with the new review system now Steam uses ajax for the info
    # We can request that instead. Uses less space and has no checks at all.
    # URL = requests.get("http://store.steampowered.com/app/" + str(appID))
    #
    # if "agecheck" in URL.url:
    #     req = requests.post(URL.url, data = {'snr': '1_agecheck_agecheck_age-gate',
    #     'ageDay': 1,
    #     'ageMonth': "January",
    #     'ageYear': 1993})
    #     # Now req.url should be /app/56493 without any agecheck
    #     soup = BeautifulSoup(req.content, 'html.parser')
    #     if len(soup.find_all('div', 'subtitle column')) > 1:
    #         reviewsTxt = soup.find_all('span', 'responsive_reviewdesc')
    #         reviewsTxt = reviewsTxt[1].string.strip()
    #         percentage = re.findall('^-\s(\d+)%', reviewsTxt)[0]
    #         percentage = int(percentage)
    #         totalCount = soup.find_all('meta', itemprop="reviewCount")[0].get('content')
    #         totalCount = int(totalCount)
    #     else:
    #         reviewsTxt = soup.find_all('span', 'responsive_reviewdesc')
    #         if len(reviewsTxt) == 0:
    #             return "-"
    #         reviewsTxt = reviewsTxt[0].string.strip()
    #         percentage = re.findall('^-\s(\d+)%', reviewsTxt)[0]
    #         percentage = int(percentage)
    #         totalCount = soup.find_all('meta', itemprop="reviewCount")[0].get('content')
    #         totalCount = int(totalCount)
    #
    # else:
    #     soup = BeautifulSoup(URL.content, 'html.parser')
    #     if len(soup.find_all('div', 'subtitle column')) > 1:
    #         reviewsTxt = soup.find_all('span', 'responsive_reviewdesc')[1].string
    #         reviewsTxt = reviewsTxt.strip()
    #         percentage = re.findall('^-\s(\d+)%', reviewsTxt)[0]
    #         percentage = int(percentage)
    #         totalCount = soup.find_all('meta', itemprop="reviewCount")[0].get('content')
    #         totalCount = int(totalCount)
    #     else:
    #         reviewsTxt = soup.find_all('span', 'responsive_reviewdesc')
    #         if len(reviewsTxt) == 0:
    #             return "-"
    #         reviewsTxt = reviewsTxt[0].string.strip()
    #         percentage = re.findall('^-\s(\d+)%', reviewsTxt)[0]
    #         percentage = int(percentage)
    #         totalCount = soup.find_all('meta', itemprop="reviewCount")[0].get('content')
    #         totalCount = int(totalCount)
    #
    # return str(percentage) + "% of *" + "{:,}".format(totalCount) + " Reviews*"



def retrieve_price(plain):
    string = "https://api.isthereanydeal.com/v01/game/prices/us/?key=" + ITADKey + "&country=US&plains=" + plain
    jsonFile = json.load(urllib.urlopen(string))
    for element in jsonFile['data'][plain]['list']:
        if element['shop']['id'] == "steam":
            return element['price_old']


def price_from_pack(app_json, appID):
    #app_json = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(appID)))
    ## Some games actually have a price, but since they also have a demo
    # Steam will count them as free, even though they are not. That's why we
    # check all the packages containing the game, if some package isn't free
    # too that means it's one of those weird free demo cases (check app 253510)
    # After thinking it is not a good idea since there is no difference between
    # actual free apps and that case. So we'll keep an array with those free
    # demo games for now.
    special_games = [253510]

    # Not used anymore
    #bPacksFree = True
    #if len(app_json[str(appID)]['data']['packages']) > 0:
    #    for index, element in enumerate(app_json[str(appID)]['data']['package_groups']):
    #        for pack in app_json[str(appID)]['data']['package_groups'][index]['subs']:
    #            if pack['is_free_license'] == False:
    #                bPacksFree = False
    #                break
    if (app_json[str(appID)]['data']['is_free'] and "price_overview" in app_json[str(appID)]['data'] == False) and not appID in special_games:
        return 0

    if "price_overview" in app_json[str(appID)]['data'] and app_json[str(appID)]['data']['price_overview']['currency'] == 'USD':
        return app_json[str(appID)]['data']['price_overview']['initial'] / 100.0

    if app_json[str(appID)]['data']['type'] == "video":
        nPacks = len(app_json[str(appID)]['data']['packages'])
        if nPacks > 0:
            subID = app_json[str(appID)]['data']['packages'][0]
            subJSON = json.load(urllib.urlopen("http://store.steampowered.com/api/packagedetails/?packageids=" + str(subID) + "&cc=us"))
            # If the subJSON returns "success" false that means that most probably
            # that package is unavailable to buy in the US, return local price of
            # app_json
            if subJSON[str(subID)]['success'] == False:
                return app_json[str(appID)]['data']['price_overview']['initial'] / 100.0

            ### For movies the possible packages are always:
            # A. Rent package; B. Buy package; C. Multi-items package
            # A and C may be missing, but there will always be at least B
            # Or A may be missing but there may be multiple C
            # But if you take the first package, and ends up being rent,
            # you can get the buy price by getting "individual" from the "price"
            # dict, and get the rent price by getting "initial" from that same dict.
            # This will only work if there are A, B and C or only A and B. Won't
            # work if there are B and C since individual will have the price
            # of the second package on "individual" instead.

            # If there is just a single package then there is only B and we
            # can safely use "initial" or "individual" price
            if nPacks == 1:
                return subJSON[str(subID)]['data']['price']['initial'] / 100.0
            # If there are 2 packages we should check if it's actually
            # a C or just that the first was an A and this a B
            elif nPacks > 1:
                subID2 = app_json[str(appID)]['data']['packages'][1]
                subJSON2 = json.load(urllib.urlopen("http://store.steampowered.com/api/packagedetails/?packageids=" + str(subID2) + "&cc=us"))
                if len(subJSON2[str(subID2)]['data']['apps']) > 1:
                    # This means this is a C, we will return "initial" price
                    # from first package then
                    return subJSON[str(subID)]['data']['price']['initial'] / 100.0
                else:
                    # This means this is actually a B and the first was an A
                    # We can either return this "initial" or the first's "individual"
                    return subJSON2[str(subID2)]['data']['price']['initial'] / 100.0

    else:
        # This means the given appID isn't a movie so we can simply take the
        # first package and get the price of it
        subID = app_json[str(appID)]['data']['packages'][0]
        subJSON = json.load(urllib.urlopen("http://store.steampowered.com/api/packagedetails/?packageids=" + str(subID) + "&cc=us"))
        # If the subJSON returns "success" false that means that most probably
        # that package is unavailable to buy in the US, return local price of
        # app_json
        if subJSON[str(subID)]['success'] == False:
            return app_json[str(appID)]['data']['price_overview']['initial'] / 100.0
        return subJSON[str(subID)]['data']['price']['initial'] / 100.0



def loop_package(subID):
    appCards = u"-"
    subJson = json.load(urllib.urlopen("http://store.steampowered.com/api/packagedetails/?packageids=" + str(subID)))

    for element in subJson[str(subID)]['data']['apps']:
        appJson = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(element['id'])))

        # print appJson[str(element['id'])]['data']['name']
        if 'categories' in appJson[str(element['id'])]['data'] != False:
            for category in appJson[str(element['id'])]['data']['categories']:
                if category['id'] == 29:
                    # print appJson[str(element['id'])]['data']['name'] + ": Yes"
                    #appCards = "&#10084;"
                    appCards = u"\u2764"
                    return appCards

    return appCards



def retrieve_bundles(plain):
    #array = []
    string = "https://api.isthereanydeal.com/v01/game/bundles/us/?key=" + ITADKey + "&limit=-1&expired=1&plains=" + plain
    jsonFile = json.load(urllib.urlopen(string))
    appBundled = 0
    for element in jsonFile['data'][plain]['list']:
        # This method is deprecated
        #to_push = "This game was featured in a bundle called " + "'" + element['title'] + "'" + " by " + "'" + element['bundle'] + "'" + ". Do you want to add it to the bundle count? "
        #array.append(to_push)
        if not element["bundle"] in invalidBundles:
            #print "Following bundle:", element['bundle'], "not in the list"
            appBundled += 1

    if appBundled > 0:
        appBundled = "[" + str(appBundled) + "](" + jsonFile['data'][plain]['urls']['bundles'] + ")"
    else:
        appBundled = "0"
    return appBundled

try:
    print "Type '!done' without the quotes to stop the program. Type '!next' to go to the next tier. Type '!package' or '!pack' to go into the package mode. Use '!next' to move to the next tier and '!cancel' to cancel an ongoing search. You can confirm by either typing 'Yes', 'Y' or simply pressing Enter will do; type 'No' or 'N' when you are prompted with something you weren't searching for. None of the commands are case sensitive, so it doesn't matter if you type it with capital letters or not. The same goes for game's titles, but be careful with stuff like - : etc in the title or typing 2 instead of II, the program won't be able to find the game in those cases."

    SteamAppsjson = json.load(urllib.urlopen("http://api.steampowered.com/ISteamApps/GetAppList/v002/"))
    confirmation = 0
    while True:
        tierInp = raw_input("Enter the number of tiers: ")
        if tierInp.isdigit():
            break
        else:
            print "You didn't enter a number"
    tierDict = {}
    for number in range(1, int(tierInp) + 1):
        tierDict[str(number)] = []
    current_tier = 1
    packInp = None
    retailPrice = 0

    while True:
        gamesInp = raw_input("Enter the game's title: ")

        if gamesInp.lower() == '!done':
            break
        elif gamesInp.lower() == "!next":
            print "Moving to the next tier"
            current_tier += 1
            continue
        elif gamesInp.lower() == '!package' or gamesInp.lower() == "!pack":
            packInp = raw_input("Enter the base game title to search for the packages its in: ")

        for app in SteamAppsjson['applist']['apps']:
            if packInp != None and packInp.lower() in app['name'].lower().encode('ascii', 'ignore'):
                appID = app['appid']
                #tryAppID = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(appID) + "&l=english"))

                #if tryAppID[str(appID)]['success'] == False or tryAppID[str(appID)]['data']['type'] == "movie" or tryAppID[str(appID)]['data']['type'] == "demo" or tryAppID[str(appID)]['data']['type'] == "mod":
                    #print "AppID", appID, "wasn't valid, skipping to the next one"
                    #continue

                print "There is an app with ID " + str(appID) + " called '" + app['name'].encode('ascii','ignore') + "'"
                confirmation2 = 0
                while True:
                    if confirmation2 == 1:
                        confirmation = 1
                        # print "if confirmation2, value confirmation: " + str(confirmation)
                        break
                    elif confirmation2 == 2:
                        confirmation = 2
                        # print "elif confirmation2, value confirmation: " + str(confirmation)
                        break
                    confInp = raw_input("Is this what you are looking for? (Y/n) ")

                    if  confInp.lower() == 'yes' or confInp.lower() == 'y' or confInp.lower() == '':
                        # print "Yep, '" + app['name'] + "' is there, the appID is:", app['appid']
                        confirmation3 = 0
                        appID = app['appid']
                        tryAppID = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(appID) + "&l=english"))
                        if tryAppID[str(appID)]['success'] == False:
                            print "The game you picked is either removed from the store or not available in your region"
                            confirmation = 2
                            packInp = None
                            break
                        for element in range(len(tryAppID[str(appID)]['data']['package_groups'][0]['subs'])):
                            if confirmation2 == 1:
                                confirmation = 1
                                # print "if confirmation3, value confirmation2: " + str(confirmation2)
                                break
                            elif confirmation2 == 2:
                                confirmation = 2
                                # print "elif confirmation3, value confirmation2: " + str(confirmation2)
                                break
                            subID = tryAppID[str(appID)]['data']['package_groups'][0]['subs'][element]['packageid']
                            subJson = json.load(urllib.urlopen("http://store.steampowered.com/api/packagedetails/?packageids=" + str(subID) + "&cc=us"))
                            if subJson[str(subID)]['success'] == True:
                                # if confirmation2 == 1:
                                #     break

                                while True:
                                    print "This game is in a package with ID " + str(subID) + " called: '" + subJson[str(subID)]['data']['name'].encode('ascii', 'ignore') + "'"
                                    subConfInp = raw_input("Is this what you are looking for? (Y/n) ")
                                    if subConfInp.lower() == 'yes' or subConfInp.lower() == 'y' or subConfInp.lower() == '':
                                        plain = itad_sub_plain(subID)
                                        appName = unicode(subJson[str(subID)]['data']['name'])
                                        # Price ITAD way, DEPRECATED
                                        #appPrice = retrieve_price(itad_sub_plain(subID))
                                        # Price sub US way
                                        if "price" in subJson[str(subID)]['data'] != False:
                                            appPrice = subJson[str(subID)]['data']['final'] / 100.0
                                        else: appPrice = 0
                                        if appPrice == 0:
                                            appPrice = u"-"
                                        else:
                                            retailPrice += appPrice
                                            appPrice = u"[$%s](%s%s)" % (str(appPrice), "https://isthereanydeal.com/#/page:game/info?plain=", plain)

                                        # Price Steam way
                                        # if subJson[str(subID)]['data'].get("price") != None:
                                        #     appPrice = float(subJson[str(subID)]['data']['price']['initial'])/100
                                        #     retailPrice += appPrice
                                        #     appPr"type" in ice = "$" + str(appPrice)
                                        # else:
                                        #     appPrice = "-"

                                        appCards = loop_package(subID)
                                        appReviews = u"-"

                                        appBundled = retrieve_bundles(plain)
                                        # This method is deprecated
                                        #retrievedBundles = retrieve_bundles(itad_sub_plain(subID))
                                        #for element in retrievedBundles[0]:
                                        #    bundleInp = raw_input(element)
                                        #    if bundleInp.lower() == "yes" or bundleInp.lower() == "y":
                                        #        appBundled += 1
                                        #    elif bundleInp.lower() == "no" or bundleInp.lower() == "n":
                                        #        continue
                                        #    elif bundleInp.lower() == "!cancel":
                                        #        break

                                        #if appBundled > 0:
                                        #    appBundled = "[" + str(appBundled) + "](" + retrievedBundles[1] + ")"
                                        #else:
                                        #    appBundled = "0"

                                        confirmation2 = 1
                                        packInp = None
                                        break

                                    elif subConfInp.lower() == "no" or subConfInp.lower() == "n":
                                        break
                                    elif subconfInp.lower() == '!cancel':
                                        confirmation2 = 2
                                        packInp = None
                                        break
                                    else:
                                        print "Sorry, something you typed is not right, the valid commands are 'yes', 'y', 'no' or 'n'. They are case insensitive."
                                        packInp = None
                    elif confInp.lower() == 'no' or confInp.lower() == 'n':
                        break
                    elif confInp.lower() == '!cancel':
                        confirmation = 2
                        break
                    else:
                        print "Sorry, something you typed is not right, the valid commands are 'yes', 'y', 'no' or 'n'. They are case insensitive."

                if confirmation == 2:
                    break

                if confirmation == 1:
                    # appName = unicodedata.normalize('NFC', tryAppID[str(appID)]['data']['name']).encode('ascii','ignore')
                    appLink = "**[" + appName + "](http://store.steampowered.com/sub/" + str(subID) + "/)**"
                    # appPrice = float(tryAppID[str(appID)]['data']['price_overview']['initial'])/100
                    # appPrice = "$" + str(appPrice)
                    # appCards = "-"
                    # for cardsinfo in tryAppID[str(appID)]['data']['categories']:
                    #     if cardsinfo['id'] == 29:
                    #         appCards = '&#10084;'
                    #         break
                    # if appCards == "-":
                    #     cookieOpener = urllib2.build_opener(urllib2.HTTPCookieProcessor())
                    #     trySCE = cookieOpener.open("http://www.steamcardexchange.net/index.php?gamepage-appid-" + str(appID))
                    #     if not "Game not found!" in trySCE.read():
                    #         appCards = '&#10084;'
                    # appReviews = steam_rating(appID)
                    # appReviews = retrieve_percentage(itad_plain(appID))
                    # appReviews = str(appReviews) + "%"
                    # appBundled = 0
                    # for element in retrieve_bundles(itad_plain(appID)):
                    #     bundleInp = raw_input(element)
                    #     if bundleInp.lower() == "yes" or bundleInp.lower() == "y":
                    #         appBundled += 1
                    #     elif bundleInp.lower() == "no" or bundleInp.lower() == "n":
                    #         continue
                    #     elif bundleInp.lower() == "!cancel":
                    #         break

                    # print appName
                    # print appLink
                    # print appPrice
                    # print appCards
                    # print appReviews
                    # print appBundled
                    # print "GAME | REVIEWS | CARDS | BUNDLED | RETAIL PRICE"
                    # print ":- | :-: | :-: | :-: | :-:"
                    # print appLink, " | ", appReviews, " | ", appCards, " | ", str(appBundled), " | ", appPrice
                    to_push = appLink + " | " + appReviews + " | " + appCards + " | " + appBundled + " | " + appPrice
                    if current_tier == 1:
                        tierDict['1'].append(to_push)
                    elif current_tier == 2:
                        tierDict['2'].append(to_push)
                    elif current_tier == 3:
                        tierDict['3'].append(to_push)
                    elif current_tier == 4:
                        tierDict['4'].append(to_push)
                    elif current_tier == 5:
                        tierDict['5'].append(to_push)
                    break

            elif gamesInp.lower() in app['name'].lower().encode('ascii', 'ignore'):
                appID = app['appid']
                #tryAppID = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(appID) + "&l=english"))

                #if tryAppID[str(appID)]['success'] == False or tryAppID[str(appID)]['data']['type'] == "movie":
                    # print "AppID", appID, "wasn't valid, skipping to the next one"
                    #continue

                print "There is an app with ID " + str(appID) + " called '" + app['name'].encode('ascii','ignore') + "'"

                while True:
                    confInp = raw_input("Is this what you are looking for? (Y/n) ")

                    if  confInp.lower() == 'yes' or confInp.lower() == 'y' or confInp.lower() == '':
                        # print "Yep, '" + app['name'] + "' is there, the appID is:", app['appid']
                        appID = app['appid']
                        tryAppID = json.load(urllib.urlopen("http://store.steampowered.com/api/appdetails/?appids=" + str(appID) + "&l=english"))
                        if tryAppID[str(appID)]["success"] == False:
                            print "The game you picked is either removed from the store or not available in your region"
                            confirmation = 2
                            break
                        confirmation = 1
                        break
                    elif confInp.lower() == 'no' or confInp.lower() == 'n':
                        break
                    elif confInp.lower() == '!cancel':
                        confirmation = 2
                        break
                    else:
                        print "Sorry, something you typed is not right, the valid commands are 'yes', 'y', 'no' or 'n'. They are case insensitive."

                if confirmation == 2:
                    break

                if confirmation == 1:
                    appName = unicode(tryAppID[str(appID)]['data']['name'])
                    appLink = "**[" + appName + "](http://store.steampowered.com/app/" + str(appID) + "/)**"
                    # Price ITAD way, DEPRECATED
                    #appPrice = retrieve_price(itad_plain(appID))
                    plain = itad_plain(appID)
                    appPrice = price_from_pack(tryAppID, appID)
                    if appPrice == 0:
                        appPrice = u"-"
                    else:
                        retailPrice += appPrice
                        appPrice = u"[$%s](%s%s)" % (str(appPrice), "https://isthereanydeal.com/#/page:game/info?plain=", plain)

                    #Price Steam way
                    # if tryAppID[str(appID)]['data'].get("price_overview") != None and tryAppID[str(appID)]['data']['is_free'] == False:
                    #     appPrice = float(tryAppID[str(appID)]['data']['price_overview']['initial'])/100
                    #     retailPrice += appPrice
                    #     appPrice = "$" + str(appPrice)
                    # else:
                    #     appPrice = "-"

                    appCards = u"-"
                    if 'categories' in tryAppID[str(appID)]['data'] != False:
                        for cardsinfo in tryAppID[str(appID)]['data']['categories']:
                            if cardsinfo['id'] == 29:
                                if tryAppID[str(appID)]['data']['type'] == "dlc":
                                    appCards = u'[\u2764](http://www.steamcardexchange.net/index.php?gamepage-appid-' + unicode(tryAppID[str(appID)]['data']['fullgame']['appid']) + ")"
                                    break
                                else:
                                    appCards = u'[\u2764](http://www.steamcardexchange.net/index.php?gamepage-appid-' + unicode(appID) + ")"
                                    break
                    if appCards == "-":
                        cookieOpener = urllib2.build_opener(urllib2.HTTPCookieProcessor())
                        trySCE = cookieOpener.open("http://www.steamcardexchange.net/index.php?gamepage-appid-" + str(appID))
                        if not "Game not found!" in trySCE.read():
                            appCards = u'[\u2764](http://www.steamcardexchange.net/index.php?gamepage-appid-' + str(appID) + ")"
                    appReviews = steam_rating(appID)
                    # appReviews = retrieve_percentage(itad_plain(appID))
                    # if appReviews != "-":
                    #     appReviews = str(appReviews) + "%"
                    appBundled = retrieve_bundles(plain)
                    # This method is DEPRECATED
                    #retrievedBundles = retrieve_bundles(itad_plain(appID))
                    #for element in retrievedBundles[0]:
                    #    bundleInp = raw_input(element)
                    #    if bundleInp.lower() == "yes" or bundleInp.lower() == "y":
                    #        appBundled += 1
                    #    elif bundleInp.lower() == "no" or bundleInp.lower() == "n":
                    #        continue
                    #    elif bundleInp.lower() == "!cancel":
                    #        break

                    #if appBundled > 0:
                    #    appBundled = "[" + str(appBundled) + "](" + retrievedBundles[1] + ")"
                    #else:
                    #    appBundled = "0"

                    # print appName
                    # print appLink
                    # print appPrice
                    # print appCards
                    # print appReviews
                    # print appBundled
                    # print "GAME | REVIEWS | CARDS | BUNDLED | RETAIL PRICE"
                    # print ":- | :-: | :-: | :-: | :-:"
                    # print appLink, " | ", appReviews, " | ", appCards, " | ", str(appBundled), " | ", appPrice
                    # print type(appLink)
                    # print type(appReviews)
                    # print type(appCards)
                    # print type(appBundled)
                    # print type(appPrice)
                    # print appLink + " | "
                    # print appReviews + " | "
                    # print appCards + " | "
                    # print appBundled + " | "
                    # print " | " + appPrice
                    to_push = appLink + " | " + appReviews + " | " + appCards + " | " + appBundled + " | " + appPrice
                    if current_tier == 1:
                        tierDict['1'].append(to_push)
                    elif current_tier == 2:
                        tierDict['2'].append(to_push)
                    elif current_tier == 3:
                        tierDict['3'].append(to_push)
                    elif current_tier == 4:
                        tierDict['4'].append(to_push)
                    elif current_tier == 5:
                        tierDict['5'].append(to_push)
                    break

        if confirmation < 1:
            print "Sorry, '" + gamesInp + "' is not in the games list, are you sure you typed the title correctly?"

        confirmation = 0

    file = open('chartSG.txt', 'w')
    if len(tierDict) == 1:
        file.write("GAME | RATINGS | CARDS | BUNDLED | RETAIL PRICE\n")
        file.write(":- | :-: | :-: | :-: | :-:\n")
        print "GAME | RATINGS | CARDS | BUNDLED | RETAIL PRICE"
        print ":- | :-: | :-: | :-: | :-:"
        for element in tierDict["1"]:
            file.write(element.encode("UTF-8") + "\n")
            print element.encode('ascii', 'replace')
        print "Retail: $" + str(retailPrice)
        file.write("\nRetail: $" + str(retailPrice))
    else:
        for number in range(1, len(tierDict) + 1):
            file.write("\nGAME | RATINGS | CARDS | BUNDLED | RETAIL PRICE\n")
            file.write(":- | :-: | :-: | :-: | :-:\n")
            print
            print "GAME | RATINGS | CARDS | BUNDLED | RETAIL PRICE"
            print ":- | :-: | :-: | :-: | :-:"
            for element in tierDict[str(number)]:
                file.write(element.encode("UTF-8") + "\n")
                print element.encode('ascii', 'replace')
        print "Retail: $" + str(retailPrice)
        file.write("\nRetail: $" + str(retailPrice))

    file.close()
    print "\nA new text file called 'chartSG' has been created here in this folder, just open it and the table will be there available to be copied\n'"
    raw_input("Press Enter or close the window to exit")
except:
    print "\nThere was an error, please copy this (or make a screenshot) and give it to Sighery if you don't want the guy to go crazy trying to figure out what happened. Also try to remember the last thing you typed or did before it blowed up, it would help a lot."
    logging.exception('')
    raw_input("Press Enter or close the window to exit")
