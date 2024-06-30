import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Import the CSS file
import { UMAP } from "umap-js";

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [songIds, setSongIds] = useState([]);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [audioFeaturesArray, setAudioFeaturesArray] = useState([]);

  // useEffect(() => {
  //   const fetchPlaylist = async () => {
  //     if (playlistId) {
  //       try {
  //         const response = await axios.get(
  //           `http://localhost:5000/playlist/${playlistId}`
  //         );
  //         const playlistTracks = response.data || [];
  //         console.log("playlistTracks", playlistTracks);
  //         const ids = playlistTracks.map((song) => song.id);
  //         setSongIds(ids);
  //         setTracks(playlistTracks);
  //       } catch (error) {
  //         console.error("Error fetching playlist data", error);
  //       }
  //     }
  //   };

  //   fetchPlaylist();
  // }, [playlistId]);
  const extractPlaylistId = (url) => {
    // Example URL format: https://open.spotify.com/playlist/37i9dQZF1DWXLeA8Omikj7
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  };

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (playlistUrl) {
        const playlistId = extractPlaylistId(playlistUrl);
        if (!playlistId) {
          console.error("Invalid playlist URL");
          return;
        }
        try {
          const response = await axios.get(
            `http://localhost:5000/playlist/${playlistId}`
          );
          const playlistTracks = response.data || [];
          console.log("playlistTracks", playlistTracks);
          const ids = playlistTracks.map((song) => song.id);
          setSongIds(ids);
          setTracks(playlistTracks);
        } catch (error) {
          console.error("Error fetching playlist data", error);
        }
      }
    };

    fetchPlaylist();
  }, [playlistUrl]);

  const fetchAudioFeatures = async (trackIds) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/audio-features`,
        { trackIds }
      );
      const audioFeatures = response.data || [];
      console.log("audio-features", audioFeatures);
      return audioFeatures;
    } catch (error) {
      console.error("Error fetching audio features", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchAllAudioFeatures = async () => {
      if (songIds.length > 0) {
        const audioFeatures = await fetchAudioFeatures(songIds);
        // console.log(audioFeatures);
        const data = audioFeatures.map((feature) => [
          feature.acousticness,
          feature.danceability,
          feature.duration_ms,
          feature.energy,
          feature.instrumentalness,
          feature.key,
          feature.liveness,
          feature.loudness,
          feature.speechiness,
          feature.tempo,
          feature.time_signature,
          feature.valence,
        ]);

        const umap = new UMAP({
          nComponents: 2,
        });
        const embedding = umap.fit(data);

        const distanceMatrix = calculateDistanceMatrix(embedding);
        const initialOrder = tracks.map((_, index) => index);
        const optimizedOrder = linKernighanHeuristic(
          initialOrder,
          distanceMatrix
        );

        const optimizedPlaylist = optimizedOrder.map((index) => tracks[index]);
        console.log("feature", data);
        setAudioFeaturesArray(audioFeatures);
      }
    };

    fetchAllAudioFeatures();
  }, [songIds]);

  function calculateDistanceMatrix(embedding) {
    const numPoints = embedding.length;
    const distanceMatrix = Array.from({ length: numPoints }, () =>
      Array(numPoints).fill(0)
    );

    for (let i = 0; i < numPoints; i++) {
      for (let j = i + 1; j < numPoints; j++) {
        const dist = Math.sqrt(
          embedding[i].reduce(
            (sum, val, k) => sum + (val - embedding[j][k]) ** 2,
            0
          )
        );
        distanceMatrix[i][j] = dist;
        distanceMatrix[j][i] = dist;
      }
    }

    return distanceMatrix;
  }

  function calculateDistance(order, distanceMatrix) {
    let totalDistance = 0;
    for (let i = 0; i < order.length - 1; i++) {
      totalDistance += distanceMatrix[order[i]][order[i + 1]];
    }
    return totalDistance;
  }

  function linKernighanHeuristic(order, distanceMatrix) {
    let currentOrder = [...order];
    let bestOrder = [...order];
    let currentDistance = calculateDistance(currentOrder, distanceMatrix);
    let bestDistance = currentDistance;

    for (let k = 0; k < 1000; k++) {
      let [i, j] = [
        Math.floor(Math.random() * order.length),
        Math.floor(Math.random() * order.length),
      ];
      if (i > j) [i, j] = [j, i];

      let a = currentOrder.slice(0, i);
      let b = currentOrder.slice(i, j).reverse();
      let c = currentOrder.slice(j);

      let tempOrder = [...a, ...b, ...c];
      let tempDistance = calculateDistance(tempOrder, distanceMatrix);

      if (tempDistance < currentDistance) {
        currentOrder = [...tempOrder];
        currentDistance = tempDistance;
        if (tempDistance < bestDistance) {
          bestOrder = [...currentOrder];
          bestDistance = tempDistance;
        }
      }
    }

    return bestOrder;
  }

  return (
    <div className="container">
      <h1>Spotify Playlist Sorter</h1>
      <input
        type="text"
        placeholder="Enter Playlist ID"
        value={playlistUrl}
        onChange={(e) => setPlaylistUrl(e.target.value)}
      />
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            {track.name} by{" "}
            {track.artists.map((artist) => artist.name).join(", ")}
          </li>
        ))}
      </ul>
      <div>
        {audioFeaturesArray.length ? <h2>Audio Features</h2> : ""}
        <ul>
          {audioFeaturesArray.map((features, index) => (
            <li key={index}>
              {features && (
                <div>
                  <p>Danceability: {features.danceability}</p>
                  <p>Energy: {features.energy}</p>
                  <p>Tempo: {features.tempo}</p>
                  {/* Add more features as needed */}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
