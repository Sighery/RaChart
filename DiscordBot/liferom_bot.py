import re
import json
import requests
from bs4 import BeautifulSoup

class LiferomBot():
    def __init__(self):
        self.commands = {"hello": "Prints a hello world message, useful for debugging purposes",
        "help": "Shows a list of all available commands, or teaches you how to use a specific one. Syntax: '!help' or '!help other_command'",
        "owner": "Tells you who the owner of the server is",
        "staff": "Tells you who the staff members are",
        "rating": "It tells you the Steam ratings for given appID. Use: '!rating appID_number'",
        "uid": "[ADMIN] Get the unique ID of an user",
        "unick": "[ADMIN] Get the nickname of an user from his ID (only if they are logged on the server)",
        "blacklist": "[STAFF] Blacklists an user so it can't use any more bot commans. Syntax: '!blacklist argument username'. Valid arguments are: add, remove, check and list. Add adds an user to the blacklist, remove removes them, check checks if they are in it and list lists all the blacklisted users. Username **is not** needed when using list."}
        self.keys = {}
        self.mail = ""
        self.password = ""
        self.blacklist = []
        self.staff = []
        self.admin = []
        self.mod = []
        #self.ITADKey = ""

        # Import the options from the external json file
        with open("LiferomBot.json") as keys_file:
            self.keys = json.load(keys_file)
            self.mail = self.keys['mail']
            self.password = self.keys['password']
            self.blacklist = self.keys['blacklist']
            self.staff = self.keys['staff']
            self.admin = self.keys['admin']
            self.mod = self.keys['mod']



    def check_lst(self, value, lst):
        if value in lst:
            return True
        else:
            return False

        # Possible values for list:
        #    * 0 for blacklist
        #    * 1 for staff
        #    * 2 for admin
        #    * 3 for mod

        # This code is DEPRECATED
        # if lst == 0:
        #     if value in self.blacklist: return True
        #     else: return False
        # elif lst == 1:
        #     if value in self.staff: return True
        #     else: return False
        # elif lst == 2:
        #     if value in self.admin: return True
        #     else: return False
        # elif lst == 3:
        #     if value in self.mod: return True
        #     else: return False



    def save_json(self):
        with open("LiferomBot.json", "w") as keys_file:
            keys_file.write(json.dumps(self.keys))



    def uid(self, message):
        user_nick = message.content
        if len(user_nick) < 6: return "%s, you didn't pass an username" % message.author.mention
        user_nick = user_nick[5:]

        user_id = message.server.get_member_named(user_nick)
        if user_id == None: return "%s, no user named that way" % message.author.mention

        user_id = user_id.id
        return "ID for %s is: %s" % (user_nick, user_id)


    def own_uid(self, message, nick):
        user_id = message.server.get_member_named(nick)
        if user_id == None: return None

        user_id = user_id.id
        return user_id



    def unick(self, message, uid):
        nick = message.server.get_member(uid)
        nick = nick.name + "#" + str(nick.discriminator)
        return nick



    def black_list(self, message):
        print("blacklist function.")
        if len(message.content) < 12:
            print("blacklist function. First conditional (if)")
            return "%s, you didn't pass an argument" % message.author.mention
        if len(message.content) == 15:
            print("blacklist function. Second conditional (if)")
            if message.content[11:] == "list":
                print("blacklist function. Second conditional (if). Nested conditional (if)")
                count = 0
                string = "%s, the following users are on the blacklist right now: " % message.author.mention
                print("blacklist function. Second conditional (if). Nested conditional (if). string equals %s" % string)
                for userid in self.blacklist:
                    print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for)")
                    nick = self.unick(message, userid)
                    print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Nick equals %s" % nick)
                    if count == len(self.blacklist) - 1:
                        print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (if)")
                        if nick != None:
                            print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (if). Nested conditional (if)")
                            string += nick
                        else:
                            print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (if). Nested conditional (else)")
                            string += userid
                    else:
                        print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (else)")
                        if nick != None:
                            print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (else). Nested conditional (if)")
                            string += nick + ", "
                        else:
                            print("blacklist function. Second conditional (if). Nested conditional (if). Loop (for). Conditional (else). Nested conditional (else)")
                            string += userid
                return string

            else:
                print("blacklist function. Second conditional (if). Nested conditional (else)")
                return "%s, that's not a valid syntax, check help" % message.author.mention

        else:
            print("blacklist function. Second conditional (else)")
            matches = re.findall("\!blacklist\s(add|remove|check|list)\s(.+)", message.content)
            print("blacklist function. Second conditional (else). Matches equals %s" % str(matches))
            if len(matches) == 0:
                print("blacklist function. Second conditional (else). Nested conditional (if)")
                return "%s, that's not a valid syntax, check !help" % message.author.mention

        argument = matches[0][0]
        print("blacklist function. Argument equals %s" % argument)
        user = matches[0][1]
        print("blacklist function. User equals %s" % user)

        if argument == "add":
            print("blacklist function. Third conditional (if)")
            user_id = self.own_uid(message, user)
            if user_id in self.staff:
                return "%s, you can't blacklist a staff member" % message.author.mention
            print("blacklist function. Third conditional (if). User_id equals %s" % user_id)
            self.blacklist.append(user_id)
            print("blacklist function. Third conditional (if). Appended to self.blacklist")
            self.save_json()
            print("blacklist function. Third conditional (if). Saved json")
            return "Added %s to the blacklist" % user
        elif argument == "remove":
            print("blacklist function. Third conditional (first elif)")
            user_id = self.own_uid(message, user)
            print("blacklist function. Third conditional (first elif). User_id equals %s" % user_id)
            self.blacklist.remove(user_id)
            print("blacklist function. Third conditional (first elif). Removed from self.blacklist")
            self.save_json()
            print("blacklist function. Third conditional (first elif). Saved json")
            return "Removed %s from the blacklist" % user
        elif argument == "check":
            print("blacklist function. Third conditional (second elif)")
            user_id = self.own_uid(message, user)
            print("blacklist function. Third conditional (second elif). User_id equals %s" % user_id)
            if user_id in self.blacklist:
                print("blacklist function. Third conditional (second elif). Nested conditional (if)")
                return "%s **is** in the blacklist" % user
            else:
                print("blacklist function. Third conditional (second elif). Nested conditional (else)")
                return "%s **is not** in the blacklist" % user



    def hello(self, message):
        return "[%s] Hello, World!" % message.author



    def rating(self, message):
        if len(message.content) < 9: return "%s, you didn't pass an appID" % message.author.mention

        appID = message.content
        appID = appID[8:]
        if appID.isdigit() == False: return "%s, you didn't pass a valid appID" % message.author.mention

        URL = requests.get("http://store.steampowered.com/appreviews/" + appID + "?start_offset=0&day_range=30&filter=summary&language=all&review_type=all&purchase_type=all")

        jsonf = URL.json()

        # Case to handle removed games that have no store page anymore or simply don't exist
        if jsonf['success'] == 2: return "%s, game removed from the store or inexistant" % message.author.mention

        soup = BeautifulSoup(jsonf['review_score'], 'html.parser')
        percentage = soup.find_all('span')[1]

        # In case the game has no reviews or hasn't been released yet:
        if percentage['data-store-tooltip'] == "No user reviews": return "%s, no user reviews for that game yet" % message.author.mention

        percentage = re.findall("(\d+)%", percentage['data-store-tooltip'])[0]
        total = soup.find_all('span')[0]
        total = total.string.replace(",", "")
        total = re.findall('(\d+)\s', total)[0]
        total = "{:,}".format(int(total))

        return "%s, %s rating is: %s%% of *%s Reviews*" % (message.author.mention, appID, percentage, total)



    def help(self, message):
        if len(message.content) < 7:
            string = "The available commands are: "
            count = 0
            for key in sorted(self.commands):
                if count == len(self.commands) - 1: string += key
                else: string += key + ", "
                count += 1

            return string

        else:
            help_com = message.content[6:]
            if help_com in self.commands: return self.commands[help_com]
            else: return "%s there is no such command" % message.author.mention



    def owner(self, message):
        return "%s, the owner is %s" % (message.author.mention, message.server.owner)



    def all_upper(self, message):
        return "%s, no excessive use of caps allowed, warning" % message.author.mention



    def sv_staff(self, message):
        count = 0
        string = "%s, the staff members are: " % message.author.mention
        for user in self.staff:
            nick = self.unick(message, user)
            if nick != None:
                if count == len(self.staff) - 1: string += nick
                else: string += nick + ", "

            count += 1

        return string
