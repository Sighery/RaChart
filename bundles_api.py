import re
import requests
import json

class Bundle(object):
    def __init__(self, link):
        self.link = link
        self.notes = None
        self.tiers = 0
        self.jsonf = {
        "title": None,
        "link": None,
        "description": None,
        "availability": {
            "from_day": None,
            "from_hour": None,
            "until_day": None,
            "until_hour": None
        },
        "ntiers": None,
        "tiers": []
        }

    def show_title(self):
        return self.jsonf['title']

class BundleStars(object):
    def __init__(self, link):
        if re.match("^bundlestars.com", link):
            link = "https://www." + link
        elif re.match("^www.bundlestars.com", link):
            link = "https://" + link
        elif re.match("^http://www.bundlestars.com", link):
            link = "https%s" % link[4:]
        elif re.match("^https://www.bundlestars.com", link):
            pass
        else: raise ValueError("Not a valid link")

        self.link = link
        self.API_link = None
        self.type = None
        self.notes = None
        self.jsonf = {}
        self.tiers = 0
        self.get_API_link()
        self.import_info()
        self.restrictions()

    def get_API_link(self):
        matches = re.findall("[https\:\/\/www\.bundlestars\.com\/|www\.bundlestars\.com\/|bundlestars\.com\/]+[a-z]{2}\/(bundle|promotions)+\/(.+)", self.link)

        if matches[0][0] == "bundle":
            self.type = "bundle"
            self.API_link = "https://www.bundlestars.com/api/products/" + matches[0][1]

        elif matches[0][0] == "promotions":
            self.type = "promotion"
            self.API_link = "https://www.bundlestars.com/api/promotions/" + matches[0][1]


    def import_info(self):
        req = requests.get(self.API_link)
        self.jsonf = req.json()
        self.tiers = len(self.jsonf['bundles'])

    def show_title(self):
        return self.jsonf['name']

    def show_desc(self):
        return self.jsonf['desc']

    def show_tiers(self):
        return self.tiers

    def tier_prices(self, tier):
        tier -= 1
        # Code for returning float value
        # prices = self.jsonf['bundles'][tier]['price']
        # for key in prices.keys():
        #     prices[key] = prices[key] / 100.0
        # return prices
        return self.jsonf['bundles'][tier]['price']

    def ngames_tier(self, tier):
        tier -= 1
        count = 0
        for game in self.jsonf['bundles'][tier]['games']:
            if game['display'] != False:
                count += 1

        return count

    def games_tier(self, tier):
        tier -= 1
        games_array = []
        for game in self.jsonf['bundles'][tier]['games']:
            if game['display'] != False:
                games_array.append({"id": game['steam']['id'], "sub": game['steam']['sub']})

        return games_array

    def restrictions(self):
        if self.notes is None:
            self.notes = []

        keys_for = "You will receive keys for: "
        regions = []
        for tier in range(self.tiers):
            for index, game in enumerate(self.jsonf['bundles'][tier]['games']):
                if game['deliver']:
                    type_app = None
                    if game['steam']['sub']:
                        type_app = "sub"
                    else:
                        type_app = "app"
                    if tier == 0 and index == 0:
                        if game['steam']['id'] is not None and game['steam']['sub'] is not None:
                            keys_for += "[%s](http://store.steampowered.com/%s/%d)" % (game['name'], type_app, game['steam']['id'])
                        else: keys_for += game['name']
                    else:
                        if game['steam']['id'] is not None and game['steam']['sub'] is not None:
                            keys_for += ", [%s](http://store.steampowered.com/%s/%d)" % (game['name'], type_app, game['steam']['id'])
                        else: keys_for += ", %s" % game['name']

                    if len(game['regions_excluded']) > 0:
                        region_restricted = "%s cannot be activated in the following places: " % game['name']
                        for index_region, region in enumerate(game['regions_excluded']):
                            if index_region == len(game['regions_excluded']) - 1:
                                region_restricted += "%s (%s)" % (region['name'], region['code'])
                            else:
                                region_restricted += "%s (%s), " % (region['name'], region['code'])
                        regions.append(region_restricted)

        self.notes.append(keys_for)
        for element in regions:
            self.notes.append(element)


    def available_from(self):
        # Returns the following format: YYYY-MM-DDTHH:MM:SS.SSSZ Hour is UTC. T and Z are simply those letters
        return self.jsonf['availability']['valid_from']

    def available_from_day(self):
        # Returns a string with the following format: YYYY-MM-DD
        if self.jsonf['availability']['valid_from'] is None:
            return None

        matches = re.findall("(\d\d\d\d-\d\d-\d\d)", self.jsonf['availability']['valid_from'])
        return matches[0]

    def available_from_hour(self):
        # Returns a string with the following format: HH:MM:SS
        if self.jsonf['availability']['valid_from'] is None:
            return None

        matches = re.findall("\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)", self.jsonf['availability']['valid_from'])
        return matches[0]

    def available_until(self):
        # Returns the following format: YYYY-MM-DDTHH:MM:SS.SSSZ Hour is UTC. T and Z are simply those letters
        return self.jsonf['availability']['valid_until']

    def available_until_day(self):
        # Returns a string with the following format: YYYY-MM-DD
        if self.jsonf['availability']['valid_until'] is None:
            return None

        matches = re.findall("(\d\d\d\d-\d\d-\d\d)", self.jsonf['availability']['valid_until'])
        return matches[0]

    def available_until_hour(self):
        # Returns a string with the following format: HH:MM:SS
        if self.jsonf['availability']['valid_until'] is None:
            return None

        matches = re.findall("\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)", self.jsonf['availability']['valid_until'])
        return matches[0]
