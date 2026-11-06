const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

function getData() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "apex-data.json"), "utf8")
  );
}

function getValue(points) {
  return 20000000 + points * 650000;
}

app.get("/api/players", (req, res) => {
  const data = getData();

  const players = Object.values(data.players || {})
    .sort((a, b) => b.points - a.points)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      value: getValue(p.points)
    }));

  res.json(players);
});

app.get("/api/status", (req, res) => {
  res.json({
    name: "APEX RANKINGS",
    status: "Online",
    leagues: ["EVL × WASA"],
    features: [
      "Player Rankings",
      "Live Matches",
      "Partnered Leagues",
      "Discord Community"
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Apex Rankings website running at http://localhost:${PORT}`);
});