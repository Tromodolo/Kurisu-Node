import axios from "axios";
import { Message } from "eris";
import Command from "../../models/Command";
import { Bot } from "../../bot";

export default class SetAvatar extends Command {
	constructor(){
		super();
		this.commandName = "setavatar";
		this.aliases = [];
		this.description = "Sets the avatar of the bot";
		this.fullDescription = "Sets the avatar of the bot";
		this.usage = "setname [url]";

		// const requirements: new Object();
		this.requirements = [];
		this.deleteCommand = false;
	}

	public exec(message: Message, args: string[], bot: Bot) {
		return new Promise(async (resolve) => {
			if (args.length < 1){
				message.channel.createMessage("You need to specify a url");
			}
			else{
				axios.get(args[0], {
				  responseType: "arraybuffer",
				})
				.then((response) => {
					const buffer = Buffer.from(response.data, "utf8");
					const avatarBase = "data:image/png;base64," + buffer.toString("base64");
					bot.client.editSelf({ avatar: avatarBase });
				});
			}
			return resolve();
		});
	}
}