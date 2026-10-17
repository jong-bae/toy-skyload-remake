# 원작의 깊이 매핑(s = 1/(y - 8))으로 지면 높이의 블록 앞면 경계를 추적해 전진 거리를 추정한다
"""
원작 화면 투영 (docs/measurements.md 2장)
- 좌우: 노면 폭이 y = 32에서 0으로 수렴한다. 반폭(px) = 칸 수 × ⅔ × (y - 32)
- 깊이: 화면 행 y의 지면까지 거리 s = 1/(y - 8). 타일 1칸 = 0.00396
  (등속 궤적이 시간에 직선이 되는 조건과 줄무늬 타일 간격이 균일해지는 조건이 모두 y = 8을 가리킨다)

블록 앞면의 아랫선은 바닥과 만나므로 정확히 지면 높이에 있다.
"바닥 색 바로 위에 블록 면 색"인 가로 경계를 프레임마다 찾고, 프레임 사이에 이어 붙여 궤적을 만든다.
"""
import numpy as np

Y_D = 8          # 깊이 매핑 기준 행
TILE = 0.00396   # 타일 1칸의 s 길이
Y_MIN, Y_MAX = 36, 130  # 지면이 보이는 행 범위 (아래는 계기판)


def ground_edges(frame: np.ndarray, floor_rgb, is_face, min_run: int = 10) -> list[int]:
    """바닥 행 y 바로 위(y-1)가 블록 면인 픽셀이 min_run개 이상인 행 y 목록."""
    floor = np.all(frame == np.asarray(floor_rgb), axis=2)
    face = is_face(frame)
    hits = floor[1:] & face[:-1]  # hits[y-1]: 행 y가 바닥, 행 y-1이 면
    counts = hits.sum(axis=1)
    return [y for y in range(Y_MIN, Y_MAX) if counts[y - 1] >= min_run]


def s_of(y: float) -> float:
    return 1.0 / (y - Y_D)


def link(edges_per_frame: list[list[int]], max_ds: float = 0.004) -> list[dict[int, int]]:
    """경계를 프레임 사이에 이어 궤적 목록({프레임: y})을 만든다. 경계는 가까워지기만 한다(y 증가)."""
    tracks: list[dict[int, int]] = []
    active: list[dict[int, int]] = []
    for i, ys in enumerate(edges_per_frame):
        free = sorted(ys)
        nxt = []
        for tr in sorted(active, key=lambda t: -t[max(t)]):  # 가까운 궤적부터 짝짓기
            y0 = tr[max(tr)]
            cand = [y for y in free if y >= y0 and s_of(y0) - s_of(y) <= max_ds]
            if cand:
                y = min(cand)
                free.remove(y)
                tr[i] = y
                nxt.append(tr)
            elif i - max(tr) <= 3:  # 잠깐 가려진 경우 몇 프레임 유지
                nxt.append(tr)
        for y in free:
            tr = {i: y}
            tracks.append(tr)
            nxt.append(tr)
        active = nxt
    return tracks


def solve_distance(tracks: list[dict[int, int]], n_frames: int, smooth: float = 1e-3) -> np.ndarray:
    """프레임별 누적 전진 거리 D (s 단위, D[0] = 0). 타일 수는 D / TILE.

    모든 궤적이 같은 이동을 공유한다는 조건 s_j(i) = c_j - D(i)를 가중 최소제곱으로 푼다.
    가중치는 픽셀 1칸에 해당하는 s 폭의 역제곱(근거리일수록 정밀). D의 2차 차분에 작은 평활 항을 둔다.
    """
    tracks = [t for t in tracks if len(t) >= 3]
    n_c = len(tracks)
    rows, rhs, wts = [], [], []
    for j, tr in enumerate(tracks):
        for i, y in tr.items():
            sigma = 1.0 / (y - Y_D) ** 2
            rows.append((i, j))
            rhs.append(s_of(y))
            wts.append(1.0 / sigma)
    n = n_frames + n_c
    A = np.zeros((len(rows) + n_frames, n))
    b = np.zeros(len(rows) + n_frames)
    for k, ((i, j), r, w) in enumerate(zip(rows, rhs, wts)):
        A[k, n_frames + j] = w      # c_j
        A[k, i] = -w                # -D_i
        b[k] = w * r
    k0 = len(rows)
    lam = smooth * np.median(wts)
    for i in range(1, n_frames - 1):
        A[k0 + i, i - 1], A[k0 + i, i], A[k0 + i, i + 1] = lam, -2 * lam, lam
    A[k0, 0] = np.max(wts)  # D_0 = 0 고정
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    return sol[:n_frames]
