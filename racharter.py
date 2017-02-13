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
		print("\n\nNOTES FOR THIS BUNDLE (IF ANY):")
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

## This part of the code will be the introductory message that asks what mode
## do you want to use,
#         while True:
#             input_type = input("Welcome, you are using the program to create \
# charts, please type whether you want to use the 'auto' or 'manual' mode. Use \
# 'info' for more information on what each does. ")
#             if input_type.lower() == "manual":
#                 self.bManual = True
#                 break
#             elif input_type.lower() == "auto":
#                 break
#             elif input_type.lower() == "info":
#                 print("The program has to modes, automatic, choosen by typing \
# 'auto' which allows you to simply give it the link of the bundle and the program \
# itself takes care of doing all the work and manual mode, choosen by typing \
# 'manual' which will rely on you to do all the work like setting the amount of \
# tiers, prices, what games in each tier, and so on.")
#             else: print("You didn't enter a valid argument, try again.")
#
#     def manual_input(self):
#         '''
#             This function will be used for getting things like the title, link,
#         description, number of tiers and prices for each tier manually. Once
#         that info is gathered it should use the same methods to set that info
#         and create the chart that the automatic way uses.
#         '''
#
#         print("You picked the manual mode. You'll now be asked how many tiers \
# there are, and then you'll be asked the price of the tier, please use the \
# following syntax so the program can correctly guess the price and currency: \
# \n\t12.99 USD\nUse EUR for euros, USD for US dollars, CAD for Canadian dollars\
# and GBP for British pounds, the number can be integer or decimal, doesn't \
# matter. Once you set the number of tiers and price you'll be asked about \
# the games in each tier.")
#
#         tier_input = None
#         while True:
#             tier_input = input("Enter the number of tiers: ")
#             if tier_input.isdigit():
#                 tier_input = int(tier_input)
#                 break
#             else:
#                 print("You didn't enter a number, try again.")
#
#         price_input = None
#         while True:
#             price_input = input("Enter the price for the tier: ")
#             price_input = price_input.strip()
#             space = price_input.index(" ")
#             print(space)
#             valid_currencies = ['USD', 'EUR', 'CAD', 'GBP']
#             print(price_input[space + 1:].upper())
#             if price_input[space + 1:].upper() in valid_currencies:
#                 try:
#                     price = float(price_input[:space])
#                     currency = price_input[space + 1:].upper()
#                     break
#                 except ValueError as error:
#                     print("You didn't enter a valid number for the price")
#             else:
#                 print("You didn't enter a valid currency")
