# 작업 규칙

## Power Apps 이전본 (`powerapps/`)

- Power Apps 산출물은 **항상 `powerapps/6-dev-update/`(개발자 버전 `TDL_VISITOR` 솔루션 구조) 기준**으로 만들고 고친다. `3-powerapps/` 는 개발자에게 설명하려고 만든 참고용이라 더 이상 고치지 않는다.
  가져오기 zip(개발자 zip 과 같은 폴더 · 파일 구성)은 `6-dev-update/tools/` 로 만든다. 결과 zip 에는 회사 값이 들어 있으니 저장소에 올리지 않는다.
- 웹앱(React `src/` + `apps-script/Code.gs`)에는 없고 Power Apps 에만 있는 기능을 추가 · 수정할 때는 항상 `[PA 전용]` 으로 표시한다.
  - 수식: 여러 줄이면 맨 앞 줄 `// [PA 전용] 무엇 · 웹은 어떻게(없으면 '웹에는 없음')`, 한 줄이면 끝에 같은 주석. 주석에 `"` 와 `#` 은 쓰지 않는다.
  - 그 화면 YAML 맨 위 `── [PA 전용] ──` 머리말 목록과 `powerapps/README.md` 14절 표를 함께 고친다.
  - 웹에도 같은 기능이 생기면 표시와 표에서 뺀다.
- 웹에만 있고 Power Apps 에 아직 없는 기능은 `powerapps/README.md` 12절 '남는 차이' 에 적는다.
