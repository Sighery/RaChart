import re
import requests
import json

class BundleStars(object):
    def __init__(self, link):
        if re.match("^bundlestars.com", link):
            link = "https://www." + link
        elif re.match("^www.bundlestars.com", link):
            link = "https://" + link

        self.link = link
        self.API_link = ""
        self.type = ""
        self.jsonf = {}
        self.tiers = 0

    def get_API_link(self):
        matches = re.findall("[https\:\/\/www\.bundlestars\.com\/|www\.bundlestars\.com\/|bundlestars\.com\/]+[a-z]{2}\/(bundle|promotions)+\/(.+)", self.link)

        if matches[0][0] == "bundle":
            self.type = "bundle"
            self.API_link = "https://www.bundlestars.com/api/products/" + matches[0][1]

        elif matches[0][0] == "promotions":
            self.type = "promotion"
            self.API_link = "https://www.bundlestars.com/api/promotions/" + matches[0][1]


    def import_json(self):
        self.get_API_link()
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
        return self.jsonf['bundles'][tier]['price']

    def ngames_in_tier(self, tier):
        tier -= 1
        count = 0
        for game in self.jsonf['bundles'][tier]['games']:
            if game['display'] != False:
                count += 1

        return count

    def games_in_tier(self, tier):
        tier -= 1
        games_json = {}
        apps = []
        subs = []
        for game in self.jsonf['bundles'][tier]['games']:
            if game['display'] != False:
                if game['steam']['sub'] == False:
                    apps.append(game['steam']['id'])
                else:
                    subs.append(game['steam']['id'])

        if len(apps) > 0: games_json['app'] = apps
        if len(subs) > 0: games_json['sub'] = subs

        return games_json

    def available_from(self):
        # Returns the following format: YYYY-MM-DDTHH:MM:SS.SSSZ Hour is UTC
        return self.jsonf['availability']['valid_from']

    def available_from_day(self):
        # Returns a string with the following format: YYYY-MM-DD
        matches = re.findall("(\d\d\d\d-\d\d-\d\d)", self.jsonf['availability']['valid_from'])
        return matches[0]

    def available_from_hour(self):
        matches = re.findall("\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)", self.jsonf['availability']['valid_from'])
        return matches[0]

    def available_until(self):
        # Returns the following format: YYYY-MM-DDTHH:MM:SS.SSSZ Hour is UTC
        return self.jsonf['availability']['valid_until']

    def available_until_day(self):
        # Returns a string with the following format: YYYY-MM-DD
        matches = re.findall("(\d\d\d\d-\d\d-\d\d)", self.jsonf['availability']['valid_until'])
        return matches[0]

    def available_until_hour(self):
        matches = re.findall("\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)", self.jsonf['availability']['valid_until'])
        return matches[0]
