/**
 * pets.ts
 *
 * Pets another user
 *
 * Last Edit - Oct 18, 2018 by Tromo
 */

import { Message } from "eris";
import fs from "fs";
import config from "../../config";
import KurisuCommand from "../../models/Command";
import { DiscordEmbed } from "../../utility/DiscordEmbed";
import { getUserByMessage } from "../../utility/Util";
import { Bot } from "../../bot";

export default class Pet extends KurisuCommand {
	constructor(bot: Bot){
		super(bot, {
			name: "pet",
			description: "Pets someone or gets patted if unspecified",
			usage: "pet {user}",
			aliases: [],
			requirements: [],
			delete: false,
		});
	}

	public execute(message: Message, args: string[]) {
		return new Promise(async (resolve, reject) => {
			if (!message.member){
				return resolve();
			}

			const embed = new DiscordEmbed();
			const user = getUserByMessage(message, args);
			let embedMessage = "";

			embed.setColor(parseInt(config.bot.color));

			if (!user || user.id === message.member.id){
				embedMessage = `*Pets* ${message.member.mention}`;
			}
			else{
				embedMessage = `${message.member.mention} *pets* ${user.mention}`;
			}

			let fileNum = 1;
			fs.readdir("../data/pet", (err: Error, files: any) => {
				fileNum = files.length;

				const randomFile = Math.floor(Math.random() * fileNum);

				fs.readFile(`../data/pet/${randomFile}.gif`, (err2: Error, data: Buffer ) => {
					embed.setDescription(embedMessage);
					embed.setImage("attachment://pet.gif");
					message.channel.createMessage(embed.getEmbed(), { file: data, name: "pet.gif" });
				});
			});
			return resolve();
		});
	}
}