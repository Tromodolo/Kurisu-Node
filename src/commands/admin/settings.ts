import botConfig from "../../config";
import Command from "../../models/Command";
import ReactionListener from "../../handlers/ReactionListener";
import ResponseListener from "../../handlers/ResponseListener";
import { Message, Client, Emoji, GuildChannel, TextChannel } from "eris";
import { DiscordEmbed } from "../../utility/DiscordEmbed";
import { DatabaseHandler } from "../../handlers";
import { ConfigFeature, GuildConfig } from "../../database/models/GuildConfig";
import { Guild } from "../../database/models/Guild";
import { Bot } from "../../bot";
import { getChannelByName } from "../../utility/Util";

const LEVEL_UP_EMOJI = "🎉";
const KICK_BAN_EMOJI = "🛑";
const JOIN_LEAVE_EMOJI = "🚪";

export default class Settings extends Command {
	constructor(){
		super();
		this.commandName = "settings";
		this.aliases = [
			"config",
		];
		this.description = "Sets up server settings";
		this.fullDescription = "Sets up server settings";
		this.usage = "settings";
		this.requirements = [
			"manageGuild",
		];
		this.deleteCommand = false;
	}

	public exec(message: Message, args: string[], bot: Bot) {
		return new Promise(async (resolve) => {
			if (!(message.channel as GuildChannel).guild){
				return;
			}
			const guild = await bot.db.getOrCreateGuild((message.channel as GuildChannel).guild);

			const embed = new DiscordEmbed();
			embed.setAuthor("Admin Menu", "", bot.client.user.avatarURL);
			embed.setColor(parseInt(botConfig.bot.color));
			embed.setDescription(`
**React to this message to edit settings.**

${LEVEL_UP_EMOJI} - Level-up Messages
${KICK_BAN_EMOJI} - Ban/Kick Messages
${JOIN_LEAVE_EMOJI} - Join/Leave Messages
			`);
			const sentMessage = await message.channel.createMessage(embed.getEmbed());
			sentMessage.addReaction(LEVEL_UP_EMOJI);
			sentMessage.addReaction(KICK_BAN_EMOJI);
			sentMessage.addReaction(JOIN_LEAVE_EMOJI);

			const reactions = new ReactionListener(bot.client, sentMessage, 30 * 1000);
			reactions.on("reactionAdd", async (reactionMessage: Message, emoji: Emoji, userId: string) => {
				if (userId === message.author.id){
					switch (emoji.name){
						case LEVEL_UP_EMOJI:
							await reactionMessage.removeReactions();
							await handleEnabled(reactionMessage, bot.db, guild, bot.client, userId, ConfigFeature.LevelUpMessage);
							return;
						case KICK_BAN_EMOJI:
							await reactionMessage.removeReactions();
							await handleSelectChannel(reactionMessage, bot.db, guild, bot.client, userId, ConfigFeature.KickBanNotification);
							return;
						case JOIN_LEAVE_EMOJI:
							await reactionMessage.removeReactions();
							await handleSelectChannel(reactionMessage, bot.db, guild, bot.client, userId, ConfigFeature.JoinLeaveNotification);
							return;
						default:
							return;
					}
				}
			});
			return resolve();
		});
	}
}

async function handleSelectChannel(reactionMessage: Message, db: DatabaseHandler, guild: Guild, bot: Client, userId: string, type: ConfigFeature){
	const index = guild.configs.findIndex((x) => x.configType === type);
	let config: GuildConfig;
	if (index < 0){
		config = new GuildConfig();
		config.configType = type;
		config.enabled = false;
		config.guild = guild;
		config.value = "";
	}
	else{
		config = guild.configs[index];
	}

	const activeChannel = (reactionMessage.channel as TextChannel).guild.channels.get(config.value);

	const embed = new DiscordEmbed();
	embed.setAuthor("Admin Menu", "", bot.user.avatarURL);
	embed.setColor(parseInt(botConfig.bot.color));
	embed.setDescription(`Enter *channel name*, **disable** or **cancel**.
Currently: **${config.enabled ? (activeChannel || {name: null}).name || "Deleted Channel" : "Disabled"}**`);
	await reactionMessage.edit(embed.getEmbed());

	const responseHandler = new ResponseListener(bot, userId, 30 * 1000);
	responseHandler.on("response", async (responseMessage: Message) => {
		switch (responseMessage.content.toLowerCase()){
			case "disable":
				config.enabled = false;
				embed.setDescription(":x: Setting successfully disabled.");
				await reactionMessage.edit(embed.getEmbed());
				break;
			case "cancel":
				embed.setDescription(":exclamation: Menu canceled.");
				await reactionMessage.edit(embed.getEmbed());
				responseHandler.stopListening();
				break;
			default:
				const channels = (reactionMessage.channel as TextChannel).guild.channels.filter((x) => x.type === 0).map((x) => x);
				const channel = getChannelByName((channels as TextChannel[]), responseMessage.content);
				embed.setDescription(`:white_check_mark: Channel set to **#${channel.name}**`);
				await reactionMessage.edit(embed.getEmbed());
				responseHandler.stopListening();

				config.enabled = true;
				config.value = channel.id;
				break;
		}

		if (index < 0){
		guild.configs.push(config);
		}
		else{
			guild.configs[index] = config;
		}

		await db.guildRepo.save(guild);
	});
}

async function handleEnabled(reactionMessage: Message, db: DatabaseHandler, guild: Guild, bot: Client, userId: string, type: ConfigFeature){
	const index = guild.configs.findIndex((x) => x.configType === type);
	let config: GuildConfig;
	if (index < 0){
		config = new GuildConfig();
		config.configType = type;
		config.enabled = false;
		config.guild = guild;
		config.value = "";
	}
	else{
		config = guild.configs[index];
	}

	const embed = new DiscordEmbed();
	embed.setAuthor("Admin Menu", "", bot.user.avatarURL);
	embed.setColor(parseInt(botConfig.bot.color));
	embed.setDescription(`Enter **enable**, **disable** or **cancel**.
Currently: ${config.enabled ? "Enabled" : "Disabled"}`);
	await reactionMessage.edit(embed.getEmbed());

	const responseHandler = new ResponseListener(bot, userId, 30 * 1000);
	responseHandler.on("response", async (responseMessage: Message) => {
		switch (responseMessage.content.toLowerCase()){
			case "enable":
				config.enabled = true;
				embed.setDescription(":white_check_mark: Setting successfully enabled.");
				await reactionMessage.edit(embed.getEmbed());
				break;
			case "disable":
				config.enabled = false;
				embed.setDescription(":x: Setting successfully disabled.");
				await reactionMessage.edit(embed.getEmbed());
				break;
			case "cancel":
				embed.setDescription(":exclamation: Menu canceled.");
				await reactionMessage.edit(embed.getEmbed());
				responseHandler.stopListening();
				return;
			default:
				return;
		}

		if (index < 0){
		guild.configs.push(config);
		}
		else{
			guild.configs[index] = config;
		}

		await db.guildRepo.save(guild);
	});
}