#!/usr/bin/env python3
"""Resumable, chunked Playwright renderer for seek(t) films.

  python render.py FILM.html stills  --out DIR [--times 0 1.5 ...] [--beats] [--scale 0.5]
  python render.py FILM.html start   --out DIR [--fps 60] [--sub 4] [--chunk 3] [--scale 1]
  python render.py FILM.html status  --out DIR
  python render.py FILM.html assemble --out DIR [--audio track.wav] [--name film.mp4]

Why chunked + detached: a single tool call in the Claude sandbox is capped (~300 s) and the
container can pause between turns, killing long jobs. `start` launches a detached worker that
renders fixed-size chunks (each saved + marked .done), so `start` again simply resumes.
Poll with `status` using short sleeps (< 280 s per call).

Motion blur: SUB subframes per output frame, spaced inside the frame interval and trailing
into it, averaged by ffmpeg tmix; time wraps modulo the duration so frame 0 of a loop is
blurred with the END of the film (seamless loops).
"""
import argparse, asyncio, base64, json, os, pathlib, subprocess, sys, time

def args():
    p = argparse.ArgumentParser()
    p.add_argument('html'); p.add_argument('cmd', choices=['stills', 'start', 'work', 'status', 'assemble'])
    p.add_argument('--out', required=True); p.add_argument('--fps', type=int, default=60); p.add_argument('--sub', type=int, default=4)
    p.add_argument('--chunk', type=float, default=3.0, help='seconds per chunk'); p.add_argument('--scale', type=float, default=1.0)
    p.add_argument('--quality', type=int, default=94); p.add_argument('--times', type=float, nargs='*'); p.add_argument('--beats', action='store_true')
    p.add_argument('--audio'); p.add_argument('--name', default='film.mp4'); p.add_argument('--crf', type=int, default=17)
    return p.parse_args()

async def open_page(pw, html, scale):
    b = await pw.chromium.launch()
    pg = await b.new_page(viewport={'width': 800, 'height': 800})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(pathlib.Path(html).resolve().as_uri() + '?render=1')
    await pg.evaluate('window.ready')
    if errs: raise SystemExit('page error: ' + errs[0])
    await pg.evaluate(f"""window.__grab = async (t, q) => {{ await seek(t); const c = document.getElementById('c');
        if ({scale} === 1) return c.toDataURL('image/jpeg', q);
        const o = document.createElement('canvas'); o.width = o.height = Math.round(c.width * {scale});
        o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o.toDataURL('image/jpeg', q); }}""")
    meta = await pg.evaluate('({dur: CONFIG.dur, bpm: CONFIG.bpm ?? 120, offset: CONFIG.offset ?? 0, size: CONFIG.size ?? 1440})')
    return b, pg, meta, errs

async def grab(pg, t, q):
    d = await pg.evaluate(f'__grab({t}, {q / 100})'); return base64.b64decode(d.split(',', 1)[1])

# ------------------------------------------------------------------ stills
async def stills(a):
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    out = pathlib.Path(a.out) / 'stills'; out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        b, pg, meta, errs = await open_page(pw, a.html, a.scale)
        times = a.times or []
        if a.beats:
            spb = 60 / meta['bpm']; n = int(round((meta['dur'] - meta['offset']) / spb))
            times = [meta['offset'] + i * spb for i in range(n)]
        files = []
        for t in times:
            f = out / f'{t:07.3f}.jpg'; f.write_bytes(await grab(pg, t, 88)); files.append((t, f))
        await b.close()
    if errs: print('PAGE ERRORS:', *errs[:5], sep='\n  ')
    cols = 6 if len(files) > 12 else 4; s = 300
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * s, rows * (s + 22)), 'white'); d = ImageDraw.Draw(sheet)
    spb = 60 / meta['bpm']
    for i, (t, f) in enumerate(files):
        x, y = (i % cols) * s, (i // cols) * (s + 22)
        sheet.paste(Image.open(f).resize((s, s)), (x, y + 22))
        d.text((x + 6, y + 5), f't={t:.2f}s  b{(t - meta["offset"]) / spb:.1f}', fill=(0, 0, 0))
    p = pathlib.Path(a.out) / 'contact_sheet.jpg'; sheet.save(p, quality=85)
    print(f'{len(files)} stills -> {out}\ncontact sheet -> {p}')

# ------------------------------------------------------------------ render worker
async def work(a):
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); ch = out / 'chunks'; ch.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        b, pg, meta, errs = await open_page(pw, a.html, a.scale)
        N = int(round(meta['dur'] * a.fps)); per = max(1, int(round(a.chunk * a.fps)))
        chunks = [(i, i * per, min(N, (i + 1) * per)) for i in range((N + per - 1) // per)]
        json.dump({'frames': N, 'fps': a.fps, 'sub': a.sub, 'chunks': len(chunks), 'per': per, 'dur': meta['dur']}, open(out / 'plan.json', 'w'))
        t0 = time.time()
        for i, n0, n1 in chunks:
            done = ch / f'{i:04d}.done'
            if done.exists(): continue
            tmp = ch / f'{i:04d}.tmp.mp4'
            vf = f"tmix=frames={a.sub},select='eq(mod(n\\,{a.sub})\\,{a.sub - 1})',setpts=N/{a.fps}/TB" if a.sub > 1 else 'null'
            ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', str(a.fps * a.sub), '-i', '-',
                                   '-vf', vf, '-r', str(a.fps), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14',
                                   '-pix_fmt', 'yuv420p', str(tmp)], stdin=subprocess.PIPE)
            for n in range(n0, n1):
                for s in range(a.sub):
                    t = (n - (a.sub - 1 - s) / a.sub) / a.fps if a.sub > 1 else n / a.fps
                    ff.stdin.write(await grab(pg, t, a.quality))
                if n % 15 == 0:
                    json.dump({'frame': n, 'of': N, 'chunk': i, 'elapsed': round(time.time() - t0, 1)}, open(out / 'progress.json', 'w'))
            ff.stdin.close(); ff.wait()
            os.replace(tmp, ch / f'{i:04d}.mp4'); done.write_text(str(n1 - n0))
        json.dump({'frame': N, 'of': N, 'finished': True, 'elapsed': round(time.time() - t0, 1)}, open(out / 'progress.json', 'w'))
        await b.close()

def start(a):
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, os.path.abspath(__file__), a.html, 'work', '--out', a.out, '--fps', str(a.fps), '--sub', str(a.sub),
           '--chunk', str(a.chunk), '--scale', str(a.scale), '--quality', str(a.quality)]
    log = open(out / 'render.log', 'a', encoding='utf-8')
    if os.name == 'nt':
        flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        proc = subprocess.Popen(cmd, stdout=log, stderr=log, stdin=subprocess.DEVNULL, creationflags=flags)
    else:
        proc = subprocess.Popen(cmd, stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
    (out / 'worker.pid').write_text(str(proc.pid), encoding='utf-8')
    print(f'render worker started (pid={proc.pid}, detached). Poll:  python render.py {a.html} status --out {a.out}')

def is_worker_alive(out_dir, pattern):
    pid_file = pathlib.Path(out_dir) / 'worker.pid'
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text(encoding='utf-8').strip())
            if os.name == 'nt':
                res = subprocess.run(['tasklist', '/fi', f'PID eq {pid}'], capture_output=True, text=True, encoding='utf-8', errors='replace')
                return str(pid) in res.stdout
            else:
                os.kill(pid, 0)
                return True
        except Exception:
            pass
    if os.name != 'nt':
        try:
            return subprocess.run(['pgrep', '-f', pattern], capture_output=True).returncode == 0
        except Exception:
            return False
    return False

def status(a):
    out = pathlib.Path(a.out)
    plan = json.load(open(out / 'plan.json', encoding='utf-8')) if (out / 'plan.json').exists() else None
    done = len(list((out / 'chunks').glob('*.done'))) if (out / 'chunks').exists() else 0
    prog = json.load(open(out / 'progress.json', encoding='utf-8')) if (out / 'progress.json').exists() else {}
    alive = is_worker_alive(a.out, f'render.py.*work.*{a.out}')
    print(json.dumps({'chunks_done': done, 'chunks_total': plan and plan['chunks'], 'progress': prog, 'worker_alive': alive}))
    if plan and done < plan['chunks'] and not alive:
        print('worker is not running -> run `start` again to resume from the last finished chunk')
    if plan and done == plan['chunks']:
        print('ALL CHUNKS DONE -> run `assemble`')

def assemble(a):
    out = pathlib.Path(a.out); ch = sorted((out / 'chunks').glob('[0-9][0-9][0-9][0-9].mp4'))
    plan = json.load(open(out / 'plan.json', encoding='utf-8'))
    assert len(ch) == plan['chunks'], f'only {len(ch)}/{plan["chunks"]} chunks rendered'
    (out / 'list.txt').write_text(''.join(f"file '{c.resolve().as_posix()}'\n" for c in ch), encoding='utf-8')
    vid = out / 'video_only.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(out / 'list.txt'), '-c', 'copy', str(vid)], check=True)
    final = out / a.name; dur = str(plan['dur'])
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(vid)] + (['-i', a.audio] if a.audio else []) + \
          ['-map', '0:v'] + (['-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] if a.audio else []) + \
          ['-t', dur, '-c:v', 'libx264', '-preset', 'medium', '-crf', str(a.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(final)]
    subprocess.run(cmd, check=True)
    n = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(final)], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout.strip().split(',')[0]
    print(f'{final}  frames={n} expected={plan["frames"]}')

if __name__ == '__main__':
    a = args()
    if a.cmd == 'stills': asyncio.run(stills(a))
    elif a.cmd == 'work': asyncio.run(work(a))
    elif a.cmd == 'start': start(a)
    elif a.cmd == 'status': status(a)
    else: assemble(a)
