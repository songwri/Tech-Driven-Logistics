# 가져오기용 솔루션 zip 만들기

개발자 솔루션 zip(예: `TDL_VISITOR_1_0_0_1.zip`)과 이 저장소의 화면 소스(`../Src`)로, 개발자 솔루션과 **같은 폴더 · 파일 · 순서**의 가져오기용 zip 을 만듭니다.
회사 값(사이트 주소 · 목록 ID · Forms 링크)은 이 폴더에 없고, 실행할 때 개발자 zip 에서 읽어 채웁니다. **결과 zip 은 공개 저장소에 올리지 마세요.**

```bash
W=/작업/폴더                                   # 저장소 밖
mkdir -p $W/msapp && cd $W
python3 -c "import zipfile,io,os; z=zipfile.ZipFile('TDL_VISITOR_1_0_0_1.zip'); m=zipfile.ZipFile(io.BytesIO(z.read('CanvasApps/crebc_tdl_0bea4_DocumentUri.msapp')));
[ (os.makedirs(os.path.dirname('msapp/'+n.replace(chr(92),'/')) or '.', exist_ok=True), open('msapp/'+n.replace(chr(92),'/'),'wb').write(m.read(n))) for n in m.namelist() ]"

cd <저장소>/powerapps
python3 6-dev-update/tools/msapp_build.py   $W/msapp 6-dev-update/Src $W/msapp_new          # 점검 문제 0건이어야 함
python3 6-dev-update/tools/solution_pack.py $W/TDL_VISITOR_1_0_0_1.zip $W/msapp_new 4-power-automate/mail-templates.md $W/TDL_VISITOR_1_0_0_2.zip
```

| 파일 | 하는 일 |
| --- | --- |
| `msapp_build.py` | `Src/*.pa.yaml` → Studio 가 읽는 `Controls/*.json`. 있는 컨트롤은 바뀐 속성만, 새 컨트롤은 같은 종류의 개발자 컨트롤을 본떠 만듦. 컨테이너 · 타이머는 풀어 냄. 이름 중복 · 괄호 · 없는 컨트롤 참조 점검 |
| `solution_pack.py` | 앱 파일 교체, 흐름 4개 수정(접수 M 제외 · 완료 메일 · 동의 안 한 응답 저장 안 함 · 3개월 삭제), 버전 +1, 원본 순서로 묶기 |

필요: Python 3, PyYAML (`pip install pyyaml`)
