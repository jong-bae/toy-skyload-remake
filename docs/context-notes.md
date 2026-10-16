# 컨텍스트 노트

의사결정과 그 근거를 시간순으로 기록한다. 새 세션은 이 문서부터 읽는다.

## 배경 사실

- 원작은 **SkyRoads** (Creative Dimensions / Bluemoon Interactive, 1993)다. 슈팅 게임이 아니라 우주 도로 레이싱/플랫포머다.
- `dosplay/`는 DOSBox 0.74 실행 환경이다. 게임 파일은 `dosplay/C HDD/`, 실행 파일은 `PWORM.EXE`(18KB)이고, `dosplay/run.bat`로 구동한다.
- `original_file/`은 1995년판 공식 배포본으로 보인다. 실행 파일은 `SKYROADS.EXE`(30KB)이며, `HELPMENU`, `INTRO`, `MUZAX`, `ROADS` 등 일부 파일 크기가 `dosplay/C HDD/`와 다르다.
- `original_file/`과 `dosplay/`는 `.gitignore`로 저장소에서 제외한다.
- `original_file/readme.txt`의 배포 조건은 다음과 같다. "freeware… as long as you don't reverse engineer, and/or modify this program or any of its accompanying files… distributed as a single unit."

## 의사결정

### D-01 (2026-10-16) 웹 기술 기반으로 구현
- 결정: TypeScript + Vite + Three.js로 만든다.
- 근거: 브라우저와 데스크톱(Tauri)에 같은 코드를 쓸 수 있다. 게임 규모에 비해 Unity·Godot는 과하다.

### D-02 (2026-10-16) 데스크톱 배포는 Tauri
- 결정: 2차 계획에서 Tauri v2로 Windows exe를 만들고 GitHub Actions(`tauri-action`)로 Release한다.
- 근거: Electron보다 결과물이 훨씬 작다. 처음엔 Windows만, 코드 서명 없이 시작한다. (SmartScreen 경고는 감수)

### D-03 (2026-10-16) 수치 확보는 블랙박스 측정만
- 결정: `SKYROADS.EXE`, `PWORM.EXE`는 디스어셈블, 디컴파일, 디버거 분석을 하지 않는다. REA 도구도 쓰지 않는다. 수치는 DOSBox 플레이 녹화를 프레임 단위로 측정해 얻는다.
- 근거: readme.txt가 리버스 엔지니어링을 명시적으로 금지한다. 사용자가 블랙박스 측정 방식을 선택했다.
- 결과: 1:1 정밀 재현이 아니라 "원작 느낌" 재현이 목표가 된다. 체감 비교로 튜닝한다.

### D-04 (2026-10-16) 원작 에셋 비포함, 원작 맵 지원은 보류
- 결정: 원작 파일은 저장소와 배포물에 넣지 않는다. 자체 맵과 에셋이 기본이다. 사용자 폴더의 원작 데이터를 읽는 기능은 M7에서 다시 판단한다.
- 근거: readme가 "single unit, intact" 배포만 허용하므로 일부 파일만 포함하거나 변환본을 배포할 수 없다. 데이터 파일 포맷은 커뮤니티 공개 문서로 알 수 있지만, 그 문서도 결국 누군가의 역분석 결과라 모호함이 남는다.
- 미결: M7 시점에 포함 여부를 정한다. 제외해도 게임 완성에는 지장이 없다.

### D-05 (2026-10-16) 시뮬레이션은 고정 시간 간격, 결정론적
- 결정: 게임 로직은 고정 스텝으로 돌고 렌더링과 분리한다.
- 근거: 기기 성능과 무관하게 같은 손맛을 보장하고, 입력 리플레이로 회귀 테스트를 할 수 있다.

### D-06 (2026-10-16) M0 툴체인 버전
- 결정: Vite 8, TypeScript 7, Vitest 5, three 0.186을 쓴다. `npm create vite` 대신 설정 파일을 직접 작성했다.
- 근거: 설치 시점의 최신 버전이다. TypeScript 7은 Go 기반 네이티브 컴파일러라서 `baseUrl`, `moduleResolution: node` 같은 옛 옵션은 쓰지 않고 `moduleResolution: bundler`로 설정했다.
- 참고: `npm run build`에서 "청크 500KB 초과" 경고가 나온다. three 라이브러리 크기 때문이며 M6 최적화 때 다시 본다.

## 미결 사항

- 도로 가로 칸 수 (M1에서 확인)
- 고정 스텝 주기 (원작 체감에 맞춰 60Hz 또는 70Hz 중 결정)
- 프로젝트 정식 이름
