# MyBoard Chrome Extension

바닐라 JavaScript로 개발된 크롬 익스텐션입니다.

## 개발 환경

- Vanilla JavaScript
- Chrome Extension Manifest V3

## 파일 구조

```
├── manifest.json       # 익스텐션 설정 파일
├── popup.html          # 팝업 UI
├── popup.js            # 팝업 스크립트
├── background.js       # 백그라운드 서비스 워커
├── content.js          # 콘텐츠 스크립트
├── icons/              # 아이콘 파일들
└── package.json        # 프로젝트 설정
```

## 개발 방법

1. 크롬에서 `chrome://extensions/` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 이 프로젝트 폴더 선택

## 주의사항

- `icons/` 폴더에 16x16, 32x32, 48x48, 128x128 크기의 아이콘 파일들을 추가해야 합니다.
- 아이콘 파일명: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
