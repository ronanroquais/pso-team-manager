import { InteractionResponseType } from "discord-interactions"
import { DiscordRequest } from "../utils.js"
import { isPSAF } from "../functions/helpers.js"

export const help = ({guild_id, interaction_id, token}) => {
  let responseLines = ['**/now**: Gives you privately a timestamp representing the current time, plus its code (<t:XXXXX:F>) with extra spaces for copy pasting.',
    '**/timestamp** *date* *timezone*: Gives you privately a timestamp for the date of your choice. Can be "Tomorrow 5PM", "Friday 14:32" etc... ',
    'Careful as the dates are american style, 06/08 is the 8th of June. The timezone attribute is your own timezone  (UK, Central Europe or Turkey) to help the bot generate an accurate time.',
    '**/lineup** *gk*... : Posts a lineup with up to 5 subs. You can also name your opponent by filling the attribute *vs*',
    `${isPSAF(guild_id) ? 'On the PSAF server, your own team name will be prefilled' :''}`,
    '**/boxlineup** *gk*... : Same as **/lineup** but the lineup is sent in a box with better formatting',
    `${isPSAF(guild_id) ? 'On the PSAF server, your own team name will be prefilled, and the box\'s shade will be the colour of your team.' :''}`
  ]
  if(isPSAF(guild_id)){
    const psafCommandLines = [
      '**/team** *team* : List a team\'s details, such as name and budget. Leave *team* empty for details on your own team.',
      '**/players** *team* : List players registered for a team. Leave *team* empty for your own list of players',
    ]
    responseLines = responseLines.concat(psafCommandLines)
  }
  const response = responseLines.join('\r')
  const helpEmbed = {
    "type": "rich",
    "color": 16777215,
    "title": "PSAF Team Manager Commands",
    "description": response,
  }
  return DiscordRequest(`/interactions/${interaction_id}/${token}/callback`, {
    method: 'POST',
    body: {
      type : InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { embeds : [helpEmbed]},
      flags: 1 << 6
    }
  })
}


export const helpCmd = {
  name: 'help',
  description: 'List all the commands you can use for this bot',
  type: 1
}