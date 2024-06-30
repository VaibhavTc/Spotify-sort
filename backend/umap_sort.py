import json
import sys
from umap import UMAP
import numpy as np

def load_tracks(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def extract_features(tracks):
    features = []
    for track in tracks:
        features.append([
            track['features']['danceability'],
            track['features']['energy'],
            track['features']['loudness'],
            track['features']['speechiness'],
            track['features']['acousticness'],
            track['features']['instrumentalness'],
            track['features']['liveness'],
            track['features']['valence'],
            track['features']['tempo']
        ])
    return np.array(features)

def sort_tracks_by_features(tracks, features):
    umap = UMAP(n_neighbors=5, min_dist=0.3, metric='correlation')
    embedding = umap.fit_transform(features)
    sorted_indices = np.argsort(embedding[:, 0])
    return [tracks[i] for i in sorted_indices]

if __name__ == "__main__":
    try:
        file_path = sys.argv[1]
        tracks = load_tracks(file_path)
        features = extract_features(tracks)
        sorted_tracks = sort_tracks_by_features(tracks, features)
        print(json.dumps(sorted_tracks))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
