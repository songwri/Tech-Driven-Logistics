/**
 * TDL Lab — 예약 / 방명록 백엔드 (Google Apps Script 웹앱)
 *
 * 사이트는 GitHub Pages 정적 호스팅이라 서버가 없습니다. 이 스크립트를 웹앱으로
 * 배포하면 발급되는 URL 하나만 사이트에 넣으면 되고, 토큰이나 API 키를 사이트
 * 코드에 두지 않습니다.
 *
 *   GET  ?                      → 방명록(마스킹된 값) + 예약 불가 슬롯 반환
 *   GET  ?action=confirm&token= → 예약 확정 (메일의 버튼에서 호출)
 *   GET  ?action=cancel&token=  → 예약 취소 (메일의 버튼에서 호출)
 *   POST                        → { type: 'guestbook' | 'reservation', ... }
 *
 * 방명록의 실명·실제 소속과 예약자의 연락처는 시트에만 남고 사이트로는 나가지
 * 않습니다. 시트 자체가 관리자 화면 역할을 합니다.
 */

var MAIL_TO = 'daehyun.kim1@lxpantos.com';
var SITE_URL = 'https://songwri.github.io/Tech-Driven-Logistics/';

var GUESTBOOK_SHEET = 'guestbook';
var RESERVATION_SHEET = 'reservations';
var BLOCKED_SHEET = 'blocked';
var MESSAGE_LIMIT = 100;

var TIME_SLOTS = ['10:00', '14:00'];
var OPEN_WEEKDAYS = [1, 3, 5]; // 월·수·금

/**
 * 예약을 확정하면 그 날짜를 통째로 막을지, 확정된 시간대만 막을지.
 * true  → 10:00을 확정하면 같은 날 14:00도 신청 불가
 * false → 확정된 시간대만 불가 (기본값)
 */
var BLOCK_WHOLE_DAY = false;

var BRAND = '#a72b2b';

var GUESTBOOK_HEADERS = [
  'id', 'createdAt', '표시이름', '표시소속', '직함', '평가', '메시지', '실명', '실제소속', '숨김',
];
var RESERVATION_HEADERS = [
  'createdAt', '방문희망일', '시간대', '회사명', '인원', '투어대표자', '연락처', '이메일',
  '방문차량', '요청사항', '상태', '토큰',
];
var BLOCKED_HEADERS = ['날짜', '시간대(비우면 종일)', '사유'];

var GUESTBOOK_HIDDEN_COL = 10; // 1-based
var RESERVATION_STATUS_COL = 11;
var RESERVATION_TOKEN_COL = 12;

/* ------------------------------------------------------------------ 공통 */

function sheet_(name, headers) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var target = book.getSheetByName(name);
  if (!target) {
    target = book.insertSheet(name);
    target.appendRow(headers);
    target.setFrozenRows(1);
  } else if (target.getLastColumn() < headers.length) {
    // 이전 버전 시트에 새 열이 생긴 경우 헤더를 보강한다.
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

/* ---------------------------------------------------------------- 예약 */

/** 확정된 예약과 관리자가 지정한 휴무일에서 '신청 불가' 목록을 만든다. */
function blockedSlots_() {
  var slots = {};
  var days = {};

  var reservations = sheet_(RESERVATION_SHEET, RESERVATION_HEADERS).getDataRange().getValues();
  for (var row = 1; row < reservations.length; row++) {
    if (String(reservations[row][RESERVATION_STATUS_COL - 1]).trim() !== '확정') continue;
    var date = normalizeDateKey_(reservations[row][1]);
    var time = normalizeTime_(reservations[row][2]);
    if (!date) continue;
    if (BLOCK_WHOLE_DAY) days[date] = true;
    else slots[date + ' ' + time] = true;
  }

  var blocked = sheet_(BLOCKED_SHEET, BLOCKED_HEADERS).getDataRange().getValues();
  for (var b = 1; b < blocked.length; b++) {
    var blockedDate = normalizeDateKey_(blocked[b][0]);
    if (!blockedDate) continue;
    var blockedTime = normalizeTime_(blocked[b][1]);
    if (blockedTime) slots[blockedDate + ' ' + blockedTime] = true;
    else days[blockedDate] = true;
  }

  // 두 시간대가 모두 막힌 날은 날짜 자체를 선택하지 못하게 한다.
  var byDate = {};
  Object.keys(slots).forEach(function (key) {
    var date = key.slice(0, 10);
    byDate[date] = (byDate[date] || 0) + 1;
  });
  Object.keys(byDate).forEach(function (date) {
    if (byDate[date] >= TIME_SLOTS.length) days[date] = true;
  });

  return { slots: Object.keys(slots), days: Object.keys(days) };
}

function addReservation_(payload) {
  var date = requireText_(payload.date, '방문 희망일', 10);
  var time = requireText_(payload.time, '방문 시간대', 10);
  var company = requireText_(payload.company, '회사명', 60);
  var leadName = requireText_(payload.leadName, '투어 대표자', 40);
  var phone = requireText_(payload.phone, '연락처', 30);
  var email = requireText_(payload.email, '이메일', 120);
  var vehicles = String(payload.vehicles == null ? '' : payload.vehicles).trim().slice(0, 200);
  var note = String(payload.note == null ? '' : payload.note).trim().slice(0, 300);
  var headcount = Number(payload.headcount);
  if (!(headcount >= 1 && headcount <= 50)) {
    throw new Error('방문 인원은 1~50명 사이로 입력해 주세요.');
  }

  // 월(1)·수(3)·금(5), 10:00 / 14:00 운영
  var weekday = new Date(date + 'T00:00:00').getDay();
  if (OPEN_WEEKDAYS.indexOf(weekday) === -1) {
    throw new Error('방문은 월·수·금만 가능합니다.');
  }
  if (TIME_SLOTS.indexOf(time) === -1) {
    throw new Error('방문 시간대는 10:00 또는 14:00만 선택할 수 있습니다.');
  }

  // 확정된 일정과 겹치지 않는지 서버에서 한 번 더 확인한다.
  var blocked = blockedSlots_();
  if (blocked.days.indexOf(date) !== -1 || blocked.slots.indexOf(date + ' ' + time) !== -1) {
    throw new Error('이미 확정된 일정이라 신청할 수 없습니다. 다른 날짜나 시간대를 선택해 주세요.');
  }

  var token = Utilities.getUuid();
  sheet_(RESERVATION_SHEET, RESERVATION_HEADERS).appendRow([
    new Date().toISOString(), date, time, company, headcount, leadName, phone, email,
    vehicles, note, '대기', token,
  ]);

  MailApp.sendEmail({
    to: MAIL_TO,
    replyTo: email,
    subject: '[TDL Lab] 방문 예약 신청 · ' + company + ' · ' + date + ' ' + time,
    htmlBody: reservationMailHtml_({
      date: date, time: time, company: company, headcount: headcount, leadName: leadName,
      phone: phone, email: email, vehicles: vehicles, note: note, token: token,
    }),
  });

  return { ok: true };
}

/** 메일의 확정/취소 버튼이 호출한다. */
function setReservationStatus_(token, status) {
  var target = sheet_(RESERVATION_SHEET, RESERVATION_HEADERS);
  var values = target.getDataRange().getValues();
  for (var row = 1; row < values.length; row++) {
    if (String(values[row][RESERVATION_TOKEN_COL - 1]).trim() !== String(token).trim()) continue;
    var previous = String(values[row][RESERVATION_STATUS_COL - 1]).trim();
    target.getRange(row + 1, RESERVATION_STATUS_COL).setValue(status);
    return {
      status: status,
      previous: previous,
      date: normalizeDateKey_(values[row][1]),
      time: normalizeTime_(values[row][2]),
      company: String(values[row][3]),
      leadName: String(values[row][5]),
      email: String(values[row][7]),
    };
  }
  return null;
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

function reservationMailHtml_(r) {
  var base = ScriptApp.getService().getUrl();
  var confirm = base + '?action=confirm&token=' + encodeURIComponent(r.token);
  var cancel = base + '?action=cancel&token=' + encodeURIComponent(r.token);

  var lead = [
    '안녕하세요, TDL Lab 담당자님.<br>',
    '<b style="color:#3d3532;">', escapeHtml_(r.company), ' ', escapeHtml_(r.leadName),
    '</b> 님으로부터 방문 예약이 도착하였습니다.<br>',
    '아래 내용을 확인하시고 일정을 확정해 주시기 바랍니다.',
  ].join('');

  var highlight = [
    '<div style="border:1px solid #e3e0de;border-left:3px solid ', BRAND, ';',
    'background:#faf9f8;padding:16px 18px;margin-bottom:24px;">',
    '<div style="font-size:11px;letter-spacing:2px;color:#aca8a7;">VISIT SCHEDULE</div>',
    '<div style="font-size:17px;font-weight:700;color:#3d3532;margin-top:6px;">',
    escapeHtml_(formatDateKo_(r.date)), ' &nbsp;', escapeHtml_(r.time),
    '</div></div>',
  ].join('');

  var detail = rows_([
    ['회사명', escapeHtml_(r.company)],
    ['방문 인원', escapeHtml_(r.headcount) + '명'],
    ['투어 대표자', escapeHtml_(r.leadName)],
    ['연락처', '<a href="tel:' + escapeHtml_(r.phone) + '" style="color:#3d3532;">'
      + escapeHtml_(r.phone) + '</a>'],
    ['이메일', '<a href="mailto:' + escapeHtml_(r.email) + '" style="color:#3d3532;">'
      + escapeHtml_(r.email) + '</a>'],
    ['방문 차량', r.vehicles ? escapeHtml_(r.vehicles) : '<span style="color:#aca8a7;">없음</span>'],
    ['요청사항', r.note ? escapeHtml_(r.note) : '<span style="color:#aca8a7;">없음</span>'],
  ]);

  var actions = [
    '<div style="margin-top:26px;">',
    button_(confirm, '이 일정으로 확정하기', true),
    '&nbsp;&nbsp;',
    button_(cancel, '예약 취소', false),
    '</div>',
    '<p style="margin:14px 0 0;font-size:12px;color:#aca8a7;line-height:1.7;">',
    '확정하시면 해당 시간대는 예약 화면에서 자동으로 선택 불가 처리됩니다.<br>',
    '이 메일에 그대로 <b>회신</b>하시면 신청자에게 바로 답장이 갑니다.',
    '</p>',
  ].join('');

  return mailShell_('방문 예약 신청', lead, highlight + detail + actions);
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
    .addSeparator()
    .addItem('선택한 예약 확정', 'confirmSelectedReservation')
    .addItem('선택한 예약 취소', 'cancelSelectedReservation')
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
function confirmSelectedReservation() {
  setSelected_(RESERVATION_SHEET, RESERVATION_STATUS_COL, '확정', '확정했습니다. 해당 시간대는 예약 화면에서 막힙니다.');
}
function cancelSelectedReservation() {
  setSelected_(RESERVATION_SHEET, RESERVATION_STATUS_COL, '취소', '취소했습니다. 해당 시간대가 다시 열립니다.');
}

/* ------------------------------------------------------------ 엔드포인트 */

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';

    if (action === 'confirm' || action === 'cancel') {
      var status = action === 'confirm' ? '확정' : '취소';
      var result = setReservationStatus_(e.parameter.token, status);
      if (!result) {
        return resultPage_('예약을 찾을 수 없습니다',
          '이미 삭제되었거나 링크가 잘못되었습니다.<br>스프레드시트에서 직접 확인해 주세요.', 'error');
      }
      if (action === 'confirm') {
        return resultPage_('예약을 확정했습니다',
          '<b>' + escapeHtml_(formatDateKo_(result.date)) + ' ' + escapeHtml_(result.time) + '</b><br>'
          + escapeHtml_(result.company) + ' · ' + escapeHtml_(result.leadName) + ' 님<br><br>'
          + '이제 이 시간대는 예약 화면에서 선택할 수 없습니다.<br>'
          + '신청자에게는 <b>' + escapeHtml_(result.email) + '</b> 로 안내해 주세요.');
      }
      return resultPage_('예약을 취소했습니다',
        '<b>' + escapeHtml_(formatDateKo_(result.date)) + ' ' + escapeHtml_(result.time) + '</b><br>'
        + '해당 시간대는 다시 신청 가능한 상태가 됩니다.');
    }

    var blocked = blockedSlots_();
    return jsonOutput_({
      entries: readGuestbook_(),
      blockedSlots: blocked.slots,
      blockedDays: blocked.days,
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
    throw new Error('알 수 없는 요청입니다.');
  } catch (error) {
    return jsonOutput_({ error: String(error.message || error) });
  }
}
