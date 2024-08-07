# osubot-lazer
A bot that allows you to show everyone your plays/profile/etc right in the group chat of [VK](https://vk.com/).
It is inspired by [osubot by OctopuSSX](https://github.com/OctoDumb/osubot-old) (no longer maintained) and its minimalistic straight-to-the-point output. The end goal of this project is to provide better and more up-to-date experience for all original features while also adding a lot of new useful options and tools.

### So why not just fork the original?
The way original bot was written does not really support easy expansion in the directions I want. For example addition of Telegram client, update of Performance Points calculation or implementation of something like "Top plays of the week" for chat groups is not feasible without rewriting most of the codebase. I have a lot of new features in mind, so it is in my best interest to build a more robust and maintainable bot from the ground up.

# What's different
Though [bot](https://vk.com/club224713087) is not quite finishied yet, it already has some notable changes and features you might be interested in if you used [the old one](https://vk.com/sosubot).
### Changes
- Responses have less clutter and more alignment (important for lists like chat leaderboard on a map) and therefore are easier to read.
  
  Before/after:
  ![before and after image](https://github.com/user-attachments/assets/3c75021a-fb91-4905-8386-d09348b4dbf9)

- Responses are more mobile-friendly.
  
  Before/after:
  ![before and after image](https://github.com/user-attachments/assets/b7a78499-3458-4bad-8e83-394fb9260c3c)


- Score default sorting is by PP.
- Responses to some commands have more information that is useful. An example of this is beatmapset/beatmap playcount and favourite count. Or if PP value is an estimation and was not actually achieved, it will be prefixed with `~`. Or a number of 50s on `l map X%` command. You get the idea.
- Performance Points calculation is more in line with current version of the game, done using official [performance calculation tool](https://github.com/ppy/osu-tools/tree/master/PerformanceCalculator).
- Commands have names that are more structured. No more `compare` for just showing single play on specific map. Chat leaderboard is `l`/`lb`/`leaderboard`, chat leaderboard **on map** is `ml`/`mlb`/`mapleaderboard`. Your best plays are `p`/`pb`/`personalbest`, your best plays **on map** are `mp`/`mpb`/`mappersonalbest`. Same will go for future `top` and `maptop` commands to show global/country player ranking and ranking on a map. If you are not a fan of this and really want to use old naming you can just type `osubot-alias legacy`.
- By default, if you write DT (or NC) in your mod filter for any command, it will also show NC (or DT) scores. Same goes for HT and DC. Additionally, CL mod presence is allowed, for example writing +NM will give you both NM and CL-only scores. If you want the bot to match your filter strictly, add `!` at the end (like `+(HD)HR!`)

### New features
- `osubot-help` command that shows all available commands or a detailed explanation on selected command.
- Support for plays done using [lazer client](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer).
- Support for mod settings like DT speed change or DA beatmap stats modification (this also includes `l map` command, you can specify mod settings to see how much a hypothetical play would be worth).
- `osubot-alias` command that allows you to use any word/sentence you want as a bot command. Want to type `watch my last three plays!` to show it? Just use `osubot-alias add 'watch my last three plays!' 'l r :3'`!
- `rp` (`recentpass`) command. Same as `r`/`recent`, but shows passes only.
- Ability to specify how many scores to show through a `:number` argument. For example `l personalbest mrekk +dt \2 :5` will show up to five DT-only top scores from [mrekk's profile](https://osu.ppy.sh/users/7562902/osu#top_ranks) starting from the second DT score.
- Ability to specify mods on your `r`/`recent` (including new `rp`/`recentpass`) commands. `l r :10 +hdhr` will show 10 of your latest HDHR scores using short score description.
- Advanced mod filter:
  - You can specify optional mods with `()`. If you type `+(hd)dt` as a mod filter you will get both DT and HDDT scores. NOTE: `(hdhr)dt` and `(hd)(hr)dt` are not the same!
  - You can exclude mods from your search with `{}`. If you type `+{clnm}`, you will see all scores that do not have CL mod while also not being NM scores.
  - You can specify 'only one of' mod group with `[]`. `+HD[HRDT]` will ensure you get either HDHR or HDDT scores.
  - You can specify multiple mod patterns with `,`. If you type `+dt,(hd)hr`, bot will show you DT, HR and HDHR scores.
  - You can negate mod pattern with `^`. If you type `+nc,^(hd)dt`, you will get NC scores AND everything except HD and HDDT scores.
  - You can negate a whole filter when starting with `-` instead of `+`. `-{hr}` can be translated as `don't show scores without hr`, so essentially it is a filter for any score with HR in it.
- You don't need to send a map link in chat before your actual command to select the map. `l MapPersonalBest https://osu.ppy.sh/beatmapsets/6180#osu/28578` or `l mp *28578` will work fine.
- If for some reason you don't want to switch a language when you chat and use the bot, it is fine. `д к эцщкые рк здфнукэ Ж5` will be treated as `l r 'worst hr player' :5`. Works in reverse too, for example if you have aliases in a different language.
- You can contact bot admin by starting your message with bot mention (for private messages you need to manually type `[club<group_id>|<link text>] <your question>`). You won't be able to send anything again until admin replies to your message.
 
### What's not there yet
Most notably:
- non-official servers
- replays support
- news notifications

If there is a feature from the old bot you use frequently that is not in this list, [message](https://vk.com/ampi0) or [mail](mailto:ampiduxmoe@gmail.com) me so I can bump it on my priority list and include it here.
### Priorities
1. Making [Bancho](https://osu.ppy.sh/wiki/en/Bancho_%28server%29) users experience as feature-rich as possible, focusing on the standard mode first.
2. Adding [Telegram](https://telegram.org/) support.
3. Adding unofficial servers support.
### Developer side of things
If you are curious about some of the more technical differences, here are main things:
- Current version is trying to follow Clean Architecture principles as closely as reasonably possible for current scope of the project. This should make it easy to add any feature later: be it a Telegram support or something like an admin web interface.
- For official server commands bot now uses [API v2](https://osu.ppy.sh/docs/index.html#api-versions) exclusively. This is what allows bot to see [lazer](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer) scores.
- Bot also uses `x-api-version` of 20220705 to be able to see new mod options (like DT speed rate adjust) from [lazer client](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer) scores.
- Performance Points calculation is delegated to an external endpoint ([repo](https://github.com/Ampiduxmoe/osutools-simulate-wrapper)) which wraps [official calculation tool](https://github.com/ppy/osu-tools/tree/master/PerformanceCalculator) to better handle performance reworks. Migration to [rosu-pp](https://github.com/MaxOhn/rosu-pp) as a primary calculation tool is planned (osutools can still be useful in the future, e.g. to calculate profiles for pending reworks).

# How to run
1. Install [node](https://nodejs.org/) v20.11.1
2. Clone this repository
```
git clone git@github.com:Ampiduxmoe/osubot-lazer.git
```
3. Install dependencies
```
npm ci
```
4. Create app-config.json and fill it with real values.
```jsonc
{
  "osu": {
    "bancho": {
      "oauth": {
        "id": 0,
        "secret": ""
      }
    }
  },
  "vk": {
    "group": {
      "id": 0,
      "token": "",
      "owner": 0
    },
    "group_dev": {
      "id": 0,
      "token": "",
      "owner": 0
    }
  },
  "bot": {
    "score_simulation": {
      "endpoint_url": "",
      "default_timeout": 0
    }
  }
}
```
5. Compile project
```
npm run compile
```
6. Run
```
node build/src/main/Main.js
```

# I'm not a programmer, can I use it?
Though [current live version (VK)](https://vk.com/club224713087) of the bot has all of the most used features, it is far from being finished. If this doesn't bother you, you can send group join request and message [me](https://vk.com/ampi0) so I don't miss your request. After that you can add this bot to your chat or just use it directly in private messages.
