"""Combine real gameplay and recorded-input Blender poses on one 60 fps timeline.

Requires ffmpeg and Pillow. The input gameplay clip must already start at the
same time as the render manifest. Raw captures and scene files stay local.
"""
import argparse, json, os, subprocess
from pathlib import Path
from uuid import uuid4
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('--game', required=True)
p.add_argument('--poses', required=True)
p.add_argument('--work', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
poses = Path(a.poses).resolve()
work = Path(a.work).resolve()
out = Path(a.output).resolve()
work.mkdir(parents=True, exist_ok=True)
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((poses / 'frames.json').read_text())
# A reused work folder must never retain links from an older event timeline.
sequence = work / ('sequence-' + uuid4().hex)
sequence.mkdir()
for i, name in enumerate(manifest['frames']):
    source = (poses / name).resolve()
    if source.parent != poses or source.suffix != '.png':
        raise ValueError('Pose must be a PNG inside the poses folder')
    target = sequence / f'frame-{i:04}.png'
    if not target.exists():
        os.link(source, target)
mask = Image.new('L', (2240, 934))
mask.putdata([round(255 * min(1, min(x, 2239-x, y, 933-y) / 70))
              for y in range(934) for x in range(2240)])
mask.save(work / 'mask.png')
full = out / 'blizzard-keyboard.mp4'
def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str,args)], check=True)
run(['-i', a.game, '-framerate', 60, '-i', sequence/'frame-%04d.png',
     '-loop', 1, '-i', work/'mask.png', '-filter_complex_threads', 2,
     '-filter_complex', '[0:v]pad=2560:2160:0:0:color=0x02090f[bg];'
     '[1:v]scale=2240:934:flags=lanczos,format=rgb24[key];[2:v]format=gray[mask];'
     '[key][mask]alphamerge[rgba];[bg][rgba]overlay=160:1270:shortest=1,format=yuv420p[out]',
     '-map', '[out]', '-frames:v', len(manifest['frames']), '-c:v', 'libx264',
     '-preset', 'medium', '-crf', 17, '-threads', 8, '-movflags', '+faststart',
     '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-an', full])
run(['-i', full, '-vf', 'scale=1280:1080:flags=lanczos', '-c:v', 'libx264',
     '-preset', 'medium', '-crf', 18, '-threads', 8, '-movflags', '+faststart',
     '-an', out/'blizzard-keyboard-1280.mp4'])
for suffix, filters, quality in [('', [], 92), ('-1280', ['-vf', 'scale=1280:1080:flags=lanczos'], 90)]:
    run(['-i', full, *filters, '-frames:v', 1, '-c:v', 'libwebp', '-quality', quality,
         out/f'blizzard-keyboard-poster{suffix}.webp'])
