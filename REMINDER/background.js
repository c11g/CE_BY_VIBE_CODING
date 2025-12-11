// Reminder 백그라운드 서비스 워커 기본 뼈대
// 알람/알림 처리 로직과 팝업에서의 테스트 트리거를 담당합니다.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Reminder 확장이 설치 또는 업데이트되었습니다. (기능 구현 예정)");
});

/**
 * 실제 알람이 도래했을 때 수행될 공통 처리 로직
 */
function handleReminderAlarm(source) {
  console.log("Reminder 알람 처리 로직 실행", source);

  const reminder = source && source.reminder ? source.reminder : null;
  const notificationTitle = (reminder && reminder.title) || "Reminder 알림";
  const notificationMessage = reminder
    ? "설정한 리마인더 시간입니다."
    : "테스트 알람이 트리거되었습니다.";

  try {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: "icon-128.png", // 아이콘 파일은 사용자가 추가 예정
        title: notificationTitle,
        message: notificationMessage,
        priority: 0,
      },
      (notificationId) => {
        console.log(
          "Notification 생성 콜백",
          notificationId,
          chrome.runtime.lastError
        );
      }
    );

    // 알림과 함께 MIDI 알람음을 재생하기 위해 최소 크기 팝업 창을 연다.
    const alarmPlayerUrl = chrome.runtime.getURL("alarm-player.html");
    chrome.windows.create(
      {
        url: alarmPlayerUrl,
        type: "popup",
        width: 1,
        height: 1,
        focused: false,
      },
      (createdWindow) => {
        const updates = { alarmPlaying: true };
        if (createdWindow && typeof createdWindow.id === "number") {
          updates.alarmPlayerWindowId = createdWindow.id;
        }
        chrome.storage.local.set(updates);
      }
    );
  } catch (error) {
    console.error("알림(Notification) 생성 중 오류", error);
  }
}

// 알람 이벤트 리스너: 실제 알람 도래 시
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("Reminder 알람이 트리거되었습니다.", alarm);

  const alarmName = alarm.name;

  // 예약 시 저장해둔 제목/시간 정보를 가져와서 함께 전달
  chrome.storage.local.get(alarmName, (result) => {
    const reminder = result && result[alarmName] ? result[alarmName] : null;

    handleReminderAlarm({ from: "alarm", alarm, reminder });

    // 한 번 울린 알람에 대한 메타데이터는 정리
    if (reminder) {
      chrome.storage.local.remove(alarmName);
    }
  });
});

// 팝업에서 알람 관련 요청을 처리하는 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "STOP_ALARM") {
    console.log("팝업에서 STOP_ALARM 요청", message, sender);

    chrome.storage.local.get(
      ["alarmPlayerWindowId", "alarmPlaying"],
      (result) => {
        const windowId = result && result.alarmPlayerWindowId;

        const clearState = () => {
          chrome.storage.local.remove("alarmPlayerWindowId");
          chrome.storage.local.set({ alarmPlaying: false });
        };

        if (typeof windowId === "number") {
          chrome.windows.remove(windowId, () => {
            if (chrome.runtime.lastError) {
              console.warn(
                "알람 플레이어 창 닫기 중 오류",
                chrome.runtime.lastError
              );
            }
            clearState();
          });
        } else {
          clearState();
        }
      }
    );

    sendResponse?.({ ok: true });
    return;
  }

  if (message && message.type === "ALARM_ENDED") {
    console.log("알람 재생 종료 메시지 수신", message, sender);

    chrome.storage.local.remove("alarmPlayerWindowId");
    chrome.storage.local.set({ alarmPlaying: false });

    sendResponse?.({ ok: true });
    return;
  }

  if (message && message.type === "TEST_ALARM") {
    console.log("팝업에서 TEST_ALARM 즉시 실행 요청", message, sender);

    const title = message.title || "테스트 알람";
    handleReminderAlarm({ from: "test-button", reminder: { title } });

    sendResponse?.({ ok: true });
    return;
  }

  if (message && message.type === "SCHEDULE_REMINDER") {
    console.log("팝업에서 SCHEDULE_REMINDER 요청", message, sender);

    const time = message.time;
    const title = message.title;

    if (!time || typeof time !== "string") {
      console.warn("유효하지 않은 time 값", time);
      sendResponse?.({ ok: false, error: "INVALID_TIME" });
      return;
    }

    try {
      const [hhStr, mmStr] = time.split(":");
      const hh = Number.parseInt(hhStr, 10);
      const mm = Number.parseInt(mmStr, 10);

      if (Number.isNaN(hh) || Number.isNaN(mm)) {
        throw new Error("시간 파싱 실패");
      }

      const now = new Date();
      const target = new Date(now.getTime());
      target.setHours(hh, mm, 0, 0);

      // 이미 지난 시간이라면 내일 같은 시간으로 예약
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const when = target.getTime();
      const alarmName = `reminder-${when}`;

      // 알람 메타데이터(제목/시간)를 저장해 두었다가,
      // 실제 알람 발생 시 Notification에 반영
      const reminder = {
        title,
        time,
        when,
      };

      chrome.storage.local.set({ [alarmName]: reminder }, () => {
        chrome.alarms.create(alarmName, { when });

        console.log("알람 예약 완료", {
          alarmName,
          when,
          whenAsString: target.toString(),
          reminder,
        });

        sendResponse?.({ ok: true, alarmName, when });
      });
    } catch (error) {
      console.error("알람 예약 중 오류", error);
      sendResponse?.({ ok: false, error: String(error) });
    }

    // 비동기 sendResponse 사용을 위해 true 반환
    return true;
  }
});
