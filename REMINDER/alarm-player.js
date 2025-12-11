const audio = document.getElementById("alarm-audio");

if (audio) {
  audio.addEventListener("error", (e) => {
    console.error("알람 오디오 재생 오류", e);
  });

  // 오디오 재생이 끝나면 백그라운드에 알리고 창 자동 닫기
  audio.addEventListener("ended", () => {
    try {
      chrome.runtime.sendMessage({ type: "ALARM_ENDED" });
    } catch (e) {
      console.error("알람 종료 메시지 전송 실패", e);
    }
    window.close();
  });
}

// 팝업에서 STOP_ALARM이 브로드캐스트되면, 열린 모든 플레이어가 스스로 정리
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "STOP_ALARM") {
      try {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch (e) {
        console.error("알람 수동 종료 중 오류", e);
      }

      window.close();
    }
  });
} catch (e) {
  console.error("알람 플레이어 메시지 리스너 등록 실패", e);
}
