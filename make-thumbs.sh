#!/data/data/com.termux/files/usr/bin/bash
# Makes small thumbnail copies of your gallery images so the site loads faster.
# Run it from inside your site folder (the one with index.html):
#     bash make-thumbs.sh
# Needs ffmpeg:  pkg install ffmpeg
# Your originals are never changed. Thumbnails go into a "thumbs" folder next to them.

for dir in images/presh images/mister-giordani; do
    [ -d "$dir" ] || { echo "Skipping $dir (folder not found)"; continue; }
    mkdir -p "$dir/thumbs"
    for f in "$dir"/*.jpg "$dir"/*.jpeg "$dir"/*.png "$dir"/*.webp; do
        [ -e "$f" ] || continue
        name=$(basename "${f%.*}")
        case "$name" in *-base) continue ;; esac        # the before photos are not part of the grid
        ffmpeg -y -loglevel error -i "$f" -vf "scale=600:-2" -q:v 4 "$dir/thumbs/$name.jpg" \
            && echo "made $dir/thumbs/$name.jpg"
    done
done
echo "Done."
