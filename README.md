# ONF_Homepage — OWNIFY 홈페이지 커스텀 코드

[www.ownify.co.kr](https://www.ownify.co.kr) (우피/Oopy)에 들어가는 커스텀 CSS·JS의 **정본 저장소**.

우피 설정의 `<head>` 입력칸은 항목별 10,240자 제한이 있어서, 코드를 여기(공개 저장소)에 두고 **GitHub Pages**로 불러온다. → 글자 수 제한 없음 + 주석 가능 + git 이력 관리.

> CSS/JS 서빙은 **GitHub Pages**(`immplee.github.io/ONF_Homepage/…`)가 기본이다 — push 후 1~2분 빌드 + 캐시 10분이면 자동 반영, purge 불필요. jsDelivr `@main`은 캐시가 최대 12시간이고 purge가 스로틀에 걸리는 일이 있어(2026-07-02 실측) 예비용으로만. 노션 본문에 **삽입하는 이미지**(assets/)는 예외로 jsDelivr **커밋 고정** URL 원칙 유지.

> ⚠️ 이 저장소는 **공개(public)** 다. CSS/JS는 어차피 방문자 브라우저에 그대로 전송되는 코드라 문제 없지만, **비밀값(키·이메일·내부 정보)은 절대 넣지 말 것.**

## 파일

| 파일 | 내용 |
|------|------|
| `ownify.css` | 홈페이지 스타일 전체 (탑바·카드·이미지·SNS 버튼·CTA 밴드·푸터 등) |
| `ownify.js` | 스크롤 등장 애니메이션 + 인스타 버튼 임시 알림 + 사이트 푸터 주입 |
| `assets/` | CDN으로 서빙하는 이미지 (푸터용 크림 로고 등) |

## 우피에 넣는 코드 (설정 → 사용자 정의 코드 → `<head>`)

```html
<link rel="stylesheet" href="https://immplee.github.io/ONF_Homepage/ownify.css">
<script defer src="https://immplee.github.io/ONF_Homepage/ownify.js"></script>
```

## 수정 → 반영 절차

1. `ownify.css` / `ownify.js` 수정
2. commit & push:
   ```bash
   W="/Users/peter/Library/Mobile Documents/com~apple~CloudDocs/Ownify/ONF_Homepage"
   git -C "$W" add -A && git -C "$W" commit -m "<요약>" && git -C "$W" push
   ```
3. 1~2분 뒤(Pages 빌드) 홈페이지에서 강력 새로고침(⌘⇧R)으로 확인. 브라우저 캐시는 최대 10분.

## 주의

- 이 폴더는 Ownify 프로젝트 안에 있지만 **별도 git 저장소**(`immplee/ONF_Homepage`)다. Ownify repo(비공개)에는 gitignore 화이트리스트 때문에 자동으로 안 잡힌다. ONF_Archive와 같은 패턴.
- `ownify.css` 맨 아래 `data-block-id` 규칙들은 우피에서 해당 블록을 지우고 다시 만들면 id가 바뀌므로 함께 갱신해야 한다.
