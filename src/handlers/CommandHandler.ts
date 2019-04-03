import eris, { Message } from "eris";
import fs from "fs";
import config from "../config";
import CommandModule from "../models/CommandModule";

export default class CommandHandler{
	private moduleList: CommandModule[] = [];
	private bot: eris.Client;

	constructor(bot: eris.Client){
		this.bot = bot;

		this.messageEvent = this.messageEvent.bind(this);
	}

	public get modules(){
		return this.moduleList;
	}

	public loadCommands(){
		fs.readdir("./commands/", (folderErr, folders) => {
			folders.forEach((folder) => {
				try{
					const props = require(`../commands/${folder}`);
					if (props){
						this.moduleList.push(props.default);
					}
					return;
				}
				catch (ex){
					console.log(ex);
					return;
				}
			});
		});
	}

	public hookEvent(){
		this.bot.on("messageCreate", this.messageEvent);
	}

	public unhookEvent(){
		this.bot.off("messageCreate", this.messageEvent);
	}

	private async messageEvent(message: Message){
		if (message.author.bot){
			return;
		}
		const messageArgs = message.content.split(" ");
		// Check if there are any commands that match this message
		if (await this.checkCommand(message, messageArgs)){
			// This means a command was ran, so update database accordingly
			// There is no custom command system in place, but eventually adding that somehow is good
		}
	}

	/**
	 * Returns true or false depending on whether a command was ran
	 * @param {Message} message An erisjs message object
	 * @param {Array} args The message as an array of strings
	 * @param {Array} modules An array of all the loaded commmand modules
	 */
	private async checkCommand(message: eris.Message, args: string[]){
		if (message.content.startsWith(config.bot.defaultPrefix)){
			// Starting at 1 index so that it takes away the prefix
			// This makes it easier to later allow custom prefixes for servers, and just check for those too in the if case above
			args[0] = args[0].substring(config.bot.defaultPrefix.length);
			this.moduleList.forEach(async (module) => {
				if (!message.member){
					return;
				}
				if (!module.checkPermissions(message.member.permission)){
					message.channel.createMessage("You don't have permission to use this command");
					return;
				}
				if (module.name.toLowerCase() === "owner"){
					const devs: any = config.bot.developerIds;
					if (!devs.includes(message.author.id)){
						return;
					}
				}
				const command = module.findCommand(args[0]);
				if (command){
					if (!command.checkPermissions(message.member.permission)){
						message.channel.createMessage("You don't have permission to use this command");
						return;
					}

					if (command.deleteCommand === true){
						await message.delete();
					}

					args.shift();
					await command.commandFunc(message, args);

					return true;
				}
				else{
					return false;
				}
			});
		}
		else{
			return false;
		}
	}
}