import os
import re
import json
import requests
from bs4 import BeautifulSoup
from bundles_api import BundleStars

class Thread(object):
	def __init__(self):
		self.bundle_title = None
		self.bundle_link = None
		self.bundle_description = None
		self.bundle_notes = None
		self.bundle_chart = None
		self.RaChartEnhancer = u"##**Wondering what games you already own from \
this bundle? There's an extension/UserScript for that! It's called the \
[RaChart\u2122 Enhancer](https://www.steamgifts.com\
/discussion/riOvr/userscript-rachart-enhancer), \
created by our fellow SG member [Sighery](https://www.steamgifts.\
com/user/Sighery)!**\n\n> This script enhances the charts by showing \
you which games you already own from the ones in it. If you own it, \
the row will be highlighted with a green color.\n\n##**For more \
information and to Download, please click here for the \
[RaChart\u2122 Enhancer](https://www.steamgifts.com/discussion\
/riOvr/userscript-rachart-enhancer)!**"
		self.thanks = None
		self.final = None

	def set_basic_info(self, title, link, desc = None):
		self.bundle_title = title
		self.bundle_link = link
		if desc is not None:
			self.bundle_description = desc

	def set_notes(self, note_array = None):
		if note_array is not None:
			self.bundle_notes = note_array

	def set_chart(self, chart):
		self.bundle_chart = chart

	def set_thanks(self, thanks_array = None):
		if thanks_array is not None:
			self.thanks = thanks_array

	def format(self):
		self.final = ""
		spacing = "\n\n---\n\n"

		if self.bundle_title is not None and self.bundle_link is not None:
			self.final += '#[%s](%s)' % (self.bundle_title, self.bundle_link)

		if self.bundle_description is not None:
			self.final += "\n> %s" % self.bundle_description

		if self.bundle_notes is not None:
			notes = "%sNotes:\n\n" % spacing

			for note in self.bundle_notes:
				notes += "* %s\n" % note

			self.final += notes

		if self.bundle_chart is not None:
			self.final += "%s%s" % (spacing, self.bundle_chart)

		if self.RaChartEnhancer is not None:
			self.final += "%s%s" % (spacing, self.RaChartEnhancer)

		if self.thanks is not None:
			thanks = ""
			for index, nick in enumerate(self.thanks):
				if index == len(self.thanks) - 1:
					thanks += "Thanks %s!"
				else:
					thanks += "Thanks %s! "

			self.final += "%s%s" % (spacing, thanks)

		return self.final



# TODO: RaChart class
class RaChart(object):
	def __init__(self):
		self.tiers = None
		self.chart = {
		"title": None,
		"link": None,
		"description": None,
		"availability": {
			"from_day": None,
			"from_hour": None, # UTC Timezone
			"until_day": None,
			"until_hour": None # UTC Timezone
		},
		"ntiers": None
		}
		self.itad_key = None
		self.notes = None
		self.games_plains = None
		self.invalid_bundles = ["DailyIndieGame", "Chrono.gg", "Ikoid",
		"Humble Mobile Bundle", "PlayInjector", "Vodo", "Get Loaded",
		"GreenMan Gaming", "IndieAmmoBox", "MacGameStore", "PeonBundle",
		"Select n'Play", "StackSocial", "StoryBundle", "Bundle Central",
		"Cult of Mac", "GOG", "Gram.pl", "Indie Fort", "IUP Bundle", "Paddle",
		"SavyGamer", "Shinyloot", "Sophie Houlden", "Unversala", "Indie Game Stand"]
		self.bManual = False
		self.bapi_sg = False
		self.sce_api_json = None

		# The following values are used for requests to SG
		self.user_agent = 'RaChart/0.1 - github.com/RaChart'


		# We try to open the 'keys.json' file here to get ITAD's API key
		if os.path.isfile("keys.json"):
			with open("keys.json") as keys_file:
				keys_file = json.load(keys_file)

				if 'ITAD_API_KEY' in keys_file:
					self.itad_key = keys_file['ITAD_API_KEY']
				else:
					print("No key for ITAD's API was found, you'll have to \
calculate the bundled times for each game yourself.")

		else:
			print("No keys.json was found on this directory, you'll have to \
manually get the bundled count for each game.")

		# Try the SG API to see if it's online, if it is get the online invalid
		#bundles list
		try:
			sg_api_req = requests.get("http://api.sighery.com/isup.html",
			timeout = 2, headers = {
				"user-agent": self.user_agent
			})

			self.bapi_sg = True

			sg_api_req = requests.get("http://api.sighery.com/RaChart/InvalidBundles.json",
			timeout = 5, headers = {
				"user-agent": self.user_agent
			})

			if sg_api_req.status_code == 200:
				self.invalid_bundles = sg_api_req.json()
		except:
			pass

		# Try the SCE API to see if it's online, if it is get the JSON and store
		#it
		try:
			sce_api = requests.get("http://api.steamcardexchange.net/GetBadgePrices.json",
			timeout = 10, headers = {
				"user-agent": self.user_agent
			})

			if sce_api.status_code == 200:
				self.sce_api_json = sce_api.json()
		except:
			pass


	def split_array(self, big_array, wanted_size):
		'''
			This function is only used to create sublists of size 50 each since
		that is the limitation for ITAD's method used on the 'get_plains'
		function. It should NOT be used from outside the class itself.
		'''
		arrays = []
		last_index = 0
		division = None

		if len(big_array)/wanted_size > len(big_array) // wanted_size:
			division = (len(big_array) // wanted_size) + 1
		else:
			division = len(big_array) // wanted_size

		for time in range(division):
			arrays.append(big_array[last_index:last_index + wanted_size])
			last_index += wanted_size

		return arrays


	def get_list_games(self):
		'''
			This function loops over every game for the bundle and creates a
		list with valid values to pass to the 'get_plains' function.
		'''

		games = []
		for tier in self.chart['tiers']:
			for game in tier['games']:
				if game['sub']:
					games.append("sub/%d" % game['id'])
				else:
					games.append("app/%d" % game['id'])

		return games

	def get_plains(self, games_list):
		'''
			This function will get the plains for the given list of games and set
		it back into the 'itad_plain' field for each game.

			The games_list argument should be the kind of list returned by the
		'get_list_games' function since that's the format used for this API
		method.

			This method NEEDS a key for ITAD's API to work, without it it will
		simply return None.
		'''

		if self.itad_key is None:
			return None

		sub_lists = None
		if len(games_list) > 50:
			sub_lists = split_array(games_list, 50)

		jsonf = None
		if sub_lists is None:
			req = requests.get("https://api.isthereanydeal.com/v01/game/\
plain/id/?key=%s&shop=steam&ids=%s" % (self.itad_key, ",".join(games_list)))
			jsonf = req.json()
		else:
			for index, sub_list in enumerate(range(len(sub_lists))):
				if index is 0:
					req = requests.get("https://api.isthereanydeal.com/v01/game/\
plain/id/?key=%s&shop=steam&ids=%s" % (self.itad_key, ",".join(sub_list)))
					jsonf = req.json()
				else:
					req = requests.get("https://api.isthereanydeal.com/v01/game/\
plain/id/?key=%s&shop=steam&ids=%s" % (self.itad_key, ",".join(sub_list)))
					jsonf.update(req.json())

		self.game_plains = []
		for tier in self.chart['tiers']:
			for game in tier['games']:
				app_string = None
				if game['sub']: app_string = "sub/%d" % game['id']
				else: app_string = "app/%d" % game['id']

				game['itad_plain'] = jsonf['data'][app_string]
				if jsonf['data'][app_string] is not None:
					self.game_plains.append(jsonf['data'][app_string])


	def get_bundled(self, game_plains = None):
		if game_plains is None:
			game_plains = ",".join(self.game_plains)

		req = requests.get("https://api.isthereanydeal.com/v01/game/bundles/\
us/?key=%s&limit=-1&expired=1&plains=%s" % (self.itad_key, game_plains))
		jsonf = req.json()

		for tier in self.chart['tiers']:
			for game in tier['games']:
				app_bundled = 0
				itad_plain = game['itad_plain']
				if itad_plain in jsonf['data']:
					for bundle in jsonf['data'][itad_plain]['list']:
						if bundle['bundle'] not in self.invalid_bundles and bundle['title'] != self.chart['title']:
							app_bundled += 1
					game['itad_bundled'] = app_bundled
					game['itad_bundled_link'] = jsonf['data'][itad_plain]['urls']['bundles']
					game['itad_index_link'] = jsonf['data'][itad_plain]['urls']['game']



	def set_basic_info(self, title = None, link = None, desc = None, nTiers = 1,
	available_from_day = None, available_from_hour = None,
	available_until_day = None, available_until_hour = None):
		'''
			This function will be used to set many of the "basic" information of
		a bundle such as the title, link and number of tiers.
			Dates should follow the following format: YYYY-MM-DD
			Hours should be from the UTC timezone and follow the following
		format: HH:MM:SS
			Both dates and hours MUST be strings.
		'''

		if title is not None:
			self.chart['title'] = title
		if link is not None:
			self.chart['link'] = link
		if desc is not None:
			self.chart['description'] = desc
		if available_from_day is not None:
			self.chart['availability']['from_day'] = available_from_day
		if available_from_hour is not None:
			self.chart['availability']['from_hour'] = available_from_hour
		if available_until_day is not None:
			self.chart['availability']['until_day'] = available_until_day
		if available_until_hour is not None:
			self.chart['availability']['until_hour'] = available_until_hour

		self.chart['ntiers'] = nTiers
		self.chart['tiers'] = []
		for tier in range(nTiers):
			self.chart['tiers'].append({})

	def set_tier_info(self, games, prices, tier = 1):
		'''
			This function will set the games for each tier in the chart dict.
		For now those games will have only very basic info and we'll start
		populating them later with the other methods. Tiers start from 1 instead
		of 0.

			The games argument should be an array of dictionaries with the
		following syntax:
			```
				# If any of the keys has no value it should be None
				{
				"id": 4321, # Must be an int
				"sub": False, # Must be a boolean
				"app_type": "movie/game/dlc/etc", # Must be a string
				"name": "game-title", # Must be a string
				"steam_link": "steam.store.link", # Must be a string
				"itad_index_link": "itad.index.link", # Must be a string
				"itad_bundled_link": "itad.bundled.link", # Must be a string
				"sce_link": "steam.card.exchange.link", # Must be a string
				"itad_plain": "itad-plain", # Must be a string
				"cards": True, # Must be a boolean
				"achievements": True, # Must be a boolean
				"singleplayer": True, # Must be a boolean
				"multiplayer": False, # Must be a boolean
				"coop": True, # Must be a boolean
				"steam_cloud": True, # Must be a boolean
				"windows_support": False, # Must be a boolean
				"linux_support": True, # Must be a boolean
				"mac_support": False, # Must be a boolean
				"controller_support": "0/1/2", # 0 none, 1 partial, 2 full
				"price": 1299, # Must be an int (cents value)
				"currency": "USD", # Must be a string
				"sg_free": False, # Must be a boolean
				"itad_bundled": 4, # Must be an int
				"genres": ["Action", "RPG"], # Must be a list of strings
				"rating_percentage": 99, # Must be an int
				"rating_total": 28312 # Must be an int
				}
			```
			Even though there will ALWAYS be these keys, the values for them
		may be set to None instead of the actual type they should hold, if that's
		the case you should simply treat it as a False and code your program to
		expect a key having value None.

			The prices argument should be a dictionary with the following syntax:
			```
				{
				"EUR": 1499, # Must be an int (cents value)
				"USD": 1399, # Must be an int (cents value)
				"GBP": 1299, # Must be an int (cents value)
				"CAD": 1199 # Must be an int (cents value)
				}
			```
			Any key will work for currency, but only the ones listed above have
		the correct format for them. If the currency isn't one of the listed
		there the program will simply display it as 'price CURRENCY' where
		'price' is the float value of the price and 'CURRENCY' the key.
		'''

		tier -= 1
		self.chart['tiers'][tier]['price'] = prices

		# We add all of the needed keys in case there weren't there
		for game in games:
			if 'app_type' not in game: game['app_type'] = None
			if 'name' not in game: game['name'] = None
			if 'steam_link' not in game: game['steam_link'] = None
			if 'itad_index_link' not in game: game['itad_index_link'] = None
			if 'itad_bundled_link' not in game: game['itad_bundled_link'] = None
			if 'sce_link' not in game: game['sce_link'] = None
			if 'itad_plain' not in game: game['itad_plain'] = None
			if 'cards' not in game: game['cards'] = None
			if 'achievements' not in game: game['achievements'] = None
			if 'singleplayer' not in game: game['singleplayer'] = None
			if 'multiplayer' not in game: game['multiplayer'] = None
			if 'coop' not in game: game['coop'] = None
			if 'steam_cloud' not in game: game['steam_cloud'] = None
			if 'windows_support' not in game: game['windows_support'] = None
			if 'linux_support' not in game: game['linux_support'] = None
			if 'mac_support' not in game: game['mac_support'] = None
			if 'controller_support' not in game: game['controller_support'] = None
			if 'price' not in game: game['price'] = None
			if 'currency' not in game: game['currency'] = None
			if 'itad_bundled' not in game: game['itad_bundled'] = None
			if 'genres' not in game: game['genres'] = []
			if 'rating_percentage' not in game: game['rating_percentage'] = None
			if 'rating_total' not in game: game['rating_total'] = None
			if 'sg_free' not in game: game['sg_free'] = None

		self.chart['tiers'][tier]['games'] = games

	def price_from_pack(self, app_json, appID):
		'''
			This function is mainly for use within the class, you shouldn't use
		it individually.
		'''
		## Some games actually have a price, but since they also have a demo
		# Steam will count them as free, even though they are not. That's why we
		# check all the packages containing the game, if some package isn't free
		# too that means it's one of those weird free demo cases (check app 253510)
		# After thinking it is not a good idea since there is no difference between
		# actual free apps and that case. So we'll keep an array with those free
		# demo games for now.
		special_games = [253510]

		if "packages" not in app_json[str(appID)]['data']:
			return 0

		if (app_json[str(appID)]['data']['is_free'] and "price_overview" in app_json[str(appID)]['data'] == False) and not appID in special_games:
			return 0

		if "price_overview" in app_json[str(appID)]['data'] and app_json[str(appID)]['data']['price_overview']['currency'] == 'USD':
			return [
				app_json[str(appID)]['data']['price_overview']['initial'],
				'USD'
			]

		if app_json[str(appID)]['data']['type'] == "video":
			nPacks = len(app_json[str(appID)]['data']['packages'])
			if nPacks > 0:
				subID = app_json[str(appID)]['data']['packages'][0]
				req = requests.get("http://store.steampowered.com/api/\
packagedetails?packageids=%d&cc=us" % subID)
				subJSON = req.json()
				del req
				# If the subJSON returns "success" false that means that most probably
				# that package is unavailable to buy in the US, return local price of
				# app_json
				if subJSON[str(subID)]['success'] == False:
					return [
						app_json[str(appID)]['data']['price_overview']['initial'],
						app_json[str(appID)]['data']['price_overview']['currency']
					]

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
					return [
					subJSON[str(subID)]['data']['price']['initial'],
					subJSON[str(subID)]['data']['price']['currency']
					]
				# If there are 2 packages we should check if it's actually
				# a C or just that the first was an A and this a B
				elif nPacks > 1:
					subID2 = app_json[str(appID)]['data']['packages'][1]
					req = requests.get("http://store.steampowered.com/api/\
packagedetails?packageids=%d&cc=us" % subID)
					subJSON2 = req.json()
					del req
					if len(subJSON2[str(subID2)]['data']['apps']) > 1:
						# This means this is a C, we will return "initial" price
						# from first package then
						return [
						subJSON[str(subID)]['data']['price']['initial'],
						subJSON[str(subID)]['data']['price']['currency']
						]
					else:
						# This means this is actually a B and the first was an A
						# We can either return this "initial" or the first's "individual"
						return [
						subJSON2[str(subID2)]['data']['price']['initial'],
						subJSON2[str(subID2)]['data']['price']['currency']
						]

		else:
			# This means the given appID isn't a movie so we can simply take the
			# first package and get the price of it
			subID = app_json[str(appID)]['data']['packages'][0]
			req = requests.get("http://store.steampowered.com/api/packagedetails\
?packageids=%d&cc=us" % subID)
			subJSON = req.json()
			del req
			# If the subJSON returns "success" false that means that most probably
			# that package is unavailable to buy in the US, return local price of
			# app_json
			if subJSON[str(subID)]['success'] == False:
				return [
				app_json[str(appID)]['data']['price_overview']['initial'],
				app_json[str(appID)]['data']['price_overview']['currency']
				]
			return [
				subJSON[str(subID)]['data']['price']['initial'],
				subJSON[str(subID)]['data']['price']['currency']
			]

	def sce_api_cards(self, appid):
		if str(appid) in self.sce_api_json:
			return True
		else:
			return False


	def steam_api_request(self, game_dict, game_id = None, type_id = 0):
		'''
			This function will be used for the requests to Steam's store API, it
		only allows one appID or subID at a time. `game_dict` should be the game
		dictionary from the 'games' key in the chart JSON. `game_id` and `type_id`
		can both be taken from there and it will allow it to assign the data
		faster. If by any case you want to manually set them, set `game_dict` to
		None.
		`game_id` must be an int. type_id can be either 0 for app or 1 for sub.
		If no type_id argument is provided the function will assume you want the
		app and not the package.

			It will return None if the app or package success equals False.
		That would mean that the app/package is inexistant or not available
		in the user's region.
		'''

		api_links = {
		"0": "http://store.steampowered.com/api/appdetails/?appids=%d",
		"1": "http://store.steampowered.com/api/packagedetails/?packageids=%d&cc=us"
		}

		if game_dict is None and (type_id != 0 or type_id != 1):
			raise ValueError("Not a valid type_id")

		URL = None
		if game_dict is not None:
			if game_dict['sub']:
				URL = api_links["1"] % game_dict['id']
			else:
				URL = api_links["0"] % game_dict['id']
		else:
			URL = api_links[str(type_id)] % game_id

		# We will get the correct game_dict here in case it wasn't provided
		if game_dict is None:
			for tier in self.chart['tiers']:
				for game in tier['games']:
					if game_dict['id'] == game_id and game_dict['sub'] == type_id:
						game_dict = game

		game_id = game_dict['id']
		if game_dict['sub']: type_id = 1
		else: type_id = 0

		req = requests.get(URL)
		if req.status_code == 403 or req.status_code == 404:
			return None
		jsonf = req.json()
		if jsonf[str(game_id)]['success'] == False:
			return None

		strID = str(game_id)
		# This works the same for packages and apps requests
		game_dict['name'] = jsonf[strID]['data']['name']
		game_dict['windows_support'] = jsonf[strID]['data']['platforms']['windows']
		game_dict['linux_support'] = jsonf[strID]['data']['platforms']['linux']
		game_dict['mac_support'] = jsonf[strID]['data']['platforms']['mac']

		# This is specific for package requests
		if type_id:
			game_dict['steam_link'] = "http://store.steampowered.com/sub/\
%s" % strID
			game_dict['price'] = jsonf[strID]['price']['initial']
			game_dict['currency'] = jsonf[strID]['price']['currency']

		else:
			game_dict['app_type'] = jsonf[strID]['data']['type']
			game_dict['steam_link'] = "http://store.steampowered.com/app/\
%s" % strID
			# We loop over the categories array to get the useful categories
			for category in jsonf[strID]['data']['categories']:
				if category['id'] == 1: game_dict['multiplayer'] = True
				elif category['id'] == 2: game_dict['singleplayer'] = True
				elif category['id'] == 9: game_dict['coop'] = True
				elif category['id'] == 18: game_dict['controller_support'] = 1
				elif category['id'] == 22: game_dict['achievements'] = True
				elif category['id'] == 23: game_dict['steam_cloud'] = True
				elif category['id'] == 28: game_dict['controller_support'] = 2
				elif category['id'] == 29: game_dict['cards'] = True

			if self.sce_api_json is not None:
				if self.sce_api_cards(strID):
					game_dict['sce_link'] = "http://www.steamcardexchange.net/index.\
php?gamepage-appid-%s" % strID
			elif game_dict['cards']:
				game_dict['sce_link'] = "http://www.steamcardexchange.net/index.\
php?gamepage-appid-%s" % strID

			# We get all the genres here
			for genre in jsonf[strID]['data']['genres']:
				game_dict['genres'].append(genre['description'])

			# We set the price using the 'price_from_pack' function
			price = self.price_from_pack(jsonf, game_id)
			if price is not 0:
				game_dict['price'] = price[0]
				game_dict['currency'] = price[1]

			ratings = self.steam_rating(game_id)
			if ratings is not None:
				game_dict['rating_percentage'] = ratings[0]
				game_dict['rating_total'] = ratings[1]


			if self.bapi_sg is not False:
				sg_free = self.check_free_api(game_id, type_id)
			else:
				sg_free = self.check_free_manually(game_dict['name'], game_id, type_id)

			if sg_free is not None:
				game_dict['sg_free'] = sg_free


	def set_notes(notes_array):
		'''
			This is for setting notes like: "X game cannot be activated in
		Germany". The notes_array should be an array of strings with all the
		notes you want to add.
		'''

		if self.notes is None:
			self.notes = []

		for note in notes_array:
			self.notes.append(note)

	def steam_rating(self, appID):
		'''
			Function to get the (old overall) Steam ratings of a game, only
		one appID at a time. SubIDs won't work since packages have no reviews.

			It will return an array with the percentage first and total as ints
		or None otherwise. The percentage is for the percentage of positive
		reviews from the total.
		'''

		req = requests.get("http://store.steampowered.com/appreviews/%d\
?filter=summary&language=all&review_type=all&purchase_type=all" % appID)
		jsonf = req.json()

		# Case to handle removed games that have no store page anymore
		# or simply don't exist
		if jsonf['success'] == 2:
			return None

		soup = BeautifulSoup(jsonf['review_score'], 'html.parser')
		percentage = soup.find_all('span')[1]

		# In case the game has no reviews or hasn't been released yet:
		if percentage['data-store-tooltip'] == "No user reviews":
			return None

		percentage = re.findall("(\d+)%", percentage['data-store-tooltip'])[0]
		total = soup.find_all('span')[0]
		total = total.string.replace(",", "")
		total = re.findall('(\d+)\s', total)[0]

		return [int(percentage), int(total)]

	def check_free_api(self, game_id, type_id):
		'''
			Function to check if a game is considered "free" on SteamGifts
		automatically through the unofficial SG API hosted on api.sighery.com

			Will return None if the request was unsuccessful, or True or False
		if it was, depending on whether the given type and id is free or not.
		'''

		url = "http://api.sighery.com/SteamGifts/Interactions/IsFree/?id=%d&type=%d" % (game_id, type_id)

		try:
			req = requests.get(url, timeout = 5, headers = {
				"user-agent": self.user_agent
			})

			if req.status_code != 200:
				return None
			else:
				json_file = req.json()
				return json_file['free']
		except:
			return None


	def check_free_manually(self, gametitle, gameid, typeid):
		'''
			Function to check if a game is considered "free" on SteamGifts and
		thus ungiftable. There is no public list or easy way to find out, the only
		way is trying to gift a game and not finding it in the list of giftable
		games, so this function does exactly that.

			The arguments are: 'gametitle' for the title of the game, best to use
		the exact name shown in the Steam store; 'gameid' for Steam's ID; and
		'typeid' that can either be 0 for app or 1 for package.

			This function REQUIRES the PHPSESSID cookie so if that cookie isn't
		provided this function will return None and no automatic CV count will
		be made.

			SG will forbid us from making requests if our User-Agent isn't a
		browser or similar, so we're faking it here by using the string stored
		in `self.user_agent`. Having an invalid PHPSESSID apparently causes
		redirections.
		'''

		if self.phpsessid is None:
			return None

		if typeid == 0:
			typeid = "app"
		elif typeid == 1:
			typeid = "sub"
		else:
			return None

		url = "https://www.steamgifts.com/ajax.php"
		payload = {'search_query': gametitle,
		'page_number': 1,
		'do': 'autocomplete_game'}
		cookie = {'PHPSESSID': self.phpsessid}
		usera = {'user-agent': self.user_agent}

		req = requests.post(url, data = payload, cookies = cookie, headers = usera)
		soup = BeautifulSoup(req.json()['html'], 'html.parser')
		parents = soup.find_all(class_ = 'table__column--width-fill')

		for element in parents:
			title = element.find_all(class_ = 'table__column__heading')[0].string
			link = element.find_all(class_ = 'table__column__secondary-link')[0]['href']
			matches = re.findall('http\:\/\/store\.steampowered\.com\/(app|sub)\/(\d+)', link)

			if len(matches) == 0:
				continue

			id_type = matches[0][0]
			id_game = matches[0][1]

			if id_type == typeid and int(id_game) == gameid:
				return False

		return True

	def create_json(self):
		'''
			This function is used to create the JSON file of the chart once we
		are done filling up the chart.
		'''

		if os.path.exists('bundles') is False:
			os.mkdir('bundles')

		file_name = os.path.join(os.getcwd(), 'bundles', self.chart['title'] + '.json')

		with open(file_name, 'w') as outfile:
			json.dump(self.chart, outfile, sort_keys = True)


#TODO: Clean logs and pass to RaChart class
def sg_format_chart(chart):
	prices_format = {
	"EUR": "%s€",
	"USD": "$%s",
	"GBP": "£%s",
	"CAD": "CAD$%s"
	}

	if os.path.exists('bundles') is False:
		os.mkdir('bundles')

	file_name = os.path.join(os.getcwd(), 'bundles', chart['title'] + '.txt')
	outfile = open(file_name, 'w')

	retail_total = 0
	cv_total = 0

	for index_tier, tier in enumerate(chart['tiers']):
		tier_total = 0
		tier_cv = 0

		print(index_tier)
		print(tier)
		outfile.write("**Tier %d: " % (index_tier + 1))
		print("**Tier %d: " % (index_tier + 1))
		for index_prices, price in enumerate(sorted(tier['price'].keys())):
			print(index_prices)
			print(price)
			if index_prices == len(tier['price'].keys()) - 1:
				print("if, ultimo price")
				if price in prices_format:
					print("if, price in prices_format")
					outfile.write(prices_format[price] % str(tier['price'][price]))
					print(prices_format[price] % str(tier['price'][price]))
					outfile.write("**\n\n")
					print("**\n\n")
				else:
					print("else, no price in prices_format")
					outfile.write("%s %s**\n\n" % (str(tier['price'][price]), price))
					print("%s %s**\n\n" % (str(tier['price'][price]), price))
			else:
				print("else, no ultimo price")
				if price in prices_format:
					print("if, price in prices_format")
					outfile.write(prices_format[price] % str(tier['price'][price]))
					print(prices_format[price] % str(tier['price'][price]))
					outfile.write(" / ")
					print(" / ")
				else:
					print("else, no price in prices_format")
					outfile.write("%s %s / " % (str(tier['price'][price]), price))
					print("%s %s / " % (str(tier['price'][price]), price))

		outfile.write("GAME | RATINGS | CARDS | BUNDLED | RETAIL PRICE\n:- | :-: | :-: | :-: | :-:\n")
		for index_games, game in enumerate(tier['games']):
			print(index_games)
			print(game)
			game_link = "**[%s](%s)**" % (game['name'], game['steam_link'])
			if game['app_type'] != "game" and game['app_type'] is not None:
				game_link += " (%s)" % game['app_type'].upper()
			print(game_link)

			if game['rating_percentage'] is not None and game['rating_total'] is not None:
				ratings = "%d%% of *%s Reviews*" % (game['rating_percentage'], "{:,}".format(game['rating_total']))
				print(ratings)

			cards = None
			if game['cards']:
				cards = "[%s](%s)" % ("\u2764", game['sce_link'])
			else:
				cards = "-"
			print(cards)

			bundled = None
			if game['itad_bundled']:
				bundled = "[%d](%s)" % (game['itad_bundled'], game['itad_bundled_link'])
			else:
				bundled = "0"
			print(bundled)

			retail = None
			if game['price'] is not None and game['currency'] is not None:
				if game['currency'] in prices_format:
					retail = prices_format[game['currency']] % str(game['price'])
					retail = "[%s](%s)" % (retail, game['itad_index_link'])
				else:
					retail = "[%s %s](%s)" % (game['price'], game['currency'], game['itad_index_link'])
			print(retail)

			if index_games == len(tier['games']) - 1:
				print("if, index_games is len -1")
				outfile.write("%s | %s | %s | %s | %s\n\n" % (game_link, ratings, cards, bundled, retail))
				print("%s | %s | %s | %s | %s\n\n" % (game_link, ratings, cards, bundled, retail))
			else:
				print("else, index_games is not len -1")
				outfile.write("%s | %s | %s | %s | %s\n" % (game_link, ratings, cards, bundled, retail))
				print("%s | %s | %s | %s | %s\n" % (game_link, ratings, cards, bundled, retail))

			tier_total += game['price']
			retail_total += game['price']
			if game['sg_free'] is False:
				tier_cv += 0.15 * game['price']
				cv_total += 0.15 * game['price']

		if chart['ntiers'] > 1:
			outfile.write("Tier %d retail: $%s\n" % str(tier_total))
			outfile.write("CV: %s\n\n" % str(tier_cv))

	if chart['ntiers'] > 1:
		outfile.write("Total retail: $%s\n" % str(retail_total))
		outfile.write("Total CV: %s\n\n" % str(cv_total))

	print('A file called %s.txt was created in the \'bundles\' folder' % chart['title'])

	outfile.close()
