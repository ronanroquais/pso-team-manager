import { matchDays, serverRoles } from "../../config/psafServerConfig.js"
import { getCurrentSeason, isTopAdminRole, msToTimestamp, optionsToObject, quickResponse, silentResponse, updateResponse, waitingMsg } from "../../functions/helpers.js"
import { parseDate } from "../timestamp.js"
import { editAMatchInternal, formatMatch, internalCreateMatch, internalPublishMatch } from "../match.js"
import { shuffleArray } from "../../functions/helpers.js"
import { getFastCurrentSeason } from "../season.js"
import { getAllLeagues } from "../../functions/allCache.js"

const thirtyMinutes = 30*60

const generateMatchday = async ({interaction_id, token, application_id, dbClient, member, options}) => {
  if(!member.roles.find(role => isTopAdminRole(role))) {
    return silentResponse({interaction_id, token, content: 'This command is only available to presidents.'})
  }
  const {league, matchday, date, image} = optionsToObject(options)
  const parsedDate = parseDate(date)
  const startOfDay = new Date(parsedDate)
  startOfDay.setHours(17,0,0,0)
  const endOfDay = new Date(parsedDate)
  endOfDay.setHours(20,30,0,0)
  const startDateTimestamp = msToTimestamp(Date.parse(startOfDay))
  const endDateTimestamp = msToTimestamp(Date.parse(endOfDay))
  const allLeagues = await getAllLeagues()

  const leagueObj = allLeagues.find(fixtureChan=> fixtureChan.value === league)
  if(!leagueObj) {
    return silentResponse({interaction_id, token, content: `Can't find League ${league}`})
  }
  let currentTimestamp = startDateTimestamp
  await waitingMsg({interaction_id, token})
  let processedMatchesIds = []
  const content = await dbClient(async({matches, matchDays, seasonsCollect, teams, nationalTeams, leagueConfig})=> {
    const season = await getCurrentSeason(seasonsCollect)
    const matchesOfDay = await matches.find({season, league, matchday, finished: null}).toArray()
    shuffleArray(matchesOfDay)
    for await (const match of matchesOfDay) {
      await matches.updateOne({_id: match._id}, {$set: {dateTimestamp: currentTimestamp}})
      processedMatchesIds.push(match._id.toString())
      currentTimestamp = (parseInt(currentTimestamp) + thirtyMinutes).toString()
      if(currentTimestamp > endDateTimestamp) {
        currentTimestamp = startDateTimestamp
      }
    }
    await Promise.allSettled(processedMatchesIds.map(id => editAMatchInternal({id, teams, nationalTeams, matches, leagueConfig})))
    await matchDays.updateOne({league, matchday, season}, {$set: {league, matchday, season, startDateTimestamp, endDateTimestamp, image}}, {upsert: true})
    return `${leagueObj.name} ${matchday}: ${processedMatchesIds.length} matches set between <t:${startDateTimestamp}:F> and <t:${endDateTimestamp}:F>`
  })

  return await updateResponse({application_id, token, content})
}

const randomMatchesDay = async ({interaction_id, token, application_id, member, options, dbClient}) => {
  if(!member.roles.find(role => isTopAdminRole(role))) {
    return silentResponse({interaction_id, token, content: 'This command is only available to presidents/engineers.'})
  }
  const {league, matchday} = optionsToObject(options)
  
  const allLeagues = await getAllLeagues()
  const leagueObj = allLeagues.find(fixtureChan=> fixtureChan.value === league)
  if(!leagueObj) {
    return silentResponse({interaction_id, token, content: `Can't find League ${league}`})
  }
  await waitingMsg({interaction_id, token})
  const content = await dbClient(async({matches, seasonsCollect, teams, leagues, nationalTeams, leagueConfig})=> {
    const currentSeason = await getCurrentSeason(seasonsCollect)
    const matchesOfDay = await matches.find({season: currentSeason, league, matchday, finished: null}).toArray()
    if(matchesOfDay.length>0) {
      return `${leagueObj.name} ${matchday} has already ${matchesOfDay.length} matches`
    }
    const leagueTeams = (await leagues.find({leagueId: league}, ).toArray()).map(leagueTeam => leagueTeam.team)
    shuffleArray(leagueTeams)
    let teamPairs = []
    for(let i=0; i+1<leagueTeams.length ; i+=2) {
      teamPairs.push([leagueTeams[i], leagueTeams[i+1]])
    }
    const matchesList = await Promise.allSettled(teamPairs.map(([home, away])=>
      internalCreateMatch({league, home, away, isInternational:leagueObj.isInternational, undefined, matchday, teams, matches, nationalTeams, seasonsCollect, leagueConfig})
    ))

    console.log(matchesList)
    return `${leagueObj.name} ${matchday}: ${teamPairs.length} matches created:\r${teamPairs.map(([home, away])=> `<@&${home}> - <@&${away}>`).join('\r')}`
  })

  return await updateResponse({application_id, token, content: content.substring(0, 1999)})
}

const showMatchDay = async ({interaction_id, token, application_id, dbClient, options}) => {
  await waitingMsg({interaction_id, token})
  const {league, matchday} = optionsToObject(options)
  const {
    matchDay,
    matchDayMatches,
    relatedTeams,
    leagueObj
  } = await showMatchDayInternal({dbClient, league, matchday})
  if(!leagueObj) {
    return updateResponse({application_id, token, content: `Can't find League ${league}`})
  }
  let response = `${leagueObj.name}, ${matchday}\r`
  if(matchDay) {
    response += `${matchDay.image}\r<t:${matchDay.startDateTimestamp}:f> - <t:${matchDay.endDateTimestamp}:f>\r`
  }
  console.log(matchDayMatches.length)
  const matchDayEntries = []
  for await (const match of matchDayMatches) {
    const homeTeam = leagueObj.isInternational ? relatedTeams.find(team=>team.shortname === match.home) : relatedTeams.find(team=>team.id === match.home)
    const awayTeam = leagueObj.isInternational ? relatedTeams.find(team=>team.shortname === match.away) : relatedTeams.find(team=>team.id === match.away)
    const formattedMatch = await formatMatch(leagueObj, homeTeam, awayTeam, match)
    matchDayEntries.push(formattedMatch)
  }
  response += matchDayEntries.join('\r')
  await updateResponse({application_id, token, content: response.substring(0, 1999)})
}

export const showMatchDayInternal = async({dbClient, league, matchday, season})=> {
  return dbClient(async ({teams, matches, matchDays, playerStats, nationalTeams, lineups, leagueConfig})=> {
    const seasonRequested = Number(season) || getFastCurrentSeason()
    const [matchDay, matchDayMatches, leagueObj] = await Promise.all([
      matchDays.findOne({league, matchday, season:seasonRequested}),
      matches.find({league, matchday, season: seasonRequested}).toArray(),
      leagueConfig.findOne({value: league})
    ])
    const matchIds = matchDayMatches.map(match=> match._id)
    const matchIdsStr = matchIds.map(matchId=> matchId.toString())
    const [matchdayLineups, matchdayPlayerStats, relatedClubs, relatedSelections] = await Promise.all([
      lineups.find({matchId: {$in: matchIdsStr}}).toArray(),
      playerStats.find({matchId: {$in: matchIds}}).toArray(),
      teams.find({id: {$in: [...matchDayMatches.map(match=> [match.home, match.away]).flat(), serverRoles.unknownTeam]}}).toArray(),
      nationalTeams.find({shortname: {$in: [...matchDayMatches.map(match=> [match.home, match.away]).flat(),  serverRoles.unknownTeam]}}).toArray()
    ])
    const relatedTeams = [...relatedClubs, ...relatedSelections]
    const lastMatch = matchDayMatches.reduce((latestMatchTime, currentMatch) => Math.max(latestMatchTime, currentMatch.dateTimestamp), 0)
    const lastMatchDateTime = matchDay ? Math.max(matchDay.endDateTimestamp, lastMatch) : lastMatch
    return {
      matchDay,
      matchDayMatches,
      lastMatchDateTime,
      relatedTeams,
      matchdayLineups,
      matchdayPlayerStats,
      leagueObj
    }
  })
}

const updateMatchDayImage = async({dbClient, interaction_id, token, options}) => {
  const {image, league, matchday} = optionsToObject(options)
  const content = await dbClient(async({matchDays, leagueConfig})=> {
    try{
      const [, leagueObj] = await Promise.all([
        matchDays.updateOne({league, matchday}, {$set:{image}}),
        leagueConfig.findOne({value:league})
      ])
      return `Image set for ${leagueObj.name} ${matchday}:\r${image}`
    } catch(e) {
      return e.message
    }
  })
  quickResponse({interaction_id, token, content, isEphemeral:true})
}

const publishNextMatches = async ({interaction_id, application_id, token, dbClient}) => {
  const now = msToTimestamp(Date.now())
  await waitingMsg({interaction_id, token})
  const content = await dbClient(async ({seasonsCollect, teams, matches, nationalTeams, matchDays, leagueConfig}) => {
    const activeLeagues = await leagueConfig.find({active: true}).toArray()
    const activeLeaguesId = activeLeagues.map(league=>league.value)
    const nextMatchDays = await matchDays.find({startDateTimestamp: {$gte: now}, league: {$in: activeLeaguesId}}, {startDateTimestamp: 1}).toArray()
    const matchDaysPerLeague = new Map()
    nextMatchDays.forEach((matchDay)=> {
      if(!matchDaysPerLeague.has(matchDay.league)) {
        matchDaysPerLeague.set(matchDay.league, matchDay)
      }
    })
    const matchDaysToPost = Array.from(matchDaysPerLeague).filter(([, matchDay])=> !matchDay.posted).map(([, matchDay])=> matchDay)
    for await(const matchDay of matchDaysToPost) {
      await internalPublishMatch({league: matchDay.league, matchday: matchDay.matchday, seasonsCollect, teams, matches, nationalTeams, matchDays, leagueConfig})
    }
    return `Posted ${matchDaysToPost.length} matchdays`
  })
  return updateResponse({application_id, token, content})
}

export const autoPublish = async ({dbClient}) => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 0)
  return dbClient(async ({seasonsCollect, teams, matches, nationalTeams, leagueConfig, matchDays})=> {
    const activeLeagues = await leagueConfig.find({active: true}).toArray()
    const todayMatchDays = await matchDays.find({startDateTimestamp:{$gte: msToTimestamp(startOfDay.getTime())}, endDateTimestamp: {$lte: msToTimestamp(endOfDay.getTime())}, league: {$in: activeLeagues.map(league=>league.value)}}, {startDateTimestamp: -1}).toArray()
    const leaguesToPost = todayMatchDays.map(matchday=> matchday.league)
    const nextMatchDays = await matchDays.find({posted: {$in: [null, false]}, startDateTimestamp: {$gte: msToTimestamp(endOfDay.getTime())}, league: {$in: leaguesToPost}}, {startDateTimestamp: -1}).toArray()
    const nextMatchDayPerLeague = new Map()
    nextMatchDays.forEach(matchDay => {
      if(!nextMatchDayPerLeague.has(matchDay.league)) {
        nextMatchDayPerLeague.set(matchDay.league, matchDay)
      }
    })
    const matchDaysToPost = Array.from(nextMatchDayPerLeague).map(([, matchDay]) => matchDay)
    console.log(matchDaysToPost)

    for await(const matchDay of matchDaysToPost) {
      await internalPublishMatch({league: matchDay.league, matchday: matchDay.matchday, seasonsCollect, teams, matches, nationalTeams, matchDays, leagueConfig})
    }
  })
}

/*export const matchDay = async ({interaction_id, token, dbClient}) => {
  const {allTeams} = await dbClient(({teams})=> {
    return teams.find({active:true}).toArray()
  })
  const modal = {
    title: 'Create a matchday',
    custom_id: `create_matchday`,
    components: [{
      type: 1,
      components: [{
        type: 4,
        custom_id: "date",
        label: "Date",
        style: 1,
        min_length: 1,
        value: '',
        required: true
      }]
    },{
      type: 1,
      components: [{
        type: 3,
        custom_id: "select_matchday",
        label: "Match Day",
        style: 1,
        required: true,
        min_values: 1,
        max_values: 1,
        options: matchDays.slice(0,24).map((matchDay,index)=> ({
          label: matchDay.name,
          description: ' ',
          value: index,
        }))
      }]
    },{
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "ff",
          label: 'Enter ff if Forfeited',
          style: 1,
          max_length: 2,
          required: false
        }
      ]
  }]
  }
  await DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.MODAL,
      data: modal
    }
  })
}*/

const generateMatchdayCmd = {
  type: 1,
  name: 'generatematchday',
  description: 'Generate the fixtures for a matchday',
  psaf: true,
  func: generateMatchday,
  options: [{
    type: 3,
    name: 'league',
    description: 'League',
    required: true,
    autocomplete: true,
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays.slice(0,24),
    required: true
  },{
    type: 3,
    name: 'date',
    description: "The day you're looking for (UK timezone)",
    required: true
  },{
    type: 3,
    name: 'image',
    description: "The template image to post before the match is published"
  }]
}

export const randomMatchdayCmd = {
  type: 1,
  name: 'randommatchday',
  psaf: true, 
  func: randomMatchesDay,
  description: 'Generate random oppositions for a matchday',
  options: [{
    type: 3,
    name: 'league',
    description: 'League',
    required: true,
    autocomplete: true,
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays.slice(0,24),
    required: true
  }]
}

const showMatchDayCmd = {
  type: 1,
  name: 'showmatchday',
  description: 'Show the details of a matchday',
  psaf: true,
  func: showMatchDay,
  options: [{
    type: 3,
    name: 'league',
    description: 'League',
    required: true,
    autocomplete: true,
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays.slice(0,24),
    required: true
  }]
}
const updateMatchDayImageCmd = {
  type: 1,
  name: 'updatematchdayimage',
  func: updateMatchDayImage,
  psaf: true,
  description: 'Update the image for a matchday',
  options: [{
    type: 3,
    name: 'league',
    description: 'League',
    required: true,
    autocomplete: true,
  },{
    type: 3,
    name: 'matchday',
    description: "The matchday, or competition stage",
    choices: matchDays.slice(0,24),
    required: true
  },{
    type: 3,
    name: 'image',
    description: "The template image to post before the match is published"
  }]
}

const publishNextMatchesCmd = {
  type: 1,
  name: 'publishnextmatches',
  psaf: true,
  func: publishNextMatches,
  description: 'publish the next matchday'
}

export default [generateMatchdayCmd, publishNextMatchesCmd, updateMatchDayImageCmd, showMatchDayCmd, randomMatchdayCmd]