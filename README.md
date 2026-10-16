# toy-skyload-remake

> Inspired by **SkyRoads** (Bluemoon Interactive, 1993)

1993년 DOS 게임 SkyRoads를 웹 기술로 새로 만드는 **비공식 팬 리메이크** 프로젝트입니다. 원작의 손맛은 살리고, 그래픽과 연출은 요즘 스타일로 다시 만드는 것이 목표입니다.

## 알림

- 이 프로젝트는 Bluemoon Interactive와 **관련이 없는 비공식 팬 프로젝트**입니다.
- 이 저장소에는 원작 게임의 실행 파일, 그래픽, 사운드, 맵 데이터가 **포함되어 있지 않습니다.**
- 원작 코드를 분석하거나 옮겨 오지 않습니다. 모든 코드는 원작 플레이를 관찰한 결과만 바탕으로 새로 작성합니다.
- 원작은 Bluemoon Interactive 공식 사이트(http://www.bluemoon.ee/)에서 프리웨어로 받을 수 있습니다.

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| M0 | 개발 환경 구성 | 완료 |
| M1 | 원작 플레이 측정 (속도, 점프, 충돌 등) | 예정 |
| M2 | 코어 물리 | 예정 |
| M3 | 3D 렌더링 | 예정 |
| M4 | 게임 규칙 (블록 효과, 연료, 산소) | 예정 |
| M5 | 맵, 메뉴, HUD, 효과음 | 예정 |
| M6 | 현대적 연출 | 예정 |
| 2차 | Windows 실행 파일 배포 (Tauri + GitHub Releases) | 예정 |

자세한 내용은 [개발 계획서](docs/development-plan.md)를 참고하세요.

## 기술 스택

- TypeScript, Vite
- Three.js
- Vitest
- (2차) Tauri

## 실행 방법

Node.js 22.12 이상이 필요합니다.

```bash
npm install
npm run dev      # 개발 서버 실행
npm test         # 테스트
npm run build    # 배포용 빌드 (dist/)
```

## 문서

- [개발 계획서](docs/development-plan.md)
- [작업 체크리스트](docs/checklist.md)
- [의사결정 기록](docs/context-notes.md)
