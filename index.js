const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Load saved users or start empty
let users = [];
if (fs.existsSync("users.json")) {
  users = JSON.parse(fs.readFileSync("users.json"));
}

// OAuth2 callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code provided");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) return res.send("❌ OAuth Error: " + tokenData.error);

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();

  users.push({
    id: user.id,
    access_token: tokenData.access_token,
  });
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

  await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: tokenData.access_token,
    }),
  });

  res.send("✅ Verified & Joined!");
});

app.listen(process.env.PORT || 3000, () => console.log("Running"));
