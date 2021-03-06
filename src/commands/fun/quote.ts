import { Message, TextChannel, Collection } from "eris";
import KurisuCommand from "../../models/Command";
import { Bot } from "../../bot";
import { getPrimaryColorFromImageUrl } from "../../utility/Util";
import { DiscordEmbed } from "../../utility/DiscordEmbed";

export default class Quote extends KurisuCommand {
	constructor(bot: Bot){
		super(bot, {
			name: "quote",
			description: "Quotes either last message sent or message from Id",
			usage: "quote {Optional Id}",
			aliases: [],
			requirements: [],
			delete: false,
		});
	}

	public execute(message: Message, args: string[]) {
		return new Promise(async (resolve, reject) => {
			let quoteMessage: Message | undefined;
			if (args[0]){
				try{
					quoteMessage = await this.bot.client.getMessage(message.channel.id, args[0]);
				}
				catch {
					quoteMessage = undefined;
				}
			}
			else{
				for (const mes of (message.channel.messages as Collection<Message<TextChannel>>).map((x) => x)){
					if (mes.id === message.id || mes.author.bot){
						continue;
					}
					if (!quoteMessage){
						quoteMessage = mes;
						continue;
					}

					if (mes.createdAt > quoteMessage?.createdAt){
						quoteMessage = mes;
						continue;
					}
				}
			}

			if (!quoteMessage){
				return reject({title: "Message not found", message: "Message wasn't found, is it in this text channel?"});
			}

			let color: number | undefined;
			if (quoteMessage?.author.avatarURL){
				color = await getPrimaryColorFromImageUrl(quoteMessage?.author.avatarURL);
			}

			const embed = new DiscordEmbed();

			if (color){
				embed.setColor(color);
			}

			embed.setAuthor(`${quoteMessage.author.username}#${quoteMessage.author.discriminator}`, undefined, quoteMessage.author.avatarURL);
			embed.setDescription(quoteMessage.content);
			embed.setTimestamp(new Date(quoteMessage.createdAt));

			await message.channel.createMessage(embed.getEmbed());
			return resolve();
		});
	}
}
