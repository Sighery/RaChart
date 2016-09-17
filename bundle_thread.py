import re
import json
import requests

class Thread(object):
    def __init__(self):
        self.bundle_title = ""
        self.bundle_link = ""
        self.bundle_description = ""
        self.bundle_notes = []
        self.bundle_chart = ""
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
        self.thanks = []
        self.final = ""

    def set_title(self, title, link, desc = ""):
        self.bundle_title = title
        self.bundle_link = link
        self.bundle_description = desc

    def set_notes(self, note_array):
        self.bundle_notes = note_array

    def set_chart(self, chart):
        self.bundle_chart = chart

    def set_thanks(self, thanks_array):
        self.thanks = thanks_array

    def format(self):
        separator = "\n\n---\n\n"

        if self.bundle_title != "" or self.bundle_link == "" or self.bundle_description == "":
            self.final += "#[" + self.bundle_title + "](" + self.bundle_link + ")\n> "

            if self.bundle_description != "":
                self.final += self.bundle_description

        if len(self.bundle_notes) > 0:
            notes = separator + "Notes:\n\n"

            for note in self.bundle_notes:
                notes += "* " + note + "\n"

            self.final += notes

        if self.bundle_chart != "":
            self.final += separator + self.bundle_chart

        self.final += separator + self.RaChartEnhancer

        if len(self.thanks) > 0:
            thanks = ""
            for nick in self.thanks:
                thanks += "Thanks " + nick + "! "

            self.final += separator + thanks

        return self.final


# TODO: RaChart class
class RaChart(object):
    def __init__(self):
        self.tiers = 0
        self.chart = {}

    def set_tiers(self, tiers):
        self.tiers = tiers

    def set_games_tier(self, tier, games):
        pass
        #for game in games:
        #    chart[str(tier)]
