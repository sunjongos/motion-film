#!/usr/bin/env python3
"""KakaoTalk & Mobile Safe Audio Master Tool (motion-film v2.0)
==============================================================
Ensures zero-clipping, zero-distortion playback when sharing MP4 videos on KakaoTalk:
1. Resamples to 48,000 Hz (SMPTE video standard, eliminates mobile hardware jitter)
2. Normalizes to ITU-R BS.1770-4 / EBU R128 (-15.0 LUFS)
3. Hard True Peak ceiling at -2.5 dBTP (absorbs +2.0 dB lossy AAC transcode overshoot)
4. Sidechain ducking of BGM under voice narration (-10 dB)
5. FastStart MP4 packaging (-movflags +faststart) for instant playback
"""

import argparse
import os
import subprocess
import sys

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def master_audio(video_in, bgm_in, voice_in=None, out_mp4=None, tp_limit=-2.5, lufs_target=-15.0):
    if not out_mp4:
        base, ext = os.path.splitext(video_in)
        out_mp4 = f"{base}_kakao_safe{ext}"

    tmp_dir = os.path.dirname(os.path.abspath(out_mp4))
    tmp_mixed = os.path.join(tmp_dir, '_tmp_mixed.wav')
    tmp_master = os.path.join(tmp_dir, '_tmp_master.wav')

    try:
        if voice_in and os.path.exists(voice_in):
            print(f"[*] Mixing BGM ({bgm_in}) with Voice ({voice_in}) + Sidechain ducking...")
            cmd_mix = [
                'ffmpeg', '-y',
                '-i', bgm_in,
                '-i', voice_in,
                '-filter_complex',
                '[0:a]volume=0.9[bgm];'
                '[bgm][1:a]sidechaincompress=threshold=0.08:ratio=5:attack=100:release=650[ducked_bgm];'
                '[ducked_bgm][1:a]amix=inputs=2:dropout_transition=0:normalize=0[mixed]',
                '-map', '[mixed]',
                '-ar', '48000', '-ac', '2',
                tmp_mixed
            ]
            subprocess.run(cmd_mix, check=True)
            source_audio = tmp_mixed
        else:
            source_audio = bgm_in

        print(f"[*] Applying EBU R128 Loudnorm (I={lufs_target} LUFS, TP={tp_limit} dBTP, 48kHz)...")
        cmd_master = [
            'ffmpeg', '-y',
            '-i', source_audio,
            '-af', f'loudnorm=I={lufs_target}:TP={tp_limit}:LRA=7.0:print_format=summary',
            '-ar', '48000', '-ac', '2',
            tmp_master
        ]
        subprocess.run(cmd_master, check=True)

        print(f"[*] Muxing video + AAC 192k 48kHz + faststart into: {out_mp4}...")
        cmd_mux = [
            'ffmpeg', '-y',
            '-i', video_in,
            '-i', tmp_master,
            '-map', '0:v', '-map', '1:a',
            '-c:v', 'copy',
            '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '192k', '-ar', '48000',
            '-movflags', '+faststart',
            out_mp4
        ]
        subprocess.run(cmd_mux, check=True)
        print(f"[+] Successfully generated KakaoTalk-safe master: {out_mp4}")
        return out_mp4

    finally:
        for f in [tmp_mixed, tmp_master]:
            if os.path.exists(f):
                try: os.remove(f)
                except Exception: pass

if __name__ == '__main__':
    p = argparse.ArgumentParser(description="KakaoTalk-safe Audio Mastering Tool")
    p.add_argument('video', help="Input MP4 video path")
    p.add_argument('--bgm', required=True, help="Background music audio file")
    p.add_argument('--voice', help="Optional voice narration audio file")
    p.add_argument('--out', help="Output MP4 file path")
    p.add_argument('--tp', type=float, default=-2.5, help="True Peak ceiling in dBTP (default: -2.5)")
    p.add_argument('--lufs', type=float, default=-15.0, help="Target Integrated Loudness in LUFS (default: -15.0)")
    args = p.parse_args()

    master_audio(args.video, args.bgm, args.voice, args.out, args.tp, args.lufs)
