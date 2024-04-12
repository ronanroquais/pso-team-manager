import {
  InteractionResponseType,
} from 'discord-interactions';
import { getPlayerTeam, getPlayerNick, optionsToObject, msToTimestamp, postMessage, genericFormatMatch, quickResponse, waitingMsg, updateResponse, genericInterFormatMatch } from '../../functions/helpers.js';
import { getAllPlayers } from '../../functions/playersCache.js';
import { lineupBlacklist, lineupRolesBlacklist, lineupRolesWhitelist, serverChannels, serverRoles } from '../../config/psafServerConfig.js';
import { DiscordRequest } from '../../utils.js';

const nonLineupAttributes = ['_id', 'team', 'matchId', 'vs']
const steam = '<:steam:1201620242015719454>'

export const formatDMLineup = ({gk, lb, rb, cm, lw, rw, sub1, sub2, sub3, sub4, sub5, cb, lcm, rcm, lst, rst}) => {
  let response = `**GK:** ${gk.name} (<@${gk.id}>)\r`;
  response += `**LB:** ${lb.name} (<@${lb.id}>)\r`;
  if(cb) {
    response += `**CB:** ${cb.name} (<@${cb.id}>)\r`;
  }
  response += `**RB:** ${rb.name} (<@${rb.id}>)\r`;
  if(lcm) {
    response += `**LCM:** ${lcm.name} (<@${lcm.id}>)\r`;
    response += `**RCM:** ${rcm.name} (<@${rcm.id}>)\r`;
  } else {
    response += `**CM:** ${cm.name} (<@${cm.id}>)\r`;
  }
  if(lst) {
    response += `**LST:** ${lst.name} (<@${lst.id}>)\r`;
    response += `**RST:** ${rst.name} (<@${rst.id}>)`;
  } else {
    response += `**LW:** ${lw.name} (<@${lw.id}>)\r`;
    response += `**RW:** ${rw.name} (<@${rw.id}>)`;
  }
  if(sub1?.id) {
    response += `\r**Subs:** ${sub1.name} (<@${sub1.id}>)`;
  }
  if(sub2?.id) {
    response += `, ${sub2.name} (<@${sub2.id}>)`;
  }
  if(sub3?.id) {
    response += `, ${sub3.name} (<@${sub3.id}>)`;
  }
  if(sub4?.id) {
    response += `, ${sub4.name} (<@${sub4.id}>)`;
  }
  if(sub5?.id) {
    response += `, ${sub5.name} (<@${sub5.id}>)`;
  }
  return response
}

export const formatLineup = ({gk, lb, rb, cm, lw, rw, sub1, sub2, sub3, sub4, sub5, admin}) => {
  if(gk && gk.id) {
    let response = `**GK:** <@${gk.id}> ${gk.registered ? steam: ''}${gk.ingamename ? ` (${gk.ingamename})`: ''}${admin && gk.steam ? ' '+gk.steam:''}\r`;
    response += `**LB:** <@${lb.id}> ${lb.registered ? steam : ''}${lb.ingamename ? ` (${lb.ingamename})`: ''}${admin && lb.steam ? ' '+lb.steam:''}\r`;
    response += `**RB:** <@${rb.id}> ${rb.registered ? steam : ''}${rb.ingamename ? ` (${rb.ingamename})`: ''}${admin && rb.steam ? ' '+rb.steam:''}\r`;
    response += `**CM:** <@${cm.id}> ${cm.registered ? steam : ''}${cm.ingamename ? ` (${cm.ingamename})`: ''}${admin && cm.steam ? ' '+cm.steam:''}\r`;
    response += `**LW:** <@${lw.id}> ${lw.registered ? steam : ''}${lw.ingamename ? ` (${lw.ingamename})`: ''}${admin && lw.steam ? ' '+lw.steam:''}\r`;
    response += `**RW:** <@${rw.id}> ${rw.registered ? steam : ''}${rw.ingamename ? ` (${rw.ingamename})`: ''}${admin && rw.steam ? ' '+rw.steam:''}`;
    if(sub1) {
      response += `\r**Subs:** <@${sub1.id}> ${sub1.registered ? steam : ''}${sub1.ingamename ? ` (${sub1.ingamename})`: ''}${admin && sub1.steam ? ' '+sub1.steam:''}\r`;
    }
    if(sub2) {
      response += `, <@${sub2.id}> ${sub2.registered ? steam : ''}${sub2.ingamename ? ` (${sub2.ingamename})`: ''}${admin && sub2.steam ? ' '+sub2.steam:''}\r`;
    }
    if(sub3) {
      response += `, <@${sub3.id}> ${sub3.registered ? steam : ''}${sub3.ingamename ? ` (${sub3.ingamename})`: ''}${admin && sub3.steam ? ' '+sub3.steam:''}\r`;
    }
    if(sub4) {
      response += `, <@${sub4.id}> ${sub4.registered ? steam : ''}${sub4.ingamename ? ` (${sub4.ingamename})`: ''}${admin && sub4.steam ? ' '+sub4.steam:''}\r`;
    }
    if(sub5) {
      response += `, <@${sub5.id}> ${sub5.registered ? steam : ''}${sub5.ingamename ? ` (${sub5.ingamename})`: ''}${admin && sub5.steam ? ' '+sub5.steam:''}\r`;
    }
    return response
  } else {
    let response = `**GK:** <@${gk}>\r`;
    response += `**LB:** <@${lb}>\r`;
    response += `**RB:** <@${rb}>\r`;
    response += `**CM:** <@${cm}>\r`;
    response += `**LW:** <@${lw}>\r`;
    response += `**RW:** <@${rw}>`;
    if(sub1) {
      response += `\r**Subs:** <@${sub1}>`;
    }
    if(sub2) {
      response += `, <@${sub2}>`;
    }
    if(sub3) {
      response += `, <@${sub3}>`;
    }
    if(sub4) {
      response += `, <@${sub4}>`;
    }
    if(sub5) {
      response += `, <@${sub5}>`;
    }
    return response
  }
}

export const formatEightLineup = ({gk, lb, cb, rb, lcm, rcm, lst, rst, sub1, sub2, sub3, sub4, sub5, admin}) => {
  if(gk && gk.id) {
    let response = `**GK:** <@${gk.id}> ${gk.registered ? steam : ''}${gk.ingamename ? ` (${gk.ingamename})`: ''}${admin && gk.steam ? ' '+gk.steam:''}\r`;
    response += `**LB:** <@${lb.id}> ${lb.registered ? steam : ''}${lb.ingamename ? ` (${lb.ingamename})`: ''}${admin && lb.steam ? ' '+lb.steam:''}\r`;
    response += `**CB:** <@${cb.id}> ${cb.registered ? steam : ''}${cb.ingamename ? ` (${cb.ingamename})`: ''}${admin && cb.steam ? ' '+cb.steam:''}\r`;
    response += `**RB:** <@${rb.id}> ${rb.registered ? steam : ''}${rb.ingamename ? ` (${rb.ingamename})`: ''}${admin && rb.steam ? ' '+rb.steam:''}\r`;
    response += `**LCM:** <@${lcm.id}> ${lcm.registered ? steam : ''}${lcm.ingamename ? ` (${lcm.ingamename})`: ''}${admin && lcm.steam ? ' '+lcm.steam:''}\r`;
    response += `**RCM:** <@${rcm.id}> ${rcm.registered ? steam : ''}${rcm.ingamename ? ` (${rcm.ingamename})`: ''}${admin && rcm.steam ? ' '+rcm.steam:''}\r`;
    response += `**LST:** <@${lst.id}> ${lst.registered ? steam : ''}${lst.ingamename ? ` (${lst.ingamename})`: ''}${admin && lst.steam ? ' '+lst.steam:''}\r`;
    response += `**RST:** <@${rst.id}> ${rst.registered ? steam : ''}${rst.ingamename ? ` (${rst.ingamename})`: ''}${admin && rst.steam ? ' '+rst.steam:''}`;
    if(sub1) {
      response += `\r**Subs:** <@${sub1.id}> ${sub1.registered ? steam : ''}${sub1.ingamename ? ` (${sub1.ingamename})`: ''}${admin && sub1.steam ? ' '+sub1.steam:''}\r`;
    }
    if(sub2) {
      response += `, <@${sub2.id}> ${sub2.registered ? steam : ''}${sub2.ingamename ? ` (${sub2.ingamename})`: ''}${admin && sub2.steam ? ' '+sub2.steam:''}\r`;
    }
    if(sub3) {
      response += `, <@${sub3.id}> ${sub3.registered ? steam : ''}${sub3.ingamename ? ` (${sub3.ingamename})`: ''}${admin && sub3.steam ? ' '+sub3.steam:''}\r`;
    }
    if(sub4) {
      response += `, <@${sub4.id}> ${sub4.registered ? steam : ''}${sub4.ingamename ? ` (${sub4.ingamename})`: ''}${admin && sub4.steam ? ' '+sub4.steam:''}\r`;
    }
    if(sub5) {
      response += `, <@${sub5.id}> ${sub5.registered ? steam : ''}${sub5.ingamename ? ` (${sub5.ingamename})`: ''}${admin && sub5.steam ? ' '+sub5.steam:''}\r`;
    }
    return response
  } else {
    let response = `GK: <@${gk}>\r`;
    response += `LB: <@${lb}>\r`;
    response += `CB: <@${cb}>\r`;
    response += `RB: <@${rb}>\r`;
    response += `LCM: <@${lcm}>\r`;
    response += `RCM: <@${rcm}>\r`;
    response += `LST: <@${lst}>\r`;
    response += `RST: <@${rst}>`;
    if(sub1) {
      response += `\rSubs: <@${sub1}>`;
    }
    if(sub2) {
      response += `, <@${sub2}>`;
    }
    if(sub3) {
      response += `, <@${sub3}>`;
    }
    if(sub4) {
      response += `, <@${sub4}>`;
    }
    if(sub5) {
      response += `, <@${sub5}>`;
    }
    return response
  }
}

const saveLineup = async ({dbClient, callerId, lineup, objLineup={}, playerTeam, member, edit=false, guild_id, isInternational, interaction_id, token, application_id, channel_id, isEightPlayers }) => {
  const lineupFormatFunction = isEightPlayers ? formatEightLineup : formatLineup
  if(process.env.GUILD_ID === guild_id && channel_id === serverChannels.lineupsChannelId) {
    await waitingMsg({interaction_id, token})
    let playerTeam= ''
    const startOfDay = new Date()
    startOfDay.setUTCHours(startOfDay.getHours()-1,0,0,0)
    const endOfDay = new Date()
    endOfDay.setUTCHours(23,59,59,999)
    const startDateTimestamp = msToTimestamp(Date.parse(startOfDay))
    const endDateTimestamp = msToTimestamp(Date.parse(endOfDay))
    
    return await dbClient(async ({teams, matches, nationalities, players, lineups})=>{
      const [dbPlayer, nations] = await Promise.all([
        players.findOne({id: member.user.id}),
        nationalities.find({}).toArray()
      ])
      const nation = nations.find(item=> item.name === dbPlayer.nat1)
      const memberTeam = await getPlayerTeam(member, teams)
      const teamId = isInternational ? nation.name: memberTeam.id
      const nextMatches = await matches.find({isInternational: isInternational ? isInternational : {$ne: true}, dateTimestamp: { $gt: startDateTimestamp, $lt: endDateTimestamp}, finished: {$in: [false, null]}, $or: [{home: teamId}, {away: teamId}]}).sort({dateTimestamp:1}).toArray()
      const nextMatch = nextMatches[0]
      const matchId = nextMatch?._id?.toString() || ''
      let previousLineup = {}
      if(edit) {
        if(!nextMatch){
          return updateResponse({application_id, token, content: `Cannot find the lineup you're trying to edit`})
        }
        previousLineup = await lineups.findOne({matchId, team: teamId})
        if(!previousLineup) {
          return updateResponse({application_id, token, content: `Cannot find the lineup you're trying to edit`})
        }
      }
      if(nextMatch) {
        if(!isInternational){
          const teamsOfMatch = await teams.find({$or:[{id:nextMatch.home}, {id:nextMatch.away}]}).toArray()
          playerTeam = genericFormatMatch(teamsOfMatch, nextMatch) + '\r'
        } else {
          genericInterFormatMatch(nations, nextMatch)
        }
        await lineups.updateOne({matchId, team: teamId}, {
          $setOnInsert: {
            matchId,
            team: teamId
          },
          $set: {
            ...previousLineup,
            ...lineup
          }
        }, {upsert: true})
      }
      let lineupPlayers = await players.find({id: {$in: Object.values(lineup)}}).toArray()
      playerTeam += isInternational ? nation.flag + ' ' + nation.name + ' ' : memberTeam.emoji+' ' + memberTeam.name + ' '
      lineupPlayers = lineupPlayers.filter(lineupPlayer=> lineupPlayer.steam)
      objLineup = Object.fromEntries(Object.entries(objLineup).map(posLineup=> ({...(lineupPlayers.find(lineupPlayer => lineupPlayer.id === posLineup?.id)|| {}), ...posLineup})))
      
      let response = `\r<@${callerId}> posted:\r${playerTeam}lineup ${lineup.vs? `vs ${lineup.vs}`: ''}\r`
      response += lineupFormatFunction({vs: lineup.vs, ...objLineup})
      console.log(response)

      let threadMessage = `\r<@${callerId}> posted:\r${playerTeam}lineup ${lineup.vs? `vs ${lineup.vs}`: ''}\r`
      threadMessage += lineupFormatFunction({vs: lineup.vs, ...objLineup, admin: true})
      
      const messageResp = await postMessage({channel_id, content: response})
      const message = await messageResp.json()
      if(nextMatch?.thread) {
        try {
          await DiscordRequest(`/channels/${nextMatch.thread}/messages`, {
            method: 'POST',
            body: {
              content: threadMessage
            }
          })
        }
        catch(e) {
          console.error(e)
        }
      }
      if(matchId){
        await lineups.updateOne({matchId, team: teamId}, {$set: {message: message.id}})
      }
      return updateResponse({application_id, token, content: response})
    })
  } else {
    let response = `<@${callerId}> posted:\r${playerTeam? playerTeam : ''}lineup ${lineup.vs? `vs ${lineup.vs}`: ''}\r`
    response += lineupFormatFunction({vs: lineup.vs, ...objLineup})
    console.log(response)
    
    return quickResponse({interaction_id, token, content: response})
  }
}

const verifyClubLineup = (discPlayer, playerId) => {
  const response = {}
  if(lineupBlacklist.includes(playerId)) {
    response.message = `<@${playerId}> can't be included in a lineup`
  }
  if(discPlayer.roles.some(role => lineupRolesBlacklist.includes(role))) {
    response.message = `<@${playerId}> is not eligible to play`
  }
  if(!discPlayer.roles.some(role => lineupRolesWhitelist.includes(role))) {
    response.message =`<@${playerId}> isn't verified`
  }
  return response
}

const verifyInternationalLineup = (discPlayer, playerId) => {
  const response = {}
  if(lineupBlacklist.includes(playerId)) {
    response.message = `<@${playerId}> can't be included in a lineup`
  }
  if(discPlayer.roles.some(role => lineupRolesBlacklist.includes(role))) {
    response.message = `<@${playerId}> is not eligible to play`
  }
  if(!discPlayer.roles.includes(serverRoles.nationalTeamPlayerRole)) {
     response.message = `<@${playerId}> is not an international player`
  }
  if(!discPlayer.roles.some(role => lineupRolesWhitelist.includes(role))) {
     response.message = `<@${playerId}> isn't verified`
  }
  return response
}

export const editLineup = async({options, interaction_id, callerId, token, member, guild_id, application_id, channel_id, dbClient}) => {
  return lineup({options, interaction_id, callerId, token, member, edit:true, guild_id, application_id, channel_id, dbClient})
}

export const lineup = async({options, interaction_id, callerId, token, member, edit = false, guild_id, application_id, channel_id, dbClient}) => {
  const lineup = optionsToObject(options)
  const allPlayers = await getAllPlayers(guild_id)
  let forbiddenUsersList = []
  let objLineup = Object.fromEntries(
    Object.entries(lineup)
      .filter(([name])=> !nonLineupAttributes.includes(name))
      .map(([name, value])=> {
        const discPlayer = allPlayers.find(player=> player?.user?.id === value)
        if(guild_id === process.env.GUILD_ID) {
          const response = verifyClubLineup(discPlayer, value)
          if(response.message) {
            forbiddenUsersList.push(response.message)
          }
        }
        return [name, {id: value, name: getPlayerNick(discPlayer), registered: discPlayer.roles.includes(serverRoles.registeredRole)}]
      })
  )
  if(forbiddenUsersList.length>0) {
    return quickResponse({interaction_id, token, content: `Can't post this lineup, restricted users: \r${forbiddenUsersList.join('\r')}`})
  }
  return saveLineup({dbClient, lineup, callerId, objLineup, member, edit, application_id, guild_id, isInternational:false, interaction_id, token, channel_id, isEightPlayers: false})
}

export const internationalLineup = async ({options, member, callerId, guild_id, interaction_id, application_id, token, channel_id, dbClient}) => {
  const lineup = optionsToObject(options)
  const allPlayers = await getAllPlayers(guild_id)
  let forbiddenUsersList = []
  let objLineup = Object.fromEntries(
    Object.entries(lineup)
      .filter(([name])=> !nonLineupAttributes.includes(name))
      .map(([name, value])=> {
        const discPlayer = allPlayers.find(player=> player?.user?.id === value)
        if(guild_id === process.env.GUILD_ID) {
          const response = verifyInternationalLineup(discPlayer, value)
          if(response.message) {
            forbiddenUsersList.push(response.message)
          }
        }
        return [name, {id: value, name: getPlayerNick(discPlayer), registered: discPlayer.roles.includes(serverRoles.registeredRole)}]
      })
  )
  if(forbiddenUsersList.length>0) {
    return quickResponse({interaction_id, token, content: `Can't post this lineup, restricted users: ${forbiddenUsersList.join(', ')}`})
  }
  return saveLineup({dbClient, lineup, callerId, objLineup, member, guild_id, application_id, isInternational:true, interaction_id, token, channel_id, isEightPlayers: false})
}

export const editEightLineup = ({options, interaction_id, callerId, token, application_id, channel_id, member, guild_id, dbClient}) => 
  eightLineup({options, interaction_id, callerId, token, application_id, channel_id, member, guild_id, edit: true, dbClient})

export const eightLineup = async ({options, interaction_id, callerId, token, application_id, channel_id, edit=false, member, guild_id, dbClient}) => {
  const lineup = optionsToObject(options)
  const allPlayers = await getAllPlayers(guild_id)
  let forbiddenUsersList = []
  let objLineup = Object.fromEntries(
    Object.entries(lineup)
      .filter(([name])=> !nonLineupAttributes.includes(name))
      .map(([name, value])=> {
        const discPlayer = allPlayers.find(player=> player?.user?.id === value)
        if(guild_id === process.env.GUILD_ID) {
          const response = verifyClubLineup(discPlayer, value)
          if(response.message) {
            forbiddenUsersList.push(response.message)
          }
        }
        return [name, {id: value, name: getPlayerNick(discPlayer), registered: discPlayer.roles.includes(serverRoles.registeredRole)}]
      })
  )
  if(forbiddenUsersList.length>0) {
    return quickResponse({interaction_id, token, content: `Can't post this lineup, restricted users: ${forbiddenUsersList.join(', ')}`})
  }
  return saveLineup({dbClient, lineup, callerId, objLineup, member, guild_id, application_id, edit, isInternational:false, interaction_id, token, channel_id, isEightPlayers: true})
}

const findPlayerNick = (playersList, id) => {
  const player = playersList.find(player => player?.user?.id === id)
  return getPlayerNick(player)
}

export const boxLineup = async ({res, options, member, guild_id, dbClient}) => {
  const {gk, lb, rb, cm, lw, rw, sub1, sub2, sub3, sub4, sub5, vs} = Object.fromEntries(options.map(({name, value})=> [name, value]))
  let playerTeam = ''
  let embedColor = 16777215
  let teamIcon = ''
  const allPlayers = await getAllPlayers(guild_id)
  if(process.env.GUILD_ID === guild_id) {
    const startOfDay = new Date()
    startOfDay.setUTCHours(startOfDay.getHours()-1,0,0,0)
    const endOfDay = new Date()
    endOfDay.setUTCHours(23,59,59,999)
    const startDateTimestamp = msToTimestamp(Date.parse(startOfDay))
    const endDateTimestamp = msToTimestamp(Date.parse(endOfDay))
    await dbClient(async ({teams, matches, lineups})=>{
      const memberTeam = await getPlayerTeam(member, teams)
      const nextMatches = await matches.find({dateTimestamp: { $gt: startDateTimestamp, $lt: endDateTimestamp}, finished: {$in: [false, null]}, $or: [{home: memberTeam.id}, {away: memberTeam.id}]}).sort({dateTimestamp:1}).toArray()
      const nextMatch = nextMatches[0]
      if(nextMatch) {
        const teamsOfMatch = await teams.find({active: true, $or:[{id:nextMatch.home}, {id:nextMatch.away}]}).toArray()
        playerTeam = genericFormatMatch(teamsOfMatch, nextMatch) + '\r'
        const matchId = nextMatch._id.toString()
        await lineups.updateOne({matchId, team:memberTeam.id}, {
          $setOnInsert: {
            matchId,
            team: memberTeam.id
          },
          $set: {
            gk,
            lb,
            rb,
            cm,
            lw,
            rw,
            sub1,
            sub2,
            sub3,
            sub4,
            sub5
          }
        }, {upsert: true})
      }
      playerTeam = memberTeam.name +' '
      embedColor = memberTeam.color
      teamIcon = `https://cdn.discordapp.com/role-icons/${memberTeam.id}/${memberTeam.icon}.png`
    })
  }
  const optionValues = options.map(option => option.value).sort()
  const lineupPlayers = optionValues.map(id => allPlayers.find(player => player.user.id === id))
  const lineupEmbed = {
    "type": "rich",
    "color": embedColor,
    "thumbnail": {
      "url": "https://shinmugen.net/Football-pitch-icon.png"
    },
    "author": {
      "name": `${playerTeam}Lineup by ${getPlayerNick(member)}`
    },
    "fields": [
      {
        "name": `${vs? `Against ${vs}`: ' '}`,
        "value": " ",
        "inline": false
      },
      {
        "name": " ",
        "value": "",
        "inline": false
      },
      {
        "name": "LW:",
        "value": `<@${lw}>\r(${findPlayerNick(lineupPlayers, lw)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      },
      {
        "name": "RW:",
        "value": `<@${rw}>\r(${findPlayerNick(lineupPlayers, rw)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      },
      {
        "name": "CM",
        "value": `<@${cm}>\r(${findPlayerNick(lineupPlayers, cm)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      },
      {
        "name": "LB",
        "value": `<@${lb}>\r(${findPlayerNick(lineupPlayers, lb)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      },
      {
        "name": "RB",
        "value": `<@${rb}>\r(${findPlayerNick(lineupPlayers, rb)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      },
      {
        "name": "GK",
        "value": `<@${gk}>\r(${findPlayerNick(lineupPlayers, gk)})`,
        "inline": true
      },
      {
        "name": " ",
        "value": "",
        "inline": true
      }
    ]
  }
  if(sub1) {
    lineupEmbed.fields.push(
      {
        "name": "Subs",
        "value": `${sub1? `<@${sub1}> (${findPlayerNick(lineupPlayers, sub1)})`: ''}${sub2? `, <@${sub2}> (${findPlayerNick(lineupPlayers, sub2)})`: ''}${sub3? `, <@${sub3}> (${findPlayerNick(lineupPlayers, sub3)})`: ''}${sub4? `, <@${sub4}> (${findPlayerNick(lineupPlayers, sub4)})`: ''}${sub5? `, <@${sub5}> (${findPlayerNick(lineupPlayers, sub5)})`: ''}`,
        "inline": false
      })
  }
  if(teamIcon){
    lineupEmbed.author.icon_url = teamIcon
  }
  return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds : [lineupEmbed]}
  })
}


export const lineupCmd = {
  name: 'lineup',
  description: 'Create a lineup for your team',
  type: 1,
  options: [{
    type: 6,
    name: 'gk',
    description: 'GK',
    required: true
  },{
    type: 6,
    name: 'lb',
    description: 'LB',
    required: true
  },{
    type: 6,
    name: 'rb',
    description: 'RB',
    required: true
  },{
    type: 6,
    name: 'cm',
    description: 'CM',
    required: true
  },{
    type: 6,
    name: 'lw',
    description: 'LW',
    required: true
  },{
    type: 6,
    name: 'rw',
    description: 'RW',
    required: true
  },{
    type: 6,
    name: 'sub1',
    description: 'Sub1'
  },{
    type: 6,
    name: 'sub2',
    description: 'Sub2'
  },{
    type: 6,
    name: 'sub3',
    description: 'Sub3'
  },{
    type: 6,
    name: 'sub4',
    description: 'Sub4'
  },{
    type: 6,
    name: 'sub5',
    description: 'Sub5'
  }, {
    type: 3,
    name: 'vs',
    description: 'Against'
  }]
}

export const boxLineupcmd = {...lineupCmd, name: 'boxlineup'}
export const internationalLineupCmd = {...lineupCmd, name: 'interlineup'}
export const editLineupCmd = {
  name: 'lineupedit',
  description: 'Edit a saved lineup for your team',
  type: 1,
  options: lineupCmd.options.map(option=> ({...option, required: false}))
}
export const eightLineupCmd = {
  name: 'eightlineup',
  description: 'Create a 8v8 lineup for your team',
  type: 1,
  options: [{
    type: 6,
    name: 'gk',
    description: 'GK',
    required: true
  },{
    type: 6,
    name: 'lb',
    description: 'LB',
    required: true
  },{
    type: 6,
    name: 'cb',
    description: 'CB',
    required: true
  },{
    type: 6,
    name: 'rb',
    description: 'RB',
    required: true
  },{
    type: 6,
    name: 'lcm',
    description: 'LCM',
    required: true
  },{
    type: 6,
    name: 'rcm',
    description: 'RCM',
    required: true
  },{
    type: 6,
    name: 'lst',
    description: 'LST',
    required: true
  },{
    type: 6,
    name: 'rst',
    description: 'RST',
    required: true
  },{
    type: 6,
    name: 'sub1',
    description: 'Sub1'
  },{
    type: 6,
    name: 'sub2',
    description: 'Sub2'
  },{
    type: 6,
    name: 'sub3',
    description: 'Sub3'
  },{
    type: 6,
    name: 'sub4',
    description: 'Sub4'
  },{
    type: 6,
    name: 'sub5',
    description: 'Sub5'
  },{
    type: 6,
    name: 'sub6',
    description: 'Sub6'
  }, {
    type: 3,
    name: 'vs',
    description: 'Against'
  }]
}

export const editEightLineupCmd = {
  name: 'eightlineupedit',
  description: 'Edit a saved 8v8 lineup for your team',
  type: 1,
  options: eightLineupCmd.options.map(option=> ({...option, required:false}))
}
