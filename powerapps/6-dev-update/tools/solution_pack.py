# 개발자 솔루션 zip 과 같은 폴더 · 파일 · 항목 순서로 다시 묶음 (버전 +1)
#
#   python3 solution_pack.py <개발자 솔루션 zip> <msapp_build.py 출력 폴더> <mail-templates.md> <출력 zip>
#
# 바꾸는 것: CanvasApps/*_DocumentUri.msapp (앱), 흐름 4개, solution.xml 버전, customizations.xml 앱 버전 시각
# 이 파일에는 회사 값이 없음 (사이트 주소 · 목록 ID 는 개발자 흐름에서 그대로 가져옴)
import copy, datetime, io, json, os, re, sys, zipfile

SRC_ZIP, MS, MAIL_MD, OUT_ZIP = sys.argv[1:5]
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
src = zipfile.ZipFile(SRC_ZIP)
files = {i.filename: src.read(i) for i in src.infolist()}
order = [i.filename for i in src.infolist()]
APP = next(n for n in order if n.endswith('_DocumentUri.msapp'))


# ---------------------------------------------------------------- 1. 앱 (.msapp): 원본 항목 순서 · 백슬래시 경로
orig_ms = [i.filename for i in zipfile.ZipFile(io.BytesIO(files[APP])).infolist()]
have = set()
for root, _, fs in os.walk(MS):
    for f in fs:
        have.add(os.path.relpath(os.path.join(root, f), MS).replace('/', '\\'))
ms_order = [n for n in orig_ms if n in have]
new_pairs = []
for n in sorted(have - set(ms_order)):
    if n.startswith('Controls\\'):
        nm = json.load(open(os.path.join(MS, n.replace('\\', '/')), encoding='utf-8'))['TopParent']['Name']
        new_pairs += [n, f'Src\\{nm}.pa.yaml']
i = ms_order.index('Controls\\1.json')
ms_order[i:i] = new_pairs
assert set(ms_order) == have, sorted(have - set(ms_order))
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in ms_order:
        z.writestr(n, open(os.path.join(MS, n.replace('\\', '/')), 'rb').read())
files[APP] = buf.getvalue()


# ---------------------------------------------------------------- 2. 흐름
def flow(prefix):
    n = next(x for x in order if x.startswith('Workflows/' + prefix))
    return n, json.loads(files[n])


def save(n, d):
    files[n] = json.dumps(d, ensure_ascii=False).encode('utf-8')


# 2-1 접수: 관리자 수기 등록(신청번호 M...)은 접수 메일 없음
n, d = flow('TDLVisitSubmitted')
for t in d['properties']['definition']['triggers'].values():
    t['conditions'] = [{'expression': "@not(startsWith(triggerOutputs()?['body/Title'], 'M'))"}]
save(n, d)

# 2-2 참석자 응답: 동의하지 않은 응답(Forms 분기로 성함 없이 끝남)은 저장하지 않음 (보안팀 검토)
n, d = flow('TDLAttendeeCollect')
acts = d['properties']['definition']['actions']
name_expr = acts['Create_item']['inputs']['parameters']['item/Title']          # 성함 답변
assert name_expr.startswith("@outputs('응답')")
acts['동의확인'] = {'type': 'If', 'runAfter': {'응답': ['Succeeded']},
                 'expression': {'and': [{'equals': ['@empty(trim(coalesce(' + name_expr[1:] + ", '')))", True]}]},
                 'actions': {'동의안함_종료': {'type': 'Terminate', 'runAfter': {}, 'inputs': {'runStatus': 'Succeeded'}}},
                 'else': {'actions': {}}}
acts['신청찾기']['runAfter'] = {'동의확인': ['Succeeded']}
save(n, d)

# 2-3 보관 기간: 매일, 방문 종료일로부터 3개월 지난 참석자 정보 삭제 (보안팀 검토)
n, d = flow('TDLRetention')
df = d['properties']['definition']
for t in df['triggers'].values():
    t['recurrence'] = {'frequency': 'Day', 'interval': 1, 'timeZone': 'Korea Standard Time', 'schedule': {'hours': ['3'], 'minutes': [0]}}
p = df['actions']['만료']['inputs']['parameters']
p['$filter'] = "field_9 lt '@{addToTime(utcNow(), -3, 'Month', 'yyyy-MM-dd')}'"   # field_9 = VisitAttendees 의 VisitDate (흐름 B 와 같은 열)
save(n, d)

# 2-4 결정: 완료 → 참석자에게 방명록(만족도 조사) 요청 메일
n, d = flow('TDLVisitDecision')
df = d['properties']['definition']
for t in df['triggers'].values():
    e = t['conditions'][0]['expression']
    t['conditions'][0]['expression'] = e.replace("equals(triggerOutputs()?['body/field_17'], '취소')",
        "equals(triggerOutputs()?['body/field_17'], '취소'),       equals(triggerOutputs()?['body/field_17'], '완료')")
    assert "'완료'" in t['conditions'][0]['expression']
cases = df['actions']['Switch']['cases']
get_tpl = cases['취소']['actions']['점유']
mail_tpl = cases['승인']['actions']['Send_an_email_(V2)']
att_table = json.loads(files[flow('TDLAttendeeCollect')[0]])['properties']['definition']['actions']['Create_item']['inputs']['parameters']['table']

md = open(MAIL_MD, encoding='utf-8').read()
f1 = md.split('## F-1.')[1].split('```html')[1].split('```')[0].strip()
f2 = md.split('## F-2.')[1].split('```html')[1].split('```')[0].strip()
REP = {'{{DateKey}}': "@{triggerBody()?['field_4']}", '{{TourName}}': "@{triggerBody()?['field_2']}",
       '{{ScheduleText}}': "@{triggerBody()?['field_6']}", '{{후기링크}}': "@{outputs('후기링크')}"}
for k, v in REP.items():
    f1, f2 = f1.replace(k, v), f2.replace(k, v)
i = f1.index('<p style="margin:0 0 22px')
j = f1.index('<div style="border:1px solid #e3e0de;border-left')
s = f1.index('<div style="font-size:14px;line-height:1.9')
k = f1.index('\n  </div>\n  <div style="padding:16px 28px')
lead_ko, box, sect_ko = f1[i:j], f1[j:s], f1[s:k]
lead_en, sect_en = f2[:f2.index('<div style="font-size:14px')], f2[f2.index('<div style="font-size:14px'):]
white = sect_ko.replace('background:#a72b2b;color:#ffffff;border:1px solid #a72b2b', 'background:#ffffff;color:#a72b2b;border:1px solid #a72b2b')
body_ko = f1
body_en = (f1[:i].replace('방문해 주셔서 감사합니다</div>', 'Thank you for visiting</div>') + lead_en + box + sect_en
           + '\n<hr style="border:0;border-top:1px solid #e3e0de;margin:26px 0;">\n' + lead_ko + white + f1[k:])
assert '{{' not in body_ko + body_en and body_en.count('<div') == body_en.count('</div>')

get_att = copy.deepcopy(get_tpl)
get_att['inputs']['parameters'] = {'dataset': get_tpl['inputs']['parameters']['dataset'], 'table': att_table,
                                   '$filter': "field_1 eq '@{triggerBody()?['Title']}'"}   # field_1 = RequestNo
get_att['runAfter'] = {}
send = copy.deepcopy(mail_tpl)
send['runAfter'] = {}
send['inputs']['parameters'] = {
    'emailMessage/To': "@items('후기대상_각각')",
    'emailMessage/Subject': "@{if(equals(triggerBody()?['field_23'], '한국어'), '[TDL] 방문해 주셔서 감사합니다 · 만족도와 개선 의견을 남겨 주세요', '[TDL] Thank you for visiting · 방문해 주셔서 감사합니다')}",
    'emailMessage/Body': "@{if(equals(triggerBody()?['field_23'], '한국어'), outputs('본문_한국어'), outputs('본문_외국어'))}",
    'emailMessage/Importance': 'Normal'}
cases['완료'] = {'case': '완료', 'actions': {
    # 방명록 Forms 를 만든 뒤 미리 채운 링크로 바꿈 (TOURQ = 투어 이름, REQNO = 신청번호). 바꾸기 전에는 아래 조건에서 걸러져 보내지 않음
    '후기링크': {'type': 'Compose', 'runAfter': {},
              'inputs': "@replace(replace('https://방명록-Forms-링크를-넣으세요?tour=TOURQ&req=REQNO', 'TOURQ', encodeUriComponent(triggerBody()?['field_2'])), 'REQNO', triggerBody()?['Title'])"},
    '보낼조건': {'type': 'If', 'runAfter': {'후기링크': ['Succeeded']},
             'expression': {'and': [
                 {'startsWith': ["@outputs('후기링크')", 'https://forms']},
                 {'not': {'startsWith': ["@triggerBody()?['Title']", 'M']}},
                 {'greaterOrEquals': ["@formatDateTime(triggerBody()?['Created'], 'yyyy-MM-dd')", '2026-10-22']},
                 {'lessOrEquals': ["@formatDateTime(triggerBody()?['field_3'], 'yyyy-MM-dd')", "@formatDateTime(convertFromUtc(utcNow(), 'Korea Standard Time'), 'yyyy-MM-dd')"]}]},
             'actions': {
                 '후기참석자': get_att,
                 '참석확인': {'type': 'Query', 'runAfter': {'후기참석자': ['Succeeded']},
                          'inputs': {'from': "@outputs('후기참석자')?['body/value']", 'where': "@not(equals(item()?['Status'], '미매칭'))"}},
                 '후기주소': {'type': 'Select', 'runAfter': {'참석확인': ['Succeeded']},
                          'inputs': {'from': "@body('참석확인')", 'select': "@toLower(trim(coalesce(item()?['Email'], '')))"}},
                 '받는사람': {'type': 'Query', 'runAfter': {'후기주소': ['Succeeded']},
                          'inputs': {'from': "@union(body('후기주소'), body('후기주소'))", 'where': "@and(contains(item(), '@'), contains(item(), '.'))"}},
                 '본문_한국어': {'type': 'Compose', 'runAfter': {'받는사람': ['Succeeded']}, 'inputs': body_ko},
                 '본문_외국어': {'type': 'Compose', 'runAfter': {'본문_한국어': ['Succeeded']}, 'inputs': body_en},
                 '후기대상_각각': {'type': 'Foreach', 'runAfter': {'본문_외국어': ['Succeeded']},
                              'foreach': "@body('받는사람')", 'actions': {'Send_an_email_(V2)_3': send}},
             }, 'else': {'actions': {}}}}}
save(n, d)


# ---------------------------------------------------------------- 3. 버전
sx = files['solution.xml'].decode('utf-8')
v = re.search(r'<Version>(\d+)\.(\d+)\.(\d+)\.(\d+)</Version>', sx)
new_ver = f'{v.group(1)}.{v.group(2)}.{v.group(3)}.{int(v.group(4)) + 1}'
files['solution.xml'] = sx.replace(v.group(0), f'<Version>{new_ver}</Version>', 1).encode('utf-8')
cx = files['customizations.xml'].decode('utf-8')
files['customizations.xml'] = re.sub(r'<AppVersion>[^<]*</AppVersion>', f'<AppVersion>{NOW}</AppVersion>', cx, count=1).encode('utf-8')

# ---------------------------------------------------------------- 4. 묶기 (원본 순서)
with zipfile.ZipFile(OUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in order:
        z.writestr(n, files[n])
print('ok', new_ver, OUT_ZIP, len(ms_order), 'app entries')
