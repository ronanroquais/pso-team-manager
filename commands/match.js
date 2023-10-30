import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { ObjectId } from "mongodb";
import { fixturesChannels, matchDays } from "../config/psafServerConfig.js";
import { msToTimestamp, optionsToObject } from "../functions/helpers.js";
import { DiscordRequest } from "../utils.js";
import { sleep } from "../functions/helpers.js";
import { parseDate } from "./timestamp.js";

const matchLogChannelId = '1151131972568092702'
//const botTestingId = '1150376229178978377'

const formatMatch = (league, homeTeam, awayTeam, match, showId, isInternational) => {
  let response = `<${league.emoji}> **| ${league.name} ${match.matchday}** - <t:${match.dateTimestamp}:F>`
  if(isInternational) {
    response += `\r> ${homeTeam.flag} **${homeTeam.name} :vs: ${awayTeam.name}** ${awayTeam.flag}`
  } else {
    response += `\r> ${homeTeam.flag} ${homeTeam.emoji} <@&${homeTeam.id}> :vs: <@&${awayTeam.id}> ${awayTeam.emoji} ${awayTeam.flag}`
  }
  response += `\r> ${match.homeScore} : ${match.awayScore}${match.isFF ? ' **ff**': ''}`
  if(showId)
    response += `\rID: ${match._id}`
  return response
}

const createMatch = async ({interaction_id, token, options, dbClient, isInternational}) => {
  const {home, away, league, matchday, date, timezone = 0, timestamp} = optionsToObject(options)
  if(!date && !timestamp) {
    return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
      method: 'POST',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Please provide either a date or a timestamp.',
          flags: 1 << 6
        }
      }
    })
  }
  let dateTimestamp = timestamp
  if(!dateTimestamp) {
    const parsedDate = parseDate(date, timezone)
    dateTimestamp = msToTimestamp(Date.parse(parsedDate))
  }
  const currentLeague = fixturesChannels.find(({value})=> value === league)

  let response = `<${currentLeague.emoji}> **| ${currentLeague.name} ${matchday}** - <t:${dateTimestamp}:F>`
  await dbClient(async ({teams, matches, nationalities})=> {
    const homeScore = '?'
    const awayScore = '?'
    let insertResult
    if(isInternational) {
      const [homeTeam, awayTeam] = await Promise.all([
        nationalities.findOne({name: home}),
        nationalities.findOne({name: away})
      ])
      response += `\r> ${homeTeam.flag} **${homeTeam.name} :vs: ${awayTeam.name}** ${awayTeam.flag}`
    } else {
      const [homeTeam, awayTeam] = await Promise.all([
        teams.findOne({active:true, id: home}),
        teams.findOne({active:true, id: away})
      ])
      response += `\r> ${homeTeam.flag} ${homeTeam.emoji} <@&${homeTeam.id}> :vs: <@&${awayTeam.id}> ${awayTeam.emoji} ${awayTeam.flag}`
    }
    response += `\r> ${homeScore} : ${awayScore}`
    
    insertResult = await matches.insertOne({
      home,
      away,
      dateTimestamp,
      league,
      matchday,
      homeScore,
      awayScore,
      isInternational,
    })
    response += `\rID: ${insertResult.insertedId}`
    const messageResp = await DiscordRequest(`/channels/${matchLogChannelId}/messages`, {
      method: 'POST',
      body: {
        content: response,
      }
    })
    const logResp = await messageResp.json()
    await matches.updateOne({_id: new ObjectId(insertResult.insertedId)}, {$set: {logId: logResp.id}})
  })

  return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: response,
        flags: InteractionResponseFlags.EPHEMERAL
      }
    }
  })
}

export const match = async ({interaction_id, token,  options, dbClient}) => {
  return createMatch({interaction_id, token, options, dbClient})
}

export const internationalMatch = async ({interaction_id, token,  options, dbClient}) => {
  return createMatch({interaction_id, token, options, dbClient, isInternational: true})
}

export const matchId = async ({interaction_id, token, options, dbClient}) => {
  const {home, away} = Object.fromEntries(options.map(({name, value})=> [name, value]))
  return await dbClient(async ({matches})=> {
    const foundMatches = await matches.find({home, away}).sort({dateTimestamp: 1}).toArray()
    if(foundMatches.length === 0) {
      return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
        method: 'POST',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Match <@&${home}> - <@&${away}> not found`,
            flags: 1 << 6
          }
        }
      })
    }
    const response = foundMatches.map(({home, away, dateTimestamp, _id})=> `<@&${home}> - <@&${away}> <t:${dateTimestamp}:F> ${_id}`).join('\r')
    return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
      method: 'POST',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: response,
          flags: 1 << 6
        }
      }
    })
  })
}

export const editAMatch = async ({interaction_id, token, options, dbClient, isInternational}) => {
  const {id, home, away, league, matchday, date, timezone = 0, timestamp} = optionsToObject(options)

  const matchId = new ObjectId(id)
  return await dbClient(async ({teams, matches, nationalities}) => {
    const match = await matches.findOne(matchId)
    if(!match) {
      return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
        method: 'POST',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Match ${id} not found`,
            flags: InteractionResponseFlags.EPHEMERAL
          }
        }
      })
    }
    const homeId = home || match.home
    const awayId = away || match.away
    let homeTeam, awayTeam
    if(isInternational) {
      [homeTeam, awayTeam] = await Promise.all([
        nationalities.findOne({name: homeId}),
        nationalities.findOne({name: awayId})
      ])
    } else {
      [homeTeam, awayTeam] = await Promise.all([
        teams.findOne({active:true, id: homeId}),
        teams.findOne({active:true, id: awayId})
      ])
    }
    let dateTimestamp = match.dateTimestamp
    if(date || timestamp) {
      dateTimestamp = timestamp
      if(!dateTimestamp) {
        const parsedDate = parseDate(date, timezone)
        dateTimestamp = msToTimestamp(Date.parse(parsedDate))
      }
    }
    const leaguePick = league || match.league
    const currentLeague = fixturesChannels.find(({value})=> value === leaguePick)
    const channel = currentLeague.channel || currentLeague.value
    const matchDayPick = matchday || match.matchday
    await matches.updateOne({"_id": matchId}, {$set: {
      home: homeId,
      away: awayId,
      dateTimestamp,
      league: leaguePick,
      matchday: matchDayPick
    }})
    const post = formatMatch(currentLeague, homeTeam, awayTeam, {...match, home: homeId, away:awayId, dateTimestamp, matchday: matchDayPick}, false, isInternational)
    const response = formatMatch(currentLeague, homeTeam, awayTeam, {...match, home: homeId, away:awayId, dateTimestamp, matchday: matchDayPick}, true, isInternational)
    if(match.messageId) {
      await DiscordRequest(`/channels/${channel}/messages/${match.messageId}`, {
        method: 'PATCH',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          content: post
        }
      })
    }
    if(match.logId) {
      await DiscordRequest(`/channels/${matchLogChannelId}/messages/${match.logId}`, {
        method: 'PATCH',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          content: response
        }
      })
    }
    return await DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
      method: 'POST',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Updated \r`+response,
          flags: 1 << 6
        }
      }
    })
  })
}

export const editMatch = async ({interaction_id, token, options, dbClient}) => {
  return editAMatch({interaction_id, token, options, dbClient, isInternational:false})
}

export const editInterMatch = async ({interaction_id, token, options, dbClient}) => {
  return editAMatch({interaction_id, token, options, dbClient, isInternational:true})
}

export const endMatch = async ({interaction_id, token, options, dbClient}) => {
  const {id, homescore, awayscore, ff} = optionsToObject(options)

  const matchId = new ObjectId(id)
  return await dbClient(async ({teams, matches, nationalities}) => {
    const match = await matches.findOne(matchId)
    if(!match) {
      return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
        method: 'POST',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Match ${id} not found`,
            flags: 1 << 6
          }
        }
      })
    }
    
    const [homeTeam, awayTeam] = await Promise.all([
      match.isInternational ? nationalities.findOne({name: match.home}) : teams.findOne({active: true, id: match.home}),
      match.isInternational ? nationalities.findOne({name: match.away}) : teams.findOne({active: true, id: match.away})
    ])
    
    const currentLeague = fixturesChannels.find(({value})=> value === match.league)
    const channel = currentLeague.channel || currentLeague.value
    await matches.updateOne({"_id": matchId}, {$set: {
      homeScore: homescore,
      awayScore: awayscore,
      isFF: ff,
      finished: true
    }})
    const post = formatMatch(currentLeague, homeTeam, awayTeam, {...match, homeScore: homescore, awayScore:awayscore, isFF: ff}, false, match.isInternational)
    const response = formatMatch(currentLeague, homeTeam, awayTeam, {...match, homeScore: homescore, awayScore:awayscore, isFF: ff}, true, match.isInternational)
    if(match.messageId) {
      await DiscordRequest(`/channels/${channel}/messages/${match.messageId}`, {
        method: 'PATCH',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          content: post
        }
      })
    }
    if(match.logId) {
      await DiscordRequest(`/channels/${matchLogChannelId}/messages/${match.logId}`, {
        method: 'PATCH',
        body: {
          type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          content: response
        }
      })
    }
    return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
      method: 'POST',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Updated \r`+response,
          flags: 1 << 6
        }
      }
    })
  })
}

export const publishMatch = async ({interaction_id, token, application_id, options, dbClient}) => {
  const {league, matchday, postping} = optionsToObject(options)
  const currentLeague = fixturesChannels.find(({value})=> value === league)
  const channel = currentLeague.channel || currentLeague.value

  DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Publishing ${currentLeague.name} - ${matchday}...`,
        flags: 1 << 6
      }
    }
  })
  return await dbClient(async ({teams, matches, nationalities}) => {
    const teamsCursor = teams.find({active: true})
    const allTeams = await teamsCursor.toArray()
    const allNationalTeams = await nationalities.find({}).toArray()
    const matchCursor = matches.find({league, matchday, messageId: null})
    for await (const match of matchCursor) {
      const homeTeam = match.isInternational ? allNationalTeams.find(({name})=> name === match.home) : allTeams.find(({id})=> id === match.home)
      const awayTeam = match.isInternational ? allNationalTeams.find(({name})=> name === match.away) : allTeams.find(({id})=> id === match.away)
      const matchContent = formatMatch(currentLeague, homeTeam, awayTeam, match, false, match.isInternational)
      const messageResp = await DiscordRequest(`/channels/${channel}/messages`, {
        method: 'POST',
        body: {
          content: matchContent,
        }
      })
      const message = await messageResp.json()
      matches.updateOne({_id: match._id}, {$set: {messageId: message.id}})
      if(match.isInternational) {
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/${homeTeam.flag}/@me`, {method: 'PUT', body:{}})
        await sleep(300)
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/🇽/@me`, {method: 'PUT', body:{}})
        await sleep(300)
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/${awayTeam.flag}/@me`, {method: 'PUT', body:{}})
      } else {
        const [,homeEmoji, homeEmojiId] = homeTeam.emoji.split(':')
        const [,awayEmoji, awayEmojiId] = awayTeam.emoji.split(':')
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/${homeEmoji}:${homeEmojiId.substring(0, homeEmojiId.length -1)}/@me`, {method: 'PUT', body:{}})
        await sleep(300)
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/🇽/@me`, {method: 'PUT', body:{}})
        await sleep(300)
        await DiscordRequest(`/channels/${message.channel_id}/messages/${message.id}/reactions/${awayEmoji}:${awayEmojiId.substring(0, awayEmojiId.length -1)}/@me`, {method: 'PUT', body:{}})
      }
      //forced to wait otherwise we get blocked by the API limits
      await sleep(500)
    }
    if(postping) {
      const pingRole = currentLeague.pingRole ? `<@&${currentLeague.pingRole}>`:'@everyone'
      const endMessage = `[ ${pingRole} ]--[ WELCOME BACK TO THE ${currentLeague.name}! VOTE YOUR WINNERS! ]`
      await DiscordRequest(`/channels/${channel}/messages`, {
        method: 'POST',
        body: {
          content: endMessage,
        }
      })
    }
    return DiscordRequest(`/webhooks/${application_id}/${token}/messages/@original`, {
      method: 'PATCH',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        content: 'Done',
      }
    })
  })
}

export const getMatchesOfDay = async ({date='today', dbClient}) => {
  const parsedDate = parseDate(date)
  const startOfDay = new Date(parsedDate)
  startOfDay.setUTCHours(0,0,0,0)
  const endOfDay = new Date(parsedDate)
  endOfDay.setUTCHours(23,59,59,999)
  const startDateTimestamp = msToTimestamp(Date.parse(startOfDay))
  const endDateTimestamp = msToTimestamp(Date.parse(endOfDay))
  
  return dbClient(async ({teams, matches, nationalities}) => {
    const matchesOfDay = await matches.find({dateTimestamp: { $gt: startDateTimestamp, $lt: endDateTimestamp}, $or: [{finished:false}, {finished:null}]}).sort({dateTimestamp:1}).toArray()
    const allTeams = await teams.find({active: true}).toArray()
    const allNationalTeams = await nationalities.find({}).toArray()
    let response = `${matchesOfDay.length} match${matchesOfDay.length >1?'es':''} on <t:${startDateTimestamp}:d>.\r`
    for (const match of matchesOfDay) {
      const homeTeam = match.isInternational ? allNationalTeams.find(({name})=>name===match.home) : allTeams.find(({id})=> id === match.home)
      const awayTeam = match.isInternational ? allNationalTeams.find(({name})=>name===match.away) : allTeams.find(({id})=> id === match.away)
      const currentLeague = fixturesChannels.find(({value})=> value === match.league)
      response += formatMatch(currentLeague, homeTeam, awayTeam, match, true, match.isInternational)+'\r'
    }
    return response
  })
}

export const matches = async ({interaction_id, token, options=[], dbClient}) => {
  const {date = "today", post} = Object.fromEntries(options.map(({name, value})=> [name, value]))
  const response = await getMatchesOfDay({date, dbClient})
  return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: response.substring(0, 1999),
        flags: !post ? InteractionResponseFlags.EPHEMERAL : 0
      }
    }
  })
}

export const matchCmd = {
  name: 'match',
  description: 'Enter a match',
  type: 1,
  options: [{
    type: 8,
    name: 'home',
    description: 'Home Team',
    required: true
  },{
    type: 8,
    name: 'away',
    description: 'Away Team',
    required: true
  },{
    type: 3,
    name: 'league',
    description: "Which league it is for",
    choices: fixturesChannels.map(({name, value})=> ({name, value})),
    required: true
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays,
    required: true
  },{
    type: 3,
    name: 'date',
    description: "The date planned for the match (UK timezone by default)",
  },{
    type: 4,
    name: 'timezone',
    description: "Which timezone to apply",
    choices: [{
      name: "UK",
      value: "0"
    }, {
      name: "Central Europe",
      value: "1"
    }, {
      name: "Turkey",
      value: "2"
    }]
  },{
    type: 3,
    name: 'timestamp',
    description: "The exact timestamp for the game (use either date or this)",
  }]
}


export const internationalMatchCmd = {
  name: 'intermatch',
  description: 'Enter an international match',
  type: 1,
  options: [{
    type: 3,
    name: 'home',
    description: 'Home Team',
    autocomplete: true,
    required: true,
  },{
    type: 3,
    name: 'away',
    description: 'Away Team',
    autocomplete: true,
    required: true,
  },{
    type: 3,
    name: 'league',
    description: "Which league it is for",
    choices: fixturesChannels.map(({name, value})=> ({name, value})),
    required: true
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays,
    required: true
  },{
    type: 3,
    name: 'date',
    description: "The date planned for the match (UK timezone by default)",
  },{
    type: 4,
    name: 'timezone',
    description: "Which timezone to apply",
    choices: [{
      name: "UK",
      value: "0"
    }, {
      name: "Central Europe",
      value: "1"
    }, {
      name: "Turkey",
      value: "2"
    }]
  },{
    type: 3,
    name: 'timestamp',
    description: "The exact timestamp for the game (use either date or this)",
  }]
}

export const editMatchCmd = {
  name: 'editmatch',
  description: 'Update a match',
  type: 1,
  options: [
    {
      type: 3,
      name: 'id',
      description: "The Match ID to modify",
      required: true
    },
    ...matchCmd.options.map(option => ({
      ...option,
      required: false
    }))
  ]
}

export const editInternationalMatchCmd = {
  name: 'editintermatch',
  description: 'Update an international match',
  type: 1,
  options: [
    {
      type: 3,
      name: 'id',
      description: "The Match ID to modify",
      required: true
    },
    ...internationalMatchCmd.options.map(option => ({
      ...option,
      required: false
    }))
  ]
}

export const endMatchCmd = {
  name: 'endmatch',
  description: 'Finish a match',
  type: 1,
  options: [
    {
      type: 3,
      name: 'id',
      description: "The Match ID to modify",
      required: true
    },
    {
      type: 3,
      name: 'homescore',
      description: "The score for the home team",
      required: true
    },
    {
      type: 3,
      name: 'awayscore',
      description: "The score for the away team",
      required: true
    },
    {
      type: 5,
      name: 'ff',
      description: "Was the match a FF?"
    }
  ]
}

export const publishMatchCmd = {
  name: 'publishmatch',
  description: 'Publish a matchday',
  type: 1,
  options: [
    {
      type: 3,
      name: 'league',
      description: "Which league it is for",
      choices: fixturesChannels.map(({name, value})=> ({name, value})),
      required: true
    },{
      type: 3,
      name: 'matchday',
      description: "The matchday, or competition stage",
      choices: matchDays,
      required: true
    },{
      type: 5,
      name: 'postping',
      description: "Post the ping in the channel?"
    }
  ]
}

export const matchIdCmd = {
  name: 'matchid',
  description: 'Get a match\'s ID',
  type: 1,
  options: [{
    type: 8,
    name: 'home',
    description: 'Home Team',
    required: true
  },{
    type: 8,
    name: 'away',
    description: 'Away Team',
    required: true
  }]
}

export const matchesCmd = {
  name: 'matches',
  description: 'List the matches on a day',
  type: 1,
  options: [
    {
      type: 3,
      name: 'date',
      description: "The day you're looking for (UK timezone)"
    },
    {
      type: 5,
      name: 'post',
      description: "Post the matches in the channel?"
    }
  ]
}