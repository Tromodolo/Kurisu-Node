import { Message } from "eris";
import { Bot } from "../../bot";
import Command from "../../models/Command";

export default class SetName extends Command {
	constructor(){
		super();
		this.commandName = "setname";
		this.aliases = [];
		this.description = "Sets the name of the bot";
		this.fullDescription = "Sets the name of the bot";
		this.usage = "setname Kurisu";

		// const requirements: new Object();
		this.requirements = [];
		this.deleteCommand = false;
	}

	public exec(message: Message, args: string[], bot: Bot) {
		return new Promise(async (resolve) => {
			if (args.length < 1){
				message.channel.createMessage("You need to specify a name");
			}
			else{
				bot.client.editSelf({username: args.join(" ")});
				message.channel.createMessage("Name changed! :ok_hand:");
			}
			return resolve();
		});
	}
}