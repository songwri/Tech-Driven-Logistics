/**
 * TDL Lab — 방문 예약 / 방명록 백엔드 (Google Apps Script 웹앱)
 *
 * 사이트는 GitHub Pages 정적 호스팅이라 서버가 없습니다. 이 스크립트를 웹앱으로
 * 배포하면 발급되는 URL 하나만 사이트에 넣으면 되고, 토큰이나 API 키를 사이트
 * 코드에 두지 않습니다.
 *
 *   GET  ?                      → 방명록(마스킹된 값) + 예약 불가 구간 반환
 *   GET  ?action=confirm|cancel → (예전 메일 링크) 관리자 페이지로 안내만 함. 승인·거절은 관리자 페이지에서
 *   GET  ?action=version        → 배포된 코드 버전
 *   POST                        → { type: 'guestbook' | 'reservation' | 'admin', ... }
 *
 * 방명록의 실명·실제 소속과 예약자의 연락처는 시트에만 남고 공개 GET 으로는
 * 나가지 않습니다. 관리자 대시보드(/admin/)는 ADMIN_KEY 스크립트 속성과 같은
 * 키를 보내야 예약 목록을 볼 수 있습니다.
 */

/**
 * 알림 메일 수신자: 방문 예약 신청 알림을 투어 종류에 따라 두 담당자 그룹에 나눠 보낸다.
 *   종합 투어  → 센터 투어 담당자 + TDL 투어 담당자
 *   TDL Lab 투어 → TDL 투어 담당자
 *   센터 투어  → 센터 투어 담당자
 * 방명록 등록은 메일을 보내지 않는다. (관리자 페이지 · 시트에서 확인)
 *
 * 이 저장소는 공개라 직원 메일 주소를 코드에 적지 않고, Apps Script 의 스크립트 속성에 둔다.
 *   프로젝트 설정(톱니바퀴) → 스크립트 속성
 *     MAIL_TO        = TDL 투어 담당자 a@lxpantos.com,b@lxpantos.com,...
 *     CENTER_MAIL_TO = 센터 투어 담당자 c@lxpantos.com,d@lxpantos.com,...
 * 쉼표 · 세미콜론 · 줄바꿈으로 여러 명을 구분한다. 속성은 저장 즉시 적용되어 재배포가 필요 없다.
 * MAIL_TO 가 비어 있으면 DEFAULT_MAIL_TO 로, CENTER_MAIL_TO 가 비어 있으면 TDL 담당자에게 대신 보낸다
 * (알림이 아무에게도 가지 않는 일이 없게).
 * 신청자에게 가는 승인 · 거절 메일의 회신 주소는 그 예약의 알림을 받은 담당자들이다.
 */
var DEFAULT_MAIL_TO = 'daehyun.kim1@lxpantos.com';

/**
 * 메일에 표시되는 보내는 사람 이름. 보내는 사람 '주소'는 스크립트를 소유한 구글 계정이라 바꿀 수 없고,
 * 이름만 바뀐다. (예: '메가와이즈 + TDL 방문관리 <계정 주소>')
 */
var MAIL_SENDER_NAME = '메가와이즈 + TDL 방문관리';

function mailList_(property) {
  var raw = PropertiesService.getScriptProperties().getProperty(property) || '';
  return String(raw).split(/[,;\s]+/).filter(function (address) { return address; });
}

/** 투어 종류별 알림 수신자 (MailApp 의 to 에 그대로 쓰는 쉼표 구분 문자열, 중복 제거) */
function mailTo_(tour) {
  var tdl = mailList_('MAIL_TO');
  if (!tdl.length) tdl = [DEFAULT_MAIL_TO];
  var center = mailList_('CENTER_MAIL_TO');
  if (!center.length) center = tdl;

  var list = tour === 'combined' ? center.concat(tdl) : tour === 'center' ? center : tdl;
  var seen = {};
  return list.filter(function (address) {
    var key = address.toLowerCase();
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  }).join(',');
}
var SITE_URL = 'https://songwri.github.io/Tech-Driven-Logistics/';
var ADMIN_URL = SITE_URL + 'admin/';

/** 배포된 코드 버전 확인용. 웹앱주소?action=version 으로 확인할 수 있다. */
var CODE_VERSION = '2026-10-15.prep-time';
/**
 * 관리자 페이지가 기대하는 서버 기능 수준. 관리자 API 가 바뀔 때 올리고,
 * src/lib/labApi.ts 의 REQUIRED_API_LEVEL 도 함께 맞춘다.
 *   2: 수기 등록(create) · 기존 이력 가져오기(import) · 완료/취소 상태 · 운영 기록 열
 *   3: 신청 담당자의 담당(실) 열
 *   4: 관리자 방명록 관리 (guestbookList · guestbookSetHidden · guestbookDelete)
 *   5: 방명록 투어 구분 (투어 열 · guestbookSetTour)
 *   6: 일정 막기 (blocked 시트 대상 · id 열, list 응답의 blocks, blockAdd · blockRemove)
 *   7: 기존 이력 가져오기(import)에 별도 암호키(IMPORT_KEY 스크립트 속성) 필요
 *   (방명록 팀 열 · 0.5점 단위 평가는 공개 방명록 쓰기 변경이라 수준을 올리지 않는다)
 */
var API_LEVEL = 7;
var ADMIN_ACTIONS = [
  'list', 'health', 'delete', 'setStatus', 'update', 'create', 'import',
  'guestbookList', 'guestbookSetHidden', 'guestbookDelete', 'guestbookSetTour',
  'blockAdd', 'blockRemove',
];

var GUESTBOOK_SHEET = 'guestbook';
var VISIT_SHEET = 'visit_requests';
var BLOCKED_SHEET = 'blocked';
var MESSAGE_LIMIT = 100;
var MAX_VISITORS = 30;

var OPEN_WEEKDAYS = [1, 3, 5]; // 월·수·금
/** 당일·익일 신청 불가 (오늘 +2일부터). src/lib/visit.ts 의 MIN_LEAD_DAYS 와 같아야 합니다. */
var MIN_LEAD_DAYS = 2;

/**
 * 투어 종류와 시간대. src/lib/visit.ts 의 TOURS 와 값이 같아야 합니다.
 * 종합 투어는 앞 1시간 센터 → 뒤 1시간 TDL Lab 을 씁니다.
 */
var TOURS = {
  combined: { label: '종합 투어', slots: ['09:30-11:30', '13:00-15:00'] },
  center: {
    label: '센터 투어',
    slots: ['10:00-11:00', '13:00-14:00', '15:00-16:00'],
  },
  lab: { label: 'TDL Lab 투어', slots: ['10:30-11:30', '14:00-15:00'] },
  // 기존 방문 이력 · 관리자 수기 등록 전용 (예약 화면에서는 고를 수 없음). 시간 자유.
  other: { label: '기타 방문', slots: [] },
};

var STATUS_TEXT = { pending: '대기', approved: '승인', completed: '완료', rejected: '거절', cancelled: '취소' };
var MAX_IMPORT = 500;
/** 승인 · 완료: 성사된 방문 (시간대를 점유) */
function isConfirmed_(status) { return status === 'approved' || status === 'completed'; }
var PURPOSES = ['기존 고객사 Lock-in', '신규 영업', '교육', '투어'];

var BRAND = '#a72b2b';

var GUESTBOOK_HEADERS = [
  'id', 'createdAt', '표시이름', '표시소속', '직함', '평가', '메시지', '실명', '실제소속', '숨김',
  // 새 열은 기존 시트와 맞도록 맨 뒤에 붙인다.
  '팀',
  '투어',
];
/** src/admin/importLegacy.ts 의 VISIT_SHEET_HEADERS 와 같아야 합니다 (가져오기 양식). */
var VISIT_HEADERS = [
  'id', '신청일시', '상태', '투어', '방문일', '시간', '방문구분', '고객구분', '업체명', '업종',
  '방문목적', '담당자', '담당자직책', '담당자조직', '담당자연락처', '담당자이메일', '담당자의견',
  '방문인원', '방문자명단', '요청사항', '개인정보동의', '관리자메모', '토큰', '수정일시', '방문자JSON',
  '투어언어', '외국어', '통역동반', '출처', '주요인원', '가이드', '유관부서', '후속진행',
  // 새 열은 기존 시트와 맞도록 맨 뒤에 붙인다 (시트를 열면 제목이 자동으로 추가된다).
  '담당(실)', '통역언어',
];
var BLOCKED_HEADERS = ['날짜', '시간대(비우면 종일)', '사유', '대상(all/center/lab)', 'id'];

var GUESTBOOK_HIDDEN_COL = 10; // 1-based
var GUESTBOOK_TEAM_COL = 11; // 1-based
var GUESTBOOK_TOUR_COL = 12; // 1-based
var GUESTBOOK_TOURS = ['combined', 'lab', 'center'];
function guestbookTour_(value) {
  var tour = String(value == null ? '' : value);
  return GUESTBOOK_TOURS.indexOf(tour) === -1 ? '' : tour;
}

/* ------------------------------------------------------------------ 공통 */

/** 같은 실행 안에서 스프레드시트를 한 번만 연다. */
var bookCache_ = null;
function book_() {
  if (!bookCache_) bookCache_ = SpreadsheetApp.getActiveSpreadsheet();
  return bookCache_;
}

function sheet_(name, headers) {
  var book = book_();
  var target = book.getSheetByName(name);
  if (!target) {
    target = book.insertSheet(name);
    target.appendRow(headers);
    target.setFrozenRows(1);
  } else if (
    target.getLastColumn() < headers.length &&
    String(target.getRange(1, 1).getValue()).trim() === String(headers[0])
  ) {
    // 이전 버전 시트에 새 열이 생긴 경우 헤더를 보강한다.
    // 첫 칸이 제목이 아닐 때(=1행이 데이터일 때)는 덮어쓰지 않는다.
    target.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return target;
}

function maskToken_(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  return text.charAt(0) + '**';
}

/** 홍길동 → 홍** / David Kim → D** K** */
function maskName_(value) {
  return String(value == null ? '' : value)
    .trim()
    .split(/\s+/)
    .filter(function (part) { return part; })
    .map(maskToken_)
    .join(' ');
}

function requireText_(value, label, max) {
  var text = String(value == null ? '' : value).trim();
  if (!text) throw new Error(label + '을(를) 입력해 주세요.');
  if (text.length > max) throw new Error(label + '이(가) 너무 깁니다.');
  return text;
}

/**
 * 시트 쓰기를 한 번에 하나씩만 실행한다. 두 요청이 동시에 들어오면 같은 행 번호를 받아
 * 먼저 들어온 예약을 덮어쓰는 문제(→ 메일의 승인 링크가 '예약을 찾을 수 없습니다')를 막는다.
 */
var lockDepth_ = 0; // 같은 실행 안에서 중첩 호출돼도 잠금을 한 번만 잡는다.

function withLock_(task) {
  if (lockDepth_ > 0) return task();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
  lockDepth_++;
  try {
    return task();
  } finally {
    lockDepth_--;
    // 쓰기가 끝나면 공개 일정 캐시를 지워, 다음 조회가 바뀐 일정을 바로 반영하게 한다.
    clearScheduleCache_();
    lock.releaseLock();
  }
}

/* ------------------------------------------------- 예약 화면 일정 캐시 */

var SCHEDULE_CACHE_KEY = 'schedule-v1';
/** 쓰기마다 바뀌는 값. 읽는 도중 쓰기가 끼어들면 그 결과(이전 일정)는 캐시에 넣지 않는다. */
var SCHEDULE_GEN_KEY = 'schedule-gen';
/** 시트를 직접 고친 경우를 대비한 최대 보관 시간(초). warmUp 트리거가 있으면 5분마다 새로 만든다. */
var SCHEDULE_CACHE_SECONDS = 600;

function clearScheduleCache_() {
  try {
    var cache = CacheService.getScriptCache();
    cache.put(SCHEDULE_GEN_KEY, Utilities.getUuid(), 21600);
    cache.remove(SCHEDULE_CACHE_KEY);
  } catch (error) {
    /* 캐시 실패는 무시 (다음 조회가 시트에서 다시 읽는다) */
  }
}

/** 예약 화면용 '신청 불가' 일정. 개인정보 없이 날짜 · 공간 · 시간만 담기므로 캐시해도 된다. */
function cachedSchedule_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(SCHEDULE_CACHE_KEY);
  if (hit) {
    try {
      return JSON.parse(hit);
    } catch (error) {
      /* 손상된 캐시 → 새로 만든다 */
    }
  }
  var generation = cache.get(SCHEDULE_GEN_KEY);
  var fresh = busy_(null, true);
  try {
    // 시트를 읽는 동안 다른 요청이 일정을 바꿨으면 (세대 값이 달라짐) 이 결과는 오래된 것일 수 있어 저장하지 않는다.
    if (cache.get(SCHEDULE_GEN_KEY) === generation) {
      cache.put(SCHEDULE_CACHE_KEY, JSON.stringify(fresh), SCHEDULE_CACHE_SECONDS);
    }
  } catch (error) {
    /* 캐시 용량 초과 등은 무시 */
  }
  return fresh;
}

/**
 * 시간 기반 트리거로 5분마다 실행: 일정 캐시를 미리 만들고 웹앱을 깨워 둔다 (첫 응답 지연 감소).
 * 설치: 편집기에서 installWarmUp 을 한 번 실행.
 */
function warmUp() {
  clearScheduleCache_();
  cachedSchedule_();
}

function installWarmUp() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'warmUp') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('warmUp').timeBased().everyMinutes(5).create();
  warmUp();
}

/**
 * 메일 버튼이 가리킬 웹앱 주소.
 * ScriptApp.getService().getUrl() 은 환경에 따라 /dev 주소나 다른 배포 주소를 줄 수 있어,
 * 스크립트 속성 WEB_APP_URL 이 있으면 그 값을 우선 쓰고 /dev 는 /exec 로 바꾼다.
 */
function webAppUrl_() {
  var fixed = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
  var url = String(fixed || ScriptApp.getService().getUrl() || '').trim();
  return url.replace(/\/dev$/, '/exec');
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 2026-09-09 → 2026년 9월 9일 (수) */
function formatDateKo_(dateKey) {
  var parts = String(dateKey).split('-');
  var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  return parts[0] + '년 ' + Number(parts[1]) + '월 ' + Number(parts[2]) + '일 ('
    + days[date.getDay()] + ')';
}

/** ISO 문자열 → 2026년 9월 7일 (월) 11:00 */
function formatDateTimeKo_(iso) {
  var date = new Date(iso);
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  var tz = Session.getScriptTimeZone();
  return Utilities.formatDate(date, tz, 'yyyy년 M월 d일')
    + ' (' + days[Number(Utilities.formatDate(date, tz, 'u')) % 7] + ') '
    + Utilities.formatDate(date, tz, 'HH:mm');
}

function normalizeDateKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value == null ? '' : value).trim().slice(0, 10);
}

function normalizeTime_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(value == null ? '' : value).trim();
}

/* -------------------------------------------------------------- 방명록 */

/** '숨김' 열에 값이 있으면(체크박스 TRUE, 'Y', '숨김' 등) 숨긴 글이다. */
function isGuestbookHidden_(cell) {
  var hidden = String(cell == null ? '' : cell).trim();
  return Boolean(hidden) && hidden.toLowerCase() !== 'false';
}

function isoOrEmpty_(value) {
  var date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}

function readGuestbook_() {
  var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
  var values = target.getDataRange().getValues();
  var entries = [];

  for (var row = 1; row < values.length; row++) {
    if (!values[row][0]) continue;
    // 숨긴 글은 사이트에 내보내지 않는다.
    if (isGuestbookHidden_(values[row][GUESTBOOK_HIDDEN_COL - 1])) continue;

    entries.push({
      id: String(values[row][0]),
      createdAt: new Date(values[row][1]).toISOString(),
      name: String(values[row][2]),
      company: String(values[row][3]),
      // 팀명도 회사명처럼 가려서 내보낸다 (시트에는 입력한 그대로 있다).
      team: maskToken_(values[row][GUESTBOOK_TEAM_COL - 1]),
      role: String(values[row][4]),
      rating: Number(values[row][5]),
      message: String(values[row][6]),
      tour: guestbookTour_(values[row][GUESTBOOK_TOUR_COL - 1]),
    });
  }

  return entries.reverse();
}

/**
 * 관리자용 방명록 전체 목록: 숨긴 글 포함, 실명 · 실제 소속 포함, 최신순.
 * (공개 GET 은 마스킹된 값만 내보내므로 이 함수는 관리자 키 뒤에서만 호출된다)
 */
function readGuestbookAdmin_() {
  var values = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS).getDataRange().getValues();
  var entries = [];
  for (var row = 1; row < values.length; row++) {
    if (!values[row][0]) continue;
    entries.push({
      id: String(values[row][0]),
      createdAt: isoOrEmpty_(values[row][1]),
      displayName: String(values[row][2]),
      displayCompany: String(values[row][3]),
      team: String(values[row][GUESTBOOK_TEAM_COL - 1] == null ? '' : values[row][GUESTBOOK_TEAM_COL - 1]),
      role: String(values[row][4]),
      rating: Number(values[row][5]),
      message: String(values[row][6]),
      name: String(values[row][7] == null ? '' : values[row][7]),
      company: String(values[row][8] == null ? '' : values[row][8]),
      hidden: isGuestbookHidden_(values[row][GUESTBOOK_HIDDEN_COL - 1]),
      tour: guestbookTour_(values[row][GUESTBOOK_TOUR_COL - 1]),
    });
  }
  return entries.reverse();
}

/** id 가 같은 방명록의 시트 행 번호 (1-based, 없으면 0) */
function findGuestbookRow_(target, id) {
  var values = target.getDataRange().getValues();
  for (var row = 1; row < values.length; row++) {
    if (String(values[row][0]) === id) return row + 1;
  }
  return 0;
}

/** 방명록 숨김 · 다시 표시. 시트 메뉴의 '숨김'과 같은 값을 쓴다. */
function setGuestbookHidden_(id, hidden) {
  return withLock_(function () {
    var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
    var rowNumber = findGuestbookRow_(target, id);
    if (!rowNumber) throw new Error('방명록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.');
    target.getRange(rowNumber, GUESTBOOK_HIDDEN_COL).setValue(hidden ? '숨김' : '');
    SpreadsheetApp.flush();
    return { id: id, hidden: hidden };
  });
}

/** 방명록의 투어 구분 지정 (투어 선택이 생기기 전 기록을 분류할 때). 빈 값이면 미분류. */
function setGuestbookTour_(id, tour) {
  var value = guestbookTour_(tour);
  if (tour && !value) throw new Error('알 수 없는 투어입니다.');
  return withLock_(function () {
    var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
    var rowNumber = findGuestbookRow_(target, id);
    if (!rowNumber) throw new Error('방명록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.');
    target.getRange(rowNumber, GUESTBOOK_TOUR_COL).setValue(value);
    SpreadsheetApp.flush();
    return { id: id, tour: value };
  });
}

/** 방명록을 시트에서 완전히 지운다 (되돌릴 수 없음). */
function deleteGuestbook_(id) {
  return withLock_(function () {
    var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
    var rowNumber = findGuestbookRow_(target, id);
    if (!rowNumber) throw new Error('방명록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.');
    target.deleteRow(rowNumber);
    SpreadsheetApp.flush();
    return { deleted: id };
  });
}

function addGuestbook_(payload) {
  var name = requireText_(payload.name, '이름', 40);
  var company = requireText_(payload.company, '회사명', 60);
  var team = optionalText_(payload.team, 60);
  var role = requireText_(payload.role, '직책', 60);
  var message = requireText_(payload.message, '메시지', MESSAGE_LIMIT);
  var tour = guestbookTour_(payload.tour);
  if (!tour) throw new Error('참여하신 투어를 선택해 주세요.');
  var rating = Number(payload.rating);
  // 0.5점 단위 (0.5 ~ 5). 이전 사이트가 보내는 1~5 정수도 그대로 받는다.
  if (!(rating >= 0.5 && rating <= 5) || rating * 2 !== Math.round(rating * 2)) {
    throw new Error('평가는 0.5~5점 사이에서 0.5점 단위로 입력해 주세요.');
  }

  var entry = {
    id: Utilities.getUuid(),
    createdAt: new Date().toISOString(),
    name: maskName_(name),
    company: maskToken_(company),
    team: maskToken_(team),
    role: role,
    rating: rating,
    message: message,
    tour: tour,
  };

  sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS).appendRow([
    entry.id, entry.createdAt, entry.name, entry.company,
    entry.role, entry.rating, entry.message, name, company, '', team, tour,
  ]);

  // 방명록은 메일을 보내지 않는다. 관리자 페이지(방명록 탭)나 guestbook 시트에서 확인한다.
  return { entry: entry };
}

/* ---------------------------------------------------------- 방문 예약 */

function toMinutes_(time) {
  var parts = String(time).split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function fromMinutes_(minutes) {
  var h = Math.floor(minutes / 60);
  var m = minutes % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/** 준비 시간(분). src/lib/visit.ts 의 PREP_MINUTES 와 같아야 한다. */
var PREP_MINUTES = 60;

/**
 * 투어 한 건이 점유하는 공간·시간 구간 (src/lib/visit.ts 의 segmentsOf 와 같아야 한다)
 * - 종합 투어: 센터 1시간 → Lab. Lab 은 준비를 위해 종합 투어 시작부터 점유
 * - manual(수기 등록): 모든 공간을 사용 시작 1시간 전부터 점유 (준비 여유)
 */
function segmentsOf_(tour, date, slot, manual) {
  var range = String(slot || '').split('-');
  if (!range[0] || !range[1]) return []; // 시간 미정
  var start = toMinutes_(range[0]);
  var prep = function (minutes) { return fromMinutes_(Math.max(0, manual ? minutes - PREP_MINUTES : minutes)); };
  // 기타 방문은 어느 공간을 쓰는지 모르므로 그 시간의 센터 · Lab 을 모두 막는다.
  if (tour === 'other') return [{ date: date, resource: 'all', from: prep(start), to: range[1] }];
  if (tour === 'combined') {
    var handoff = start + 60;
    return [
      { date: date, resource: 'center', from: prep(start), to: fromMinutes_(handoff) },
      { date: date, resource: 'lab', from: fromMinutes_(Math.max(0, handoff - PREP_MINUTES)), to: range[1] },
    ];
  }
  return [{ date: date, resource: tour, from: prep(start), to: range[1] }];
}

function overlaps_(a, b) {
  if (a.date !== b.date) return false;
  if (a.resource !== 'all' && b.resource !== 'all' && a.resource !== b.resource) return false;
  return toMinutes_(a.from) < toMinutes_(b.to) && toMinutes_(b.from) < toMinutes_(a.to);
}

function isBusy_(tour, date, slot, busy, manual) {
  var wanted = segmentsOf_(tour, date, slot, manual);
  return busy.some(function (segment) {
    return wanted.some(function (part) { return overlaps_(part, segment); });
  });
}

function tourIdFromLabel_(value) {
  var text = String(value == null ? '' : value).trim();
  for (var id in TOURS) {
    if (id === text || TOURS[id].label === text) return id;
  }
  return '';
}

function statusFromText_(value) {
  var text = String(value == null ? '' : value).trim();
  if (text === '승인' || text === '확정' || text === 'approved') return 'approved';
  if (text === '완료' || text === 'completed') return 'completed';
  if (text === '거절' || text === 'rejected') return 'rejected';
  if (text === '취소' || text === 'cancelled') return 'cancelled';
  return 'pending';
}

function splitList_(value) {
  return String(value == null ? '' : value)
    .split(',')
    .map(function (item) { return item.trim(); })
    .filter(function (item) { return item; });
}

function visitSheet_() {
  var target = sheet_(VISIT_SHEET, VISIT_HEADERS);
  // 이전 버전의 저장 오류로 제목 행이 예약 데이터로 덮어써진 시트를 자동 복구한다.
  // (덮어써진 행은 지우지 않고 제목 행 아래로 밀어, 그 예약이 목록에 다시 나타난다.)
  if (String(target.getRange(1, 1).getValue()).trim() !== VISIT_HEADERS[0]) {
    // 동시에 들어온 다른 요청이 이미 복구했을 수 있으므로 잠금 안에서 한 번 더 확인한다.
    withLock_(function () {
      if (String(target.getRange(1, 1).getValue()).trim() === VISIT_HEADERS[0]) return;
      target.insertRowBefore(1);
      target.getRange(1, 1, 1, VISIT_HEADERS.length).setValues([VISIT_HEADERS]);
      target.setFrozenRows(1);
      SpreadsheetApp.flush();
    });
  }
  return target;
}

/** 헤더 이름 → 0-based 열 번호. 시트의 열 순서를 바꿔도 동작한다. */
function columns_(values) {
  var map = {};
  (values[0] || []).forEach(function (name, index) { map[String(name).trim()] = index; });
  return map;
}

function rowToRequest_(row, col) {
  var get = function (name) { return col[name] === undefined ? '' : row[col[name]]; };
  var visitors = [];
  try {
    visitors = JSON.parse(String(get('방문자JSON') || '[]'));
  } catch (error) {
    visitors = [];
  }
  var category = String(get('방문구분')).indexOf('내부') !== -1 ? 'internal' : 'external';
  var foreign = String(get('투어언어')).trim() === '외국어';
  var clientText = String(get('고객구분')).trim();
  return {
    id: String(get('id')),
    createdAt: get('신청일시') ? new Date(get('신청일시')).toISOString() : '',
    status: statusFromText_(get('상태')),
    tour: tourIdFromLabel_(get('투어')) || 'lab',
    date: normalizeDateKey_(get('방문일')),
    slot: normalizeSlot_(get('시간')),
    category: category,
    clientType: category === 'external' && clientText
      ? (clientText.indexOf('신규') !== -1 ? 'new' : 'existing') : undefined,
    language: foreign ? 'foreign' : 'ko',
    foreignLanguage: foreign ? String(get('외국어')) : '',
    // 통역 동반은 모든 진행 언어에서 받는다 (이전에는 외국어 투어만).
    interpreter: String(get('통역동반')).trim() === '동반',
    interpreterLanguage: String(get('통역언어') || ''),
    company: String(get('업체명')),
    industries: splitList_(get('업종')),
    purposes: splitList_(get('방문목적')),
    host: {
      name: String(get('담당자')),
      title: String(get('담당자직책')),
      division: String(get('담당(실)')),
      org: String(get('담당자조직')),
      phone: String(get('담당자연락처')),
      email: String(get('담당자이메일')),
    },
    hostComment: String(get('담당자의견')),
    visitors: visitors,
    note: String(get('요청사항')),
    consent: String(get('개인정보동의')).trim() !== '',
    adminMemo: String(get('관리자메모')),
    source: String(get('출처')).trim() === '수기' ? 'manual' : 'web',
    headcount: headcountFromCell_(get('방문인원')),
    keyPersons: String(get('주요인원')),
    guides: String(get('가이드')),
    departments: splitList_(get('유관부서')),
    followUp: String(get('후속진행')),
  };
}

function headcountFromCell_(value) {
  var text = String(value == null ? '' : value).trim();
  if (!/^\d+$/.test(text)) return undefined; // 비어 있거나 'TBD'
  return Number(text);
}

/** '09:30-11:30' 형태로 정리 (시트가 시간을 Date 로 바꿔 놓은 경우 대비) */
function normalizeSlot_(value) {
  if (value instanceof Date) return normalizeTime_(value);
  return String(value == null ? '' : value).replace(/\s/g, '').replace('–', '-');
}

function readVisits_() {
  // 빠른 경로: 시트를 한 번만 읽고, 제목 행이 정상이 아닐 때만 복구 경로(visitSheet_)를 탄다.
  var target = book_().getSheetByName(VISIT_SHEET);
  var values = target ? target.getDataRange().getValues() : null;
  if (!values || String(values[0][0]).trim() !== VISIT_HEADERS[0]) {
    values = visitSheet_().getDataRange().getValues();
  }
  var col = columns_(values);
  var list = [];
  for (var row = 1; row < values.length; row++) {
    if (!values[row][col['id']]) continue;
    var request = rowToRequest_(values[row], col);
    request._row = row + 1;
    request._token = String(values[row][col['토큰']] || '');
    list.push(request);
  }
  return list;
}

function publicRequest_(request) {
  var copy = {};
  for (var key in request) {
    if (key !== '_row' && key !== '_token') copy[key] = request[key];
  }
  return copy;
}

function visitorsText_(visitors) {
  return visitors.map(function (v) {
    return v.name + '(' + v.title + ', ' + v.org + ')';
  }).join(' / ');
}

function writeVisit_(rowNumber, request, extra) {
  var target = visitSheet_();
  var col = columns_(target.getRange(1, 1, 1, target.getLastColumn()).getValues());
  var values = target.getRange(rowNumber, 1, 1, target.getLastColumn()).getValues()[0];
  fillVisitRow_(values, col, request, extra);

  // 날짜·시간·연락처가 숫자/날짜로 자동 변환되지 않도록 텍스트 서식으로 기록한다.
  var range = target.getRange(rowNumber, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values]);
}

/** 예약 객체를 시트 한 행(values, 헤더 순서)에 채운다. */
function fillVisitRow_(values, col, request, extra) {
  var set = function (name, value) { if (col[name] !== undefined) values[col[name]] = value; };
  var visitors = request.visitors || [];
  var hasHeadcount = typeof request.headcount === 'number';

  set('id', request.id);
  set('상태', STATUS_TEXT[request.status] || '대기');
  set('투어', TOURS[request.tour].label);
  set('방문일', request.date);
  set('시간', request.slot);
  set('방문구분', request.category === 'internal' ? '내부 방문' : '고객 방문');
  set('고객구분', request.category === 'internal' || !request.clientType ? ''
    : (request.clientType === 'new' ? '신규 고객사' : '기존 고객사'));
  set('투어언어', request.language === 'foreign' ? '외국어' : '한국어');
  set('외국어', request.language === 'foreign' ? request.foreignLanguage : '');
  set('통역동반', request.interpreter ? '동반' : '없음');
  set('통역언어', request.interpreter ? (request.interpreterLanguage || '') : '');
  set('업체명', request.company);
  set('업종', request.industries.join(', '));
  set('방문목적', request.purposes.join(', '));
  set('담당자', request.host.name);
  set('담당자직책', request.host.title);
  set('담당(실)', request.host.division || '');
  set('담당자조직', request.host.org);
  set('담당자연락처', request.host.phone);
  set('담당자이메일', request.host.email);
  set('담당자의견', request.hostComment);
  set('방문인원', visitors.length ? visitors.length : (hasHeadcount ? request.headcount : ''));
  set('방문자명단', visitorsText_(visitors));
  set('요청사항', request.note);
  set('관리자메모', request.adminMemo || '');
  set('수정일시', new Date().toISOString());
  set('방문자JSON', JSON.stringify(visitors));
  set('출처', request.source === 'manual' ? '수기' : '웹');
  set('주요인원', request.keyPersons || '');
  set('가이드', request.guides || '');
  set('유관부서', (request.departments || []).join(', '));
  set('후속진행', request.followUp || '');
  for (var key in (extra || {})) set(key, extra[key]);
}

/** blocked 시트의 막힌 일정. 대상 열이 비어 있는 이전 행은 전체(all)로 본다. */
function readBlocks_() {
  var target = book_().getSheetByName(BLOCKED_SHEET);
  if (!target) return [];
  var values = target.getDataRange().getValues();
  var list = [];
  for (var row = 1; row < values.length; row++) {
    var date = normalizeDateKey_(values[row][0]);
    if (!date) continue;
    var target = String(values[row][3] || '').trim();
    list.push({
      id: String(values[row][4] || ''),
      date: date,
      slot: normalizeSlot_(values[row][1]),
      reason: String(values[row][2] || ''),
      resource: target === 'center' || target === 'lab' ? target : 'all',
      _row: row + 1,
    });
  }
  return list;
}

/** 관리자 화면용: id 가 없는 이전 행에 id 를 채워 돌려준다. */
function adminBlocks_() {
  var sheet = sheet_(BLOCKED_SHEET, BLOCKED_HEADERS);
  var list = readBlocks_();
  list.forEach(function (block) {
    if (!block.id) {
      block.id = Utilities.getUuid();
      sheet.getRange(block._row, 5).setValue(block.id);
    }
  });
  return list.map(function (block) {
    return { id: block.id, date: block.date, slot: block.slot, reason: block.reason, resource: block.resource };
  });
}

function addBlocks_(payload) {
  var resource = String(payload.resource || '');
  if (['all', 'center', 'lab'].indexOf(resource) === -1) throw new Error('막을 대상을 선택해 주세요.');
  var dates = Array.isArray(payload.dates) ? payload.dates : [];
  if (dates.length === 0 || dates.length > 120) throw new Error('막을 날짜는 1~120일 사이여야 합니다.');
  var slot = normalizeSlot_(payload.slot);
  if (slot && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot)) throw new Error('시간대 형식이 올바르지 않습니다.');
  if (slot && toMinutes_(slot.split('-')[0]) >= toMinutes_(slot.split('-')[1])) throw new Error('끝 시간은 시작 시간보다 늦어야 합니다.');
  var reason = optionalText_(payload.reason, 200);
  var rows = dates.map(function (value) {
    var date = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('날짜 형식이 올바르지 않습니다.');
    return [date, slot, reason, resource, Utilities.getUuid()];
  });
  return withLock_(function () {
    var sheet = sheet_(BLOCKED_SHEET, BLOCKED_HEADERS);
    var start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, 1).setNumberFormat('@');
    sheet.getRange(start, 1, rows.length, 5).setValues(rows);
    SpreadsheetApp.flush();
    return {
      blocks: rows.map(function (row) {
        return { id: row[4], date: row[0], slot: row[1], reason: row[2], resource: row[3] };
      }),
    };
  });
}

function removeBlocks_(payload) {
  var ids = (Array.isArray(payload.ids) ? payload.ids : [payload.id]).map(String);
  return withLock_(function () {
    var sheet = sheet_(BLOCKED_SHEET, BLOCKED_HEADERS);
    var rows = readBlocks_().filter(function (block) { return ids.indexOf(block.id) !== -1; })
      .map(function (block) { return block._row; })
      .sort(function (a, b) { return b - a; });
    rows.forEach(function (row) { sheet.deleteRow(row); });
    SpreadsheetApp.flush();
    return { removed: ids };
  });
}

/** 승인된 예약과 blocked 시트에서 '신청 불가' 구간을 만든다. */
/**
 * includePending: 예약 화면 · 새 신청 검사용. 승인 대기 중인 신청도 시간대를 점유해 다른 사람이 같은 시간에
 * 중복 신청하지 못하게 한다. 관리자 승인 · 수정 검사는 확정(승인 · 완료) 건끼리만 비교한다.
 */
function busy_(excludeId, includePending) {
  // 지난 날짜는 신청·승인 판단에 쓰이지 않으므로 빼서 응답을 가볍게 유지한다.
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var busy = [];
  readVisits_().forEach(function (request) {
    var occupies = isConfirmed_(request.status) || (includePending && request.status === 'pending');
    if (!occupies || request.id === excludeId || request.date < today) return;
    busy = busy.concat(segmentsOf_(request.tour, request.date, request.slot, request.source === 'manual'));
  });

  var closedDays = {};
  readBlocks_().forEach(function (block) {
    if (block.date < today) return;
    if (!block.slot) {
      if (block.resource === 'all') closedDays[block.date] = true;
      else busy.push({ date: block.date, resource: block.resource, from: '00:00', to: '24:00' });
      return;
    }
    var range = block.slot.split('-');
    var to = range[1] || fromMinutes_(toMinutes_(range[0]) + 60);
    busy.push({ date: block.date, resource: block.resource, from: range[0], to: to });
  });
  return { busy: busy, closedDays: Object.keys(closedDays) };
}

function optionalText_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

/** 예약 화면/관리자 수정 공통 검증. 깨끗한 요청 객체를 돌려준다. */
function sanitizeVisit_(payload, requireConsent) {
  var tour = String(payload.tour || '');
  if (!TOURS[tour] || tour === 'other') throw new Error('투어 종류를 선택해 주세요.');
  var date = requireText_(payload.date, '방문 희망일', 10);
  var slot = requireText_(payload.slot, '방문 시간', 11);
  if (TOURS[tour].slots.indexOf(slot) === -1) throw new Error('선택한 투어에서 운영하지 않는 시간입니다.');
  var weekday = new Date(date + 'T00:00:00').getDay();
  if (OPEN_WEEKDAYS.indexOf(weekday) === -1) throw new Error('방문은 월·수·금만 가능합니다.');

  var category = payload.category === 'internal' ? 'internal' : 'external';
  var clientType = category === 'external' ? (payload.clientType === 'new' ? 'new' : 'existing') : undefined;
  var language = payload.language === 'foreign' ? 'foreign' : 'ko';
  var foreignLanguage = language === 'foreign' ? optionalText_(payload.foreignLanguage, 40).replace(/,/g, ' ') : '';
  if (language === 'foreign' && (!foreignLanguage || foreignLanguage === '기타')) {
    throw new Error('투어 진행 언어를 선택해 주세요.');
  }
  var industries = (payload.industries || []).map(function (item) { return optionalText_(item, 50).replace(/,/g, ' '); })
    .filter(function (item) { return item; });
  // 방문 목적은 하나만 받는다 (통계 중복 집계 방지). 이전 화면이 여러 개를 보내도 첫 번째만 저장한다.
  var purposes = (payload.purposes || []).map(function (item) { return optionalText_(item, 50).replace(/,/g, ' '); })
    .filter(function (item) { return item; }).slice(0, 1);
  if (category === 'external' && industries.length === 0) throw new Error('업종을 하나 이상 선택해 주세요.');
  if (purposes.length === 0) throw new Error('방문 목적을 하나 이상 선택해 주세요.');

  var host = payload.host || {};
  var visitors = payload.visitors || [];
  if (!(visitors.length >= 1 && visitors.length <= MAX_VISITORS)) {
    throw new Error('방문자는 1~' + MAX_VISITORS + '명까지 등록할 수 있습니다.');
  }
  if (requireConsent && payload.consent !== true) throw new Error('개인정보 수집·이용에 동의해 주세요.');

  return {
    tour: tour,
    date: date,
    slot: slot,
    category: category,
    clientType: clientType,
    language: language,
    foreignLanguage: foreignLanguage,
    interpreter: payload.interpreter === true,
    interpreterLanguage: payload.interpreter === true ? optionalText_(payload.interpreterLanguage, 40) : '',
    company: requireText_(payload.company, category === 'external' ? '업체명' : '방문 조직명', 60),
    industries: category === 'external' ? industries : [],
    purposes: purposes,
    host: {
      name: requireText_(host.name, '담당자 성함', 40),
      title: requireText_(host.title, '담당자 직책', 40),
      // 웹 신청은 필수, 관리자 수정은 담당(실)이 없던 이전 기록도 고칠 수 있게 선택.
      division: requireConsent
        ? requireText_(host.division, '담당자 담당(실)', 40)
        : optionalText_(host.division, 40),
      org: requireText_(host.org, '담당자 조직명', 60),
      phone: requireText_(host.phone, '담당자 연락처', 30),
      email: requireText_(host.email, '담당자 이메일', 120),
    },
    hostComment: optionalText_(payload.hostComment, 500),
    visitors: visitors.map(function (v, index) {
      var label = '방문자 #' + (index + 1) + ' ';
      return {
        name: requireText_(v.name, label + '성함', 40),
        title: requireText_(v.title, label + '직책', 40),
        org: requireText_(v.org, label + '조직명', 60),
        email: requireText_(v.email, label + '이메일', 120),
        car: optionalText_(v.car, 20),
        jobs: (v.jobs || []).map(function (job) { return optionalText_(job, 30); }).slice(0, 12),
      };
    }),
    note: optionalText_(payload.note, 500),
    consent: true,
  };
}

function addReservation_(payload) {
  var request = sanitizeVisit_(payload, true);
  var earliest = new Date();
  earliest.setDate(earliest.getDate() + MIN_LEAD_DAYS);
  var earliestKey = Utilities.formatDate(earliest, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (request.date < earliestKey) {
    throw new Error('당일 · 익일 방문은 신청할 수 없습니다. ' + formatDateKo_(earliestKey) + ' 이후 날짜를 선택해 주세요.');
  }

  request.id = Utilities.getUuid();
  request.status = 'pending';
  request.adminMemo = '';
  var token = Utilities.getUuid();
  var now = new Date().toISOString();

  var target = visitSheet_();
  withLock_(function () {
    // 승인 · 대기 중인 일정과 겹치지 않는지 잠금 안에서 확인한다.
    // (잠금 밖에서 확인하면 같은 시간에 동시에 들어온 두 신청이 모두 통과할 수 있다)
    var blocked = busy_(null, true);
    if (blocked.closedDays.indexOf(request.date) !== -1 || isBusy_(request.tour, request.date, request.slot, blocked.busy)) {
      throw new Error('이미 신청되었거나 확정된 일정과 겹쳐 신청할 수 없습니다. 다른 날짜나 시간을 선택해 주세요.');
    }

    // 내용 없는 행은 appendRow 로 추가되지 않으므로, 쓸 행 번호를 직접 계산한다.
    // 잠금 안에서 계산해야 동시에 들어온 예약끼리 같은 행을 덮어쓰지 않는다.
    var rowNumber = target.getLastRow() + 1;
    if (rowNumber > target.getMaxRows()) target.insertRowsAfter(target.getMaxRows(), 1);
    writeVisit_(rowNumber, request, { '신청일시': now, '토큰': token, '개인정보동의': now });

    // 저장이 실제로 됐는지 확인한다. 실패했는데 메일만 나가는 일이 없도록.
    SpreadsheetApp.flush();
    var saved = findVisit_(function (item) { return item.id === request.id; });
    if (!saved || saved._token !== token) {
      throw new Error('예약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  });

  MailApp.sendEmail({
    to: mailTo_(request.tour),
    name: MAIL_SENDER_NAME,
    replyTo: request.host.email,
    subject: mailBrand_(request.tour).tag + ' 방문 예약 신청 · ' + TOURS[request.tour].label + ' · ' + request.company + ' · '
      + request.date + ' ' + request.slot,
    htmlBody: reservationMailHtml_(request),
  });

  return { ok: true };
}

/**
 * 상태 변경. 승인은 다른 승인 건과 겹치면 거부한다.
 * 상태가 실제로 바뀌면 신청 담당자에게 결과 메일을 보낸다.
 */
function changeStatus_(found, status) {
  var request = withLock_(function () {
    // 잠금을 기다리는 사이 행 위치가 바뀌었을 수 있어 id 로 다시 찾는다.
    var current = findVisit_(function (item) { return item.id === found.id; });
    if (!current) throw new Error('예약을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.');
    if (isConfirmed_(status) && !isConfirmed_(current.status)
      && isBusy_(current.tour, current.date, current.slot, busy_(current.id).busy, current.source === 'manual')) {
      throw new Error('이미 승인된 다른 예약과 시간이 겹쳐 승인할 수 없습니다.');
    }
    current._previous = current.status;
    current.status = status;
    writeVisit_(current._row, current);
    return current;
  });
  // 신청 담당자에게는 웹 예약의 승인 · 거절만 알린다. (완료 · 취소 · 수기 등록 건은 메일 없음)
  var before = request._previous;
  var notify = request.source !== 'manual' && (
    (status === 'approved' && !isConfirmed_(before)) || (status === 'rejected' && before !== 'rejected'));
  if (notify) notifyHost_(request);
  return request;
}

/* ------------------------------------------------- 수기 등록 · 이력 가져오기 */

var TIME_RE_ = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 관리자 수기 등록 · 기존 방문 이력 검증. 웹 예약 규칙(월·수·금, 정해진 시간대, 방문자 명단 등)을 적용하지 않는다.
 */
function sanitizeManual_(payload) {
  var tour = TOURS[payload.tour] ? String(payload.tour) : 'other';
  var date = String(payload.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T00:00:00').getTime())) {
    throw new Error('방문일이 올바르지 않습니다. (예: 2026-09-07)');
  }
  var slot = String(payload.slot || '').replace(/\s/g, '');
  if (slot) {
    var range = slot.split('-');
    if (range.length !== 2 || !TIME_RE_.test(range[0]) || !TIME_RE_.test(range[1]) || range[0] >= range[1]) {
      throw new Error('시간이 올바르지 않습니다. (예: 10:00-11:30, 미정이면 비워 두세요)');
    }
  }
  var status = STATUS_TEXT[payload.status] ? String(payload.status) : 'approved';
  var category = payload.category === 'internal' ? 'internal' : 'external';
  var language = payload.language === 'foreign' ? 'foreign' : 'ko';
  var list = function (items, max) {
    return (items || []).map(function (item) { return optionalText_(item, max).replace(/,/g, ' '); })
      .filter(function (item) { return item; }).slice(0, 20);
  };
  var host = payload.host || {};
  var visitors = (payload.visitors || []).slice(0, MAX_VISITORS).map(function (v) {
    return {
      name: optionalText_(v.name, 40), title: optionalText_(v.title, 40), org: optionalText_(v.org, 60),
      email: optionalText_(v.email, 120), car: optionalText_(v.car, 20),
      jobs: (v.jobs || []).map(function (job) { return optionalText_(job, 30); }).slice(0, 12),
    };
  }).filter(function (v) { return v.name; });
  var headcount = Number(payload.headcount);
  return {
    tour: tour,
    date: date,
    slot: slot,
    status: status,
    source: 'manual',
    category: category,
    clientType: category === 'external' && (payload.clientType === 'new' || payload.clientType === 'existing')
      ? payload.clientType : undefined,
    language: language,
    foreignLanguage: language === 'foreign' ? optionalText_(payload.foreignLanguage, 40).replace(/,/g, ' ') : '',
    interpreter: payload.interpreter === true,
    interpreterLanguage: payload.interpreter === true ? optionalText_(payload.interpreterLanguage, 40) : '',
    company: requireText_(payload.company, '업체(기관)명', 80),
    industries: category === 'external' ? list(payload.industries, 50) : [],
    purposes: list(payload.purposes, 80),
    host: {
      name: optionalText_(host.name, 40), title: optionalText_(host.title, 40),
      division: optionalText_(host.division, 40), org: optionalText_(host.org, 60),
      phone: optionalText_(host.phone, 30), email: optionalText_(host.email, 120),
    },
    hostComment: optionalText_(payload.hostComment, 500),
    visitors: visitors,
    headcount: payload.headcount === '' || payload.headcount == null || !(headcount >= 0 && headcount <= 9999)
      ? undefined : Math.floor(headcount),
    note: optionalText_(payload.note, 1000),
    consent: false,
    adminMemo: optionalText_(payload.adminMemo, 1000),
    keyPersons: optionalText_(payload.keyPersons, 1000),
    guides: optionalText_(payload.guides, 1000),
    departments: list(payload.departments, 60),
    followUp: optionalText_(payload.followUp, 2000),
  };
}

/** 운영 기록 필드 (웹 예약에도 방문 후 기록할 수 있다) */
function applyOpsFields_(target, payload) {
  target.keyPersons = optionalText_(payload.keyPersons, 1000);
  target.guides = optionalText_(payload.guides, 1000);
  target.departments = (payload.departments || []).map(function (item) { return optionalText_(item, 60).replace(/,/g, ' '); })
    .filter(function (item) { return item; }).slice(0, 20);
  target.followUp = optionalText_(payload.followUp, 2000);
  return target;
}

/** 같은 방문을 두 번 가져오지 않도록: 날짜 + 업체명 + 시간 */
function visitKey_(request) {
  return [request.date, String(request.company).replace(/\s/g, '').toLowerCase(), request.slot].join('|');
}

/** 여러 건을 한 번에 시트 끝에 기록한다 (잠금 안에서 호출). */
function appendVisits_(requests) {
  if (!requests.length) return;
  var target = visitSheet_();
  var header = target.getRange(1, 1, 1, Math.max(target.getLastColumn(), VISIT_HEADERS.length)).getValues();
  var col = columns_(header);
  var width = header[0].length;
  var now = new Date().toISOString();
  var rows = requests.map(function (request) {
    var values = [];
    for (var i = 0; i < width; i++) values.push('');
    fillVisitRow_(values, col, request, { '신청일시': request.createdAt || now });
    return values;
  });
  var start = target.getLastRow() + 1;
  var needed = start + rows.length - 1 - target.getMaxRows();
  if (needed > 0) target.insertRowsAfter(target.getMaxRows(), needed);
  var range = target.getRange(start, 1, rows.length, width);
  range.setNumberFormat('@');
  range.setValues(rows);
  SpreadsheetApp.flush();
}

function createManual_(payload) {
  var request = sanitizeManual_(payload || {});
  return withLock_(function () {
    if (isConfirmed_(request.status) && isBusy_(request.tour, request.date, request.slot, busy_().busy, true)) {
      throw new Error('이미 승인된 다른 예약과 시간이 겹칩니다. 시간을 확인해 주세요.');
    }
    request.id = Utilities.getUuid();
    request.createdAt = new Date().toISOString();
    appendVisits_([request]);
    return { request: request };
  });
}

/** 기존 방문 이력 일괄 가져오기. 이미 있는 방문(날짜+업체+시간)은 건너뛴다. */
/**
 * 기존 이력 가져오기는 시트에 대량으로 행을 쌓는 작업이라 관리자 키와 별도의 암호키(IMPORT_KEY)를 한 번 더 요구한다.
 * 기존 행은 지우거나 덮어쓰지 않고, 시트 마지막 행 아래에 이어서 추가한다.
 */
function checkImportKey_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('IMPORT_KEY');
  if (!expected) throw new Error('가져오기 암호키(IMPORT_KEY)가 설정되지 않았습니다. Apps Script 프로젝트 설정 → 스크립트 속성에 IMPORT_KEY 를 추가해 주세요.');
  if (String(given || '') !== expected) {
    Utilities.sleep(1500); // 무차별 대입을 늦춘다.
    throw new Error('가져오기 암호키가 올바르지 않습니다.');
  }
}

function importManual_(items, importKey) {
  checkImportKey_(importKey);
  if (!Array.isArray(items) || items.length === 0) throw new Error('가져올 방문 기록이 없습니다.');
  if (items.length > MAX_IMPORT) throw new Error('한 번에 ' + MAX_IMPORT + '건까지 가져올 수 있습니다.');
  return withLock_(function () {
    var seen = {};
    readVisits_().forEach(function (item) { seen[visitKey_(item)] = true; });
    var created = [];
    var skipped = [];
    var now = new Date().toISOString();
    items.forEach(function (item, index) {
      try {
        var request = sanitizeManual_(item || {});
        var key = visitKey_(request);
        if (seen[key]) {
          skipped.push({ index: index, reason: '이미 등록된 방문' });
          return;
        }
        seen[key] = true;
        request.id = Utilities.getUuid();
        request.createdAt = now;
        created.push(request);
      } catch (error) {
        skipped.push({ index: index, reason: String(error.message || error) });
      }
    });
    appendVisits_(created);
    return { created: created, skipped: skipped };
  });
}

function findVisit_(predicate) {
  var list = readVisits_();
  for (var i = 0; i < list.length; i++) if (predicate(list[i])) return list[i];
  return null;
}

/* ------------------------------------------------------------ 관리자 API */

function admin_(payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected) throw new Error('관리자 키(ADMIN_KEY)가 설정되지 않았습니다. apps-script/README.md 를 참고하세요.');
  if (String(payload.key || '') !== expected) {
    Utilities.sleep(1500); // 무차별 대입을 늦춘다.
    throw new Error('관리자 키가 올바르지 않습니다.');
  }

  if (ADMIN_ACTIONS.indexOf(String(payload.action)) === -1) {
    throw new Error('서버(Apps Script)가 모르는 관리자 요청입니다: ' + payload.action + ' (서버 버전 ' + CODE_VERSION + ')');
  }

  if (payload.action === 'list') {
    // 버전 정보도 함께 돌려줘 관리자 화면이 따로 health 를 부르지 않아도 된다.
    return { requests: readVisits_().map(publicRequest_), blocks: adminBlocks_(), version: CODE_VERSION, apiLevel: API_LEVEL };
  }

  // light: 버전 확인만 (시트를 읽지 않는다)
  if (payload.action === 'health') return payload.light === true ? { version: CODE_VERSION, apiLevel: API_LEVEL } : health_();
  if (payload.action === 'blockAdd') return addBlocks_(payload);
  if (payload.action === 'blockRemove') return removeBlocks_(payload);
  if (payload.action === 'create') return createManual_(payload.request);
  if (payload.action === 'import') return importManual_(payload.requests, payload.importKey);

  if (payload.action === 'guestbookList') return { entries: readGuestbookAdmin_() };
  if (payload.action === 'guestbookSetHidden') return setGuestbookHidden_(String(payload.id), payload.hidden === true);
  if (payload.action === 'guestbookSetTour') return setGuestbookTour_(String(payload.id), String(payload.tour || ''));
  if (payload.action === 'guestbookDelete') return deleteGuestbook_(String(payload.id));

  if (payload.action === 'delete') {
    // 예약을 시트에서 완전히 지운다 (되돌릴 수 없음). 잠금 안에서 id 로 다시 찾아 그 행만 삭제.
    return withLock_(function () {
      var target = findVisit_(function (item) { return item.id === String(payload.id); });
      if (!target) throw new Error('예약을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.');
      visitSheet_().deleteRow(target._row);
      SpreadsheetApp.flush();
      return { deleted: target.id };
    });
  }

  var request = findVisit_(function (item) { return item.id === String(payload.id); });
  if (!request) throw new Error('예약을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.');

  if (payload.action === 'setStatus') {
    var status = String(payload.status);
    if (!STATUS_TEXT[status]) throw new Error('알 수 없는 상태입니다.');
    return { request: publicRequest_(changeStatus_(request, status)) };
  }

  if (payload.action === 'update') {
    var input = payload.request || {};
    // 수기 등록 건은 완화된 규칙, 웹 예약은 예약 화면과 같은 규칙으로 검사한다.
    var next = request.source === 'manual' ? sanitizeManual_(input) : sanitizeVisit_(input, false);
    applyOpsFields_(next, input);
    next.source = request.source;
    next.consent = request.consent;
    next.id = request.id;
    next.createdAt = request.createdAt;
    next.adminMemo = optionalText_(input.adminMemo, 1000);
    return withLock_(function () {
      var current = findVisit_(function (item) { return item.id === request.id; });
      if (!current) throw new Error('예약을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.');
      next.status = current.status;
      next._row = current._row;
      if (isConfirmed_(next.status) && isBusy_(next.tour, next.date, next.slot, busy_(next.id).busy, next.source === 'manual')) {
        throw new Error('변경한 일정이 이미 승인된 다른 예약과 겹칩니다.');
      }
      writeVisit_(next._row, next);
      delete next._row;
      return { request: publicRequest_(next) };
    });
  }

  throw new Error('알 수 없는 관리자 요청입니다.');
}

/* ----------------------------------------------------------- 메일 서식 */

/**
 * 메일 머리 표기: 투어에 따라 장소 이름을 나눈다.
 * 'TDL Lab' 은 TDL Lab 만 가리키고, 건물(센터)은 '메가와이즈 청라' 로 부른다 (한글 표기만 쓴다).
 */
function mailBrand_(tour) {
  if (tour === 'center') return { tag: '[메가와이즈 청라]', label: '메가와이즈 청라', manager: '센터 투어 담당자님' };
  if (tour === 'combined') {
    return { tag: '[메가와이즈 청라 · TDL Lab]', label: '메가와이즈 청라 · TDL Lab', manager: '센터 · TDL Lab 투어 담당자님' };
  }
  return { tag: '[TDL Lab]', label: 'TDL LAB', manager: 'TDL Lab 담당자님' };
}

function mailShell_(title, lead, bodyHtml, brand) {
  return [
    '<div style="margin:0;padding:24px 12px;background:#f3f2f1;',
    'font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',Helvetica,Arial,sans-serif;">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;',
    'border:1px solid #e3e0de;">',
    '<div style="background:', BRAND, ';padding:20px 28px;">',
    // 영문 'TDL LAB' 만 자간을 넓히고, 한글 이름은 자간 없이 읽기 좋게 둔다.
    '<div style="color:#ffffff;font-size:12px;letter-spacing:', /^[\x00-\x7f]+$/.test((brand || mailBrand_('lab')).label) ? '3px' : '0.5px',
    ';">', escapeHtml_((brand || mailBrand_('lab')).label), '</div>',
    '<div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:6px;">',
    escapeHtml_(title), '</div></div>',
    '<div style="padding:28px;">',
    '<p style="margin:0 0 22px;font-size:14px;line-height:1.75;color:#534a47;">', lead, '</p>',
    bodyHtml,
    '</div>',
    '<div style="padding:16px 28px;border-top:1px solid #eeecea;',
    'font-size:11px;color:#aca8a7;line-height:1.6;">',
    'Tech Driven Logistics · Tech Innovation Team<br>',
    '<a href="', SITE_URL, '" style="color:#aca8a7;">', SITE_URL, '</a>',
    '</div></div></div>',
  ].join('');
}

function rows_(pairs) {
  var html = ['<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">'];
  for (var i = 0; i < pairs.length; i++) {
    html.push(
      '<tr>',
      '<td style="padding:11px 0;width:96px;vertical-align:top;font-size:12px;color:#aca8a7;',
      'border-bottom:1px solid #f1efee;">', escapeHtml_(pairs[i][0]), '</td>',
      '<td style="padding:11px 0;font-size:14px;color:#3d3532;line-height:1.6;',
      'border-bottom:1px solid #f1efee;">', pairs[i][1], '</td>',
      '</tr>',
    );
  }
  html.push('</table>');
  return html.join('');
}

function button_(href, label, filled) {
  var style = filled
    ? 'background:' + BRAND + ';color:#ffffff;border:1px solid ' + BRAND + ';'
    : 'background:#ffffff;color:#736662;border:1px solid #d9d5d3;';
  return '<a href="' + href + '" style="' + style
    + 'display:inline-block;padding:12px 22px;font-size:13px;font-weight:700;'
    + 'text-decoration:none;">' + escapeHtml_(label) + '</a>';
}


/** '한국어' 또는 '<b>영어</b> · 고객사 통역 동반' */
function languageText_(r) {
  var foreign = r.language === 'foreign';
  var name = foreign ? (String(r.foreignLanguage).replace(/^기타:\s*/, '') || '외국어') : '한국어';
  var interpreter = r.interpreter
    ? '고객사 통역 동반' + (r.interpreterLanguage ? ' (' + escapeHtml_(r.interpreterLanguage) + ')' : '')
    : (foreign ? '통역 없음 (' + escapeHtml_(name) + ' 안내 인력 필요)' : '');
  if (!foreign && !r.interpreter) return '한국어';
  return (foreign ? '<b style="color:' + BRAND + ';">' + escapeHtml_(name) + '</b>' : '한국어') + ' · ' + interpreter;
}

function listOrNone_(items) {
  return items && items.length ? escapeHtml_(items.join(', ')) : '<span style="color:#aca8a7;">없음</span>';
}

function textOrNone_(value) {
  return value ? escapeHtml_(value) : '<span style="color:#aca8a7;">없음</span>';
}

/** 투어 색 (src/lib/visit.ts 의 TOURS color 와 같다) */
var TOUR_MAIL_COLOR = { combined: '#dc2626', lab: '#7c5cc4', center: '#1a8fa0', other: '#8a8f98' };

function scheduleBox_(r) {
  return [
    '<div style="border:1px solid #e3e0de;border-left:3px solid ', BRAND, ';',
    'background:#faf9f8;padding:16px 18px;margin-bottom:24px;">',
    // 투어 종류는 관리자 화면과 같은 투어 색 배지로 눈에 띄게 표시한다.
    '<span style="display:inline-block;padding:4px 12px;font-size:14px;font-weight:700;color:#ffffff;',
    'background:', TOUR_MAIL_COLOR[r.tour] || TOUR_MAIL_COLOR.other, ';border-radius:3px;">',
    escapeHtml_(TOURS[r.tour].label), '</span>',
    '<div style="font-size:17px;font-weight:700;color:#3d3532;margin-top:10px;">',
    escapeHtml_(formatDateKo_(r.date)), ' &nbsp;', escapeHtml_(r.slot.replace('-', ' – ')),
    '</div></div>',
  ].join('');
}

function visitorsTable_(visitors) {
  var cell = 'padding:6px 8px;border:1px solid #eeecea;font-size:12px;color:#3d3532;';
  var head = 'padding:6px 8px;border:1px solid #eeecea;font-size:11px;color:#736662;background:#faf9f8;text-align:left;';
  var html = ['<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:8px;">',
    '<tr><th style="', head, '">성함</th><th style="', head, '">직책</th><th style="', head, '">조직</th>',
    '<th style="', head, '">차량</th><th style="', head, '">직무</th></tr>'];
  visitors.forEach(function (v) {
    html.push('<tr><td style="', cell, '">', escapeHtml_(v.name), '</td><td style="', cell, '">',
      escapeHtml_(v.title), '</td><td style="', cell, '">', escapeHtml_(v.org), '</td><td style="', cell, '">',
      escapeHtml_(v.car || '-'), '</td><td style="', cell, '">', escapeHtml_((v.jobs || []).join(', ') || '-'),
      '</td></tr>');
  });
  html.push('</table>');
  return html.join('');
}

/** 관리자 페이지에서 해당 예약 상세를 바로 여는 주소 */
function reviewUrl_(id) {
  return ADMIN_URL + '?review=' + encodeURIComponent(id);
}

/**
 * 메일의 버튼은 승인을 직접 처리하지 않고 관리자 페이지(해당 예약 상세)를 연다.
 * - 관리자 키가 있어야 승인되므로 메일이 전달되거나 보안 스캐너가 링크를 열어도 자동 승인되지 않는다.
 * - 관리자 페이지는 사이트가 쓰는 웹앱 주소로만 요청하므로 배포 주소가 여러 개여도 어긋나지 않는다.
 */
function reservationMailHtml_(r) {
  var review = reviewUrl_(r.id);

  var lead = [
    '안녕하세요, ', mailBrand_(r.tour).manager, '.<br>',
    '<b style="color:#3d3532;">', escapeHtml_([r.host.division, r.host.org].filter(Boolean).join(' ')), ' ',
    escapeHtml_(r.host.name), ' ',
    escapeHtml_(r.host.title), '</b> 님으로부터 방문 예약이 도착하였습니다.<br>',
    '아래 내용을 확인하시고 일정을 승인해 주시기 바랍니다.',
  ].join('');

  var detail = rows_([
    ['방문 유형', r.category === 'internal' ? '내부 방문'
      : '고객 방문 · ' + (r.clientType === 'new' ? '신규 고객사' : '기존 고객사')],
    ['투어 언어', languageText_(r)],
    [r.category === 'internal' ? '방문 조직' : '업체명', escapeHtml_(r.company)],
    ['업종', listOrNone_(r.industries)],
    ['방문 목적', listOrNone_(r.purposes)],
    ['방문 인원', r.visitors.length + '명'],
    ['담당자', escapeHtml_(r.host.name + ' ' + r.host.title + ' · '
      + [r.host.division, r.host.org].filter(Boolean).join(' '))],
    ['연락처', '<a href="tel:' + escapeHtml_(r.host.phone) + '" style="color:#3d3532;">'
      + escapeHtml_(r.host.phone) + '</a>'],
    ['이메일', '<a href="mailto:' + escapeHtml_(r.host.email) + '" style="color:#3d3532;">'
      + escapeHtml_(r.host.email) + '</a>'],
    ['담당자 의견', textOrNone_(r.hostComment)],
    ['요청사항', textOrNone_(r.note)],
  ]);

  var actions = [
    '<div style="margin-top:26px;">',
    button_(review, '확인하고 승인 · 거절하기', true),
    '</div>',
    '<p style="margin:14px 0 0;font-size:12px;color:#aca8a7;line-height:1.7;">',
    '버튼을 누르면 관리자 페이지에서 이 예약의 상세 화면이 열립니다. (관리자 키로 로그인)<br>',
    '승인하면 해당 시간대는 예약 화면에서 자동으로 선택 불가 처리되고, 신청 담당자에게 확정 메일이 발송됩니다.<br>',
    '이 메일에 그대로 <b>회신</b>하시면 신청 담당자에게 바로 답장이 갑니다.',
    '</p>',
  ].join('');

  var book = SpreadsheetApp.getActiveSpreadsheet();
  var stored = '<p style="margin:14px 0 0;font-size:11px;color:#aca8a7;">저장 위치: '
    + '<a href="' + book.getUrl() + '" style="color:#aca8a7;">' + escapeHtml_(book.getName())
    + '</a> · ' + VISIT_SHEET + ' 탭 · 예약번호 ' + escapeHtml_(String(r.id).slice(0, 8)) + '</p>';
  return mailShell_('방문 예약 신청', lead, scheduleBox_(r) + detail + stored
    + '<div style="margin-top:20px;font-size:12px;color:#aca8a7;">방문자 명단</div>'
    + visitorsTable_(r.visitors) + actions, mailBrand_(r.tour));
}

/* ---------------------------------------------------- 방문 안내 (확정 메일) */

/** 확정 메일에 들어가는 오시는 길 · 주차 · 미팅 장소. 문구를 바꿀 때는 여기만 고친다. */
var VISIT_GUIDE = {
  address: '인천 서해구 북항단지로 151 (LX판토스 메가와이즈 청라)',
  mapUrl: 'https://naver.me/FNtXUogd',
  /** 주차 · 미팅 위치 지도 (사이트 public/media/visit-map.jpg) */
  mapImage: SITE_URL + 'media/visit-map.jpg',
  arriveBefore: 10,
  /** 모든 투어 공통: 입구(IN) 왼쪽 투어 주차장 */
  parking: '입구(IN)로 들어와 왼쪽의 투어 주차장에 주차해 주세요.',
  /** TDL Lab 투어는 주차장에서 담당자가 Lab 으로 안내 */
  labMeeting: '주차 후 투어 주차장에서 담당자가 TDL Lab 까지 안내해 드립니다.',
};

function visitGuideHtml_(r) {
  var pairs = [
    ['위치', escapeHtml_(VISIT_GUIDE.address) + '<br><a href="' + VISIT_GUIDE.mapUrl
      + '" style="color:' + BRAND + ';font-size:13px;font-weight:700;">네이버 지도에서 보기 →</a>'],
    ['주차', escapeHtml_(VISIT_GUIDE.parking)],
  ];
  if (r.tour === 'lab') pairs.push(['미팅 장소', escapeHtml_(VISIT_GUIDE.labMeeting)]);
  return [
    '<div style="margin-top:26px;font-size:15px;font-weight:700;color:#3d3532;">오시는 길</div>',
    rows_(pairs),
    '<a href="', VISIT_GUIDE.mapUrl, '" style="display:block;margin-top:14px;">',
    '<img src="', VISIT_GUIDE.mapImage, '" alt="주차 · 미팅 장소 안내 지도" width="504" ',
    'style="display:block;width:100%;max-width:504px;height:auto;border:1px solid #e3e0de;"></a>',
    '<div style="margin-top:22px;background:#faf9f8;border:1px solid #eeecea;padding:14px 16px;',
    'font-size:13px;color:#534a47;line-height:1.8;">',
    '· 원활한 진행을 위해 투어 시작 <b>', VISIT_GUIDE.arriveBefore, '분 전</b>까지 도착해 주시기 바랍니다.<br>',
    '· 일정이 변경되거나 취소되는 경우 <b>최소 1일 전</b>까지 이 메일에 회신해 알려 주시기 바랍니다.',
    '</div>',
  ].join('');
}

/** 승인/거절 결과를 신청 담당자에게 알린다. */
function notifyHost_(r) {
  if (!r.host.email) return;
  var approved = r.status === 'approved';
  var lead = approved
    ? escapeHtml_(r.host.name) + ' 님, 신청하신 투어 방문 일정이 <b style="color:' + BRAND + ';">확정</b>되었습니다.<br>'
      + '아래 오시는 길과 주차 안내를 확인해 주세요.'
    : escapeHtml_(r.host.name) + ' 님, 아쉽지만 신청하신 일정으로는 방문이 어렵습니다.<br>'
      + '다른 날짜로 다시 신청해 주시거나, 이 메일에 회신해 일정을 조율해 주세요.';
  MailApp.sendEmail({
    to: r.host.email,
    name: MAIL_SENDER_NAME,
    replyTo: mailTo_(r.tour),
    subject: mailBrand_(r.tour).tag + ' 방문 예약 ' + (approved ? '확정' : '불가') + ' 안내 · ' + r.date + ' ' + r.slot,
    htmlBody: mailShell_(approved ? '방문 일정 확정' : '방문 예약 결과 안내', lead, scheduleBox_(r) + rows_([
      [r.category === 'internal' ? '방문 조직' : '업체명', escapeHtml_(r.company)],
      ['투어 언어', languageText_(r)],
      ['방문 인원', r.visitors.length + '명'],
    ]) + (approved ? visitGuideHtml_(r) : ''), mailBrand_(r.tour)),
  });
}

function resultPage_(title, message, tone) {
  var color = tone === 'error' ? '#aca8a7' : BRAND;
  return HtmlService.createHtmlOutput(
    '<div style="font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',Helvetica,Arial,sans-serif;'
    + 'max-width:460px;margin:64px auto;padding:32px;border:1px solid #e3e0de;text-align:center;">'
    + '<div style="font-size:11px;letter-spacing:3px;color:' + color + ';">TDL LAB</div>'
    + '<h1 style="font-size:20px;color:#3d3532;margin:14px 0 10px;">' + escapeHtml_(title) + '</h1>'
    + '<p style="font-size:14px;color:#736662;line-height:1.8;margin:0;">' + message + '</p>'
    + '</div>',
  ).setTitle('TDL Lab');
}


/* -------------------------------------------------------- 시트 관리 메뉴 */

/** 스프레드시트를 열면 상단에 'TDL Lab' 메뉴가 생긴다. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TDL Lab')
    .addItem('선택한 방명록 숨기기', 'hideSelectedGuestbook')
    .addItem('선택한 방명록 다시 표시', 'showSelectedGuestbook')
    .addToUi();
}

function setSelected_(sheetName, column, value, done) {
  var active = SpreadsheetApp.getActiveSheet();
  if (active.getName() !== sheetName) {
    SpreadsheetApp.getUi().alert('"' + sheetName + '" 시트에서 행을 선택한 뒤 실행해 주세요.');
    return;
  }
  var range = active.getActiveRange();
  var count = 0;
  for (var i = 0; i < range.getNumRows(); i++) {
    var row = range.getRow() + i;
    if (row === 1) continue;
    active.getRange(row, column).setValue(value);
    count++;
  }
  SpreadsheetApp.getUi().alert(count + '건 ' + done);
}

function hideSelectedGuestbook() {
  setSelected_(GUESTBOOK_SHEET, GUESTBOOK_HIDDEN_COL, '숨김', '숨겼습니다. 사이트에서 즉시 사라집니다.');
}
function showSelectedGuestbook() {
  setSelected_(GUESTBOOK_SHEET, GUESTBOOK_HIDDEN_COL, '', '다시 표시합니다.');
}

/* ------------------------------------------------------------ 진단 */

/** 관리자 키로만 호출된다. 어떤 시트에 무엇이 저장되어 있는지 한 번에 확인하기 위한 정보. */
function health_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var target = book.getSheetByName(VISIT_SHEET);
  var info = {
    version: CODE_VERSION,
    apiLevel: API_LEVEL,
    spreadsheet: { name: book.getName(), url: book.getUrl() },
    webAppUrl: webAppUrl_(),
    tabs: book.getSheets().map(function (sheet) {
      return { name: sheet.getName(), rows: sheet.getLastRow(), columns: sheet.getLastColumn() };
    }),
  };
  if (target) {
    var lastColumn = Math.max(1, target.getLastColumn());
    var header = target.getRange(1, 1, 1, lastColumn).getValues()[0];
    var col = columns_([header]);
    var list = readVisits_();
    var last = list[list.length - 1];
    info.visitSheet = {
      headerOk: String(header[0]) === VISIT_HEADERS[0],
      missingColumns: VISIT_HEADERS.filter(function (name) { return col[name] === undefined; }),
      reservations: list.length,
      withToken: list.filter(function (item) { return item._token; }).length,
      last: last ? { row: last._row, id: last.id.slice(0, 8), hasToken: Boolean(last._token), status: last.status, date: last.date } : null,
    };
  }
  return info;
}

/* ------------------------------------------------------------ 엔드포인트 */

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';

    if (action === 'version') return jsonOutput_({ version: CODE_VERSION, apiLevel: API_LEVEL });

    // 예약 화면: 방명록 없이 일정만 (캐시)
    if (action === 'schedule') {
      var schedule = cachedSchedule_();
      return jsonOutput_({ busy: schedule.busy, closedDays: schedule.closedDays });
    }

    if (action === 'confirm' || action === 'cancel') {
      // 예전 메일의 승인/거절 링크. 링크만으로 상태를 바꾸지 않고(자동 승인 방지) 관리자 페이지로 안내한다.
      var token = String(e.parameter.token || '').trim();
      var id = String(e.parameter.id || '').trim();
      var found = id
        ? findVisit_(function (item) { return item.id === id; })
        : token ? findVisit_(function (item) { return item._token === token; }) : null;
      var target = found ? reviewUrl_(found.id) : ADMIN_URL;
      return resultPage_('관리자 페이지에서 처리해 주세요',
        '보안을 위해 메일 링크로는 바로 승인 · 거절되지 않습니다.<br>'
        + '아래 버튼으로 관리자 페이지에서 예약을 확인하고 처리해 주세요.<br><br>'
        + button_(target, found ? '이 예약 열기' : '관리자 페이지 열기', true));
    }

    var blocked = cachedSchedule_();
    return jsonOutput_({
      entries: readGuestbook_(),
      busy: blocked.busy,
      closedDays: blocked.closedDays,
    });
  } catch (error) {
    return jsonOutput_({ error: String(error.message || error) });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.type === 'reservation') return jsonOutput_(addReservation_(payload));
    if (payload.type === 'guestbook') return jsonOutput_(addGuestbook_(payload));
    if (payload.type === 'admin') return jsonOutput_(admin_(payload));
    throw new Error('알 수 없는 요청입니다.');
  } catch (error) {
    return jsonOutput_({ error: String(error.message || error) });
  }
}
