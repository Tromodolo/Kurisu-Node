import { createCanvas, Image } from "canvas";
import drawMultilineText from "canvas-multiline-text";
import { Message } from "eris";
import fs from "fs";
import path from "path";
import KurisuCommand from "../../models/Command";
import { Bot } from "../../bot";

export default class Deathnote extends KurisuCommand {
	constructor(bot: Bot){
		super(bot, {
			name: "deathnote",
			description: "Puts someone's name into the death note",
			usage: "deathnote {person}",
			aliases: [],
			requirements: [],
			delete: false,
		});
	}

	public execute(message: Message, args: string[]) {
		return new Promise(async (resolve, reject) => {
			let text = "";
			if (args.length < 1){
				text = `${message.author.username}#${message.author.discriminator}`;
			}
			else{
				text = args.join(" ");
			}
			if (message.mentions.length > 0){
				for (const user of message.mentions){
					text = text.replace(/<@!?[0-9]*>/, user.username);
				}
			}

			const canvas = createCanvas(1000, 562);
			const ctx = canvas.getContext("2d");

			const kirby = new Image();
			kirby.src = fs.readFileSync(path.join(__dirname, `../../../data/deathnote/deathnote.png`));

			ctx.drawImage(kirby, 0, 0, 1000, 562);

			drawMultilineText(
				ctx,
				text,
				{
					rect: {
						x: 500,
						y: 375,
						width: 300,
						height: 150,
					},
					font: "Indie Flower",
					verbose: false,
					lineHeight: 1.4,
					minFontSize: 24,
					maxFontSize: 24,
				},
			);

			// Converts canvas to buffer and sends it to the response
			const buffer = canvas.toBuffer();
			await message.channel.createMessage("", { file: buffer, name: "deathnote.png"});
			return resolve();
		});
	}
}