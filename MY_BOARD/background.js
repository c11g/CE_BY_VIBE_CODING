// 백그라운드 서비스 워커
console.log('Background script loaded');

// 익스텐션 설치 또는 업데이트 시
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
});

// 컨텐츠 스크립트로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureFullScreen") {
    captureFullScreen(sender.tab)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error("캡쳐 오류:", error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (request.action === "captureArea") {
    captureArea(request.area, sender.tab)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error("영역 캡쳐 오류:", error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // 비동기 응답을 위해 true 반환
  }
});

// 화면 전체 캡쳐 함수
async function captureFullScreen(tab) {
  try {
    console.log("전체 화면 캡쳐 시작, 탭 ID:", tab.id);
    
    // windowId 없이 현재 활성 윈도우에서 캡쳐
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });
    
    console.log("전체 화면 캡쳐 완료");
    
    // 현재 시간으로 타임스탬프 생성
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
    const filename = `myboard-capture-${timestamp}.png`;
    
    // 캡쳐된 이미지를 파일로 다운로드
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false // true로 하면 저장 위치 선택 다이얼로그, false면 기본 다운로드 폴더
    });
    
    console.log("파일 다운로드 완료:", filename);
    
    return { success: true, filename: filename };
    
  } catch (error) {
    console.error("캡쳐 중 오류:", error);
    throw error;
  }
}

// 영역 캡쳐 함수
async function captureArea(area, tab) {
  try {
    console.log("영역 캡쳐 시작:", area);
    
    // 전체 화면 캡쳐
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });
    
    console.log("전체 화면 캡쳐 완료, offscreen document로 크롭 시작");
    
    // Offscreen document 생성
    await ensureOffscreenDocument();
    
    // Offscreen document에서 이미지 크롭
    const result = await chrome.runtime.sendMessage({
      type: 'crop-image',
      dataUrl: dataUrl,
      area: area
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    console.log("이미지 크롭 완료");
    
    // 현재 시간으로 타임스탬프 생성
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
    const filename = `myboard-capture-${timestamp}.png`;
    
    // 크롭된 이미지를 파일로 다운로드
    await chrome.downloads.download({
      url: result.croppedDataUrl,
      filename: filename,
      saveAs: false
    });
    
    console.log("크롭된 영역 캡쳐 파일 다운로드 완료:", filename);
    
    return { success: true, filename: filename };
    
  } catch (error) {
    console.error("영역 캡쳐 중 오류:", error);
    throw error;
  }
}

// Offscreen document 생성 및 관리
async function ensureOffscreenDocument() {
  try {
    // 기존 offscreen document가 있는지 확인
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length === 0) {
      // offscreen document 생성
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['DOM_SCRAPING'],
        justification: 'Image processing for screenshot cropping'
      });
      console.log("Offscreen document 생성됨");
    } else {
      console.log("기존 Offscreen document 사용");
    }
  } catch (error) {
    console.error("Offscreen document 생성 오류:", error);
    throw error;
  }
}
