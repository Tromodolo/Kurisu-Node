import Axios from "axios";
import * as eris from "eris";
import * as fs from "fs";
import config from "./config.json";
import * as db from "./db";
import { Command, CommandModule, UserTimer } from "./types";
import TriviaHandler from "./util/TriviaHandler";

const bot = new eris.Client(config.botToken, { getAllUsers: true });
const moduleList: CommandModule[] = [];
// The string here is the userid of the user
const xpTimers: Map<string, UserTimer> = new Map<string, UserTimer>();
let triviaGames: TriviaHandler[] = [];
let loadedFiles = 0;

////////////////////////////////////////////////////////////
//                                                        //
//              Load all command modules                  //
//                                                        //
////////////////////////////////////////////////////////////

/**
 * This block of code loads all the command modules within the command/ dir
 */
fs.readdir("./commands/", (folderErr, folders) => {
	folders.forEach((folderName) => {
		fs.readdir(`./commands/${folderName}`, (fileErr, files) => {
			const commands: Command[] = [];
			const commandModule = {
				commands,
				name: folderName,
			};
			let index = 0;
			files.forEach((file) => {
				const commandName = file.split(".")[0];
				const props = require(`./commands/${folderName}/${file}`);
				loadedFiles = loadedFiles + 1;
				commandModule.commands.push(
					{
						aliases: props.aliases,
						description: props.description,
						fullDescription: props.fullDescription,
						function: props.commandFunc,
						name: commandName,
						usage: config.commandPrefix + props.usage,
						requirements: props.requirements,
						deleteCommand: props.deleteCommand,
					});
				if (index + 1 === files.length) {
					moduleList.push(commandModule);
					return;
				}
				else{
					index++;
				}
			});

			moduleList.sort((a: CommandModule, b: CommandModule) => {
				if (a.name < b.name) {
					return -1;
				}
				if (a.name > b.name) {
					return 1;
				}
				return 0;
			});
		});
	});
});

////////////////////////////////////////////////////////////
//                                                        //
//                     Bot Events                         //
//                                                        //
////////////////////////////////////////////////////////////

/**
 * Prepare the bot to be turned on.
 */
bot.on("ready", async () => {
	console.log(`Loaded ${loadedFiles} commands`);

	console.log("Successfully connected as: " + bot.user.username + "#" + bot.user.discriminator); // Log "Ready!"
	let statusMessage: string;
	statusMessage = `${config.commandPrefix}help to get command list`;

	await bot.editStatus("online", {name: statusMessage});
});

/**
 * Event handler that runs everytime that a message is created
 */
bot.on("messageCreate", async (message) => {
	if (message.author.bot){
		return;
	}
	const messageArgs = message.content.split(" ");
	// Check if there are any commands that match this message
	if (await checkCommand(message, messageArgs, moduleList)){
		// This means a command was ran, so update database accordingly
		// There is no custom command system in place, but eventually adding that somehow is good
	}else if (config.xpMoneyEnabled === true){
		// Do other non-command stuff
		await handleExperience(message.author, message);
	}
});

bot.connect();

////////////////////////////////////////////////////////////
//                                                        //
//                   Other Functions                      //
//                                                        //
////////////////////////////////////////////////////////////

/**
 * Returns true or false depending on whether a command was ran
 * @param {Message} message An erisjs message object
 * @param {Array} args The message as an array of strings
 * @param {Array} modules An array of all the loaded commmand modules
 */
async function checkCommand(message: eris.Message, args: string[], modules: CommandModule[]){
	if (message.content.startsWith(config.commandPrefix)){
		// Starting at 1 index so that it takes away the prefix
		// This makes it easier to later allow custom prefixes for servers, and just check for those too in the if case above
		args[0] = args[0].substring(1);
		modules.forEach(async (module) => {
			for (const command of module.commands){
				if (command.name === args[0]){
					await command.function(message, args);
					return true;
				}
			}
			return false;
		});
	}
	else{
		return false;
	}
}

/**
 * Handles adding experience for users
 *
 * @param {eris.User} user user that triggered event
 * @param {eris.Message} message message sent with the triggered event
 * @returns {void}
 */
async function handleExperience(user: eris.User, message: eris.Message){
	// This is a really dumb way of adding 15 to it so it ranges from 16-25 in xpGain
	const xpGain = (Math.floor(Math.random() * 10) + 1) + 15;
	let willUpdate = false;

	// Gets timer to see if it exists
	const userTimer = xpTimers.get(user.id);
	if (userTimer){
		// This would mean a minute has passed
		if (Date.now() - userTimer.time < 60000){
			return;
		}
		else{
			// Because a minute has passed, you can add xp to the database
			const newTimer: UserTimer = { userid: user.id, time: Date.now() };
			xpTimers.set(user.id, newTimer);
			willUpdate = true;
		}
	}
	else {
		// Because the timer doesn't exist, add one to the list and then add xp
		const newTimer: UserTimer = { userid: user.id, time: Date.now() };
		xpTimers.set(user.id, newTimer);
		willUpdate = true;
	}
	if (willUpdate){
		// Check to see if message.member is undefined. This should only happen if the user isn't cached
		// If member is undefined, the guildid won't be sent through meaning only profile xp will increase
		if (!message.member){
			Axios.post(`${config.apiEndpoint}/api/user/exp`, {
				apiKey: config.kurisuApiKey,
				userId: message.author.id,
				username: message.author.username,
				discriminator: message.author.discriminator,
				xpGain,
			}).then((result) => {
				if (result.data.leveledUp){
					// TODO handle level up messages with a toggle if server owners don't want it
					return;
				}
			});
		}
		else{
			Axios.post(`${config.apiEndpoint}/api/user/exp`, {
				apiKey: config.kurisuApiKey,
				userId: message.author.id,
				username: message.author.username,
				discriminator: message.author.discriminator,
				guildId: message.member.guild.id,
				xpGain,
			}).then((result) => {
				if (result.data.leveledUp){
					// TODO handle level up messages with a toggle if server owners don't want it
					return;
				}
			});
		}
	}
	return;
}

////////////////////////////////////////////////////////////
//                                                        //
//                   Trivia Functions                     //
//                                                        //
////////////////////////////////////////////////////////////

/**
 * Adds a TriviaHandler to array. Returns false if channel id already exists
 * @param {Array} handler TriviaHandler to add to array
 */
function addTrivia(handler: TriviaHandler){
	const found = triviaGames.find((x) => x.token === handler.token);
	// Means there already is an ongoing game in the channel
	if (found){
		return false;
	}
	else{
		triviaGames.push(handler);
		return true;
	}
}

/**
 * Removes a TriviaHandler from array
 * @param {Array} handler TriviaHandler to remove from array
 */
function removeTrivia(handler: TriviaHandler){
	let index = 0;
	for (const triv of triviaGames){
		if (triv.token === handler.token){
			break;
		}
		else{
			index++;
		}
	}
	triviaGames = triviaGames.splice(index, 1);
}

export {
	bot,
	moduleList,
	addTrivia,
	removeTrivia,
};
