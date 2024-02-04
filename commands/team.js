import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions"
import { DiscordRequest } from "../utils.js"
import { displayTeam, genericFormatMatch, getCurrentSeason, optionsToObject } from "../functions/helpers.js"

export const team = async ({interaction_id, application_id, token, options, member, dbClient})=> {
  let response = "No teams found"
  let matchEmbeds = []
  const {team, allmatches} = optionsToObject(options || [])
  let roles = []
  if(!team) {
    roles = member.roles.map(role=>({id:role}))
  } else {
    roles = [{id: team}]
  }
  await dbClient(async ({teams, matches, seasonsCollect})=>{
    const team = await teams.findOne({active:true, $or:roles})
    if(!team)
    {
      response = 'No team found'
      return
    }
    response = displayTeam(team)
    const finished = allmatches ? {} : {finished: null}
    const season = await getCurrentSeason(seasonsCollect)
    const teamsMatches = await matches.find({$or: [{home: team.id}, {away: team.id}], ...finished, season }).sort({dateTimestamp: 1}).toArray()
    console.log(teamsMatches.length)
    const allTeams = await teams.find({active: true}).toArray()
    response += '\r**Upcoming matches:**'
    if(teamsMatches.length === 0 ) {
      response += '\rNone'
    } else {
      let i = 0
      let currentEmbed = ''
      for (const match of teamsMatches) {
        currentEmbed += genericFormatMatch(allTeams, match)
        i++
        if(i === 4) {
          matchEmbeds.push(currentEmbed)
          currentEmbed = ''
          i = 0
        }
      }
      if(i!==0) {
        matchEmbeds.push(currentEmbed)
      }
    }
  })
  const embeds = matchEmbeds.map(matchEmbed => ({
    "type": "rich",
    "color": 16777215,
    "title": "Matches",
    "description": matchEmbed,
  }))
  console.log(embeds.map(em=> em.description.length))
  await DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: response,
        embeds: embeds.slice(0, 3),
        flags: InteractionResponseFlags.EPHEMERAL,
      }
    }
  })
  let i = 3
  while (i<embeds.length) {
    const currentEmbed = embeds.slice(i, i+3)
    console.log(currentEmbed)
    await DiscordRequest(`/webhooks/${application_id}/${token}`, {
      method: 'POST',
      body: {
        type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        content: `${Math.floor(i/3 + 1)}`,
        embeds: currentEmbed,
        flags: InteractionResponseFlags.EPHEMERAL,
      }
    })
    i+=3
  }
}

export const teamCmd = {
  name: 'team',
  description: 'List team details',
  type: 1,
  options: [{
    type: 8,
    name: 'team',
    description: 'Team'
  },{
    type: 5,
    name: 'allmatches',
    description: "Show finished matches?"
  }]
}