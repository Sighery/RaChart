import re
import json
from datetime import datetime

import requests


import exceptions

class Bundle(object):
	def __init__(self, link):
		self.notes = None
		self.title = None
		self.description = None
		self.ntiers = 0
		self.bundle_info = {
			"title": None,
			"link": link,
			"description": None,
			"availability": {
				"from": None,
				"until": None
			},
			"ntiers": None,
			"tiers": []
		}



	def prices_in_tier(self, tier, cents = True):
		'''
			Returns the prices in a given tier in the following format:
		{
			"CAD": int,
			"USD": int,
			"GBP": int,
			"EUR": int
		}

			The `tier` argument is an int, starting from 1 (so tier 1 will match
		to index 0 on the array of tiers). If you pass it a tier that doesn't
		exist it will raise a bundles_api.exceptions.TierIndexError exception.

			If `cents` is set to True the return dictionary will have the prices
		set in cents, otherwise it will be `cents` / 100
		'''

		tier -= 1

		try:
			prices = self.bundle_info['tiers'][tier]['prices']

			if cents is True:
				return prices

			else:
				for item in prices:
					prices[item] /= 100

				return prices

		except IndexError:
			raise exceptions.TierIndexError('Tier index out of range') from None



	def ngames_in_tier(self, tier):
		'''
			Returns an int of the number of games on given tier.

			`tier` is an int that starts at 1 (so tier 1 will be index 0 on the
		tiers array). If you try to pass it a tier that doesn't exist it will
		raise a bundles_api.exceptions.TierIndexError exception.
		'''

		tier -= 1

		try:
			return len(self.bundle_info['tiers'][tier]['games'])
		except IndexError:
			raise exceptions.TierIndexError('Tier index out of range') from None



	def games_in_tier(self, tier):
		'''
			Returns a list of dictionaries with the following format:
		{
			"name": string,
			"id": int,
			"type": int
		}

			`type` is (for now) 0 for app, and 1 for sub.
			`tier` is an int that starts at 1 (so tier 1 will be index 0 on the
		tiers array). If you try to pass it a tier that doesn't exist it will
		raise a bundles_api.exceptions.TierIndexError exception.
		'''

		tier -= 1
		games_array = []

		try:
			bundle_tier = self.bundle_info['tiers'][tier]['games']

			for game in bundle_tier:
				games_array.append({
					'name': game['title'],
					'id': game['id'],
					'type': game['type']
				})

			return games_array

		except IndexError:
			raise exceptions.TierIndexError('Tier index out of range') from None



	def available_from(self):
		'''
			Returns a string on the following format (date in UTC):
			"YYYY-MM-DDTHH:MM:SSZ"
		'''

		return self.bundle_info['availability']['valid_from']



	def available_from_day(self):
		'''
			Returns a string on the following format (date UTC): "YYYY-MM-DD"
		'''

		if self.bundle_info['availability']['valid_from'] is None:
			return None

		matches = re.findall(
			"(\d\d\d\d-\d\d-\d\d)",
			self.bundle_info['availability']['valid_from']
		)

		if len(matches) == 1:
			return matches[0]
		else:
			return None



	def available_from_hour(self):
		'''
			Returns a string on the following format (hour UTC): "HH:MM:SS"
		'''

		if self.bundle_info['availability']['valid_from'] is None:
			return None

		matches = re.findall(
			"\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)",
			self.bundle_info['availability']['valid_from']
		)

		if len(matches) == 1:
			return matches[0]
		else:
			return None



	def available_until(self):
		'''
			Returns a string on the following format (date in UTC):
			"YYYY-MM-DDTHH:MM:SSZ"
		'''

		return self.bundle_info['availability']['valid_until']



	def available_until_day(self):
		'''
			Returns a string on the following format (date UTC): "YYYY-MM-DD"
		'''

		if self.bundle_info['availability']['valid_until'] is None:
			return None

		matches = re.findall(
			"(\d\d\d\d-\d\d-\d\d)",
			self.bundle_info['availability']['valid_until']
		)

		if len(matches) == 1:
			return matches[0]
		else:
			return None



	def available_until_hour(self):
		'''
			Returns a string on the following format (hour UTC): "HH:MM:SS"
		'''

		if self.bundle_info['availability']['valid_until'] is None:
			return None

		matches = re.findall(
			"\d\d\d\d-\d\d-\d\dT(\d\d:\d\d:\d\d)",
			self.bundle_info['availability']['valid_until']
		)

		if len(matches) == 1:
			return matches[0]
		else:
			return None





# TODO: FIX
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
		else:
			raise exceptions.InvalidLink("Not a valid link")

		super().__init__(link)

		self.restrictions = {}

		self.API_link = None
		self.type = None
		self.__get_API_link()
		self.__import_info()
		self._restrictions()



	def __get_API_link(self):
		matches = re.findall("[https\:\/\/www\.bundlestars\.com\/|www\.bundlestars\.com\/|bundlestars\.com\/]+[a-z]{2}\/(bundle|promotions)+\/(.+)", self.link)

		if matches[0][0] == "bundle":
			self.type = "bundle"
			self.API_link = "https://www.bundlestars.com/api/products/" + matches[0][1]

		elif matches[0][0] == "promotions":
			self.type = "promotion"
			self.API_link = "https://www.bundlestars.com/api/promotions/" + matches[0][1]



	def __import_info(self):
		req = requests.get(self.API_link)

		# 404 error now if promotion is over
		if req.status_code == 404:
			raise exceptions.BundleIsOver('Bundle promotion is over') from None

		self.json_file = req.json()
		self.ntiers = len(self.json_file['bundles'])

		# Get availability info
		self.__parse_time()

		#



	def __parse_time(self):
		self.bundle_info['availability']['from'] = datetime.strptime(
			self.json_file['availability']['valid_from'],
			"%Y-%m-%dT%H:%M:%S.%fZ"
		)

		self.bundle_info['availability']['until'] = datetime.strptime(
			self.json_file['availability']['valid_until'],
			"%Y-%m-%dT%H:%M:%S.%fZ"
		)



	def _restrictions(self):
		if self.notes is None:
			self.notes = []


		self.restrictions['keys_for'] = []

		for tier in range(self.tiers):
			for index, game in enumerate(self.bundle_info['bundles'][tier]['games']):

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
