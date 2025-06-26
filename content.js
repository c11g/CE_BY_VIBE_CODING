// 콘텐츠 스크립트 - 텍스트 드래그 시 툴팁 표시
console.log("Content script loaded on:", window.location.href);

let tooltip = null;
let savedSelection = null; // 선택된 범위를 저장
let highlightCounter = 1; // 하이라이트 넘버링 카운터

// 캡쳐 관련 변수들
let isCapturing = false;
let captureOverlay = null;
let captureStartX, captureStartY, captureEndX, captureEndY;

// 텍스트 선택 이벤트 리스너
document.addEventListener("mouseup", function (event) {
  // 툴팁이 이미 있다면 새로 만들지 않음
  if (tooltip) {
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // 텍스트가 실제로 선택되었고, 길이가 0보다 큰 경우에만 툴팁 표시
  if (selectedText.length > 0 && selection.rangeCount > 0) {
    // 선택 범위 저장
    savedSelection = selection.getRangeAt(0).cloneRange();
    showTooltip(event.pageX, event.pageY, selectedText);
  }
});

// 클릭 시 툴팁 제거 (단, 툴팁 내부 클릭은 제외)
document.addEventListener("mousedown", function (event) {
  // 툴팁이 존재하고, 클릭한 요소가 툴팁 내부가 아닌 경우에만 제거
  if (tooltip && !tooltip.contains(event.target)) {
    removeTooltip();
  }
});

// 하이라이트된 요소 더블클릭 시 하이라이트 제거
document.addEventListener("click", function (event) {
  const target = event.target;
  // 하이라이트된 span 또는 넘버 배지를 클릭한 경우
  if (
    (target.tagName === "SPAN" && target.style.backgroundColor && !tooltip) ||
    (target.parentNode &&
      target.parentNode.tagName === "SPAN" &&
      target.parentNode.style.position === "relative" &&
      !tooltip)
  ) {
    // 하이라이트 컨테이너 찾기
    let highlightContainer = target;
    if (target.style.backgroundColor) {
      highlightContainer = target.parentNode;
    } else if (
      target.parentNode &&
      target.parentNode.style.position === "relative"
    ) {
      highlightContainer = target.parentNode;
    }

    showEraseTooltip(event.pageX, event.pageY, highlightContainer);
  }
});

// 개별 하이라이트 지우기 툴팁 표시
function showEraseTooltip(x, y, spanElement) {
  tooltip = document.createElement("div");
  tooltip.id = "myboard-erase-tooltip";

  tooltip.innerHTML = `
    <div style="
      position: absolute;
      background: white;
      padding: 8px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: Arial, sans-serif;
      left: ${x + 10}px;
      top: ${y - 30}px;
      border: 1px solid #e0e0e0;
    ">
      <button id="erase-this-btn" style="
        background: #ff6b6b;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">🗑️</button>
    </div>
  `;

  document.body.appendChild(tooltip);

  // 개별 지우기 버튼 이벤트 리스너
  document
    .getElementById("erase-this-btn")
    .addEventListener("click", function () {
      removeSpecificHighlight(spanElement);
      removeTooltip();
    });
}

// 툴팁 생성 및 표시
function showTooltip(x, y, text) {
  tooltip = document.createElement("div");
  tooltip.id = "myboard-tooltip";

  // 파스텔톤 컬러 팔레트 (rgba로 투명도 적용)
  const colors = [
    { name: "빨강", color: "rgba(255, 179, 186, 0.6)" },
    { name: "주황", color: "rgba(255, 223, 186, 0.6)" },
    { name: "노랑", color: "rgba(255, 255, 186, 0.6)" },
    { name: "연두", color: "rgba(186, 255, 201, 0.6)" },
    { name: "파랑", color: "rgba(186, 225, 255, 0.6)" },
    { name: "보라", color: "rgba(212, 186, 255, 0.6)" },
    { name: "갈색", color: "rgba(240, 208, 180, 0.6)" },
    { name: "검정", color: "rgba(211, 211, 211, 0.6)" },
  ];

  tooltip.innerHTML = `
    <div style="
      position: absolute;
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: Arial, sans-serif;
      left: ${x + 10}px;
      top: ${y - 40}px;
      border: 1px solid #e0e0e0;
    ">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px;">
        ${colors
          .map(
            (colorItem) => `
          <button class="color-btn" data-color="${colorItem.color}" style="
            width: 30px;
            height: 30px;
            border: 2px solid #ddd;
            border-radius: 4px;
            background-color: ${colorItem.color};
            cursor: pointer;
            transition: all 0.2s;
          " title="${colorItem.name}"></button>
        `
          )
          .join("")}
      </div>
      
      <button id="clear-all-btn" style="
        background: #ff6b6b;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        margin-bottom: 8px;
      ">ALL 🗑️</button>
      
      <button id="capture-btn" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
        margin-bottom: 8px;
      ">📷 캡쳐</button>
      
      <button id="tooltip-close" style="
        background: #f5f5f5;
        color: #666;
        border: 1px solid #ddd;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        width: 100%;
      ">닫기</button>
    </div>
  `;

  document.body.appendChild(tooltip);

  // 컬러 버튼 이벤트 리스너
  const colorButtons = tooltip.querySelectorAll(".color-btn");
  colorButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const selectedColor = this.dataset.color;
      highlightText(selectedColor);
    });

    // 호버 효과
    button.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.1)";
      this.style.borderColor = "#999";
    });

    button.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
      this.style.borderColor = "#ddd";
    });
  });

  // 전체 지우기 버튼 이벤트 리스너
  document
    .getElementById("clear-all-btn")
    .addEventListener("click", function () {
      clearAllHighlights();
    });

  // 캡쳐 버튼 이벤트 리스너
  document.getElementById("capture-btn").addEventListener("click", function () {
    removeTooltip();
    startCapture();
  });

  // 닫기 버튼 이벤트 리스너
  document
    .getElementById("tooltip-close")
    .addEventListener("click", function () {
      removeTooltip();
    });
}

// 툴팁 제거
function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
  // 선택 해제
  const selection = window.getSelection();
  selection.removeAllRanges();
  savedSelection = null;
}

// 모든 하이라이트 제거
function clearAllHighlights() {
  try {
    // 페이지의 모든 하이라이트된 컨테이너 찾기
    const allHighlightContainers = document.querySelectorAll(
      'span[style*="position: relative"]'
    );

    allHighlightContainers.forEach((container) => {
      const textSpan = container.querySelector(
        'span[style*="background-color"]'
      );
      if (textSpan && container.parentNode) {
        // 텍스트 내용을 컨테이너 앞에 삽입
        while (textSpan.firstChild) {
          container.parentNode.insertBefore(textSpan.firstChild, container);
        }
        // 컨테이너 제거
        container.parentNode.removeChild(container);
      }
    });

    // 카운터 리셋
    highlightCounter = 1;

    console.log(`모든 하이라이트 제거됨 (${allHighlightContainers.length}개)`);
  } catch (e) {
    console.log("모든 하이라이트 제거 중 오류:", e);
  }

  // 선택 해제 및 툴팁 제거
  const selection = window.getSelection();
  selection.removeAllRanges();
  savedSelection = null;
  removeTooltip();
}

// 특정 하이라이트 요소 제거
function removeSpecificHighlight(highlightElement) {
  try {
    if (highlightElement.parentNode) {
      // 하이라이트 컨테이너 내부의 텍스트 찾기
      const textSpan = highlightElement.querySelector(
        'span[style*="background-color"]'
      );
      if (textSpan) {
        // 텍스트 내용을 컨테이너 앞에 삽입
        while (textSpan.firstChild) {
          highlightElement.parentNode.insertBefore(
            textSpan.firstChild,
            highlightElement
          );
        }
      }
      // 전체 컨테이너 제거
      highlightElement.parentNode.removeChild(highlightElement);
      console.log("특정 하이라이트 제거됨");
    }
  } catch (e) {
    console.log("특정 하이라이트 제거 중 오류:", e);
  }
}

// 텍스트 하이라이트 적용
function highlightText(color) {
  if (savedSelection) {
    // 하이라이트 컨테이너 생성
    const highlightContainer = document.createElement("span");
    highlightContainer.style.position = "relative";
    highlightContainer.style.display = "inline";

    // 배경색 스타일 (rgba로 투명도가 이미 적용되어 있으므로 opacity는 제거)
    const span = document.createElement("span");
    span.style.backgroundColor = color;
    span.style.borderRadius = "2px";
    span.style.position = "relative";
    span.style.display = "inline";

    // 넘버링 배지 생성
    const numberBadge = document.createElement("span");
    numberBadge.textContent = highlightCounter;
    numberBadge.style.position = "absolute";
    numberBadge.style.top = "-8px";
    numberBadge.style.left = "-8px";
    numberBadge.style.backgroundColor = "#ff4444";
    numberBadge.style.color = "white";
    numberBadge.style.borderRadius = "50%";
    numberBadge.style.width = "16px";
    numberBadge.style.height = "16px";
    numberBadge.style.fontSize = "10px";
    numberBadge.style.fontWeight = "bold";
    numberBadge.style.display = "flex";
    numberBadge.style.alignItems = "center";
    numberBadge.style.justifyContent = "center";
    numberBadge.style.zIndex = "10001";
    numberBadge.style.fontFamily = "Arial, sans-serif";

    try {
      const contents = savedSelection.extractContents();
      span.appendChild(contents);
      highlightContainer.appendChild(span);
      highlightContainer.appendChild(numberBadge);
      savedSelection.insertNode(highlightContainer);

      console.log(
        `텍스트 하이라이트 적용: ${color}, 번호: ${highlightCounter}`
      );
      highlightCounter++; // 카운터 증가
    } catch (e) {
      console.log("하이라이트 적용 중 오류:", e);
    }
  }

  // 선택 해제 및 툴팁 제거
  const selection = window.getSelection();
  selection.removeAllRanges();
  savedSelection = null;
  removeTooltip();
}

// 캡쳐 시작 함수
function startCapture() {
  console.log("영역 선택 캡쳐 시작");

  isCapturing = true;
  document.body.style.cursor = "crosshair";

  // 안내 메시지 표시
  showCaptureMessage("드래그하여 캡쳐할 영역을 선택하세요 (ESC: 취소)");

  // 이벤트 리스너 추가
  document.addEventListener("keydown", cancelCapture);
  document.addEventListener("mousedown", startCaptureSelection);
}

// 캡쳐 안내 메시지 표시
function showCaptureMessage(text) {
  const message = document.createElement("div");
  message.id = "capture-message";
  message.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10002;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
  `;
  message.textContent = text;
  document.body.appendChild(message);
}

// 캡쳐 취소
function cancelCapture(e) {
  if (e.key === "Escape") {
    isCapturing = false;
    document.body.style.cursor = "default";

    const message = document.getElementById("capture-message");
    if (message) message.remove();

    if (captureOverlay) {
      captureOverlay.remove();
      captureOverlay = null;
    }

    document.removeEventListener("keydown", cancelCapture);
    document.removeEventListener("mousedown", startCaptureSelection);
    document.removeEventListener("mousemove", updateCaptureSelection);
    document.removeEventListener("mouseup", endCaptureSelection);
  }
}

// 캡쳐 영역 선택 시작
function startCaptureSelection(e) {
  if (!isCapturing) return;

  e.preventDefault();
  captureStartX = e.clientX;
  captureStartY = e.clientY;

  console.log("캡쳐 시작 좌표:", { x: captureStartX, y: captureStartY });

  // 오버레이 생성 (드래그 중 UI 표시)
  captureOverlay = document.createElement("div");
  captureOverlay.style.cssText = `
    position: fixed;
    border: 2px dashed #007cba;
    background-color: rgba(0, 124, 186, 0.1);
    z-index: 10001;
    pointer-events: none;
  `;
  document.body.appendChild(captureOverlay);

  document.addEventListener("mousemove", updateCaptureSelection);
  document.addEventListener("mouseup", endCaptureSelection);
}

// 캡쳐 영역 업데이트
function updateCaptureSelection(e) {
  if (!isCapturing || !captureOverlay) return;

  captureEndX = e.clientX;
  captureEndY = e.clientY;

  const left = Math.min(captureStartX, captureEndX);
  const top = Math.min(captureStartY, captureEndY);
  const width = Math.abs(captureEndX - captureStartX);
  const height = Math.abs(captureEndY - captureStartY);

  captureOverlay.style.left = left + "px";
  captureOverlay.style.top = top + "px";
  captureOverlay.style.width = width + "px";
  captureOverlay.style.height = height + "px";
}

// 캡쳐 영역 선택 완료
function endCaptureSelection(e) {
  if (!isCapturing) return;

  e.preventDefault();
  captureEndX = e.clientX;
  captureEndY = e.clientY;

  const width = Math.abs(captureEndX - captureStartX);
  const height = Math.abs(captureEndY - captureStartY);

  console.log("캡쳐 종료 좌표:", { x: captureEndX, y: captureEndY });
  console.log("선택 영역 크기:", { width, height });

  // 최소 크기 체크
  if (width < 10 || height < 10) {
    showCaptureMessage("선택 영역이 너무 작습니다. 다시 시도해주세요.");
    setTimeout(() => {
      const message = document.getElementById("capture-message");
      if (message) message.remove();
    }, 2000);
    cancelCapture({ key: "Escape" });
    return;
  }

  // 캡쳐 전에 오버레이 숨기기 (캡쳐에 포함되지 않도록)
  if (captureOverlay) {
    captureOverlay.style.display = "none";
  }

  // 짧은 지연 후 캡쳐 실행 (UI가 완전히 숨겨질 시간)
  setTimeout(() => {
    performAreaCapture();
    // 정리
    cancelCapture({ key: "Escape" });
  }, 10);
}

// 영역 캡쳐 수행
function performAreaCapture() {
  const left = Math.min(captureStartX, captureEndX);
  const top = Math.min(captureStartY, captureEndY);
  const width = Math.abs(captureEndX - captureStartX);
  const height = Math.abs(captureEndY - captureStartY);

  // captureVisibleTab은 현재 뷰포트만 캡쳐하므로 스크롤 오프셋을 빼야 함
  // 뷰포트 내의 상대적 좌표 사용
  console.log("선택 영역 (뷰포트 기준):", { left, top, width, height });
  console.log("디바이스 픽셀 비율:", window.devicePixelRatio || 1);

  // 백그라운드 스크립트에 영역 캡쳐 요청
  chrome.runtime.sendMessage(
    {
      action: "captureArea",
      area: {
        x: left, // 스크롤 오프셋 제거
        y: top, // 스크롤 오프셋 제거
        width: width,
        height: height,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
    },
    (response) => {
      if (response && response.success) {
        const filename =
          response.result && response.result.filename
            ? response.result.filename
            : "파일";
        console.log(`영역 캡쳐 완료: ${filename} 파일이 다운로드되었습니다.`);
        console.log("✅ 선택한 영역만 정확히 크롭되어 저장되었습니다!");
      } else {
        const errorMsg =
          response && response.error
            ? response.error
            : "캡쳐 중 오류가 발생했습니다.";
        console.error("캡쳐 실패:", errorMsg);
        alert(`캡쳐 실패: ${errorMsg}`);
      }
    }
  );
}
