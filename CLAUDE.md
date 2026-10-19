# 작업 규칙

## Power Apps 이전본 (`powerapps/`)

- 웹앱(React `src/` + `apps-script/Code.gs`)에는 없고 Power Apps 에만 있는 기능을 추가 · 수정할 때는 항상 `[PA 전용]` 으로 표시한다.
  - 수식: 여러 줄이면 맨 앞 줄 `// [PA 전용] 무엇 · 웹은 어떻게(없으면 '웹에는 없음')`, 한 줄이면 끝에 같은 주석. 주석에 `"` 와 `#` 은 쓰지 않는다.
  - 그 화면 YAML 맨 위 `── [PA 전용] ──` 머리말 목록과 `powerapps/README.md` 14절 표를 함께 고친다.
  - 웹에도 같은 기능이 생기면 표시와 표에서 뺀다.
- 웹에만 있고 Power Apps 에 아직 없는 기능은 `powerapps/README.md` 12절 '남는 차이' 에 적는다.
