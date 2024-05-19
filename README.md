# osubot-lazer
A bot that allows you to show everyone your plays/profile/etc right in the group chat of [VK](https://vk.com/).
It is inspired by [osubot by OctopuSSX](https://github.com/OctoDumb/osubot-old) (no longer maintained) and its minimalistic straight-to-the-point output. The end goal of this project is to provide better and more up-to-date experience for all original features while also adding a lot of new useful options and tools. 

*Note that this project is still in the deep development stage and a lot of the original features are not implemented yet. After being quickly prototyped for local usage of some very needed features for me and my friends, it is currently being rewritten (see [clean](https://github.com/Ampiduxmoe/osubot-lazer/tree/master/clean) folder) to make further development more smooth. Once version in this folder reaches feature parity with the prototype, it will replace contents of the root folder. Before this moment root folder will act as a collection of implementation references, mainly because it is very convenient.*

### So why not just fork the original?
The way original bot was written does not really support easy expansion in the directions I want. For example addition of Telegram client, update of Performance Points calculation or implementation of something like "Top plays of the week" for chat groups is not feasible without rewriting most of the codebase. I have a lot of new features in mind, so it is in my best interest to build a more robust and maintainable bot from the ground up.

# What's different
Though it is still early in development, [bot](https://vk.com/club224713087) already has some notable changes and features you might be interested in if you used [the old one](https://vk.com/sosubot).
### Changes
- Responses have less clutter and are easier to read.
  
  Before/after:
  ![image](https://github.com/Ampiduxmoe/osubot-lazer/assets/63016382/6c20b400-e07c-417c-8c25-76c1b266a414)
- Responses to some commands have more information.
- Performance Points calculation is more in line with current version of the game, done using official [performance calculation tool](https://github.com/ppy/osu-tools/tree/master/PerformanceCalculator).
### New features
- Support for plays done using [lazer client](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer).
- `rp` (`recentpass`) command. Same as `r`/`recent`, but shows passes only.
- Ability to specify how many scores to show through `:number` argument. For example `l t mrekk +dt \2 :5` will show up to five DT-only top scores from [mrekk's profile](https://osu.ppy.sh/users/7562902/osu#top_ranks) starting from the second DT score.
- Ability to specify mods on your `r`/`recent` (including new `rp`/`recentpass`) commands. `l r :10 +hdhr` will show 10 of your latest HDHR scores using short score description.
- You don't need to send map link in chat before your actual command to select a map to show your scores on. `l c https://osu.ppy.sh/beatmapsets/6180#osu/28578` or `l c 28578` will work fine.

Many more will follow soon. [`l lb +(hd)hr`](https://github.com/Ampiduxmoe/osubot-lazer/commit/5b5dbed7ccdb7798ebdadc806dca4dc5558bb091#diff-8b1567a95cb62e6e3ee339e662f0e232acf4256bad6ab26fe92baf97e4b6e988R142) and being able [to see DT or DA settings](https://github.com/Ampiduxmoe/osubot-lazer/commit/b6002a46c0abc568a6e5f199cd5bdf00a7fd239b#diff-758e08a56b530f7a11c34ef4b10c71619c63474e8ffc3d2e22a0db5bc1cc8accR236-R265) are just a couple of examples that will be welcomed for sure, especially by lazer players :) 
### What's not there yet
Most notably:
- `map` command
- non-official servers
- quoting other people doesn't have an effect on command target: if you want to check score/profile of a user, you need to type their username
- replays support
- news notifications

If there is a feature from the old bot you use frequently that is not in this list, [message](https://vk.com/ampi0) or [mail](mailto:ampiduxmoe@gmail.com) me so I can bump it on my priority list and include it here.
### Priorities
1. Making [Bancho](https://osu.ppy.sh/wiki/en/Bancho_%28server%29) users experience as feature-rich as possible, focusing on the standard mode first.
2. Adding [Telegram](https://telegram.org/) support.
3. Adding unofficial servers support.
### Developer side of things
If you are curious about some of the more technical differences, here are main things:
- [Current version of the project](https://github.com/Ampiduxmoe/osubot-lazer/tree/master/clean) core is decoupled from external output mediums like VK, trying to follow Clean Architecture principles as closely as reasonably possible for current scope of the project. This will make it easy to add Telegram support or something like an admin web interface.
- For official server commands bot now uses [API v2](https://osu.ppy.sh/docs/index.html#api-versions) exclusively. This is what allows bot to see [lazer](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer) scores.
- Bot also uses `x-api-version` of 20220705 to be able to see new mod options (like DT speed rate adjust) from [lazer client](https://osu.ppy.sh/wiki/en/Help_centre/Upgrading_to_lazer) recent scores.
- Performance Points calculation is delegated to an external endpoint ([repo](https://github.com/Ampiduxmoe/osutools-simulate-wrapper)) which wraps [official calculation tool](https://github.com/ppy/osu-tools/tree/master/PerformanceCalculator) to better handle performance reworks.

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
4. Create app-config.json
```jsonc
{
  "osu": {
    "bancho": {
      "oauth": {
        "id": ,
        "secret": ""
      }
    }
  },
  "vk": {
    "group": {
      "id": ,
      "token": "",
      "owner": 
    }
  },
  "bot": {
    "score_simulation": {
      "endpoint_url": "",
      "default_timeout": 
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
node build/index.js
```

# I'm not a programmer, can I use it?
Though [current live version (VK)](https://vk.com/club224713087) of the bot has all of the most used features, it is far from being finished. If this doesn't bother you, you can send group join request and message [me](https://vk.com/ampi0) so I don't miss your request. After that you can add this bot to your chat or just use it directly in private messages.
