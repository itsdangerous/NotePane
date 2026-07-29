# NotePane

NotePane은 macOS용 local-first note pane 앱입니다. 하나의 창에서 session tab을 관리하는 모드와, 각 session을 개별 sticky window로 분리하는 모드를 지원합니다.

## 목표

- BlockNote 기본 editor UI를 그대로 사용
- 앱 전용 toolbar나 custom block editor 구현 금지
- `/` slash menu, side menu, drag/drop, Enter 흐름, toggle block, table, code block 지원
- tab session mode와 sticky window mode 지원
- 좌측 sidebar tab으로 note/session 생성, 전환, 삭제
- tab을 창 밖으로 drag하면 별도 window로 detach
- detached sticky note는 header title을 직접 수정하고 다시 tabs로 dock 가능
- session tab 더블클릭으로 이름 변경
- 공유 아이콘 기반 PNG/PDF export 제어
- session tab 우클릭 메뉴에서 tab 색상 설정
- Notion식 Light/Dark 모드
- note pane style shell
- 로컬 JSON 자동 저장
- 단일 export 아이콘에서 PNG/PDF 선택 내보내기

## 실행

```bash
make install
make verify
make run
```

`make install`은 npm 의존성과 Playwright Chromium test browser를 함께 설치합니다.

개발 모드:

```bash
make dev-web
make dev-app
```

`make dev-web`을 먼저 실행한 뒤 별도 터미널에서 `make dev-app`을 실행합니다.

## 앱 패키징

```bash
make app
```

결과물은 `release/` 아래 생성됩니다.

## 저장 위치

Electron `userData` 경로의 `notes.json`에 저장합니다. macOS에서는 보통 다음 위치입니다.

```text
~/Library/Application Support/NotePane/notes.json
```

## 포함된 BlockNote 기능

- Paragraph
- Heading
- Toggle Heading
- Quote
- Bullet List
- Numbered List
- Check List
- Toggle List
- Code Block
- Table
- File
- Image
- Video
- Audio
- Inline styles
- Link
- Slash menu
- Formatting toolbar
- Side menu / drag handle
- Advanced table controls
- Sidebar session tabs
- Tab session mode / Sticky mode
- Drag tab out to detach it into a sticky window
- Dock a detached sticky window back into tab sessions
- Sticky mode arranges sessions as compact sticky-note windows
- Sticky mode supports per-session pastel background color and opacity from the header settings modal
- Sticky color/opacity carries back to the sidebar session tab color in Tab session mode
- Dashed bottom button for new sidebar sessions
- `Command + T` new sidebar session tab
- `Command + 1` through `Command + 9` sidebar session switching
- `Command + Option + Left/Right` previous/next sidebar session switching with wrap-around
- `Command + W` closes the current tab in tab session mode
- `Command + Shift + M` mode switch
- `Command + Shift + L` Light/Dark toggle
- `Command + Shift + E` export menu
- Double-click session rename
- Hover-only session delete button
- Light/Dark app-wide theme via sidebar Preferences or `Command + Shift + L`
- Sidebar tab text color customization
- Tab color wheel
- Color brightness/value slider that stays unchanged when the wheel color changes
- Color opacity slider for sidebar tab text
- Eyedropper for tab text color when the runtime supports the browser `EyeDropper` API
- Editable HEX/HSL/RGB/LCH tab text color values with copy buttons
- PNG/PDF export menu
- Image download
- Image crop

## 디자인 원칙

- Tab session mode에서는 상단 header에 제목을 두지 않습니다.
- Sticky mode에서는 상단 header에서 현재 session title을 직접 수정합니다.
- Sticky mode로 전환하면 각 session은 작은 sticky note 창으로 정렬됩니다.
- Sticky mode의 header 설정 버튼에서 해당 sticky note의 pastel color/opacity와 editor 설정을 조정합니다.
- header 좌측은 sidebar toggle 또는 sticky title, 중앙은 drag strip, 우측은 export 또는 sticky settings control을 둡니다.
- Light/Dark 전환은 sidebar footer의 Preferences, macOS app menu Preferences, 또는 `Command + Shift + L`로 처리합니다.
- Sticky mode에서는 header를 더 작게 유지합니다.
- tab 색상 설정은 각 session tab 우클릭 메뉴의 Color 옵션에서 처리합니다.
- export는 header 우측의 공유 아이콘 한 개에서 PNG/PDF를 선택합니다.
- drag 영역은 상단 sticky header로 제한합니다.
- editor 영역은 `-webkit-app-region: no-drag`로 유지합니다.
- 좌측 sidebar는 session tab 생성, 전환, 삭제만 담당합니다.
- session 추가는 마지막 session tab 바로 아래의 점선 `+` 버튼으로 처리합니다.
- session tab 오른쪽은 평상시 `Command + 숫자` 단축키를 표시하고, hover 때만 삭제 버튼을 표시합니다.
- Tab session mode에서 `Command + W`는 창을 닫지 않고 현재 session tab을 제거합니다.
- `Command + Option + ←/→`는 이전/다음 session tab으로 순환 이동하며, 끝에서는 반대 끝으로 wrap 됩니다.
- session 이름은 sidebar tab을 더블클릭해서 inline으로 변경합니다.
- 전체 앱 배경/텍스트/코드 색상은 Light/Dark 모드 토큰으로만 결정합니다.
- session tab 배경색은 Light/Dark 모드와 active/inactive 상태 토큰으로만 결정합니다.
- 색상 팔레트와 opacity slider는 좌측 sidebar tab의 문구색 커스터마이즈에만 사용합니다.
- Sticky mode에서는 같은 색상/opacity 값이 sticky note background로 사용되고, Tab session mode로 돌아오면 session tab color로 유지됩니다.
- BlockNote 내부 block spacing, slash menu, formatting toolbar, table handle CSS는 직접 override하지 않습니다.
- floating UI는 `document.body` portal을 유지해 작은 창에서도 clipping을 줄입니다.
- PNG/PDF export는 앱 chrome과 sticky 배경색을 제거한 editor content 기준으로 생성합니다.

## 제외한 기능

AI, comments, collaboration, DOCX/ODT export는 별도 XL/서버/협업 구성이 필요한 영역이라 기본 앱에는
넣지 않았습니다. editor UX 자체는 BlockNote 기본 흐름을 기준으로 구성했습니다.
