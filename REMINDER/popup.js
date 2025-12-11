// Reminder 팝업 스크립트 기본 뼈대
// 실제 리마인더 저장/표시 로직은 이후 단계에서 구현합니다.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reminder-form");
  const titleInput = document.getElementById("title");
  const timeInput = document.getElementById("time");
  const status = document.getElementById("status");
  const currentTimeEl = document.getElementById("current-time");
  const testAlarmButton = document.getElementById("test-alarm-button");
  const stopAlarmButton = document.getElementById("stop-alarm-button");
  const reminderListEl = document.getElementById("reminder-list");

  if (!form || !titleInput || !status) {
    return;
  }

  const loadReminderList = () => {
    if (!reminderListEl || !chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.error("리마인더 목록 로드 실패", chrome.runtime.lastError);
        return;
      }

      const entries = Object.entries(items || {})
        .filter(
          ([key, value]) =>
            key.startsWith("reminder-") && value && typeof value === "object"
        )
        .map(([, value]) => value)
        .sort((a, b) => {
          const aw = a && typeof a.when === "number" ? a.when : 0;
          const bw = b && typeof b.when === "number" ? b.when : 0;
          return aw - bw;
        });

      reminderListEl.innerHTML = "";

      if (entries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "예약된 리마인더가 없습니다.";
        reminderListEl.appendChild(li);
        return;
      }

      for (const reminder of entries) {
        const li = document.createElement("li");
        const titleText = (reminder && reminder.title) || "(제목 없음)";
        const timeText = (reminder && reminder.time) || "";

        li.textContent = timeText ? `${timeText} - ${titleText}` : titleText;

        reminderListEl.appendChild(li);
      }
    });
  };

  // 현재 시간 HH:MM:SS 표시 (1초마다 갱신)
  if (currentTimeEl) {
    const updateCurrentTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      currentTimeEl.textContent = `${hh}:${mm}:${ss}`;
    };

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
  }

  // 초기 리마인더 목록 로드
  loadReminderList();

  // 상단 테스트 알람 버튼: 즉시 알람 실행
  if (testAlarmButton) {
    testAlarmButton.addEventListener("click", () => {
      status.classList.remove("status-error");
      const currentTitle = titleInput.value.trim();
      const usedTitle = currentTitle || "테스트 알람";

      status.textContent = `\"${usedTitle}\" 테스트 알람을 바로 실행했습니다.`;

      try {
        chrome.runtime.sendMessage({
          type: "TEST_ALARM",
          title: usedTitle,
        });
      } catch (error) {
        console.error("테스트 알람 실행 메시지 전송 실패", error);
      }
    });
  }

  // 상단 알람 끄기 버튼: 현재 재생 중인 알람 강제 종료
  if (stopAlarmButton) {
    stopAlarmButton.addEventListener("click", () => {
      status.classList.remove("status-error");
      status.textContent = "알람을 중지했습니다.";

      try {
        chrome.runtime.sendMessage({ type: "STOP_ALARM" });
      } catch (error) {
        console.error("알람 중지 메시지 전송 실패", error);
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const time = timeInput && timeInput.value ? timeInput.value : "";

    status.classList.remove("status-error");

    if (!title) {
      status.textContent = "제목을 입력해 주세요.";
      status.classList.add("status-error");
      return;
    }

    if (time) {
      status.textContent = `"${title}" 리마인더가 ${time}로 알람이 예약되었습니다.`;

      try {
        chrome.runtime.sendMessage(
          {
            type: "SCHEDULE_REMINDER",
            title,
            time,
          },
          (response) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.error(
                "알람 예약 응답 처리 중 오류",
                chrome.runtime.lastError
              );
              return;
            }

            if (response && response.ok) {
              form.reset();
              loadReminderList();
            }
          }
        );
      } catch (error) {
        console.error("알람 예약 메시지 전송 실패", error);
      }
    } else {
      status.textContent = `"${title}" 리마인더가 추가될 예정입니다. (저장 로직 구현 예정)`;
      form.reset();
    }

    // TODO: 여기서부터 chrome.storage / alarms와 연동하여
    // 실제 리마인더 저장 및 알람 예약 로직을 구현합니다.
  });
});
