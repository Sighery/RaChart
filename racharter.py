import logging
from bundles_api import *
from bundle_thread import *

# This variable will be used to log whether the user wants to use manual or auto
bManual = False

## This part of the code will be the introductory message that asks what mode
## do you want to use,
while True:
	input_type = input("Welcome, please type whether you want to use the 'auto' \
or 'manual' mode (use 'info' for more information on what each does): ")
	if input_type.lower() == "manual":
		bManual = True
		break
	elif input_type.lower() == "auto": break
	elif input_type.lower() == "info":
		print("The program has two modes, automatic, choosen by typing 'auto' \
which allows you to simply give it the link of the bundle and the program \
itself takes care of doing all the work and manual mode, choosen by typing \
'manual' which will rely on you to do all the work like setting the amount of \
tiers, prices, what games in each tier, and so on.")
	else:
		print("You didn't enter a valid argument, try again.")
try:
	if bManual is False:
		bundle_link = None

		while True:
			input_link = input("You picked the auto mode, please provide the link \
to the bundle: ")
			if "bundlestars.com" in input_link:
				bundle_link = input_link
				break


		bstars = BundleStars(bundle_link)
		rc = RaChart()
		rc.set_basic_info(title = bstars.show_title(), link = bundle_link,
		desc = bstars.show_desc(), available_from_day = bstars.available_from_day(),
		available_from_hour = bstars.available_from_hour(),
		available_until_day = bstars.available_until_day(),
		available_until_hour = bstars.available_until_hour(), nTiers = bstars.tiers)

		for tier in range(bstars.tiers):
			rc.set_tier_info(tier = tier, games = bstars.games_tier(tier),
			prices = bstars.tier_prices(tier))


		for tier in rc.chart['tiers']:
			for game in tier['games']:
				rc.steam_api_request(game)


		rc.get_plains(rc.get_list_games())
		rc.get_bundled()
		rc.create_json()
		sg_format_chart(rc.chart)
		print(bstars.notes)


	else:
		# TODO: Need the code to handle manual mode,
		# make everything but the chart optional
		pass
except:
	print("There was an error, please copy or make a screenshot of this and \
send it to Sighery.")
	logging.exception('')
	input("Press Enter or close the window to exit.")
