# DOSBox 녹화 영상(AVI)을 프레임 배열로 불러오는 분석 도우미
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

W, H = 320, 200
FPS = 70.086  # DOSBox VGA 모드 13h 주사율 (녹화 파일 메타데이터 기준)


def load(avi: Path) -> np.ndarray:
    """(프레임 수, 200, 320, 3) uint8 배열을 반환한다."""
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", str(avi),
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def latest(capture_dir: Path) -> Path:
    return max(capture_dir.glob("*.avi"), key=lambda p: p.stat().st_mtime)


def changed(frames: np.ndarray, region=None) -> np.ndarray:
    """각 프레임이 직전 프레임과 다른지 여부 (region = (y0, y1, x0, x1))."""
    f = frames if region is None else frames[:, region[0]:region[1], region[2]:region[3]]
    return np.concatenate([[True], np.any(f[1:] != f[:-1], axis=(1, 2, 3))])
