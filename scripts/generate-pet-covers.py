#!/usr/bin/env python3
"""Extract 1:1 cover art from the exact videos used by Mishoo pets."""

from __future__ import annotations

import subprocess
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "artifacts" / "cover-audit" / "extracted"
OUTPUT_DIR = ROOT / "public" / "images" / "pets" / "video-covers"

PETS = [
    ("mia", "mia-source.webm", 5.4, "green"),
    ("cocoa", "golden-source.webm", 4.4, "green"),
    ("snow", "samoyed-source.webm", 1.5, "green"),
    ("mochi", "pomeranian-source.webm", 4.4, "green"),
    ("mocha", "lop-rabbit-source.webm", 4.4, "green"),
    ("baobao", "panda-bamboo-source.webm", 6.4, "alpha"),
]


def ffmpeg_path() -> str:
    return subprocess.check_output(
        ["node", "-p", "require('ffmpeg-static')"], cwd=ROOT, text=True
    ).strip()


def extract_frame(ffmpeg: str, video_name: str, seconds: float, output: Path) -> None:
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-ss",
            str(seconds),
            "-i",
            str(ROOT / "public" / "videos" / video_name),
            "-frames:v",
            "1",
            str(output),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def remove_green_screen(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    rgb = rgba[:, :, :3]
    original_alpha = rgba[:, :, 3]
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    max_red_blue = np.maximum(red, blue)
    min_red_blue = np.minimum(red, blue)
    green_dominance = green - max_red_blue
    greenness = 2 * green - red - blue
    green_saturation = green - min_red_blue
    is_screen = (
        (green > 42)
        & (green_dominance > 7)
        & (greenness > 16)
        & (green_saturation > 24)
    )
    strength = np.where(is_screen, np.clip((green_dominance - 7) / 34, 0, 1), 0)
    strength = np.where(is_screen & (green_dominance > 46), 1, strength)
    alpha = original_alpha * (1 - strength)
    alpha = np.where(alpha < 30, 0, alpha)

    spill_limit = (red + blue) / 2 + 6
    rgb[:, :, 1] = np.where(
        green > spill_limit,
        green - (green - spill_limit) * 0.9,
        green,
    )
    rgba[:, :, :3] = np.clip(rgb, 0, 255)
    rgba[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(rgba.astype(np.uint8)).convert("RGBA")


def crop_to_subject(image: Image.Image) -> Image.Image:
    # All current source videos keep the animal in the center. Removing the outer
    # 6% also guarantees detached generation marks at the extreme edge do not
    # become part of the cover.
    edge = round(image.width * 0.06)
    centered = image.crop((edge, 0, image.width - edge, image.height))
    alpha = centered.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= 48 else 0)
    # Estimate connected components on a smaller mask and keep the largest one.
    # This removes detached generation marks and captions without altering any
    # pixel that belongs to the animal itself.
    sample_width = min(320, solid.width)
    sample_height = max(1, round(solid.height * sample_width / solid.width))
    sampled = solid.resize((sample_width, sample_height), Image.Resampling.NEAREST)
    mask = np.asarray(sampled) > 0
    seen = np.zeros(mask.shape, dtype=bool)
    best = None
    for sy, sx in zip(*np.nonzero(mask & ~seen)):
        if seen[sy, sx]:
            continue
        queue = deque([(int(sx), int(sy))])
        seen[sy, sx] = True
        count = 0
        min_x = max_x = int(sx)
        min_y = max_y = int(sy)
        while queue:
            x, y = queue.popleft()
            count += 1
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            for ny in range(max(0, y - 1), min(sample_height, y + 2)):
                for nx in range(max(0, x - 1), min(sample_width, x + 2)):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((nx, ny))
        if best is None or count > best[0]:
            best = (count, min_x, min_y, max_x + 1, max_y + 1)

    if best:
        _, min_x, min_y, max_x, max_y = best
        scale_x = solid.width / sample_width
        scale_y = solid.height / sample_height
        bbox = (
            max(0, int(min_x * scale_x) - 3),
            max(0, int(min_y * scale_y) - 3),
            min(solid.width, int(np.ceil(max_x * scale_x)) + 3),
            min(solid.height, int(np.ceil(max_y * scale_y)) + 3),
        )
    else:
        bbox = None
    if not bbox:
        raise RuntimeError("No visible subject remained after keying")

    left, top, right, bottom = bbox
    pad_x = max(18, round((right - left) * 0.08))
    pad_y = max(18, round((bottom - top) * 0.08))
    return centered.crop(
        (
            max(0, left - pad_x),
            max(0, top - pad_y),
            min(centered.width, right + pad_x),
            min(centered.height, bottom + pad_y),
        )
    )


def place_on_canvas(subject: Image.Image) -> Image.Image:
    canvas_size = 720
    max_width = 620
    max_height = 610
    scale = min(max_width / subject.width, max_height / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - resized.width) // 2
    y = canvas_size - resized.height - 44
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ffmpeg = ffmpeg_path()

    for pet_id, video_name, seconds, mode in PETS:
        raw_path = RAW_DIR / f"{pet_id}.png"
        if pet_id == "baobao":
            # ffmpeg's VP9 decoder does not preserve this source file's alpha
            # during still extraction on every platform. This preview was
            # already extracted from and visually verified against the same
            # panda video, so use it instead of accepting a black background.
            frame = Image.open(ROOT / "public" / "videos" / "panda-bamboo-preview.png").convert("RGBA")
        else:
            extract_frame(ffmpeg, video_name, seconds, raw_path)
            frame = Image.open(raw_path).convert("RGBA")
        keyed = frame if mode == "alpha" else remove_green_screen(frame)
        cover = place_on_canvas(crop_to_subject(keyed))
        output = OUTPUT_DIR / f"{pet_id}.webp"
        cover.save(output, "WEBP", lossless=True, method=6)
        print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
