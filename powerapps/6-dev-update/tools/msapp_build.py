# 개발자 앱(.msapp 을 푼 폴더) + 이 저장소의 화면 소스(Src/*.pa.yaml) → 가져오기용 .msapp 폴더
#
#   python3 msapp_build.py <개발자 msapp 을 푼 폴더> <Src 폴더> <출력 폴더>
#
# Studio 가 실제로 읽는 것은 Controls/*.json (ControlInfo · Rules). Src/*.pa.yaml 은 검토용 사본.
# - 이미 있는 컨트롤은 이름으로 찾아 바뀐 속성만 고치고, 새 컨트롤은 같은 종류의 개발자 컨트롤을 본떠 만듦
# - 개발자 앱에 없는 컨트롤 종류(컨테이너 · 타이머)는 쓰지 않도록 풀어 냄 (flatten)
#   · 컨테이너 안 컨트롤은 화면 바로 아래로 (좌표 = 컨테이너 위치 + 자식 위치, 표시 = 컨테이너 표시 && 자식 표시)
#   · 바탕 · 테두리가 있거나 표시 조건이 있는 컨테이너는 같은 이름의 사각형으로 남겨 이름.Visible 참조가 그대로 동작
#   · 본문 스크롤 컨테이너 대신 화면 높이(Max(창 높이, 본문 높이))로 화면 전체가 스크롤
#   · 방명록 흐르는 띠(타이머)는 [다음 소감] 버튼으로 넘김
# - 공개 저장소의 자리표시(Forms 링크 · SharePoint 주소)는 개발자 앱에서 실제 값을 읽어 채움 (이 파일에는 회사 값 없음)
import collections, copy, datetime, glob, json, os, re, shutil, sys, uuid
import yaml

ORIG, SRC, OUT = [os.path.abspath(p) for p in sys.argv[1:4]]
ORDER = ['scrBook', 'scrDone', 'scrMy', 'scrAdmin', 'scrCalendar', 'scrStats', 'scrData', 'scrGuest', 'scrGuestAdmin', 'scrGuides']

TYPE = {'Label@2.5.1': ('label', ''), 'Classic/Button@2.2.0': ('button', ''), 'Rectangle@2.3.0': ('rectangle', ''),
        'Classic/TextInput@2.3.2': ('text', ''), 'Classic/CheckBox@2.1.0': ('checkbox', ''),
        'Classic/DatePicker@2.6.0': ('datepicker', ''), 'Classic/DropDown@2.3.1': ('dropdown', ''),
        'Gallery@2.15.0': ('gallery', None)}
GAL_VARIANT = {'Vertical': 'galleryVertical', 'Horizontal': 'galleryHorizontal'}
GAL_TEMPLATE_PROPS = ('OnSelect', 'TemplateFill')


# ---------------------------------------------------------------- YAML 읽기 · 쓰기
class C:
    def __init__(self, name, control=None, props=None, children=None, variant=None):
        self.name, self.control, self.variant = name, control, variant
        self.props = dict(props or {})
        self.children = list(children or [])

    def walk(self):
        yield self
        for k in self.children:
            yield from k.walk()


def _node(name, d):
    return C(name, d.get('Control'), {k: str(v) for k, v in (d.get('Properties') or {}).items()},
             [_node(*next(iter(x.items()))) for x in (d.get('Children') or [])], d.get('Variant'))


def load_screen(path):
    d = yaml.safe_load(open(path, encoding='utf-8'))['Screens']
    (name, body), = d.items()
    return _node(name, body)


HEAD = open(os.path.join(ORIG, 'Src', 'scrBook.pa.yaml'), encoding='utf-8').read().split('Screens:')[0]


def _val(v, ind):
    plain = ('\n' not in v and ': ' not in v and ' #' not in v and not v.endswith(':') and v == v.strip()
             and not v.startswith(("'", '"', '{', '[', '&', '*', '!', '|', '>', '%', '@', '`')))
    if plain:
        return ' ' + v + '\n'
    return ' |-\n' + ''.join(' ' * ind + ln + '\n' if ln else '\n' for ln in v.split('\n'))


def _emit(c, ind):
    s = ' ' * ind + '- ' + c.name + ':\n'
    i = ind + 4
    s += ' ' * i + 'Control: ' + c.control + '\n'
    if c.variant:
        s += ' ' * i + 'Variant: ' + c.variant + '\n'
    if c.props:
        s += ' ' * i + 'Properties:\n'
        for k in sorted(c.props):
            s += ' ' * (i + 2) + k + ':' + _val(c.props[k], i + 4)
    if c.children:
        s += ' ' * i + 'Children:\n'
        for k in c.children:
            s += _emit(k, i + 2)
    return s


def emit_screen(r):
    s = HEAD + 'Screens:\n  ' + r.name + ':\n'
    if r.props:
        s += '    Properties:\n'
        for k in sorted(r.props):
            s += '      ' + k + ':' + _val(r.props[k], 8)
    if r.children:
        s += '    Children:\n'
        for k in r.children:
            s += _emit(k, 6)
    return s


# ---------------------------------------------------------------- 컨테이너 · 타이머 풀기
def _num(v):
    return re.fullmatch(r'-?\d+(?:\.\d+)?', v.strip()) is not None


def _add(a, b):
    a, b = a.strip(), b.strip()
    if _num(a) and _num(b):
        r = float(a) + float(b)
        return str(int(r)) if r == int(r) else str(r)
    if _num(a) and float(a) == 0:
        return b
    if _num(b) and float(b) == 0:
        return a
    return f'({a}) + ({b})'


def _nc(v):
    return re.sub(r'//[^\n]*$', '', v).rstrip()


def _get(c, k, d):
    return _nc(c.props.get(k, '=' + d)[1:])


def _parent(v, w, h):
    v = re.sub(r'\bParent\.Width\b', f'({w})', v)
    return re.sub(r'\bParent\.Height\b', f'({h})', v)


def _is_con(c):
    return (c.control or '').startswith('GroupContainer')


def flatten_children(kids, ox, oy, vis, pw, ph):
    out = []
    for c in kids:
        for k, v in list(c.props.items()):
            if v.startswith('='):
                c.props[k] = '=' + _parent(v[1:], pw, ph)
        ax, ay = _add(ox, _get(c, 'X', '0')), _add(oy, _get(c, 'Y', '0'))
        cv = _get(c, 'Visible', 'true')
        v = cv if vis == 'true' else (vis if cv == 'true' else f'({vis}) && ({cv})')
        if _is_con(c):
            w, h = _get(c, 'Width', '0'), _get(c, 'Height', '0')
            auto = c.variant == 'AutoLayout'
            fill = c.props.get('Fill', '=Color.Transparent')
            bt = c.props.get('BorderThickness', '=0')
            if not auto and (_nc(fill) != '=Color.Transparent' or _nc(bt) not in ('=0', '')):
                rp = {'X': '=' + ax, 'Y': '=' + ay, 'Width': '=' + w, 'Height': '=' + h, 'Fill': fill,
                      'BorderColor': c.props.get('BorderColor', '=Color.Transparent'), 'BorderThickness': bt}
                if v != 'true':
                    rp['Visible'] = '=' + v
                out.append(C(c.name, 'Rectangle@2.3.0', rp))
            elif v != 'true' and not auto:
                out.append(C(c.name, 'Rectangle@2.3.0', {'X': '=0', 'Y': '=0', 'Width': '=0', 'Height': '=0',
                                                         'Fill': '=Color.Transparent', 'BorderColor': '=Color.Transparent',
                                                         'Visible': '=' + v}))
            if auto:
                yy = ay
                for page in c.children:
                    pv = _get(page, 'Height', '0')
                    out += flatten_children(page.children, ax, yy, v, '1366', pv)
                    yy = _add(yy, pv)
            else:
                out += flatten_children(c.children, ax, ay, v, w, h)
        else:
            c.props['X'], c.props['Y'] = '=' + ax, '=' + ay
            if v != 'true':
                c.props['Visible'] = '=' + v
            out.append(c)
    return out


def page_height(r):
    best = 768
    for c in r.children:
        if _is_con(c) and c.variant == 'AutoLayout':
            tot = sum(int(float(_get(p, 'Height', '0'))) for p in c.children if _num(_get(p, 'Height', '0')))
            y = _get(c, 'Y', '0')
            foot = 64 if '64' in _get(c, 'Height', '') else 0
            best = max(best, (int(float(y)) if _num(y) else 0) + tot + foot)
    return best


def drop_timer(r):
    def strip(c):
        c.children = [k for k in c.children if not (k.control or '').startswith('Timer')]
        for k in c.children:
            strip(k)
    strip(r)
    for c in r.walk():
        if c.name == 'btnGbPlay':
            c.props['OnSelect'] = '=Set(gGbOffset, Mod(gGbOffset + 288, Max(1, CountRows(FirstN(Filter(colGbPublic, Rating >= 4), 10)) * 288)))'
            c.props['Text'] = '="다음 소감 ›"'


# ---------------------------------------------------------------- 개발자 앱 분석
def jwalk(c):
    yield c
    for k in c.get('Children', []):
        yield from jwalk(k)


orig_files = {}
for f in glob.glob(os.path.join(ORIG, 'Controls', '*.json')):
    t = json.load(open(f, encoding='utf-8'))['TopParent']
    orig_files[t['Name']] = (os.path.basename(f), t)
orig_json, orig_explicit = {}, {}
for sname in ORDER[:7]:
    _, t = orig_files[sname]
    for c in jwalk(t):
        orig_json[c['Name']] = c
    for n in load_screen(os.path.join(ORIG, 'Src', sname + '.pa.yaml')).walk():
        orig_explicit[n.name] = set(n.props)

kind = lambda c: (c['Template']['Name'], c['VariantName'])
category, defaults_cnt, donors = {}, collections.defaultdict(collections.Counter), {}
max_id, max_pub = 0, 0
for c in orig_json.values():
    max_id = max(max_id, int(c['ControlUniqueId']))
    max_pub = max(max_pub, int(c.get('PublishOrderIndex', 0)))
    ex = orig_explicit.get(c['Name'], set())
    for r in c['Rules']:
        category.setdefault(r['Property'], r['Category'])
        if r['Property'] not in ex and r['Property'] != 'ZIndex':
            defaults_cnt[(kind(c), r['Property'])][r['InvariantScript']] += 1
    k = kind(c)
    if k not in donors or len(c['Rules']) > len(donors[k]['Rules']):
        donors[k] = c
for c in orig_json.values():  # 갤러리 템플릿 기본값 (OnSelect · TemplateFill 이 없는 갤러리)
    if c['Template']['Name'] == 'galleryTemplate':
        for r in c['Rules']:
            defaults_cnt[(('galleryTemplate', ''), r['Property'])][r['InvariantScript']] += 1
DEFAULT = {k: v.most_common(1)[0][0] for k, v in defaults_cnt.items()}


def guess_cat(p):
    if p.startswith('On'):
        return 'Behavior'
    if p in ('Text', 'Items', 'Default', 'HintText', 'Tooltip', 'AccessibleLabel'):
        return 'Data'
    return 'Design'


ids = {'id': max_id, 'pub': max_pub}


def new_id():
    ids['id'] += 1
    return str(ids['id'])


def new_pub():
    ids['pub'] += 1
    return ids['pub']


def set_rules(j, k, explicit_before, props):
    rules = {r['Property']: r for r in j['Rules']}
    order = [r['Property'] for r in j['Rules']]
    cps = list(j['ControlPropertyState'])
    for p in explicit_before:
        if p in props or p not in rules:
            continue
        d = DEFAULT.get((k, p))
        if d is not None:
            rules[p]['InvariantScript'] = d
        else:
            del rules[p]
            order.remove(p)
            if p in cps:
                cps.remove(p)
    for p, v in props.items():
        assert v.startswith('='), (j['Name'], p, v)
        if p in rules:
            rules[p]['InvariantScript'] = v[1:]
        else:
            rules[p] = {'Property': p, 'Category': category.get(p, guess_cat(p)), 'InvariantScript': v[1:], 'RuleProviderType': 'Unknown'}
            order.append(p)
            if p not in cps:
                cps.append(p)
    j['Rules'] = [rules[p] for p in order]
    j['ControlPropertyState'] = cps


def build(node, parent, z):
    tname, var = TYPE[node.control]
    if tname == 'gallery':
        var = GAL_VARIANT[node.variant or 'Vertical']
    k = (tname, var)
    o = orig_json.get(node.name)
    if o is not None and kind(o) == k:
        j = copy.deepcopy(o)
        before = orig_explicit.get(node.name, set())
    else:
        d = donors[k]
        j = copy.deepcopy(d)
        before = orig_explicit.get(d['Name'], set())
        j['Name'] = node.name
        j['ControlUniqueId'] = new_id()
        j['PublishOrderIndex'] = new_pub()
        if tname == 'gallery':
            t = j['Children'][0]
            t['Name'] = str(uuid.uuid4())
            t['ControlUniqueId'] = new_id()
            t['PublishOrderIndex'] = new_pub()
            t['Parent'] = node.name
    j['Parent'] = parent
    props = dict(node.props)
    if tname == 'gallery':
        tp = {p: props.pop(p) for p in GAL_TEMPLATE_PROPS if p in props}
        t = j['Children'][0]
        set_rules(t, ('galleryTemplate', ''), {r['Property'] for r in t['Rules']} - set(tp), tp)
        before = before - set(GAL_TEMPLATE_PROPS)
    props['ZIndex'] = f'={z}'
    set_rules(j, k, before, props)
    if tname == 'gallery':
        for kid in j['Children'][1:]:
            kid['Parent'] = node.name
        j['Children'] = [j['Children'][0]] + [build(c, node.name, i + 1) for i, c in enumerate(node.children)]
    else:
        j['Children'] = []
    return j


# ---------------------------------------------------------------- 실제 값 (자리표시 → 개발자 앱 값)
app0 = json.load(open(os.path.join(ORIG, 'Controls', '1.json'), encoding='utf-8'))
_f = next(r['InvariantScript'] for r in app0['TopParent']['Rules'] if r['Property'] == 'Formulas')
FORMS = re.search(r'FormsPrefillUrl = "([^"]+)"', _f).group(1)
SITE = re.search(r'(https://[^"/\\]+\.sharepoint\.com/sites/[^"/\\]+)',
                 open(os.path.join(ORIG, 'References', 'DataSources.json'), encoding='utf-8').read().replace('\\/', '/')).group(1)


def real(t):
    t = t.replace('https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=<참석자 Forms id>&<신청번호 질문 id>=REQNO', FORMS)
    t = t.replace('https://<회사>.sharepoint.com/sites/<사이트>', SITE)
    t = t.replace('ox = Max(0, (sw - 1366) / 2);     // 머리말 · 창(대화 상자)을 가운데 두기 위한 왼쪽 여백',
                  'ox = 0;                           // 화면 전체가 스크롤하는 방식이라 왼쪽 맞춤')
    return t.replace('sh = Max(App.Height, 480);', 'sh = Max(App.Height, 768);')


# ---------------------------------------------------------------- 만들기
shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(ORIG, OUT)
for f in glob.glob(os.path.join(OUT, 'Controls', '*.json')):
    os.remove(f)
for f in glob.glob(os.path.join(OUT, 'Src', 'scr*.pa.yaml')):
    os.remove(f)
if os.path.exists(os.path.join(OUT, 'AppCheckerResult.sarif')):
    os.remove(os.path.join(OUT, 'AppCheckerResult.sarif'))

screens = {}
count = collections.Counter()
for idx, sname in enumerate(ORDER):
    r = load_screen(os.path.join(SRC, sname + '.pa.yaml'))
    ph = page_height(r)
    drop_timer(r)
    r.children = flatten_children(r.children, '0', '0', 'true', 'sw', 'sh')
    r.props['Width'] = '=Max(App.Width, 1366)'
    r.props['Height'] = f'=Max(App.Height, {ph})'
    screens[sname] = r
    if sname in orig_files:
        fname, t = orig_files[sname]
        t = copy.deepcopy(t)
        before = orig_explicit[sname]
    else:
        _, d = orig_files['scrDone']
        t = copy.deepcopy(d)
        before = orig_explicit['scrDone']
        t['Name'] = sname
        t['ControlUniqueId'] = new_id()
        fname = t['ControlUniqueId'] + '.json'
    t['Index'] = idx
    set_rules(t, ('screen', ''), before, r.props)
    t['Children'] = [build(c, sname, i + 1) for i, c in enumerate(r.children)]
    for c in jwalk(t):
        count[c['Template']['Name']] += 1
    json.dump({'TopParent': t}, open(os.path.join(OUT, 'Controls', fname), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(OUT, 'Src', sname + '.pa.yaml'), 'w', encoding='utf-8').write(emit_screen(r))
    # 다시 읽어 같은지 확인
    back = load_screen(os.path.join(OUT, 'Src', sname + '.pa.yaml'))
    assert [(n.name, n.props) for n in back.walk()] == [(n.name, n.props) for n in r.walk()], sname

# App
app_text = real(open(os.path.join(SRC, 'App.pa.yaml'), encoding='utf-8').read())
ay = yaml.safe_load(app_text)['App']['Properties']
for rule in app0['TopParent']['Rules']:
    if rule['Property'] in ay:
        rule['InvariantScript'] = str(ay[rule['Property']])[1:]
json.dump(app0, open(os.path.join(OUT, 'Controls', '1.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
open(os.path.join(OUT, 'Src', 'App.pa.yaml'), 'w', encoding='utf-8').write(app_text)
ed = open(os.path.join(OUT, 'Src', '_EditorState.pa.yaml'), encoding='utf-8').read()
ed = ed.split('  ScreensOrder:')[0] + '  ScreensOrder:\n' + ''.join(f'    - {s}\n' for s in ORDER)
open(os.path.join(OUT, 'Src', '_EditorState.pa.yaml'), 'w', encoding='utf-8').write(ed)

p = json.load(open(os.path.join(OUT, 'Properties.json'), encoding='utf-8'))
p['DocumentLayoutScaleToFit'] = False
p['DocumentLayoutMaintainAspectRatio'] = False
p['ControlCount'] = {k: count[k] for k in ['screen', 'rectangle', 'button', 'label', 'gallery', 'galleryTemplate', 'text', 'dropdown', 'checkbox', 'datepicker'] if count[k]}
json.dump(p, open(os.path.join(OUT, 'Properties.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
h = json.load(open(os.path.join(OUT, 'Header.json'), encoding='utf-8'))
h['LastSavedDateTimeUTC'] = datetime.datetime.now(datetime.timezone.utc).strftime('%m/%d/%Y %H:%M:%S')
json.dump(h, open(os.path.join(OUT, 'Header.json'), 'w', encoding='utf-8'), separators=(',', ':'))

# ---------------------------------------------------------------- 점검
problems = []
names = collections.Counter(n.name for r in screens.values() for n in r.walk())
problems += [f'이름 중복: {n}' for n, k in names.items() if k > 1]
PREFIX = r'(?:lbl|btn|txt|gal|rec|con|chk|dd|dp|tmr|hdr|nav|line|tag|err|th)'


def code(v):
    v = re.sub(r'"(?:[^"]|"")*"', '""', v)
    return re.sub(r'//[^\n]*', '', v)


for r in screens.values():
    for n in r.walk():
        for k, v in n.props.items():
            c = code(v)
            if c.count('(') != c.count(')') or c.count('{') != c.count('}') or c.count('[') != c.count(']'):
                problems.append(f'괄호: {r.name}.{n.name}.{k}')
            for ref in re.findall(r'\b(' + PREFIX + r'[A-Z]\w*)\.', c):
                if ref not in names:
                    problems.append(f'없는 컨트롤: {r.name}.{n.name}.{k} → {ref}')
            for nav in re.findall(r'Navigate\(\s*(\w+)', c):
                if nav not in screens:
                    problems.append(f'없는 화면: {r.name}.{n.name}.{k} → {nav}')
for k in ('screen', 'gallery'):
    pass
print('controls', dict(count), 'problems', len(problems))
for x in problems[:40]:
    print('  ', x)
sys.exit(1 if problems else 0)
