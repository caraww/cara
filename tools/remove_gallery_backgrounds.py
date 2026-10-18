#!/usr/bin/env python3
"""Create transparent copies of Cara gallery photos without overwriting originals.

Usage:
  python tools/remove_gallery_backgrounds.py
  python tools/remove_gallery_backgrounds.py --input img/works-view --output img/works-view-transparent
  python tools/remove_gallery_backgrounds.py --input img/works-view --output img/works-view-transparent --model birefnet-general

The script uses rembg's segmentation model. It preserves source files, writes PNGs with
alpha transparency, and creates a checkerboard contact sheet for visual review.
Review white beads and fine edges before using the output on the live site.
"""
from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image, ImageDraw
from rembg import new_session, remove

SUPPORTED = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def transparent_copy(source: Path, destination: Path, session) -> None:
    with Image.open(source) as image:
        image = image.convert("RGBA")
        result = remove(image, session=session, alpha_matting=True,
                        alpha_matting_foreground_threshold=240,
                        alpha_matting_background_threshold=10,
                        alpha_matting_erode_size=10)
        if not isinstance(result, Image.Image):
            result = Image.open(io.BytesIO(result))
        result = result.convert("RGBA")
        destination.parent.mkdir(parents=True, exist_ok=True)
        result.save(destination, "PNG", optimize=True)


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    tile = Image.new("RGB", size, (245, 245, 245))
    draw = ImageDraw.Draw(tile)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1),
                               fill=(220, 220, 220))
    return tile


def make_contact_sheet(paths: list[Path], output: Path, thumb_size=(240, 200)) -> None:
    if not paths:
        return
    label_h, gap, columns = 32, 16, 3
    rows = (len(paths) + columns - 1) // columns
    width = columns * thumb_size[0] + (columns + 1) * gap
    height = rows * (thumb_size[1] + label_h) + (rows + 1) * gap
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(paths):
        with Image.open(path) as source:
            image = source.convert("RGBA")
            image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        x = gap + (index % columns) * (thumb_size[0] + gap)
        y = gap + (index // columns) * (thumb_size[1] + label_h + gap)
        background = checkerboard(thumb_size)
        px = (thumb_size[0] - image.width) // 2
        py = (thumb_size[1] - image.height) // 2
        background.paste(image, (px, py), image)
        sheet.paste(background, (x, y))
        draw.text((x, y + thumb_size[1] + 7), path.name[:34], fill=(25, 25, 25))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("img/works-view"),
                        help="folder with original gallery photos")
    parser.add_argument("--output", type=Path, default=Path("img/works-view-transparent"),
                        help="folder for transparent PNG copies")
    parser.add_argument("--model", default="u2net",
                        help="rembg model name, e.g. u2net or birefnet-general")
    parser.add_argument("--preview", type=Path, default=Path("output/gallery-transparency-preview.png"),
                        help="checkerboard contact sheet path")
    args = parser.parse_args()

    if not args.input.is_dir():
        parser.error(f"Input folder does not exist: {args.input}")

    sources = sorted(p for p in args.input.rglob("*")
                     if p.is_file() and p.suffix.lower() in SUPPORTED)
    if not sources:
        parser.error(f"No supported images found in {args.input}")

    print(f"Loading background-removal model: {args.model}")
    session = new_session(args.model)
    generated: list[Path] = []
    for index, source in enumerate(sources, 1):
        relative = source.relative_to(args.input)
        destination = (args.output / relative).with_suffix(".png")
        try:
            transparent_copy(source, destination, session)
            generated.append(destination)
            print(f"[{index}/{len(sources)}] OK  {source} -> {destination}")
        except Exception as error:
            print(f"[{index}/{len(sources)}] ERROR {source}: {error}")

    make_contact_sheet(generated, args.preview)
    print(f"\nCreated {len(generated)} transparent image(s).")
    print(f"Preview: {args.preview}")
    print("Original photos were not changed. Review the preview, especially white beads and thin edges.")
    return 0 if generated else 1


if __name__ == "__main__":
    raise SystemExit(main())
