## Introduction

This repository will hold everything related to bundle threads in [SteamGifts](https://www.steamgifts.com) and the known as *RaChart* layout that I worked/I am working on. Please note that this is all work in progress.

For now only `createTableSG.py` is released, but please note: it was my first program so the code and logic is a mess, it works, but a mess nevertheless. I'm basically in the works of rewritting it using OOP, so you would be better waiting for that. Once I release that new version, the old one will be pretty much legacy and discontinued.

Right now I'm the only active developer for all you see, even though [Devotee](https://github.com/Michounet) also made some improvements to the `createTableSG.py` program. Feel free to chime in and help me developing stuff if you feel like it, you can contact me through here or [Steam](http://steamcommunity.com/id/Sighery), I'm usually more active on the latter.

## How to use it

The program right now which creates charts is the `createTableSG.py`. You'll need Python 2.7 to run it (**Python 3 won't work**). If you don't have Python 2.7 installed or don't know how/want to install it check the *releases* tab. I compile it and turn it into an exe by using the `py2exe` library. You will only need to unpack it and run `createTableSG.exe`. **Please do NOT remove ANY of the other files. They are needed libraries, necessary for the program to run**.

Once you have either the `.py` or `.exe` release you'll need to create a file called `keys.json` in the same directory as the program and fill it with your [IsThereAnyDeal API key](https://isthereanydeal.com/apps/new/) (you'll only need to fill the *App name* and *About* fields, random info works since it's automated) using the following syntax:

```
{"ITAD": "Key-here"}
```

Once you have `keys.json` set up you are ready to run the program. You'll have an introductory message explaining you how it works and how to use it. You'll also be told what to do in case there was any error.

## Future version

`racharter.py` is an updated, work-in-progress version of the old `createTableSG.py` program, meant to replace it. It is done using Python3, and will feature both automatic and manual modes.

`bundles_api.py` is meant to provide an API of multiple API sites, by automating fetching the data from bundles so a person doesn't have to input the data on what games are included manually. However, for the moment only BundleStars is partially supported, since it provides an undocumented API it uses to generate its own front-end pages.

`bundles_api.py` and `bundle_thread.py` are still work-in-progress too, and even though some of the classes in it work, they may change at any time, so don't base your programs or scripts on them. Basic usage for them is similar to this:

```
from bundles_api import BundleStars

# Create an object from the BundleStars class and initialize it with the link to the bundle
bs = BundleStars("https://www.bundlestars.com/en/bundle/born-2-race-3-bundle")

# Import the JSON with info about the bundle from their API
bs.import_json()

# Once loaded we can start using methods and check member variables to get info
## This would print the total number of tiers
print(bs.tiers)
## We can get the prices for each tier using this method
## and passing it the tier as an argument (starting on 1, not 0)
print(bs.tier_prices(1))
```

Either Python 2.7 or Python 3 are supported for these libraries. Check the files themselves to know which member variables or methods they hold and how to use them. `bundles_api.py` right now only has the `BundleStars` class, which only works for BundleStars' bundles (not Pick & Mix promotions). `bundle_thread.py` has both the `Thread` and `RaChart` classes, but for now only the first is functional. In the future `RaChart` will be a subclass of `Thread` and you'll only need to interact with the latter.

## Support

**NO support whatsoever will be given for the moment unless I gave you the program personally.** This is because all of this is work in progress and I can't code while constantly writing documentation and answering questions.
