#!/usr/bin/env python3
"""Keep the largest visible subject and export Mishoo's transparent front frame.

This is intentionally not a generative edit: RGB pixels belonging to the main
connected subject are copied unchanged. Small disconnected logos/artifacts are
made transparent so they cannot appear beside the desktop pet.
"""

from collections import deque
from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "public/videos/panda-bamboo-preview.png")
    target = Path(sys.argv[2] if len(sys.argv) > 2 else "public/desktop-pet/framefront.webp")
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A")
    visible = bytearray(1 if value > 8 else 0 for value in alpha.getdata())
    visited = bytearray(width * height)
    largest: list[int] = []

    for start, is_visible in enumerate(visible):
        if not is_visible or visited[start]:
            continue
        component: list[int] = []
        queue = deque([start])
        visited[start] = 1
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            for neighbor in (index - 1, index + 1, index - width, index + width):
                if neighbor < 0 or neighbor >= width * height:
                    continue
                if neighbor == index - 1 and x == 0:
                    continue
                if neighbor == index + 1 and x == width - 1:
                    continue
                if visible[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component

    keep = bytearray(width * height)
    for index in largest:
        keep[index] = 1

    pixels = list(image.getdata())
    cleaned = [pixel if keep[index] else (0, 0, 0, 0) for index, pixel in enumerate(pixels)]
    output = Image.new("RGBA", image.size)
    output.putdata(cleaned)
    subject_bounds = output.getchannel("A").getbbox()
    if not subject_bounds:
        raise RuntimeError("No visible subject found")
    left, top, right, bottom = subject_bounds
    margin = 4
    output = output.crop((
        max(0, left - margin),
        max(0, top - margin),
        min(width, right + margin),
        min(height, bottom + margin),
    ))
    target.parent.mkdir(parents=True, exist_ok=True)
    output.save(target, "WEBP", lossless=True, method=6)
    print(f"kept {len(largest)} subject pixels; wrote {output.width}x{output.height} {target}")


if __name__ == "__main__":
    main()
