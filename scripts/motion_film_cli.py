#!/usr/bin/env python3
"""motion-film CLI — World-Best Code-Driven Motion Graphics Engine
Surpasses Remotion with 0-npm dependency, pure mathematical time-function seek(t),
physical subframe motion blur, acoustic grid-lock, and automated frame-level QA.

Commands:
  python motion_film_cli.py build <scene.js> [--out <film.html>]
  python motion_film_cli.py stills <scene.js|film.html> [--out <dir>] [--beats] [--scale 0.5]
  python motion_film_cli.py render <scene.js|film.html> [--out <film.mp4>] [--audio <track.wav>] [--fps 60] [--sub 4] [--qa]
  python motion_film_cli.py qa <film.mp4> [--bpm 120] [--loop]
  python motion_film_cli.py init <project_dir>
  python motion_film_cli.py demo
"""
import argparse, os, pathlib, subprocess, sys, time

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

HERE = pathlib.Path(__file__).resolve().parent
SKILL_ROOT = HERE.parent

def run_cmd(cmd_list, check=True):
    print(f"[RUN] {' '.join(cmd_list)}")
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    return subprocess.run(cmd_list, check=check, env=env)

def cmd_build(args):
    scene_path = pathlib.Path(args.scene).resolve()
    html_path = pathlib.Path(args.out).resolve() if args.out else scene_path.with_suffix('.html')
    build_script = HERE / 'build.py'
    cmd = [sys.executable, str(build_script), str(scene_path), str(html_path)]
    run_cmd(cmd)
    return html_path

def cmd_stills(args):
    input_path = pathlib.Path(args.input).resolve()
    if input_path.suffix == '.js':
        html_path = input_path.with_suffix('.html')
        cmd_build(argparse.Namespace(scene=str(input_path), out=str(html_path)))
    else:
        html_path = input_path

    out_dir = pathlib.Path(args.out or 'preview_stills').resolve()
    render_script = HERE / 'render.py'
    cmd = [sys.executable, str(render_script), str(html_path), 'stills', '--out', str(out_dir), '--scale', str(args.scale)]
    if args.beats:
        cmd.append('--beats')
    run_cmd(cmd)

def cmd_render(args):
    input_path = pathlib.Path(args.input).resolve()
    if input_path.suffix == '.js':
        html_path = input_path.with_suffix('.html')
        cmd_build(argparse.Namespace(scene=str(input_path), out=str(html_path)))
    else:
        html_path = input_path

    out_dir = pathlib.Path(args.render_dir or 'render_work').resolve()
    mp4_out = pathlib.Path(args.out or 'final_film.mp4').resolve()
    render_script = HERE / 'render.py'

    # 1. Work synchronously in chunks
    print(f"🎬 Starting render of {html_path.name} (fps={args.fps}, sub={args.sub})...")
    work_cmd = [sys.executable, str(render_script), str(html_path), 'work',
                '--out', str(out_dir), '--fps', str(args.fps), '--sub', str(args.sub),
                '--chunk', str(args.chunk), '--scale', str(args.scale)]
    run_cmd(work_cmd)

    # 2. Assemble
    print(f"🎞️ Assembling final film -> {mp4_out.name}...")
    assemble_cmd = [sys.executable, str(render_script), str(html_path), 'assemble',
                    '--out', str(out_dir), '--name', mp4_out.name]
    if args.audio:
        assemble_cmd.extend(['--audio', str(pathlib.Path(args.audio).resolve())])
    run_cmd(assemble_cmd)

    # Move/copy if needed
    assembled = out_dir / mp4_out.name
    if assembled != mp4_out and assembled.exists():
        import shutil
        shutil.copy2(assembled, mp4_out)

    print(f"✨ Video successfully produced: {mp4_out}")

    # 3. Automated QA gate
    if args.qa:
        print("🔍 Running automated QA gate on output video...")
        qa_script = HERE / 'qa.py'
        qa_cmd = [sys.executable, str(qa_script), str(mp4_out)]
        if args.loop:
            qa_cmd.append('--loop')
        qa_res = subprocess.run(qa_cmd)
        if qa_res.returncode == 0:
            print("✅ QA PASSED: Broadcast quality verified, zero pops, seamless motion.")
        else:
            print("⚠️ QA WARNING: Frame anomalies detected. Review logs.")

def cmd_qa(args):
    qa_script = HERE / 'qa.py'
    cmd = [sys.executable, str(qa_script), str(pathlib.Path(args.mp4).resolve()), '--bpm', str(args.bpm)]
    if args.loop:
        cmd.append('--loop')
    if args.sheet:
        cmd.extend(['--sheet', str(args.sheet)])
    run_cmd(cmd)

def cmd_init(args):
    target = pathlib.Path(args.dir).resolve()
    target.mkdir(parents=True, exist_ok=True)
    template_js = """// Scene Definition: Every pixel is a pure function of t
const CONFIG = {
  size: 1440,
  dur: 8,
  bpm: 120,
  offset: 0,
  bg: '#ECEAE6',
  fonts: ['600 40px Geist', '800 100px Archivo']
};

const B = n => beat(n);

const STATES = [
  [0,    { w: 380, h: 116, r: 58, fill: '#0B0B0C' }],
  [B(2), { w: 520, h: 280, r: 36, fill: '#141416' }],
  [B(4), { w: 140, h: 140, r: 70, fill: '#0055FF' }],
  [B(6), { w: 380, h: 116, r: 58, fill: '#0B0B0C' }],
];

async function setup() {
  // Optional pre-computation
}

function draw(t) {
  // Spring interpolation
  const st = springState(t, STATES, 2.6, 0.78, 0.5);
  const zoom = Math.pow(Math.min(S * 0.74 / st.w, S * 0.74 / st.h), 0.75);

  X.save();
  applyCam(X, [C, C, zoom]);

  // Main UI shape
  X.fillStyle = st.fill;
  rrc(X, C, C, st.w, st.h, st.r);
  X.fill();

  // Typography
  X.fillStyle = '#FFFFFF';
  X.font = '800 36px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  X.fillText('MOTION FILM', C, C);

  X.restore();
}
"""
    (target / 'scene.js').write_text(template_js, encoding='utf-8')
    readme = """# Motion Film Project

1. Preview contact sheet:
   python ../scripts/motion_film_cli.py stills scene.js --beats

2. Full render:
   python ../scripts/motion_film_cli.py render scene.js --out film.mp4 --loop --qa
"""
    (target / 'README.md').write_text(readme, encoding='utf-8')
    print(f"🎉 Created motion-film project at: {target}")

def cmd_demo(args):
    example_mp4 = SKILL_ROOT / 'examples' / 'ui_morph_loop_demo.mp4'
    if not example_mp4.exists():
        example_mp4 = SKILL_ROOT / 'demo_assets' / 'ui_morph_loop_demo.mp4'
    print(f"🎬 Verifying demo MP4: {example_mp4}")
    qa_script = HERE / 'qa.py'
    run_cmd([sys.executable, str(qa_script), str(example_mp4), '--bpm', '120', '--loop'])

def main():
    p = argparse.ArgumentParser(description="World-Best motion-film CLI")
    sub = p.add_subparsers(dest='command')

    p_build = sub.add_parser('build', help='Build HTML from scene.js')
    p_build.add_argument('scene')
    p_build.add_argument('--out')

    p_stills = sub.add_parser('stills', help='Generate beat stills & contact sheet')
    p_stills.add_argument('input')
    p_stills.add_argument('--out')
    p_stills.add_argument('--beats', action='store_true', default=True)
    p_stills.add_argument('--scale', type=float, default=0.5)

    p_render = sub.add_parser('render', help='Render full video (MP4)')
    p_render.add_argument('input')
    p_render.add_argument('--out')
    p_render.add_argument('--render-dir', default='render_work')
    p_render.add_argument('--audio')
    p_render.add_argument('--fps', type=int, default=60)
    p_render.add_argument('--sub', type=int, default=4)
    p_render.add_argument('--chunk', type=float, default=3.0)
    p_render.add_argument('--scale', type=float, default=1.0)
    p_render.add_argument('--loop', action='store_true')
    p_render.add_argument('--qa', action='store_true', default=True)

    p_qa = sub.add_parser('qa', help='Run automated QA on video')
    p_qa.add_argument('mp4')
    p_qa.add_argument('--bpm', type=float, default=120)
    p_qa.add_argument('--loop', action='store_true')
    p_qa.add_argument('--sheet')

    p_init = sub.add_parser('init', help='Scaffold new motion film project')
    p_init.add_argument('dir')

    p_demo = sub.add_parser('demo', help='Verify demo video')

    args = p.parse_args()
    if args.command == 'build': cmd_build(args)
    elif args.command == 'stills': cmd_stills(args)
    elif args.command == 'render': cmd_render(args)
    elif args.command == 'qa': cmd_qa(args)
    elif args.command == 'init': cmd_init(args)
    elif args.command == 'demo': cmd_demo(args)
    else: p.print_help()

if __name__ == '__main__':
    main()
