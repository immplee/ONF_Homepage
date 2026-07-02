# ONF_Homepage — OWNIFY 홈페이지 커스텀 코드

[www.ownify.co.kr](https://www.ownify.co.kr) (우피/Oopy)에 들어가는 커스텀 CSS·JS의 **정본 저장소**.

우피 설정의 `<head>` 입력칸은 항목별 10,240자 제한이 있어서, 코드를 여기(공개 저장소)에 두고 jsDelivr CDN으로 불러온다. → 글자 수 제한 없음 + 주석 가능 + git 이력 관리.

> ⚠️ 이 저장소는 **공개(public)** 다. CSS/JS는 어차피 방문자 브라우저에 그대로 전송되는 코드라 문제 없지만, **비밀값(키·이메일·내부 정보)은 절대 넣지 말 것.**

## 파일

| 파일 | 내용 |
|------|------|
| `ownify.css` | 홈페이지 스타일 전체 (탑바·카드·이미지·SNS 버튼·CTA 밴드 등) |
| `ownify.js` | 스크롤 등장 애니메이션 + 인스타 버튼 임시 알림 |

## 우피에 넣는 코드 (설정 → 사용자 정의 코드 → `<head>`)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@main/ownify.css">
<script defer src="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@main/ownify.js"></script>
```

## 수정 → 반영 절차

1. `ownify.css` / `ownify.js` 수정
2. commit & push:
   ```bash
   W="/Users/peter/Library/Mobile Documents/com~apple~CloudDocs/Ownify/ONF_Homepage"
   git -C "$W" add -A && git -C "$W" commit -m "<요약>" && git -C "$W" push
   ```
3. **jsDelivr 캐시 비우기** (`@main` 주소는 최대 12시간 캐시됨 — purge 안 하면 반영이 늦다):
   ```bash
   curl -s "https://purge.jsdelivr.net/gh/immplee/ONF_Homepage@main/ownify.css"
   curl -s "https://purge.jsdelivr.net/gh/immplee/ONF_Homepage@main/ownify.js"
   ```
4. 홈페이지에서 강력 새로고침(⌘⇧R)으로 확인

## 주의

- 이 폴더는 Ownify 프로젝트 안에 있지만 **별도 git 저장소**(`immplee/ONF_Homepage`)다. Ownify repo(비공개)에는 gitignore 화이트리스트 때문에 자동으로 안 잡힌다. ONF_Archive와 같은 패턴.
- `ownify.css` 맨 아래 `data-block-id` 규칙들은 우피에서 해당 블록을 지우고 다시 만들면 id가 바뀌므로 함께 갱신해야 한다.
