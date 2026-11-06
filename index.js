require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DATA_FILE = "./apex-data.json";
const LIVE_CHANNEL = "1565151888872185916";

const TROPHIES = [
  { name: "Ballon d'Or", value: "ballon", emoji: "⚽" },
  { name: "Puskas Award", value: "puskas", emoji: "🏆" },
  { name: "Yashin Trophy", value: "yashin", emoji: "🧤" },
  { name: "Gerd Müller Trophy", value: "gerd", emoji: "🥇" },
  { name: "Cruyff Trophy", value: "cruyff", emoji: "🎖️" }
];

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (!data.players || Array.isArray(data.players)) data.players = {};
  if (!Array.isArray(data.staffIds)) data.staffIds = [];

  for (const player of Object.values(data.players)) {
    if (!Array.isArray(player.trophies)) player.trophies = [];
  }

  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function isStaff(id) {
  return loadData().staffIds.includes(id);
}

function getValue(points) {
  return 20000000 + points * 650000;
}

function money(amount) {
  return "£" + amount.toLocaleString("en-GB");
}

const commands = [

  new SlashCommandBuilder()
    .setName("setprofile")
    .setDescription("Set up your player profile")
    .addStringOption(o =>
      o.setName("position")
        .setDescription("Your position")
        .setRequired(true)
        .addChoices(
          { name: "Goalkeeper", value: "GK" },
          { name: "Defender", value: "DEF" },
          { name: "Midfielder", value: "MID" },
          { name: "Forward", value: "FWD" }
        )
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a player profile")
    .addUserOption(o =>
      o.setName("user").setDescription("Player")
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top 10 players"),

  new SlashCommandBuilder()
    .setName("addpoints")
    .setDescription("Add player points")
    .addUserOption(o =>
      o.setName("user").setDescription("Player").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Points").setRequired(true).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("removepoints")
    .setDescription("Remove player points")
    .addUserOption(o =>
      o.setName("user").setDescription("Player").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Points").setRequired(true).setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("addtrophy")
    .setDescription("Award a player a trophy")
    .addUserOption(o =>
      o.setName("user").setDescription("Player").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("trophy")
        .setDescription("Choose a trophy")
        .setRequired(true)
        .addChoices(...TROPHIES.map(t => ({
          name: t.name,
          value: t.value
        })))
    ),

  new SlashCommandBuilder()
    .setName("removetrophy")
    .setDescription("Remove a player's trophy")
    .addUserOption(o =>
      o.setName("user").setDescription("Player").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("trophy")
        .setDescription("Choose a trophy")
        .setRequired(true)
        .addChoices(...TROPHIES.map(t => ({
          name: t.name,
          value: t.value
        })))
    ),

  new SlashCommandBuilder()
    .setName("livegame")
    .setDescription("Start a live match")
    .addStringOption(o =>
      o.setName("home").setDescription("Home team").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("away").setDescription("Away team").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("homescore").setDescription("Home score").setRequired(true).setMinValue(0)
    )
    .addIntegerOption(o =>
      o.setName("awayscore").setDescription("Away score").setRequired(true).setMinValue(0)
    ),

  new SlashCommandBuilder()
    .setName("endgame")
    .setDescription("End the live match"),

  new SlashCommandBuilder()
    .setName("website")
    .setDescription("Get the website link"),

  new SlashCommandBuilder()
    .setName("addstaff")
    .setDescription("Add Apex staff")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removestaff")
    .setDescription("Remove Apex staff")
    .addUserOption(o =>
      o.setName("user").setDescription("Staff member").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("View Apex staff")

];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function deploy() {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands.map(c => c.toJSON()) }
  );

  console.log("Apex Rankings commands registered.");
}

client.once("clientReady", () => {
  console.log(`Apex Rankings online as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  const userId = interaction.user.id;

  try {
    const data = loadData();

    // STAFF MANAGEMENT
    if (["addstaff", "removestaff", "stafflist"].includes(command)) {

      if (!interaction.memberPermissions?.has("Administrator")) {
        return interaction.reply({
          content: "❌ Only server administrators can manage Apex staff.",
          ephemeral: true
        });
      }

      if (command === "addstaff") {
        const user = interaction.options.getUser("user");

        if (data.staffIds.includes(user.id)) {
          return interaction.reply("That user is already staff.");
        }

        data.staffIds.push(user.id);
        saveData(data);

        return interaction.reply(`✅ ${user} added to Apex staff.`);
      }

      if (command === "removestaff") {
        const user = interaction.options.getUser("user");

        data.staffIds = data.staffIds.filter(id => id !== user.id);
        saveData(data);

        return interaction.reply(`✅ ${user} removed from Apex staff.`);
      }

      if (command === "stafflist") {
        return interaction.reply({
          content: "**APEX STAFF**\n\n" +
            (data.staffIds.map(id => `<@${id}>`).join("\n") || "No staff."),
          allowedMentions: { parse: [] }
        });
      }
    }

    // STAFF-ONLY COMMANDS
    const staffCommands = [
      "addpoints",
      "removepoints",
      "addtrophy",
      "removetrophy",
      "livegame",
      "endgame"
    ];

    if (staffCommands.includes(command) && !isStaff(userId)) {
      return interaction.reply({
        content: "❌ You are not authorized Apex staff.",
        ephemeral: true
      });
    }

    // SET PROFILE
    if (command === "setprofile") {
      const position = interaction.options.getString("position");

      data.players[userId] = {
        id: userId,
        username: interaction.user.username,
        position,
        points: data.players[userId]?.points || 0,
        trophies: data.players[userId]?.trophies || []
      };

      saveData(data);

      return interaction.reply({
        content: `✅ Profile updated! Position: **${position}**`,
        ephemeral: true
      });
    }

    // PROFILE
    if (command === "profile") {
      const user = interaction.options.getUser("user") || interaction.user;
      const player = data.players[user.id];

      if (!player) {
        return interaction.reply("Player profile not found.");
      }

      const sorted = Object.values(data.players)
        .sort((a, b) => b.points - a.points);

      const rank = sorted.findIndex(p => p.id === user.id) + 1;

      const trophyDisplay = player.trophies.length
        ? player.trophies.map(value => {
            const trophy = TROPHIES.find(t => t.value === value);
            return trophy ? `${trophy.emoji} ${trophy.name}` : null;
          }).filter(Boolean).join("\n")
        : "No trophies yet.";

      const embed = new EmbedBuilder()
        .setColor("#00D9FF")
        .setTitle("⚽ PLAYER PROFILE")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "PLAYER", value: player.username, inline: true },
          { name: "POSITION", value: player.position, inline: true },
          { name: "LEADERBOARD", value: `#${rank}`, inline: true },
          { name: "🏆 POINTS", value: player.points.toLocaleString(), inline: true },
          { name: "💰 MARKET VALUE", value: money(getValue(player.points)), inline: true },
          { name: "🏅 TROPHY COLLECTION", value: trophyDisplay, inline: false }
        )
        .setFooter({ text: "APEX RANKINGS • PLAYER DATABASE" });

      return interaction.reply({ embeds: [embed] });
    }

    // LEADERBOARD
    if (command === "leaderboard") {
      const players = Object.values(data.players)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      const description = players.length
        ? players.map((p, i) =>
            `**${i + 1}. ${p.username}**\n${p.points.toLocaleString()} points • ${money(getValue(p.points))}`
          ).join("\n\n")
        : "No registered players.";

      const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle("🏆 APEX RANKINGS TOP 10")
        .setDescription(description);

      return interaction.reply({ embeds: [embed] });
    }

    // ADD / REMOVE POINTS
    if (command === "addpoints" || command === "removepoints") {
      const user = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");

      if (!data.players[user.id]) {
        return interaction.reply({
          content: "Player profile not found.",
          ephemeral: true
        });
      }

      const player = data.players[user.id];

      if (command === "addpoints") {
        player.points += amount;
      } else {
        player.points = Math.max(0, player.points - amount);
      }

      saveData(data);

      return interaction.reply(
        `✅ ${user.username}\nPoints: **${player.points.toLocaleString()}**\nMarket Value: **${money(getValue(player.points))}**`
      );
    }

    // ADD / REMOVE TROPHIES
    if (command === "addtrophy" || command === "removetrophy") {
      const user = interaction.options.getUser("user");
      const trophyValue = interaction.options.getString("trophy");

      const player = data.players[user.id];

      if (!player) {
        return interaction.reply({
          content: "Player profile not found.",
          ephemeral: true
        });
      }

      if (!Array.isArray(player.trophies)) {
        player.trophies = [];
      }

      const trophy = TROPHIES.find(t => t.value === trophyValue);

      if (command === "addtrophy") {
        if (player.trophies.includes(trophyValue)) {
          return interaction.reply({
            content: "That player already has this trophy.",
            ephemeral: true
          });
        }

        player.trophies.push(trophyValue);
        saveData(data);

        return interaction.reply(
          `🏆 **Trophy awarded!**\n${user} received ${trophy.emoji} **${trophy.name}**.`
        );
      }

      if (!player.trophies.includes(trophyValue)) {
        return interaction.reply({
          content: "That player doesn't have this trophy.",
          ephemeral: true
        });
      }

      player.trophies = player.trophies.filter(t => t !== trophyValue);
      saveData(data);

      return interaction.reply(
        `🗑️ ${trophy.emoji} **${trophy.name}** removed from ${user}'s profile.`
      );
    }

    // LIVE GAME
    if (command === "livegame") {
      await interaction.deferReply();

      const channel = await client.channels.fetch(LIVE_CHANNEL);

      if (!channel || channel.type !== ChannelType.GuildStageVoice) {
        return interaction.editReply("Configured channel is not a Stage channel.");
      }

      const home = interaction.options.getString("home");
      const away = interaction.options.getString("away");
      const hs = interaction.options.getInteger("homescore");
      const as = interaction.options.getInteger("awayscore");

      await client.rest.post(Routes.stageInstances(), {
        body: {
          channel_id: LIVE_CHANNEL,
          topic: `🔴 LIVE | ${home} ${hs}-${as} ${away}`,
          privacy_level: 2
        }
      });

      return interaction.editReply(`🔴 Live Stage created: **${home} ${hs}-${as} ${away}**`);
    }

    // END GAME
    if (command === "endgame") {
      await interaction.deferReply();

      await client.rest.delete(Routes.stageInstance(LIVE_CHANNEL));

      return interaction.editReply("🏁 Live Stage ended.");
    }

    // WEBSITE
    if (command === "website") {
      return interaction.reply(
        process.env.WEBSITE_URL || "Website is being set up."
      );
    }

  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        content: "Something went wrong. Check the terminal.",
        ephemeral: true
      });
    }

    if (interaction.deferred) {
      return interaction.editReply("Something went wrong. Check the terminal.");
    }
  }
});

deploy().catch(console.error);
client.login(process.env.TOKEN);