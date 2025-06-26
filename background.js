// 백그라운드 서비스 워커
console.log('Background script loaded');

// 익스텐션 설치 또는 업데이트 시
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
});
