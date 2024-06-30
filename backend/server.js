const express = require("express");
const axios = require("axios");
const qs = require("qs");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

let accessToken = "";

const getAccessToken = async () => {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
      }
    );
    accessToken = response.data.access_token;
    console.log("Access token retrieved:", accessToken);
  } catch (error) {
    console.error("Error getting access token", error);
  }
};

// Fetch access token initially
getAccessToken();

app.get("/playlist/:id", async (req, res) => {
  const playlistId = req.params.id;

  if (!accessToken) {
    await getAccessToken();
  }

  try {
    const playlistResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const tracks = playlistResponse.data.items.map((item) => item.track);
    console.log("tracks", tracks);
    res.json(tracks);
  } catch (error) {
    console.error("Error fetching playlist data", error);
    res.status(500).send("Error fetching playlist data");
  }
});

app.post("/audio-features", async (req, res) => {
  const trackIds = req.body.trackIds;

  if (!accessToken) {
    await getAccessToken();
  }

  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log("response", response);
    res.json(response.data.audio_features);
  } catch (error) {
    console.error("Error fetching audio features", error);
    res.status(500).send("Error fetching audio features");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
