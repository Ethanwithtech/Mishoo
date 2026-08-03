#!/usr/bin/env python3
"""Prepare the generated golden puppy desktop-pet assets.

The source clips are blue-screen MP4s with a small watermark near the lower
right. This script crops the watermark area, builds an alpha mask from the blue
background, keeps the puppy's real pixels, and encodes VP9 WebM with alpha.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
FFMPEG = ROOT / "node_modules/ffmpeg-static/ffmpeg"
OUT_DIR = ROOT / "public/desktop-pet/golden-puppy"

SOURCES = {
    "poster": ROOT / "幼年金毛静态.png",
    "idle": ROOT / "向左走.mp4",
    "walk": ROOT / "向右走.mp4",
    "jump": ROOT / "跳动.mp4",
    "rest": ROOT / "休息.mp4",
}

VIDEO_CROP = "1120:720:0:0"


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def blue_screen_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)

    blue = (
        (b > 72)
        & (b > r + 24)
        & (b > g - 4)
        & ((b - r) > 38)
    )
    vivid_blue = (b > 115) & (g > 55) & (r < 95) & ((b - r) > 55)
    return blue | vivid_blue


def clean_mask(mask: np.ndarray) -> Image.Image:
    image = Image.fromarray((mask * 255).astype(np.uint8), "L")
    image = image.filter(ImageFilter.MaxFilter(7))
    image = image.filter(ImageFilter.MinFilter(7))
    image = image.filter(ImageFilter.GaussianBlur(1.15))
    return image


def apply_mask(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGBA")
    rgb = np.array(image)[..., :3]
    foreground = ~blue_screen_mask(rgb)
    alpha = clean_mask(foreground)

    arr = np.array(image)
    a = np.array(alpha)
    visible = a > 6
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    spill = visible & (b > np.maximum(r, g) + 14)
    arr[..., 2] = np.where(spill, np.maximum(r, g) + 8, b).clip(0, 255).astype(np.uint8)
    arr[..., 3] = a

    output = Image.fromarray(arr, "RGBA")
    target.parent.mkdir(parents=True, exist_ok=True)
    output.save(target)


def prepare_poster() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "poster-source.png"
        keyed = Path(tmp) / "poster-keyed.png"
        run([
            str(FFMPEG),
            "-hide_banner",
            "-y",
            "-i",
            str(SOURCES["poster"]),
            "-vf",
            "scale=720:720",
            "-frames:v",
            "1",
            str(source),
        ])
        apply_mask(source, keyed)

        image = Image.open(keyed).convert("RGBA")
        bbox = image.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError("No puppy found in poster")
        left, top, right, bottom = bbox
        margin = 18
        image = image.crop((
            max(0, left - margin),
            max(0, top - margin),
            min(image.width, right + margin),
            min(image.height, bottom + margin),
        ))
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        image.save(OUT_DIR / "poster.webp", "WEBP", lossless=True, method=6)


def prepare_video(name: str, source: Path, output_name: str) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        raw = tmp_dir / "raw"
        keyed = tmp_dir / "keyed"
        raw.mkdir()
        keyed.mkdir()

        run([
            str(FFMPEG),
            "-hide_banner",
            "-y",
            "-i",
            str(source),
            "-an",
            "-vf",
            f"crop={VIDEO_CROP},fps=24",
            str(raw / "frame_%04d.png"),
        ])

        frames = sorted(raw.glob("frame_*.png"))
        if not frames:
            raise RuntimeError(f"No frames extracted for {name}")
        for frame in frames:
            apply_mask(frame, keyed / frame.name)

        run([
            str(FFMPEG),
            "-hide_banner",
            "-y",
            "-framerate",
            "24",
            "-i",
            str(keyed / "frame_%04d.png"),
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-b:v",
            "0",
            "-crf",
            "32",
            "-auto-alt-ref",
            "0",
            str(OUT_DIR / output_name),
        ])


def main() -> None:
    if not FFMPEG.exists():
        raise RuntimeError(f"ffmpeg-static not found: {FFMPEG}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prepare_poster()
    prepare_video("idle", SOURCES["idle"], "idle.webm")
    prepare_video("walk", SOURCES["walk"], "walk.webm")
    prepare_video("jump", SOURCES["jump"], "jump.webm")
    prepare_video("rest", SOURCES["rest"], "rest.webm")
    print(f"Wrote golden puppy assets to {OUT_DIR}")


if __name__ == "__main__":
    main()
