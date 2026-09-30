/**
 * TDL Lab — 방문 예약 / 방명록 백엔드 (Google Apps Script 웹앱)
 *
 * 사이트는 GitHub Pages 정적 호스팅이라 서버가 없습니다. 이 스크립트를 웹앱으로
 * 배포하면 발급되는 URL 하나만 사이트에 넣으면 되고, 토큰이나 API 키를 사이트
 * 코드에 두지 않습니다.
 *
 *   GET  ?                      → 방명록(마스킹된 값) + 예약 불가 구간 반환
 *   GET  ?action=confirm&token= → 예약 승인 (메일의 버튼에서 호출)
 *   GET  ?action=cancel&token=  → 예약 거절 (메일의 버튼에서 호출)
 *   POST                        → { type: 'guestbook' | 'reservation' | 'admin', ... }
 *
 * 방명록의 실명·실제 소속과 예약자의 연락처는 시트에만 남고 공개 GET 으로는
 * 나가지 않습니다. 관리자 대시보드(/admin/)는 ADMIN_KEY 스크립트 속성과 같은
 * 키를 보내야 예약 목록을 볼 수 있습니다.
 */

var MAIL_TO = 'daehyun.kim1@lxpantos.com';
var SITE_URL = 'https://songwri.github.io/Tech-Driven-Logistics/';
var ADMIN_URL = SITE_URL + 'admin/';

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
    slots: ['10:00-11:00', '11:00-12:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'],
  },
  lab: { label: 'TDL Lab 투어', slots: ['10:30-11:30', '14:00-15:00'] },
};

var STATUS_TEXT = { pending: '대기', approved: '승인', rejected: '거절' };
var PURPOSES = ['기존 고객사 Lock-in', '신규 영업', '교육', '투어'];

var BRAND = '#a72b2b';

var GUESTBOOK_HEADERS = [
  'id', 'createdAt', '표시이름', '표시소속', '직함', '평가', '메시지', '실명', '실제소속', '숨김',
];
var VISIT_HEADERS = [
  'id', '신청일시', '상태', '투어', '방문일', '시간', '방문구분', '고객구분', '업체명', '업종',
  '방문목적', '담당자', '담당자직책', '담당자조직', '담당자연락처', '담당자이메일', '담당자의견',
  '방문인원', '방문자명단', '요청사항', '개인정보동의', '관리자메모', '토큰', '수정일시', '방문자JSON',
  '투어언어', '외국어', '통역동반',
];
var BLOCKED_HEADERS = ['날짜', '시간대(비우면 종일)', '사유'];

var GUESTBOOK_HIDDEN_COL = 10; // 1-based

/* ------------------------------------------------------------------ 공통 */

function sheet_(name, headers) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
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

function readGuestbook_() {
  var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
  var values = target.getDataRange().getValues();
  var entries = [];

  for (var row = 1; row < values.length; row++) {
    if (!values[row][0]) continue;
    // '숨김' 열에 값이 있으면(체크박스 TRUE, 'Y', '숨김' 등) 사이트에 내보내지 않는다.
    var hidden = String(values[row][GUESTBOOK_HIDDEN_COL - 1] == null ? '' : values[row][GUESTBOOK_HIDDEN_COL - 1]).trim();
    if (hidden && hidden.toLowerCase() !== 'false') continue;

    entries.push({
      id: String(values[row][0]),
      createdAt: new Date(values[row][1]).toISOString(),
      name: String(values[row][2]),
      company: String(values[row][3]),
      role: String(values[row][4]),
      rating: Number(values[row][5]),
      message: String(values[row][6]),
    });
  }

  return entries.reverse();
}

function addGuestbook_(payload) {
  var name = requireText_(payload.name, '이름', 40);
  var company = requireText_(payload.company, '소속', 60);
  var role = requireText_(payload.role, '직함', 60);
  var message = requireText_(payload.message, '메시지', MESSAGE_LIMIT);
  var rating = Number(payload.rating);
  if (!(rating >= 1 && rating <= 5)) throw new Error('평가는 1~5점 사이여야 합니다.');

  var entry = {
    id: Utilities.getUuid(),
    createdAt: new Date().toISOString(),
    name: maskName_(name),
    company: maskToken_(company),
    role: role,
    rating: rating,
    message: message,
  };

  sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS).appendRow([
    entry.id, entry.createdAt, entry.name, entry.company,
    entry.role, entry.rating, entry.message, name, company, '',
  ]);

  MailApp.sendEmail({
    to: MAIL_TO,
    subject: '[TDL Lab] 방명록 등록 · ' + name + ' (' + company + ')',
    htmlBody: guestbookMailHtml_(name, company, role, rating, message, entry.createdAt),
  });

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

/** 투어 한 건이 점유하는 공간·시간 구간 */
function segmentsOf_(tour, date, slot) {
  var range = String(slot).split('-');
  if (tour === 'combined') {
    var handoff = fromMinutes_(toMinutes_(range[0]) + 60);
    return [
      { date: date, resource: 'center', from: range[0], to: handoff },
      { date: date, resource: 'lab', from: handoff, to: range[1] },
    ];
  }
  return [{ date: date, resource: tour, from: range[0], to: range[1] }];
}

function overlaps_(a, b) {
  if (a.date !== b.date) return false;
  if (a.resource !== 'all' && b.resource !== 'all' && a.resource !== b.resource) return false;
  return toMinutes_(a.from) < toMinutes_(b.to) && toMinutes_(b.from) < toMinutes_(a.to);
}

function isBusy_(tour, date, slot, busy) {
  var wanted = segmentsOf_(tour, date, slot);
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
  if (text === '거절' || text === '취소' || text === 'rejected') return 'rejected';
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
    target.insertRowBefore(1);
    target.getRange(1, 1, 1, VISIT_HEADERS.length).setValues([VISIT_HEADERS]);
    target.setFrozenRows(1);
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
    clientType: category === 'external' ? (clientText.indexOf('신규') !== -1 ? 'new' : 'existing') : undefined,
    language: foreign ? 'foreign' : 'ko',
    foreignLanguage: foreign ? String(get('외국어')) : '',
    interpreter: foreign && String(get('통역동반')).trim() === '동반',
    company: String(get('업체명')),
    industries: splitList_(get('업종')),
    purposes: splitList_(get('방문목적')),
    host: {
      name: String(get('담당자')),
      title: String(get('담당자직책')),
      org: String(get('담당자조직')),
      phone: String(get('담당자연락처')),
      email: String(get('담당자이메일')),
    },
    hostComment: String(get('담당자의견')),
    visitors: visitors,
    note: String(get('요청사항')),
    consent: String(get('개인정보동의')).trim() !== '',
    adminMemo: String(get('관리자메모')),
  };
}

/** '09:30-11:30' 형태로 정리 (시트가 시간을 Date 로 바꿔 놓은 경우 대비) */
function normalizeSlot_(value) {
  if (value instanceof Date) return normalizeTime_(value);
  return String(value == null ? '' : value).replace(/\s/g, '').replace('–', '-');
}

function readVisits_() {
  var values = visitSheet_().getDataRange().getValues();
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
  var copy = JSON.parse(JSON.stringify(request));
  delete copy._row;
  delete copy._token;
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
  var set = function (name, value) { if (col[name] !== undefined) values[col[name]] = value; };

  set('id', request.id);
  set('상태', STATUS_TEXT[request.status] || '대기');
  set('투어', TOURS[request.tour].label);
  set('방문일', request.date);
  set('시간', request.slot);
  set('방문구분', request.category === 'internal' ? '내부 방문' : '고객 방문');
  set('고객구분', request.category === 'internal' ? '' : (request.clientType === 'new' ? '신규 고객사' : '기존 고객사'));
  set('투어언어', request.language === 'foreign' ? '외국어' : '한국어');
  set('외국어', request.language === 'foreign' ? request.foreignLanguage : '');
  set('통역동반', request.language === 'foreign' ? (request.interpreter ? '동반' : '없음') : '');
  set('업체명', request.company);
  set('업종', request.industries.join(', '));
  set('방문목적', request.purposes.join(', '));
  set('담당자', request.host.name);
  set('담당자직책', request.host.title);
  set('담당자조직', request.host.org);
  set('담당자연락처', request.host.phone);
  set('담당자이메일', request.host.email);
  set('담당자의견', request.hostComment);
  set('방문인원', request.visitors.length);
  set('방문자명단', visitorsText_(request.visitors));
  set('요청사항', request.note);
  set('관리자메모', request.adminMemo || '');
  set('수정일시', new Date().toISOString());
  set('방문자JSON', JSON.stringify(request.visitors));
  for (var key in (extra || {})) set(key, extra[key]);

  // 날짜·시간·연락처가 숫자/날짜로 자동 변환되지 않도록 텍스트 서식으로 기록한다.
  var range = target.getRange(rowNumber, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values]);
}

/** 승인된 예약과 blocked 시트에서 '신청 불가' 구간을 만든다. */
function busy_(excludeId) {
  // 지난 날짜는 신청·승인 판단에 쓰이지 않으므로 빼서 응답을 가볍게 유지한다.
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var busy = [];
  readVisits_().forEach(function (request) {
    if (request.status !== 'approved' || request.id === excludeId || request.date < today) return;
    busy = busy.concat(segmentsOf_(request.tour, request.date, request.slot));
  });

  var closedDays = {};
  var blocked = sheet_(BLOCKED_SHEET, BLOCKED_HEADERS).getDataRange().getValues();
  for (var b = 1; b < blocked.length; b++) {
    var date = normalizeDateKey_(blocked[b][0]);
    if (!date || date < today) continue;
    var time = normalizeSlot_(blocked[b][1]);
    if (!time) {
      closedDays[date] = true;
      continue;
    }
    var range = time.split('-');
    var to = range[1] || fromMinutes_(toMinutes_(range[0]) + 60);
    busy.push({ date: date, resource: 'all', from: range[0], to: to });
  }
  return { busy: busy, closedDays: Object.keys(closedDays) };
}

function optionalText_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

/** 예약 화면/관리자 수정 공통 검증. 깨끗한 요청 객체를 돌려준다. */
function sanitizeVisit_(payload, requireConsent) {
  var tour = String(payload.tour || '');
  if (!TOURS[tour]) throw new Error('투어 종류를 선택해 주세요.');
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
  var purposes = (payload.purposes || []).map(function (item) { return optionalText_(item, 50).replace(/,/g, ' '); })
    .filter(function (item) { return item; });
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
    interpreter: language === 'foreign' && payload.interpreter === true,
    company: requireText_(payload.company, category === 'external' ? '업체명' : '방문 조직명', 60),
    industries: category === 'external' ? industries : [],
    purposes: purposes,
    host: {
      name: requireText_(host.name, '담당자 성함', 40),
      title: requireText_(host.title, '담당자 직책', 40),
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

  // 승인된 일정과 겹치지 않는지 서버에서 한 번 더 확인한다.
  var blocked = busy_();
  if (blocked.closedDays.indexOf(request.date) !== -1 || isBusy_(request.tour, request.date, request.slot, blocked.busy)) {
    throw new Error('이미 확정된 일정과 겹쳐 신청할 수 없습니다. 다른 날짜나 시간을 선택해 주세요.');
  }

  request.id = Utilities.getUuid();
  request.status = 'pending';
  request.adminMemo = '';
  var token = Utilities.getUuid();
  var now = new Date().toISOString();

  // 내용 없는 행은 appendRow 로 추가되지 않으므로, 쓸 행 번호를 직접 계산한다.
  var target = visitSheet_();
  var rowNumber = target.getLastRow() + 1;
  if (rowNumber > target.getMaxRows()) target.insertRowsAfter(target.getMaxRows(), 1);
  writeVisit_(rowNumber, request, { '신청일시': now, '토큰': token, '개인정보동의': now });

  // 저장이 실제로 됐는지 확인한다. 실패했는데 메일만 나가는 일이 없도록.
  SpreadsheetApp.flush();
  var idColumn = columns_(target.getRange(1, 1, 1, target.getLastColumn()).getValues())['id'];
  if (idColumn === undefined || String(target.getRange(rowNumber, idColumn + 1).getValue()) !== request.id) {
    throw new Error('예약 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }

  MailApp.sendEmail({
    to: MAIL_TO,
    replyTo: request.host.email,
    subject: '[TDL Lab] 방문 예약 신청 · ' + TOURS[request.tour].label + ' · ' + request.company + ' · '
      + request.date + ' ' + request.slot,
    htmlBody: reservationMailHtml_(request, token),
  });

  return { ok: true };
}

/**
 * 상태 변경. 승인은 다른 승인 건과 겹치면 거부한다.
 * 상태가 실제로 바뀌면 신청 담당자에게 결과 메일을 보낸다.
 */
function changeStatus_(request, status) {
  if (status === 'approved' && isBusy_(request.tour, request.date, request.slot, busy_(request.id).busy)) {
    throw new Error('이미 승인된 다른 예약과 시간이 겹쳐 승인할 수 없습니다.');
  }
  var previous = request.status;
  request.status = status;
  writeVisit_(request._row, request);
  if (previous !== status && status !== 'pending') notifyHost_(request);
  return request;
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

  if (payload.action === 'list') {
    return { requests: readVisits_().map(publicRequest_) };
  }

  var request = findVisit_(function (item) { return item.id === String(payload.id); });
  if (!request) throw new Error('예약을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.');

  if (payload.action === 'setStatus') {
    var status = String(payload.status);
    if (!STATUS_TEXT[status]) throw new Error('알 수 없는 상태입니다.');
    return { request: publicRequest_(changeStatus_(request, status)) };
  }

  if (payload.action === 'update') {
    var next = sanitizeVisit_(payload.request || {}, false);
    next.id = request.id;
    next.status = request.status;
    next.createdAt = request.createdAt;
    next.adminMemo = optionalText_((payload.request || {}).adminMemo, 500);
    next._row = request._row;
    if (next.status === 'approved' && isBusy_(next.tour, next.date, next.slot, busy_(next.id).busy)) {
      throw new Error('변경한 일정이 이미 승인된 다른 예약과 겹칩니다.');
    }
    writeVisit_(next._row, next);
    return { request: publicRequest_(next) };
  }

  throw new Error('알 수 없는 관리자 요청입니다.');
}

/* ----------------------------------------------------------- 메일 서식 */

function mailShell_(title, lead, bodyHtml) {
  return [
    '<div style="margin:0;padding:24px 12px;background:#f3f2f1;',
    'font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',Helvetica,Arial,sans-serif;">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;',
    'border:1px solid #e3e0de;">',
    '<div style="background:', BRAND, ';padding:20px 28px;">',
    '<div style="color:#ffffff;font-size:11px;letter-spacing:3px;">TDL LAB</div>',
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
  if (r.language !== 'foreign') return '한국어';
  var name = String(r.foreignLanguage).replace(/^기타:\s*/, '') || '외국어';
  return '<b style="color:' + BRAND + ';">' + escapeHtml_(name) + '</b> · '
    + (r.interpreter ? '고객사 통역 동반' : '통역 없음 (해당 언어 안내 인력 필요)');
}

function listOrNone_(items) {
  return items && items.length ? escapeHtml_(items.join(', ')) : '<span style="color:#aca8a7;">없음</span>';
}

function textOrNone_(value) {
  return value ? escapeHtml_(value) : '<span style="color:#aca8a7;">없음</span>';
}

function scheduleBox_(r) {
  return [
    '<div style="border:1px solid #e3e0de;border-left:3px solid ', BRAND, ';',
    'background:#faf9f8;padding:16px 18px;margin-bottom:24px;">',
    '<div style="font-size:11px;letter-spacing:2px;color:#aca8a7;">',
    escapeHtml_(TOURS[r.tour].label), '</div>',
    '<div style="font-size:17px;font-weight:700;color:#3d3532;margin-top:6px;">',
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

function reservationMailHtml_(r, token) {
  var base = ScriptApp.getService().getUrl();
  var confirm = base + '?action=confirm&token=' + encodeURIComponent(token);
  var cancel = base + '?action=cancel&token=' + encodeURIComponent(token);

  var lead = [
    '안녕하세요, TDL Lab 담당자님.<br>',
    '<b style="color:#3d3532;">', escapeHtml_(r.host.org), ' ', escapeHtml_(r.host.name), ' ',
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
    ['담당자', escapeHtml_(r.host.name + ' ' + r.host.title + ' · ' + r.host.org)],
    ['연락처', '<a href="tel:' + escapeHtml_(r.host.phone) + '" style="color:#3d3532;">'
      + escapeHtml_(r.host.phone) + '</a>'],
    ['이메일', '<a href="mailto:' + escapeHtml_(r.host.email) + '" style="color:#3d3532;">'
      + escapeHtml_(r.host.email) + '</a>'],
    ['담당자 의견', textOrNone_(r.hostComment)],
    ['요청사항', textOrNone_(r.note)],
  ]);

  var actions = [
    '<div style="margin-top:26px;">',
    button_(confirm, '이 일정으로 승인하기', true),
    '&nbsp;&nbsp;',
    button_(cancel, '거절', false),
    '&nbsp;&nbsp;',
    button_(ADMIN_URL, '관리자 대시보드', false),
    '</div>',
    '<p style="margin:14px 0 0;font-size:12px;color:#aca8a7;line-height:1.7;">',
    '승인하면 해당 시간대는 예약 화면에서 자동으로 선택 불가 처리되고, 신청 담당자에게 확정 메일이 발송됩니다.<br>',
    '이 메일에 그대로 <b>회신</b>하시면 신청 담당자에게 바로 답장이 갑니다.',
    '</p>',
  ].join('');

  return mailShell_('방문 예약 신청', lead, scheduleBox_(r) + detail
    + '<div style="margin-top:20px;font-size:12px;color:#aca8a7;">방문자 명단</div>'
    + visitorsTable_(r.visitors) + actions);
}

/** 승인/거절 결과를 신청 담당자에게 알린다. */
function notifyHost_(r) {
  if (!r.host.email) return;
  var approved = r.status === 'approved';
  var lead = approved
    ? escapeHtml_(r.host.name) + ' 님, 신청하신 TDL 방문 일정이 <b style="color:' + BRAND + ';">확정</b>되었습니다.<br>'
      + '방문 당일 안내 데스크에서 담당자를 찾아 주세요.'
    : escapeHtml_(r.host.name) + ' 님, 아쉽지만 신청하신 일정으로는 방문이 어렵습니다.<br>'
      + '다른 날짜로 다시 신청해 주시거나, 이 메일에 회신해 일정을 조율해 주세요.';
  MailApp.sendEmail({
    to: r.host.email,
    replyTo: MAIL_TO,
    subject: '[TDL Lab] 방문 예약 ' + (approved ? '확정' : '불가') + ' 안내 · ' + r.date + ' ' + r.slot,
    htmlBody: mailShell_(approved ? '방문 일정 확정' : '방문 예약 결과 안내', lead, scheduleBox_(r) + rows_([
      [r.category === 'internal' ? '방문 조직' : '업체명', escapeHtml_(r.company)],
      ['투어 언어', languageText_(r)],
      ['방문 인원', r.visitors.length + '명'],
    ])),
  });
}

function guestbookMailHtml_(name, company, role, rating, message, createdAt) {
  var lead = [
    '안녕하세요, TDL Lab 담당자님.<br>',
    '<b style="color:#3d3532;">', escapeHtml_(company), ' ', escapeHtml_(name),
    '</b> 님이 방명록을 남기셨습니다.',
  ].join('');

  var stars = '';
  for (var i = 1; i <= 5; i++) {
    stars += '<span style="color:' + (i <= rating ? BRAND : '#ddd9d7') + ';font-size:16px;">★</span>';
  }

  var detail = rows_([
    ['이름', escapeHtml_(name)],
    ['소속', escapeHtml_(company)],
    ['직함', escapeHtml_(role)],
    ['평가', stars + ' <span style="color:#aca8a7;font-size:12px;">' + rating + ' / 5</span>'],
    ['메시지', escapeHtml_(message)],
    ['등록일시', escapeHtml_(formatDateTimeKo_(createdAt))],
  ]);

  var hint = [
    '<p style="margin:22px 0 0;font-size:12px;color:#aca8a7;line-height:1.7;">',
    '사이트에는 <b>', escapeHtml_(maskName_(name)), ' · ', escapeHtml_(maskToken_(company)),
    '</b> 로 마스킹되어 표시됩니다.<br>',
    '내려야 할 내용이면 스프레드시트 <b>guestbook</b> 시트에서 해당 행의 ',
    '<b>숨김</b> 열에 체크하거나, 행을 그대로 삭제하시면 사이트에서 사라집니다.',
    '</p>',
  ].join('');

  return mailShell_('방명록 등록', lead, detail + hint);
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

/* ------------------------------------------------------------ 엔드포인트 */

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';

    if (action === 'confirm' || action === 'cancel') {
      var token = String(e.parameter.token || '').trim();
      var request = token ? findVisit_(function (item) { return item._token === token; }) : null;
      if (!request) {
        return resultPage_('예약을 찾을 수 없습니다',
          '이미 삭제되었거나 링크가 잘못되었습니다.<br>관리자 대시보드에서 직접 확인해 주세요.', 'error');
      }
      var schedule = '<b>' + escapeHtml_(TOURS[request.tour].label) + '<br>'
        + escapeHtml_(formatDateKo_(request.date)) + ' ' + escapeHtml_(request.slot) + '</b><br>'
        + escapeHtml_(request.company) + ' · ' + escapeHtml_(request.host.name) + ' 님<br><br>';
      try {
        changeStatus_(request, action === 'confirm' ? 'approved' : 'rejected');
      } catch (conflict) {
        return resultPage_('승인할 수 없습니다', schedule + escapeHtml_(conflict.message), 'error');
      }
      if (action === 'confirm') {
        return resultPage_('예약을 승인했습니다', schedule
          + '이 시간대는 이제 예약 화면에서 선택할 수 없습니다.<br>'
          + '<b>' + escapeHtml_(request.host.email) + '</b> 로 확정 안내 메일을 보냈습니다.');
      }
      return resultPage_('예약을 거절했습니다', schedule + '신청 담당자에게 결과 안내 메일을 보냈습니다.');
    }

    var blocked = busy_();
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
