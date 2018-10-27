var exports = module.exports = {};

const client = require("../../bot.js").client,
	  db = require("../../db");

exports.aliases = [
	"colors"
]
exports.description = "Shows colour assignment menu";
exports.fullDescription = "Shows colour assignment menu";
exports.usage = "colours";
exports.requirements = {
	
}

exports.function = async (msg, args) => {
	let description = "**List of Colour Roles:\n**\n";

	let colours = await db.ColourRoles.findAll({ raw: true, order: [["order", "ASC"]] });

	description += "React to this message with these emotes to receive a role.\nUnreact to remove a role you already have.\n\n";

	colours.forEach((e) =>{
		description += "<:" + e.emotename + ":" + e.emoteid + "> - " + e.description + "\n";
	})

	let reactMessage = await client.createMessage(msg.channel.id, {
		"embed": {
			"description": description,
			"color": 0xff4141
		}
	});

	await db.Config.update({
		colorreactionid: reactMessage.id
	},
	{
		where:{
			id: 1
		}
	});

	colours.forEach( (e) =>{
		let reactionid = e.emotename + ":" + e.emoteid;
		reactMessage.addReaction(reactionid);
	});

}