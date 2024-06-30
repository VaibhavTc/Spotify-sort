import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Import the CSS file
import { UMAP } from "umap-js";

const App = () => {
  const [tracks, setTracks] = useState([]);
  const [songIds, setSongIds] = useState([]);
  const [playlistId, setPlaylistId] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [audioFeaturesArray, setAudioFeaturesArray] = useState([]);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (playlistId) {
        try {
          const response = await axios.get(
            `http://localhost:5000/playlist/${playlistId}`
          );
          const playlistTracks = response.data;
          const ids = playlistTracks.map((song) => song.id);
          setSongIds(ids);
          setTracks(playlistTracks);
        } catch (error) {
          console.error("Error fetching playlist data", error);
        }
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  const fetchAudioFeatures = async (trackId) => {
    const url = `http://localhost:5000/audio-features/${trackId}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching audio features for track", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchAllAudioFeatures = async () => {
      const audioFeaturesPromises = songIds.map((trackId) =>
        fetchAudioFeatures(trackId)
      );
      const audioFeatures = await Promise.all(audioFeaturesPromises);
      console.log(audioFeatures);
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
      // const mean = (data) => data.reduce((a, b) => a + b, 0) / data.length;

      // // Function to calculate the standard deviation of an array
      // const standardDeviation = (data) => {
      //   const m = mean(data);
      //   return Math.sqrt(
      //     data.reduce((a, b) => a + Math.pow(b - m, 2), 0) / data.length
      //   );
      // };

      // // Function to standardize data (z-score normalization)
      // const standardize = (data) => {
      //   const m = mean(data);
      //   const sd = standardDeviation(data);
      //   return data.map((x) => (x - m) / sd);
      // };

      // // Function to normalize data (min-max normalization)
      // const normalize = (data) => {
      //   const min = Math.min(...data);
      //   const max = Math.max(...data);
      //   return data.map((x) => (x - min) / (max - min));
      // };
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
      // res.json({ optimizedPlaylist });
      console.log("feature", data);
      setAudioFeaturesArray(audioFeatures);
    };

    if (songIds.length > 0) {
      fetchAllAudioFeatures();
    }
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
      // Number of iterations
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
        value={playlistId}
        onChange={(e) => setPlaylistId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter New Playlist Name"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
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
        <h2>Audio Features</h2>
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
