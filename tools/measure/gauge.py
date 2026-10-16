# 계기판 SPEED 링 게이지가 채워진 비율(0~1)을 프레임마다 읽는다
import numpy as np

CX, CY = 161.6, 164.2       # 링 중심 (화면 좌표)
R_IN, R_OUT = 18.0, 34.0    # 바깥 SPEED 링 반경 범위
START, SWEEP = 120.0, 300.0  # 왼쪽 아래(120°)에서 시계 방향으로 300°
LIT = np.array([(113, 0, 101), (97, 0, 93), (130, 28, 138)])

_ys, _xs = np.mgrid[0:200, 0:320]
_r = np.hypot(_xs - CX, _ys - CY)
_a = (np.degrees(np.arctan2(_ys - CY, _xs - CX)) - START) % 360
_ring = (_r >= R_IN) & (_r <= R_OUT) & (_a <= SWEEP) & (_ys >= 135)
_bins = (_a[_ring] // 3).astype(int)  # 3° 단위


def speed_fraction(frame: np.ndarray) -> float:
    lit = np.any(np.all(frame[_ring][:, None, :] == LIT[None], axis=2), axis=1)
    n = int(SWEEP // 3)
    tot = np.bincount(_bins, minlength=n)[:n]
    on = np.bincount(_bins, weights=lit, minlength=n)[:n]
    frac = np.where(tot > 0, on / np.maximum(tot, 1), 0)
    lit_bins = np.where(frac > 0.5)[0]
    return 0.0 if len(lit_bins) == 0 else (lit_bins.max() + 1) / n
