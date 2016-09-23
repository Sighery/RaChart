import discord
import asyncio
from liferom_bot import LiferomBot

client = discord.Client()
liferom = LiferomBot()

@client.event
async def on_ready():
    print('Logged in as')
    print(client.user.name)
    print(client.user.id)
    print('------')

@client.event
async def on_message(message):
    if message.content.isupper():
        msg = message
        await client.delete_message(message)
        await client.send_message(message.channel, liferom.all_upper(msg))
        del msg
    elif liferom.check_lst(message.author.id, liferom.blacklist):
        # User is on the blacklist so his commands should be ignored
        print("%s is in the blacklist" % message.author)
        pass

    elif message.content.startswith('!owner'):
        await client.send_message(message.channel, liferom.owner(message))

    elif message.content.startswith('!staff'):
        await client.send_message(message.channel, liferom.sv_staff(message))

    elif message.content.startswith('!test'):
        counter = 0
        tmp = await client.send_message(message.channel, 'Calculating messages...')
        async for log in client.logs_from(message.channel, limit=100):
            if log.author == message.author:
                counter += 1

        await client.edit_message(tmp, str(message.author) + ', you have {} messages.'.format(counter))

    elif message.content.startswith("!blacklist") and liferom.check_lst(message.author.id, liferom.staff):
        # Only staff should be able to blacklist other non-staff members
        await client.send_message(message.channel, liferom.black_list(message))

    elif message.content.startswith("!hello"):
        await client.send_message(message.channel, liferom.hello(message))

    elif message.content.startswith("!help"):
        await client.send_message(message.channel, liferom.help(message))

    elif message.content.startswith("!uid") and liferom.check_lst(message.author.id, liferom.admin):
        # Only admins should have access to this command
        print("Admin used this command, that admin was: %s" % message.author)
        await client.send_message(message.channel, liferom.uid(message))

    elif message.content.startswith("!rating"):
        await client.send_message(message.channel, liferom.rating(message))

    elif message.content.startswith('!sleep'):
        await asyncio.sleep(5)
        await client.send_message(message.channel, 'Done sleeping')


@client.event
async def on_member_update(before, after):
    # Needs more testing and more cases than just role.
    bRoles = before.roles
    print(bRoles)
    print("Before roles")
    for rol in bRoles:
        print(rol.name)
    #bRoles.sort()
    aRoles = after.roles
    print("After roles")
    for rol in aRoles:
        print(rol.name)
    #aRoles.sort()

    if bRoles != aRoles:
        print("Yep, changed roles")

client.run(liferom.mail, liferom.password)
