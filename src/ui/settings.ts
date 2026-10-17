// 화면 모드·음악 설정을 브라우저 저장소에 보관한다 (저장소를 쓸 수 없으면 이번 실행 동안만 기억)
const KEY = 'skyload.settings';

export type CameraMode = 'modern' | 'classic';

export interface SettingsValues {
  camera: CameraMode;
  music: boolean;
}

const DEFAULTS: SettingsValues = { camera: 'modern', music: true };

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export class Settings {
  values: SettingsValues = { ...DEFAULTS };

  constructor(private readonly store: KeyValueStore | null) {
    try {
      const raw = store?.getItem(KEY);
      const saved: Partial<SettingsValues> = raw ? JSON.parse(raw) : {};
      if (saved.camera === 'modern' || saved.camera === 'classic') this.values.camera = saved.camera;
      if (typeof saved.music === 'boolean') this.values.music = saved.music;
    } catch {
      // 저장소 접근이 막혔거나 값이 깨졌으면 기본값으로 시작한다
    }
  }

  static fromBrowser(): Settings {
    try {
      return new Settings(window.localStorage);
    } catch {
      return new Settings(null);
    }
  }

  toggleCamera(): void {
    this.values.camera = this.values.camera === 'modern' ? 'classic' : 'modern';
    this.save();
  }

  toggleMusic(): void {
    this.values.music = !this.values.music;
    this.save();
  }

  private save(): void {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.values));
    } catch {
      // 저장 실패는 무시한다
    }
  }
}
