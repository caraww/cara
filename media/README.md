# Adding the cara weaving video

The homepage section is already built and expects the video at:

`media/cara-weaving.mp4`

## Add your video

1. Use the vertical/original portrait video you want to publish.
2. Rename the file exactly to `cara-weaving.mp4`.
3. Upload it into this `media` folder on the branch `feature/weaving-process-video`.
4. Keep the filename and folder path unchanged; the homepage is already wired to this path.
5. Commit the uploaded video to the same branch. The open pull request will include it automatically.

## Recommended export settings for a lighter page

- MP4 container, H.264 video, AAC audio (or no audio if not needed)
- Portrait 9:16; 720 × 1280 is a good web size
- 24–30 fps
- Target roughly 2–4 Mbps video bitrate; use 1.5–2.5 Mbps for a shorter/lower-motion clip
- Enable “Fast Start” / “Web Optimized” (move the MP4 metadata to the beginning)

For a 30-second clip, this usually lands around 6–12 MB depending on detail and motion. If the file is very large, compress it before committing; GitHub blocks files over 100 MB and large assets make deployments slower.

## How it displays

The outer section is intentionally wide on desktop. The video itself stays vertical, centered in its own frame, and uses `object-fit: contain` so the top and bottom of the portrait video are not cropped or stretched. On phones, the text and video stack vertically. Playback is user-initiated and uses native controls; `preload="none"` avoids downloading the video before a visitor presses play.
