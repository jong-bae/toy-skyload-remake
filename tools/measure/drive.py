# DOSBox에서 원작을 실행하고 키 입력·화면 캡처·녹화를 시나리오대로 자동 수행하는 측정 드라이버
"""
사용법:
  python drive.py <scenario.json> [cycles]
  cycles를 주면 측정 설정의 CPU 속도를 그 값으로 바꿔 실행한다.

시나리오는 단계 목록이다.
  ["wait", 초]            대기
  ["tap", "키", 초?]      키를 눌렀다 뗀다 (누르고 있는 시간, 기본 0.08초)
  ["down", "키"]          키 누름 유지
  ["up", "키"]            키 뗌
  ["tapuntil", "키", 최대횟수]  화면이 바뀔 때까지 키를 0.3초씩 눌러 본다
  ["road", 번호]          화면을 판별하며 메뉴를 거쳐 해당 로드(0~29)를 시작한다
  ["shot", "이름"]        DOSBox 창 화면을 recordings/shots/이름.png로 저장
  ["rec"]                 DOSBox 녹화 토글 (Ctrl+Alt+F5)
  ["quit"]                DOSBox 종료

키를 보내기 전마다 DOSBox 창이 맨 앞에 있는지 확인하고, 아니면 즉시 중단한다.
"""
import ctypes
import ctypes.wintypes as wt
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageGrab

ROOT = Path(__file__).resolve().parents[2]
DOSBOX = ROOT / "dosplay" / "DOSBox-0.74" / "DOSBox.exe"
CONF = Path(__file__).with_name("dosbox-measure.conf")
SHOTS = ROOT / "recordings" / "shots"
REF = ROOT / "recordings" / "ref"  # 화면 판별용 기준 이미지 (title, select, game)

user32 = ctypes.windll.user32
user32.SetProcessDPIAware()

# 키 이름 → (스캔 코드, 확장 키 여부)
SCAN = {
    "esc": (0x01, False), "enter": (0x1C, False), "space": (0x39, False),
    "up": (0x48, True), "down": (0x50, True), "left": (0x4B, True), "right": (0x4D, True),
    "ctrl": (0x1D, False), "alt": (0x38, False), "f5": (0x3F, False),
    "y": (0x15, False), "n": (0x31, False), "1": (0x02, False), "2": (0x03, False),
}

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [("wVk", wt.WORD), ("wScan", wt.WORD), ("dwFlags", wt.DWORD),
                ("time", wt.DWORD), ("dwExtraInfo", ctypes.c_size_t)]


class INPUT(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [("ki", KEYBDINPUT), ("pad", ctypes.c_byte * 32)]
    _anonymous_ = ("u",)
    _fields_ = [("type", wt.DWORD), ("u", _U)]


def find_window(pid: int) -> int:
    found = []

    @ctypes.WINFUNCTYPE(wt.BOOL, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        p = wt.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(p))
        if p.value == pid and user32.IsWindowVisible(hwnd):
            found.append(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return found[0] if found else 0


def conf_for(cycles: int | None) -> Path:
    if cycles is None:
        return CONF
    out = ROOT / "recordings" / f"dosbox-cycles{cycles}.conf"
    out.write_text(CONF.read_text(encoding="utf-8").replace("cycles=fixed 20000", f"cycles=fixed {cycles}"),
                   encoding="utf-8")
    return out


class Driver:
    def __init__(self, cycles: int | None = None):
        self.proc = subprocess.Popen([str(DOSBOX), "-noconsole", "-conf", str(conf_for(cycles))],
                                     cwd=DOSBOX.parent)
        self.hwnd = 0
        for _ in range(100):
            self.hwnd = find_window(self.proc.pid)
            if self.hwnd:
                break
            time.sleep(0.1)
        if not self.hwnd:
            raise RuntimeError("DOSBox 창을 찾지 못했다")
        time.sleep(0.5)
        user32.SetForegroundWindow(self.hwnd)
        time.sleep(0.3)

    def _ensure_focus(self):
        if user32.GetForegroundWindow() != self.hwnd:
            user32.SetForegroundWindow(self.hwnd)
            time.sleep(0.2)
            if user32.GetForegroundWindow() != self.hwnd:
                raise RuntimeError("DOSBox 창이 맨 앞에 있지 않아 중단한다")

    def key(self, name: str, up: bool):
        self._ensure_focus()
        scan, ext = SCAN[name]
        flags = KEYEVENTF_SCANCODE | (KEYEVENTF_EXTENDEDKEY if ext else 0) | (KEYEVENTF_KEYUP if up else 0)
        inp = INPUT(type=1)
        inp.ki = KEYBDINPUT(0, scan, flags, 0, 0)
        user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

    def tap(self, name: str, hold: float = 0.08):
        self.key(name, False)
        time.sleep(hold)
        self.key(name, True)

    def grab(self):
        rect = wt.RECT()
        user32.GetClientRect(self.hwnd, ctypes.byref(rect))
        pt = wt.POINT(0, 0)
        user32.ClientToScreen(self.hwnd, ctypes.byref(pt))
        box = (pt.x, pt.y, pt.x + rect.right, pt.y + rect.bottom)
        return ImageGrab.grab(bbox=box, all_screens=True)

    def shot(self, name: str):
        SHOTS.mkdir(parents=True, exist_ok=True)
        self.grab().save(SHOTS / f"{name}.png")

    def wait_stable(self, timeout: float = 6.0):
        """페이드 등으로 화면이 바뀌는 중이면 멈출 때까지 기다린다."""
        last = np.asarray(self.grab(), dtype=np.int16)
        end = time.time() + timeout
        while time.time() < end:
            time.sleep(0.4)
            now = np.asarray(self.grab(), dtype=np.int16)
            if np.mean(np.abs(now - last) > 30) < 0.01:
                return now
            last = now
        return last

    def screen(self) -> str:
        """현재 화면 종류: game, select, title, other."""
        now = np.asarray(self.grab().convert("RGB"), dtype=np.int16)
        if not hasattr(self, "_ref"):
            self._ref = {k: np.asarray(Image.open(REF / f"{k}.png").convert("RGB"), dtype=np.int16)
                         for k in ("game", "select", "title")}
        ref = self._ref
        if np.mean(np.abs(now[150:] - ref["game"][150:])) < 12:
            return "game"
        if np.mean(np.abs(now - ref["select"])) < 12:
            return "select"
        if np.mean(np.abs(now[120:] - ref["title"][120:])) < 12:
            return "title"
        return "other"

    def cursor(self) -> int | None:
        """선택 화면의 커서가 가리키는 로드 번호(0~29). 커서가 깜빡여 안 보이면 None.

        커서는 배경을 밝게 칠한 48×9 사각형이라, 커서 없는 기준 화면과 다른 영역으로 찾는다.
        왼쪽 열 월드 0~4, 오른쪽 열 월드 5~9. 월드 간격 39px, 로드 간격 9px, 첫 로드 y=12.
        """
        now = np.asarray(self.grab().convert("RGB"), dtype=np.int16)
        d = np.any(now != self._ref["select"], axis=2)
        if d.sum() < 100:
            return None
        ys, xs = np.where(d)
        y0, x0 = int(np.median(ys)) - 4, int(np.median(xs))
        col = 0 if x0 < 160 else 1
        w = (y0 - 12 + 4) // 39
        r = round((y0 - 12 - 39 * w) / 9)
        return 15 * col + 3 * w + r

    def road(self, n: int, timeout: float = 60.0):
        """메뉴를 거쳐 n번째 로드를 시작한다. 커서 위치를 확인하며 맞춘다."""
        end = time.time() + timeout
        while time.time() < end:
            kind = self.screen()
            if kind == "game":
                return
            if kind == "select":
                self.wait_stable()
                while time.time() < end:
                    idx = None
                    for _ in range(8):  # 깜빡임 대비
                        idx = self.cursor()
                        if idx is not None:
                            break
                        time.sleep(0.1)
                    if idx == n:
                        break
                    if idx is None:
                        continue
                    self.tap("down" if idx < n else "up", 0.25)
                    time.sleep(0.35)
                self.tap("enter", 0.3)
                time.sleep(2.0)
                if self.screen() != "game":
                    raise RuntimeError("선택 화면에서 로드를 시작하지 못했다")
                return
            self.tap("enter", 0.3)
            time.sleep(1.5)
        raise RuntimeError("로드 시작 시간 초과")

    def tap_until(self, name: str, tries: int = 5):
        before = self.wait_stable()
        for _ in range(tries):
            self.tap(name, 0.3)
            time.sleep(1.2)
            now = np.asarray(self.grab(), dtype=np.int16)
            if np.mean(np.abs(now - before) > 30) > 0.3:
                return
        raise RuntimeError(f"{name} 키를 {tries}번 눌러도 화면이 바뀌지 않았다")

    def rec(self):
        for k in ("ctrl", "alt", "f5"):
            self.key(k, False)
            time.sleep(0.03)
        time.sleep(0.08)
        for k in ("f5", "alt", "ctrl"):
            self.key(k, True)
            time.sleep(0.03)

    def quit(self):
        self.proc.terminate()
        self.proc.wait(timeout=5)


def run(steps, cycles: int | None = None):
    d = Driver(cycles)
    try:
        for step in steps:
            op, *args = step
            print("·", step, flush=True)
            if op == "wait":
                time.sleep(args[0])
            elif op == "tap":
                d.tap(*args)
            elif op == "down":
                d.key(args[0], False)
            elif op == "up":
                d.key(args[0], True)
            elif op == "road":
                d.road(args[0])
            elif op == "tapuntil":
                d.tap_until(*args)
            elif op == "shot":
                d.shot(args[0])
            elif op == "rec":
                d.rec()
            elif op == "quit":
                d.quit()
                return
    finally:
        if d.proc.poll() is None:
            d.quit()


if __name__ == "__main__":
    run(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")),
        int(sys.argv[2]) if len(sys.argv) > 2 else None)
