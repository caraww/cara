# Cara gallery background-removal bot

This local tool creates transparent PNG copies of the photos in \`img/works-cutouts\`.
It does not overwrite originals or publish anything to the live website.

## Run it

Python 3.10+ is recommended.

\`\`\`bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

python -m pip install -r tools/requirements-background-bot.txt
python tools/remove_gallery_backgrounds.py
\`\`\`

By default, outputs go to \`img/works-cutouts-transparent/\` and a contact sheet is written to
\`output/gallery-transparency-preview.png\`. The first run downloads the segmentation model.

To try another model:

\`\`\`bash
python tools/remove_gallery_backgrounds.py --model birefnet-general
\`\`\`

Open the contact sheet and inspect the result on the checkerboard. Automatic segmentation
can mistake white beads, reflective highlights, or thin bracelet edges for background.
If an image looks damaged, try the alternate model or correct that image manually.

## Publishing

Only after reviewing the generated images, update the gallery image paths to point to the
transparent PNG files and test the gallery on desktop and mobile. Keep the original photos
as backups. This tool intentionally does not deploy or edit payment/order code.
