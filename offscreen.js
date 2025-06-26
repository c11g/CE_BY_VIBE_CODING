// Offscreen document - 이미지 처리용
console.log('Offscreen document loaded');

// 백그라운드 스크립트로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'crop-image') {
    cropImage(request.dataUrl, request.area)
      .then(croppedDataUrl => {
        sendResponse({ success: true, croppedDataUrl });
      })
      .catch(error => {
        console.error("이미지 크롭 오류:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 비동기 응답
  }
});

// 이미지 크롭 함수
async function cropImage(dataUrl, area) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        console.log("크롱 시작 - 원본 이미지 크기:", img.width, "x", img.height);
        console.log("크롭 영역:", area);
        
        // 캔버스 크기 설정
        canvas.width = area.width;
        canvas.height = area.height;
        
        // 디바이스 픽셀 비율 고려
        const ratio = area.devicePixelRatio || 1;
        
        console.log("디바이스 픽셀 비율:", ratio);
        console.log("크롭 좌표 (픽셀 비율 적용):", {
          sourceX: area.x * ratio,
          sourceY: area.y * ratio,
          sourceWidth: area.width * ratio,
          sourceHeight: area.height * ratio
        });
        
        // 이미지를 캔버스에 크롭하여 그리기
        ctx.drawImage(
          img,
          area.x * ratio,      // 소스 이미지의 X 좌표
          area.y * ratio,      // 소스 이미지의 Y 좌표
          area.width * ratio,  // 소스 이미지에서 복사할 너비
          area.height * ratio, // 소스 이미지에서 복사할 높이
          0,                   // 캔버스에 그릴 X 좌표
          0,                   // 캔버스에 그릴 Y 좌표
          area.width,          // 캔버스에 그릴 너비
          area.height          // 캔버스에 그릴 높이
        );
        
        console.log("이미지 크롭 완료");
        
        // 크롭된 이미지를 데이터 URL로 변환
        const croppedDataUrl = canvas.toDataURL('image/png');
        resolve(croppedDataUrl);
        
      } catch (error) {
        console.error("크롭 중 오류:", error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('이미지 로드 실패'));
    };
    
    img.src = dataUrl;
  });
}
