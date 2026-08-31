/**
 * TDL Lab — 예약 / 방명록 백엔드 (Google Apps Script 웹앱)
 *
 * 사이트는 GitHub Pages 정적 호스팅이라 서버가 없습니다. 이 스크립트를 웹앱으로
 * 배포하면 발급되는 URL 하나만 사이트에 넣으면 되고, 토큰이나 API 키를 사이트
 * 코드에 두지 않습니다.
 *
 *   GET  ?  → 공개용 방명록 목록(마스킹된 값만) 반환
 *   POST ?  → { type: 'guestbook' | 'reservation', ... }
 *
 * 방명록의 실명·실제 소속과 예약자의 연락처는 시트에만 남고 사이트로는 나가지
 * 않습니다. 시트 자체가 관리자 화면 역할을 합니다.
 */

var MAIL_TO = 'daehyun.kim1@lxpantos.com';
var GUESTBOOK_SHEET = 'guestbook';
var RESERVATION_SHEET = 'reservations';
var MESSAGE_LIMIT = 100;

var GUESTBOOK_HEADERS = [
  'id', 'createdAt', '표시이름', '표시소속', '직함', '평가', '메시지', '실명', '실제소속',
];
var RESERVATION_HEADERS = [
  'createdAt', '방문희망일', '회사명', '인원', '투어대표자', '연락처', '이메일', '요청사항',
];

function sheet_(name, headers) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var target = book.getSheetByName(name);
  if (!target) {
    target = book.insertSheet(name);
    target.appendRow(headers);
    target.setFrozenRows(1);
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

function readGuestbook_() {
  var target = sheet_(GUESTBOOK_SHEET, GUESTBOOK_HEADERS);
  var values = target.getDataRange().getValues();
  var entries = [];

  for (var row = 1; row < values.length; row++) {
    if (!values[row][0]) continue;
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
    entry.role, entry.rating, entry.message, name, company,
  ]);

  MailApp.sendEmail(
    MAIL_TO,
    '[TDL Lab] 방명록 등록 · ' + name + ' (' + company + ')',
    ['이름: ' + name, '소속: ' + company, '직함: ' + role,
     '평가: ' + rating + ' / 5', '메시지: ' + message,
     '등록일시: ' + entry.createdAt].join('\n'),
  );

  return { entry: entry };
}

function addReservation_(payload) {
  var date = requireText_(payload.date, '방문 희망일', 10);
  var company = requireText_(payload.company, '회사명', 60);
  var leadName = requireText_(payload.leadName, '투어 대표자', 40);
  var phone = requireText_(payload.phone, '연락처', 30);
  var email = requireText_(payload.email, '이메일', 120);
  var note = String(payload.note == null ? '' : payload.note).trim().slice(0, 300);
  var headcount = Number(payload.headcount);
  if (!(headcount >= 1 && headcount <= 50)) {
    throw new Error('방문 인원은 1~50명 사이로 입력해 주세요.');
  }

  sheet_(RESERVATION_SHEET, RESERVATION_HEADERS).appendRow([
    new Date().toISOString(), date, company, headcount, leadName, phone, email, note,
  ]);

  MailApp.sendEmail(
    MAIL_TO,
    '[TDL Lab] 방문 예약 신청 · ' + company + ' ' + date,
    ['방문 희망일: ' + date, '회사명: ' + company, '방문 인원: ' + headcount + '명',
     '투어 대표자: ' + leadName, '연락처: ' + phone, '이메일: ' + email,
     '요청사항: ' + (note || '-')].join('\n'),
  );

  return { ok: true };
}

function doGet() {
  try {
    return jsonOutput_({ entries: readGuestbook_() });
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
