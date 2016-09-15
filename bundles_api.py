import re
import requests
import json

class BundleStars(object):
    def __init__(self, link):
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
        return len(self.jsonf['bundles'][tier]['games'])

    def games_in_tier(self, tier):
        tier -= 1
        games_json = {}
        apps = []
        subs = []
        for game in self.jsonf['bundles'][tier]['games']:
            if game['steam']['sub'] == False:
                apps.append(game['steam']['id'])
            else:
                subs.append(game['steam']['id'])

        if len(apps) > 0: games_json['app'] = apps
        if len(subs) > 0: games_json['sub'] = subs

        return games_json
