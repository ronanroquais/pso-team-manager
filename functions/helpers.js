import { fixturesChannels } from "../config/psafServerConfig.js";

export const isPSAF = (guild_id) => guild_id === process.env.GUILD_ID

export const msToTimestamp = (ms) => {
  const msAsString = ms.toString();
  return msAsString.substring(0, msAsString.length - 3);
}

export const optionToTimezoneStr = (option = 0) => {
  switch (option) {
    case 1:
      return "CET";
    case 2:
      return "EEST";
    default:
      return "UK";
  }
}

export const getPlayerNick = (player) => 
  player.nick || player.user.global_name || player.user.username

export const removePlayerPrefix = (teamShortName, playerName) => {
  const teamPrefixToRemove = `${teamShortName} | `
  const indexTeamPrefix = playerName.indexOf(teamPrefixToRemove)
  let updatedPlayerName = `${playerName}`
  if(indexTeamPrefix>=0) {
    updatedPlayerName = `${playerName.substring(0,indexTeamPrefix)}${playerName.substring(indexTeamPrefix+teamPrefixToRemove.length)}`
  }
  return updatedPlayerName
}

export const addPlayerPrefix = (teamShortName, playerName) => {
  let prefix = ''
  let displayName = playerName
  if(playerName.startsWith('⭐')) {
    displayName = playerName.substring(1)
    displayName = displayName.trimStart()
    prefix = '⭐ '
  }
  return `${prefix}${teamShortName} | ${displayName}`
}

export const setInternational = (playerName) => playerName.startsWith('⭐ ') ? playerName : `⭐ ${playerName}`

export const removeInternational = (playerName) => playerName.startsWith('⭐ ') ? playerName.substring(2) : playerName

export const getPlayerTeam = (player, teams) => 
  teams.findOne({active:true, $or:player.roles.map(role=>({id:role}))})

export const displayTeam = (team, noLogo) => (
  `Team: ${team.flag} ${team.emoji} ${team.name} - ${team.shortName}` +
  `\r> Budget: ${new Intl.NumberFormat('en-US').format(team.budget)}` +
  `\r> City: ${team.city}` +
  `\r> Palmarès: ${team.description || 'None'}` +
  `${noLogo ? '': `\r> Logo: ${team.logo || 'None'}`}`
)

export const genericFormatMatch = (teams, match) => {
  const league = fixturesChannels.find(({value})=> value === match.league)
  const homeTeam = teams.find(({id})=> id === match.home)
  const awayTeam = teams.find(({id})=> id === match.away)
  let response = `\r<${league.emoji}> **| ${league.name} ${match.matchday}** - <t:${match.dateTimestamp}:F>`
    response += `\r> ${homeTeam.flag} ${homeTeam.emoji} <@&${homeTeam.id}> :vs: <@&${awayTeam.id}> ${awayTeam.emoji} ${awayTeam.flag}`
  return response
}

export const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const getCurrentSeason = async (seasons) => (await seasons.findOne({endedAt: null}))?.season

export const optionsToObject = (options) => Object.fromEntries(options.map(({name, value})=> [name, value]))