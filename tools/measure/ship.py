# 우주선 스프라이트 몸체 색으로 화면상 위치(바운딩 박스)를 찾는다
import numpy as np

BODY = np.array([(8, 0, 117), (16, 56, 130), (32, 77, 142), (48, 97, 154),
                 (65, 121, 170), (85, 142, 182), (105, 162, 195), (130, 186, 211)])


def bbox(frame: np.ndarray, y_max: int = 130):
    """(y_top, y_bottom, x_left, x_right, 픽셀 수). 못 찾으면 None."""
    f = frame[:y_max]
    m = np.any(np.all(f[:, :, None, :] == BODY[None, None], axis=3), axis=2)
    if m.sum() < 20:
        return None
    ys, xs = np.where(m)
    return int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max()), int(m.sum())
