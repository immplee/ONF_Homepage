/* ============================================================
   OWNIFY 홈페이지 커스텀 JS (www.ownify.co.kr, 우피/Oopy)
   - 정본은 이 파일(GitHub immplee/ONF_Homepage). 우피 <head>에는
     jsDelivr <script> 한 줄만 넣는다.
   - 역할: ① 스크롤 등장 애니메이션(ownify.css의 .onf-reveal와 세트)
           ② 인스타 버튼 "준비 중" 알림
           ③ 사이트 푸터 주입(ownify.css의 .onf-footer와 세트)
           ④ 탑바 우측 상담 CTA 주입(ownify.css의 .onf-top-cta와 세트)
   ============================================================ */
(function () {

  /* ---------- ① 스크롤 등장 애니메이션 ---------- */

  // 애니메이션을 적용할 블록들
  var SEL = '.notion-page-content :is(.notion-callout-block,.notion-image-block,[class*="image"],.notion-header-block,.notion-sub_header-block,.notion-text-block,.notion-column)';

  // 화면에 12% 이상 들어오면 .onf-show를 붙이고 관찰 종료(1회성)
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('onf-show');
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12 });

  // 아직 등록 안 된 블록에 .onf-reveal을 붙이고 관찰 시작
  function scan() {
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.classList.contains('onf-reveal')) return;
      // 조상이 이미 등장 애니메이션 대상이면 건너뜀 — 래퍼와 내부 블록이
      // 이중으로 움직여 내용물이 뒤늦게 내려앉는 잔상을 만들던 문제(2026-07-03)
      if (el.parentElement && el.parentElement.closest('.onf-reveal')) return;
      el.classList.add('onf-reveal');
      io.observe(el);
    });
    alignCalloutIcons();
  }

  /* 콜아웃 아이콘(이모지)을 첫 번째 보이는 블록의 첫 줄과 세로 중앙 정렬.
     카드마다 첫 블록 구조(칩 제목/헤딩/본문)가 달라 고정값 CSS로는 안 맞음 —
     실측해서 카드별로 자동 보정 (2026-07-03 Peter 지시 "항상 자동으로"). */
  function alignCalloutIcons() {
    document.querySelectorAll('.notion-callout-block [class*="CalloutBlock_content"]').forEach(function (c) {
      var icon = c.querySelector('.notion-record-icon');
      var blocks = c.querySelector('[class*="CalloutBlock_blocks"]');
      if (!icon || !blocks) return;
      var first = null;
      for (var i = 0; i < blocks.children.length; i++) {
        if (blocks.children[i].offsetHeight > 2) { first = blocks.children[i]; break; }
      }
      if (!first) return;
      // 첫 줄 '실제 글자' 중심을 실측 — line-height 절반 방식은 폰트
      // 메트릭에 따라 글자보다 2~3px 위를 겨냥해 이모지가 떠 보임(2026-07-03 모바일 실측).
      // 글자 박스 중심도 부족: 한글 잉크는 박스 안에서 아래에 앉아 텍스트가 ~1px 쳐져
      // 보임(2026-07-04 모바일 실측) → 캔버스 메트릭으로 '잉크 중심'을 겨냥한다.
      var target = null;
      var walker = document.createTreeWalker(first, NodeFilter.SHOW_TEXT);
      var tn;
      while ((tn = walker.nextNode())) {
        if (tn.textContent.trim()) {
          var rg = document.createRange();
          rg.setStart(tn, 0); rg.setEnd(tn, Math.min(1, tn.length));
          var tr = rg.getBoundingClientRect();
          if (tr.height) {
            var ink = inkCenter(tn, tr);
            target = (ink !== null) ? ink : (tr.top + tr.height / 2);
            break;
          }
        }
      }
      if (target === null) {  // 텍스트 없는 카드(이미지 등)는 기존 line-height 방식 폴백
        var lh = parseFloat(getComputedStyle(first).lineHeight);
        var firstLine = (lh && lh < first.offsetHeight) ? lh : first.offsetHeight;
        target = first.getBoundingClientRect().top + firstLine / 2;
      }
      var ir = icon.getBoundingClientRect();
      if (!ir.height) return;
      var delta = target - (ir.top + ir.height / 2);
      // 임계 0.5px: 1.5px는 ~1px 잔차를 방치해 모바일에서 쳐져 보였음(2026-07-04).
      // 정수 반올림이라 적용 후 잔차는 0.5px 미만 → 재스캔 때 재조정 없이 안정.
      if (Math.abs(delta) > 0.5) {
        var cur = parseFloat(icon.style.marginTop) || parseFloat(getComputedStyle(icon).marginTop) || 0;
        icon.style.setProperty('margin-top', Math.round(cur + delta) + 'px', 'important');
      }
    });
  }

  /* 첫 글자 묶음의 '잉크 중심' y — Range 박스는 폰트 ascent 여백까지 포함해
     박스 중심을 맞춰도 한글 잉크가 낮게 보인다. 캔버스 TextMetrics로
     baseline 기준 실제 잉크 상하한을 재서 그 중앙을 돌려준다(미지원 브라우저는 null). */
  var _inkCtx = null;
  function inkCenter(textNode, rangeRect) {
    try {
      var el = textNode.parentElement;
      if (!el) return null;
      var st = getComputedStyle(el);
      if (!_inkCtx) _inkCtx = document.createElement('canvas').getContext('2d');
      _inkCtx.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      var m = _inkCtx.measureText(textNode.textContent.trim().slice(0, 12));
      if (m.actualBoundingBoxAscent === undefined || m.fontBoundingBoxAscent === undefined) return null;
      var baseline = rangeRect.top + m.fontBoundingBoxAscent;
      return baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    } catch (e) { return null; }
  }
  window.addEventListener('resize', function () { setTimeout(alignCalloutIcons, 80); });

  // 우피(노션)는 블록을 늦게 그리므로: 10초 동안 0.5초마다 재스캔.
  // SPA 페이지 이동 때도 재시작할 수 있게 버스트 구조(⑤의 경로 감지가 호출).
  var scanCount = 0, scanTimer = null;
  function startScanBurst() {
    scanCount = 0;
    scan();
    if (scanTimer) return;               // 이미 도는 중이면 카운터만 리셋
    scanTimer = setInterval(function () {
      scan();
      if (++scanCount > 20) { clearInterval(scanTimer); scanTimer = null; }
    }, 500);
  }
  startScanBurst();
  window.addEventListener('load', scan);

  /* ---------- ② 인스타 버튼 알림 → ②-2 위임 방식으로 통합(2026-07-04) ----------
     기존 300ms 폴링은 버튼 없는 페이지에서 영원히 돌고, 재렌더로 새 노드가 되면
     핸들러가 사라졌음 — 문서 위임(②-2)이 둘 다 해결. */

  /* ---------- ③ 사이트 푸터 주입 ---------- */
  // 모든 페이지 본문 맨 끝에 회사 정보 + 로고 푸터를 붙인다.
  // 스타일·등장 애니메이션은 ownify.css 10번 섹션(.onf-footer)과 세트.
  // 우피(노션)는 페이지를 이동하면 본문을 통째로 다시 그리므로,
  // MutationObserver로 "푸터가 사라졌으면 다시 붙이기"를 계속 보장한다.

  var FOOTER_HTML =
    '<div class="onf-footer-in">' +
      '<div class="onf-footer-info">' +
        '<p class="onf-footer-biz">' +
          '<span>상호명 : 오니파이</span>' +
          '<span>대표 : 이민우</span>' +
          '<span>사업자등록번호 : 804-17-02878</span>' +
          '<span>서울특별시 송파구 올림픽로 240, 2층 214호 (잠실동, 롯데웰빙센터)</span>' +
        '</p>' +
        '<p class="onf-footer-legal">본 사이트 모든 자료의 저작권 및 지적재산권 일체는 OWNIFY에 귀속되며, 사전 서면 동의 없는 무단 출력·복제·공유·2차 이용을 금합니다.</p>' +
        '<p class="onf-footer-copy">© 2026 OWNIFY. All rights reserved.</p>' +
      '</div>' +
      // 이미지는 jsDelivr 커밋 고정 URL 원칙(README) — 로고 파일을 바꾸면 커밋 해시도 갱신할 것
      '<img class="onf-footer-logo" alt="OWNIFY" ' +
        'src="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@66d00f3/assets/ownify-logo-cream.svg">' +
    '</div>';

  // 윗변이 화면에 들어오는 즉시 .onf-show → 아래에서 위로 떠오르는 등장
  var footIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('onf-show');
        footIo.unobserve(e.target);
      }
    });
  }, { threshold: 0 });   // 윗변이 보이는 즉시 등장 — .15는 바닥까지 가야 떠서 부자연(2026-07-03)

  function ensureFooter() {
    // 본문 "안"이 아니라 "바로 뒤"(형제)에 둔다 — 본문 컨테이너는 모바일에서
    // flex 중앙정렬이라 안에 넣으면 풀폭 배치가 어긋남 (ownify.css 10번 참고)
    var content = document.querySelector('.notion-page-content');
    if (!content) return;
    var f = document.querySelector('.onf-footer');
    if (!f) {
      f = document.createElement('footer');
      f.className = 'onf-footer';
      f.innerHTML = FOOTER_HTML;
      content.insertAdjacentElement('afterend', f);
      footIo.observe(f);
    } else if (f.previousElementSibling !== content) {
      // 페이지 이동으로 본문이 새로 그려져 순서가 틀어졌으면 재배치
      content.insertAdjacentElement('afterend', f);
    }
  }

  // 본문이 다시 그려질 때마다 확인 (연속 변경은 rAF로 한 번에 처리)
  var footPending = false;
  new MutationObserver(function () {
    if (footPending) return;
    footPending = true;
    requestAnimationFrame(function () {
      footPending = false;
      ensureFooter();
      ensureTopCta();   // 플로팅 CTA도 본문 재렌더 즉시 반영(2초 폴링 대기 제거)
    });
  }).observe(document.body, { childList: true, subtree: true });
  ensureFooter();

  /* ---------- ④ 우하단 플로팅 상담 CTA ---------- */
  // 2026-07-03 SNS 버튼과 자리 맞교환: 상담 CTA는 우하단 플로팅, SNS는 탑바 우측.
  // 문구·화살표는 본문 띠 배너(.onf-band)와 동일. 스타일은 ownify.css 11번 섹션(.onf-float-cta)과 세트.
  // 홈(/)에는 본문 띠 배너가 있으므로 하위 페이지(/how·/where 등)에서만 표시 (2026-07-02 Peter 지시).
  // 로고 왼쪽 여백 측정(--onf-cta-right)은 유지 — 이제 SNS 버튼(우상단) 위치가 이 값을 쓴다.
  function ensureTopCta() {
    var bar = document.querySelector('.notion-topbar');
    if (bar) {
      var logo = bar.querySelector('img:not(.onf-band-arrow)');
      if (logo) {
        var lx = Math.round(logo.getBoundingClientRect().left);
        // 우피가 탑바를 다 그리기 전에 재면 로고가 임시 위치라 수백 px이 나와
        // SNS 버튼이 Reviews 위에 얹혔다 우측으로 튀는 원인이 됨(2026-07-03 Peter).
        // 정상 좌측 여백 범위(≤120px)일 때만 반영 — 그 전엔 CSS 폴백(40px)이 제자리를 지킴.
        if (lx > 0 && lx <= 120) document.documentElement.style.setProperty('--onf-cta-right', lx + 'px');
      }
    }
    var isHome = location.pathname === '/' || location.pathname === '';
    var existing = document.querySelector('.onf-float-cta');
    if (isHome) {                     // 홈이면 있던 것도 제거(SPA 이동 대응)
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var a = document.createElement('a');
    a.className = 'onf-float-cta';
    a.href = 'https://own-ify.notion.site/309d6a6296ae80ebbedfe2bfdeabc5db?pvs=105'; // 상담 신청서(띠 배너와 동일)
    a.innerHTML = '👨🏻‍💻 상담 신청하러 가기 ' +
      '<img class="onf-band-arrow" alt="→" src="https://immplee.github.io/ONF_Homepage/assets/cta-arrow.webp">';
    document.body.appendChild(a);
  }
  // 우피가 페이지를 다시 그릴 수 있어 2초마다 존재 확인 후 재주입
  ensureTopCta();
  setInterval(ensureTopCta, 2000);

  /* ---------- ⑤ 커버 배너 위 투명 탑바 ---------- */
  // 커버(.page_cover)가 있는 페이지: 탑바를 커버 위에 투명하게 얹고(body.onf-clear-top),
  // 스크롤을 내리면 크림 배경으로 복귀(body.onf-scrolled). ownify.css 커버 섹션과 세트.
  // 하위 페이지엔 body.onf-sub도 함께 토글 — 배너를 낮은 띠로 줄임(ownify.css 커버 섹션과 세트).
  // 커버는 노션에 뭐가 걸려 있든 코드가 정한 배너로 강제 — 홈 포함 "전 페이지 한 장"
  // 통일(2026-07-03 Peter 지시: 데스크·OWNIFY 노트 이미지, 위치 일정).
  // 예외 페이지가 생기면 ONF_COVERS에 '/경로': 'URL'로 추가.
  // (세로 위치·높이 통일은 ownify.css의 커버 섹션 규칙이 담당)
  var ONF_COVER = 'https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@a7cea5e/assets/cover-unified.webp';
  var ONF_COVERS = {};
  var ONF_COVER_POS = {};
  function updateClearTop() {
    document.body.classList.toggle('onf-clear-top', !!document.querySelector('.page_cover'));
    // 우피는 좁은 창(≈780px 이하)에서 탑바를 둘로 나눈다: 기존 탑바는 h=0으로 숨고,
    // "모바일 탑바(로고+햄버거, 메뉴 링크 없음)" + "메뉴 스트립(형제 div)"이 나타난다.
    // → 화면에 보이는 탑바에 메뉴 링크가 없으면 분리 상태 = body.onf-nav-split
    //   (ownify.css 분리 상태 규칙과 세트: 메뉴 스트립을 로고 아래로 + CTA 숨김)
    var bars = document.querySelectorAll('.notion-topbar');
    var visibleBar = null;
    for (var bi = 0; bi < bars.length; bi++) {
      if (bars[bi].offsetHeight > 0) { visibleBar = bars[bi]; break; }
    }
    var menuLinks = visibleBar ? visibleBar.querySelectorAll('a[href]').length : 9;
    document.body.classList.toggle('onf-nav-split', !!visibleBar && menuLinks <= 1);
    var home = location.pathname === '/' || location.pathname === '';
    document.body.classList.toggle('onf-sub', !home);
    // 홈 포함 전 페이지 커버 통일
    var c = document.querySelector('.page_cover');
    var path = location.pathname.replace(/\/$/, '');
    var want = ONF_COVERS[path] || ONF_COVER;
    // SPA 이동으로 같은 img가 재사용될 수 있어 "적용한 URL"을 기억해 비교
    if (c && c.tagName === 'IMG' && c.dataset.onfCanon !== want) {
      c.dataset.onfCanon = want;
      c.removeAttribute('srcset');
      c.src = want;
    }
    // 페이지별 초점 보정 (인라인 !important가 CSS 공통값을 덮음)
    if (c && ONF_COVER_POS[path]) {
      c.style.setProperty('object-position', ONF_COVER_POS[path], 'important');
    }
    // ⑤-2 현재 메뉴 표시: 경로가 일치하는 메뉴 링크에 .onf-current(채운 알약 — CSS와 세트).
    // 우피 기본 인디케이터는 호버 잔상 버그가 있어 CSS에서 숨기고 이걸로 대체.
    var norm = location.pathname.replace(/\/$/, '') || '/';
    var navLinks = document.querySelectorAll('.notion-topbar a[href], .notion-topbar ~ div a[href]');
    for (var li = 0; li < navLinks.length; li++) {
      var na = navLinks[li];
      if (na.querySelector('img')) { na.classList.remove('onf-current'); continue; } // 로고 제외
      var lp;
      try { lp = new URL(na.href, location.origin).pathname.replace(/\/$/, '') || '/'; } catch (e) { continue; }
      na.classList.toggle('onf-current', lp === norm && lp !== '/');
    }
  }
  // 색칠(젖빛 유리) 전환 기준: 커버 배너가 탑바 뒤에서 완전히 벗어나는 지점
  // (배너 높이 - 탑바 100px). 커버 없는 페이지는 40px.
  function scrolledThreshold() {
    var c = document.querySelector('.page_cover');
    return c ? Math.max(40, c.offsetHeight - 100) : 40;
  }
  // 스크롤 위치 감지: 기본은 창(window) 스크롤, 일부 레이아웃은 .notion-scroller 내부 스크롤
  // (capture라 둘 다 이 리스너로 들어옴 — 그 외 내부 스크롤 요소는 무시)
  // 모바일(메뉴 분리)은 배너 기준만 쓰면 전환이 너무 늦어 본문 글이 투명 메뉴 밑을
  // 지나며 겹쳐 보임 → 본문이 메뉴 줄에 '닿는 순간'에도 전환 (Peter 2026-07-03).
  function navTouchesText() {
    var content = document.querySelector('.notion-page-content');
    if (!content) return false;
    var strip = null, sibs = document.querySelectorAll('.notion-topbar ~ div');
    for (var i = 0; i < sibs.length; i++) {
      if (sibs[i].offsetHeight > 0 && sibs[i].querySelector('a[href]')) { strip = sibs[i]; break; }
    }
    // 메뉴 줄이 화면 맨 위부터 시작(top:0 + padding-top:100px, CSS '유리 한 장' 구조)이라
    // 뷰포트 기준 바닥 좌표가 곧 헤더 하단
    var headerBottom = strip ? strip.getBoundingClientRect().bottom : 140;
    return content.getBoundingClientRect().top < headerBottom + 6;
  }
  document.addEventListener('scroll', function (e) {
    var t = e.target, y;
    if (t === document) y = window.scrollY;
    else if (t.classList && t.classList.contains('notion-scroller')) y = t.scrollTop;
    else return;
    var on = y > scrolledThreshold();
    if (!on && document.body.classList.contains('onf-nav-split')) on = navTouchesText();
    document.body.classList.toggle('onf-scrolled', on);
  }, true);
  // 창 크기가 바뀌면 메뉴 분리 여부도 바뀔 수 있어 리사이즈 때도 갱신
  window.addEventListener('resize', function () { setTimeout(updateClearTop, 50); });
  // 페이지 이동(SPA)으로 커버 유무가 바뀔 수 있어 본문 변경 때마다 갱신.
  // ⚠️ rAF로 묶기 — 노션은 스크롤 중에도 블록을 수시로 넣었다 빼서, 디바운스 없이는
  // 변이마다 강제 레이아웃(offsetHeight)이 돌아 프레임이 떨어짐(2026-07-04 점검).
  var clearTopPending = false;
  new MutationObserver(function () {
    if (clearTopPending) return;
    clearTopPending = true;
    requestAnimationFrame(function () {
      clearTopPending = false;
      updateClearTop();
      // SPA로 경로가 바뀌었으면 등장 애니메이션·아이콘 정렬 스캔을 다시 돌린다
      // (기존엔 첫 10초 후 영구 종료라 늦게 방문한 페이지에 적용이 안 됐음)
      var path = location.pathname;
      if (window.__onfLastPath !== path) {
        window.__onfLastPath = path;
        startScanBurst();
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
  updateClearTop();

  /* ---------- ②-2 SNS 인스타 버튼 — 오픈 전 알림 (페이지 이동 차단) ---------- */
  // SNS 위젯(우피 head 인라인)의 인스타(a.onf-sns-b)는 아직 실제 계정이 없어
  // 자리표시 href 상태 → 클릭해도 이동하지 않고 준비 중 알림만 띄운다.
  // 인스타 오픈하면: 이 블록을 지우고 우피 head의 .onf-sns-b href를 실제 주소로 교체.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var b = e.target.closest('.onf-sns-b') || e.target.closest('#onfInsta');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    alert('📸 인스타그램 오픈 준비 중입니다 🙏🏻');
  }, true);

  /* ---------- ⑥ SNS 플로팅에 카카오톡 채널 추가 ---------- */
  // SNS 위젯 HTML은 우피 head에 인라인이라(레포 밖) 카카오 항목은 여기서 주입.
  // 위치·등장 애니메이션은 ownify.css 7번 섹션(.onf-sns-k)과 세트 — 메인 버튼 바로 위 첫 슬롯.
  var snsK = setInterval(function () {
    var sns = document.querySelector('.onf-sns');
    if (!sns) return;
    if (!sns.querySelector('.onf-sns-k')) {
      var a = document.createElement('a');
      a.className = 'onf-sns-item onf-sns-k';
      a.href = 'http://pf.kakao.com/_xcBxaPX/chat';   // 오니파이 카카오톡 채널 1:1 채팅 직행
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<img alt="카카오톡 채널" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjI0IiBmaWxsPSIjRkFFMTAwIi8+PHBhdGggZD0iTTUwIDI0Yy0xNi42IDAtMzAgMTAuNy0zMCAyMy44IDAgOC41IDUuNiAxNS45IDE0IDIwLjFsLTIuOSAxMC43Yy0uMjYuOTYuODQgMS43MiAxLjY2IDEuMTdsMTIuOS04LjZjMS40LjE0IDIuOS4yMiA0LjQuMjIgMTYuNiAwIDMwLTEwLjcgMzAtMjMuOFM2Ni42IDI0IDUwIDI0eiIgZmlsbD0iIzNDMUUxRSIvPjwvc3ZnPg==">';
      // PC에선 카카오 1:1 채팅이 앱 전용(웹 미지원)이라 QR 팝업으로 안내. 모바일은 바로 채팅.
      a.addEventListener('click', function (ev) {
        if (onfIsMobileDevice()) return;   // 모바일(iPad 포함)은 앱 채팅 직행
        ev.preventDefault();
        var old = document.querySelector('.onf-qr');
        if (old) { old.remove(); return; }
        var o = document.createElement('div');
        o.className = 'onf-qr';
        o.innerHTML =
          '<div class="onf-qr-card">' +
            '<p class="onf-qr-title">카카오톡 상담</p>' +
            '<img src="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@fb90fba/assets/kakao-chat-qr.png" alt="카카오톡 채팅 QR">' +
            '<p class="onf-qr-hint">휴대폰 카메라로 QR코드를 찍으면<br>오니파이 카카오톡 채널로 연결됩니다</p>' +
            '<a href="http://pf.kakao.com/_xcBxaPX/chat" target="_blank" rel="noopener">카카오 계정으로 웹에서 열기 →</a>' +
          '</div>';
        o.addEventListener('click', function (e2) { if (e2.target === o) o.remove(); });
        document.body.appendChild(o);
      });
      sns.appendChild(a);
    }
    clearInterval(snsK);
  }, 400);

  /* ---------- ⑥-3 블로그 아이콘 'blog' 글자 정중앙 보정 (2026-07-04 Peter) ---------- */
  // 우피 head 위젯의 SVG가 baseline y=63이라 글자가 아래로 쳐져 보임.
  // 잉크 중심 기준(Arial 30px: 어센더~디센더 잉크 중심 = baseline-7.5) 정중앙은 y=57.5.
  // 위젯은 레포 밖(우피 head)이라 여기서 이미지를 교체 — 재렌더 대비 감시 재적용.
  var ONF_BLOG_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" rx="24" fill="#03C75A"/>' +
    '<text x="50" y="57.5" font-family="Arial, \'Apple SD Gothic Neo\', sans-serif" font-size="30" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-1">blog</text></svg>';
  setInterval(function () {
    var im = document.querySelector('.onf-sns-a img');
    if (im && !im.dataset.onfBlogFix) {
      im.dataset.onfBlogFix = '1';
      im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(ONF_BLOG_SVG);
    }
  }, 1200);

  /* ---------- ⑥-2 SNS를 탑 메뉴 항목으로 (2026-07-04 Peter 지시) ---------- */
  // 둥근 SNS 플로팅 버튼 대신 메뉴(How·Where·QnA·Reviews) 옆에 'SNS' 항목을 넣고,
  // 클릭하면 기존 위젯의 아이콘들(카카오→블로그→인스타)이 그 아래로 떨어진다.
  // 위젯(.onf-sns)은 그대로 재사용 — 컨테이너를 메뉴 항목 위치로 옮겨 앵커로 쓴다.
  function positionSnsDropdown() {
    var sns = document.querySelector('.onf-sns');
    var item = document.querySelector('.onf-sns-menu');
    if (!sns || !item || item.offsetHeight === 0) return;
    var r = item.getBoundingClientRect();
    sns.style.setProperty('left', Math.round(r.left + r.width / 2 - 30) + 'px', 'important');
    sns.style.setProperty('top', Math.round(r.top + r.height / 2 - 30) + 'px', 'important');
    sns.style.setProperty('right', 'auto', 'important');
    sns.style.setProperty('bottom', 'auto', 'important');
  }
  function ensureSnsMenu() {
    var sns = document.querySelector('.onf-sns');
    if (!sns) return;
    var cb = sns.querySelector('.onf-sns-cb');
    if (!cb) return;
    // 보이는 메뉴에서 Reviews 링크를 찾아 그 컨테이너에 SNS 항목을 붙인다
    var links = document.querySelectorAll('.notion-topbar a[href], .notion-topbar ~ div a[href]');
    var reviews = null;
    for (var i = 0; i < links.length; i++) {
      if (/Reviews/.test(links[i].textContent || '') && links[i].offsetHeight > 0) { reviews = links[i]; break; }
    }
    if (!reviews) return;
    // ⚠️ Reviews의 직속 부모는 '개별 링크 래퍼'라 거기 넣으면 간격(gap)이 안 붙는다.
    //    메뉴 링크 3개 이상을 담은 flex 컨테이너(진짜 메뉴 행)까지 올라가서 넣어야
    //    다른 항목과 같은 간격·가운데 정렬을 그대로 받는다(2026-07-04 실측).
    var host = reviews.parentElement;
    while (host && host !== document.body) {
      var hcs = getComputedStyle(host);
      if ((hcs.display === 'flex' || hcs.display === 'inline-flex') &&
          host.querySelectorAll('a[href]').length >= 3) break;
      host = host.parentElement;
    }
    if (!host || host === document.body) return;
    var item = document.querySelector('.onf-sns-menu');
    if (!item || item.parentElement !== host) {
      if (item) item.remove();
      item = document.createElement('a');
      item.className = 'onf-sns-menu';
      item.textContent = 'SNS';
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var cbNow = document.querySelector('.onf-sns-cb') || cb;  // 위젯 재생성 대비
        cbNow.checked = !cbNow.checked;
        positionSnsDropdown();
      });
      host.appendChild(item);
    }
    positionSnsDropdown();
  }
  // 바깥을 클릭하면 드롭다운 닫기
  document.addEventListener('click', function (e) {
    var cb = document.querySelector('.onf-sns-cb');
    if (!cb || !cb.checked) return;
    if (e.target.closest && (e.target.closest('.onf-sns') || e.target.closest('.onf-sns-menu'))) return;
    cb.checked = false;
  });
  window.addEventListener('scroll', positionSnsDropdown, true);
  ensureSnsMenu();
  // 메뉴가 그려지는 '즉시' SNS 항목을 붙인다 — 타이머만 쓰면 최대 0.8초 늦게 나타나
  // 깜빡이듯 보임(2026-07-04 Peter). DOM 변화를 감지해 없을 때만 재시도(rAF로 묶음).
  var snsMenuPending = false;
  new MutationObserver(function () {
    if (snsMenuPending || document.querySelector('.onf-sns-menu')) return;
    snsMenuPending = true;
    requestAnimationFrame(function () { snsMenuPending = false; ensureSnsMenu(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(ensureSnsMenu, 800);   // SPA 이동·위치 보정용 백스톱

  /* ---------- ⑦ 브라우저 탭 제목 ---------- */
  // 우피가 페이지 이동 때마다 탭 제목을 노션 페이지 제목으로 다시 쓰므로 주기적으로 강제.
  // 페이지를 추가하려면 아래 맵에 경로: 제목 한 줄만 추가.
  var ONF_TITLES = {
    '/how':     'Ownify┃How',
    '/where':   'Ownify┃Where',
    '/qna':     'Ownify┃QnA',
    '/reviews': 'Ownify┃Reviews',
    '/what':    'Ownify┃What'
  };
  function onfWantTitle() {
    return ONF_TITLES[location.pathname.replace(/\/$/, '')];
  }
  var titleDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
  // ⑦-1 쓰기 가로채기: 우피가 제목을 바꿔 써도 매핑된 페이지에선 즉시 우리 제목으로 치환
  //     (잘못된 제목이 탭에 그려질 틈이 없음 → 깜빡임 제거)
  try {
    Object.defineProperty(document, 'title', {
      configurable: true,
      get: function () { return titleDesc.get.call(document); },
      set: function (v) { titleDesc.set.call(document, onfWantTitle() || v); }
    });
  } catch (e) {}
  // ⑦-2 <title> 노드를 직접 고치는 경우 대비: 변경 감지 즉시 교정
  function enforceTitle() {
    if (!titleDesc) return;   // 극단 환경 방어(디스크립터 없으면 기능만 포기)
    var want = onfWantTitle();
    if (want && titleDesc.get.call(document) !== want) titleDesc.set.call(document, want);
  }
  var titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(enforceTitle).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
  // ⑦-3 라우트 변경 직후 반영용 백스톱
  setInterval(enforceTitle, 500);
  enforceTitle();

  /* ---------- ⑧ 오시는길 지도 (네이버 지도 API, PC·모바일 공통) ---------- */
  // 기존 iframe 임베드는 ①모바일 UA에서 렌더 거부(앱 연동 리다이렉트) ②PC에서도
  // 왼쪽 패널을 CSS로 잘라내는 편법이라, 공식 지도 API(Dynamic Map)로 전 기기 통일(2026-07-02).
  //   API 로드/인증 실패 시엔 "탭하면 네이버지도가 열리는" 이미지 폴백 자동 표시.
  //   Client ID는 도메인 제한(ownify.co.kr)이라 공개돼도 무방. (ownify.css 규칙과 세트)
  var ONF_PLACE = { lat: 37.5102816, lng: 127.0966326 };   // 오니파이(롯데웰빙센터)
  // iPadOS 13+는 UA가 'Macintosh'라 정규식만으론 PC로 오판 → 터치 포인트로 보강
  function onfIsMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && (navigator.maxTouchPoints || 0) > 1);
  }
  // 인증 실패 시 네이버가 이 전역 함수를 호출 → API 지도 제거하고 이미지 폴백 유지
  window.navermap_authFailure = function () {
    // 실패 플래그를 남겨야 함 — 없으면 1초 루프가 지도 생성→실패→제거를 영원히
    // 반복하며 리스너를 누적시킴(2026-07-04 점검에서 발견)
    window.__onfMapAuthFailed = true;
    document.body.classList.remove('onf-map-api-on');
    var d = document.querySelector('.onf-map-api');
    if (d) d.remove();
  };
  function buildApiMap(block) {
    if (window.__onfMapAuthFailed) return;   // 인증 실패면 이미지 폴백만 유지
    if (!window.naver || !naver.maps || block.querySelector('.onf-map-api')) return;
    var d = document.createElement('div');
    d.className = 'onf-map-api';
    block.appendChild(d);
    var pos = new naver.maps.LatLng(ONF_PLACE.lat, ONF_PLACE.lng);
    var map = new naver.maps.Map(d, { center: pos, zoom: 17 });
    new naver.maps.Marker({ position: pos, map: map, title: '오니파이' });
    document.body.classList.add('onf-map-api-on');
    // 자가 교정: 지도의 내부 크기가 컨테이너와 어긋나면(좁게 초기화됐거나 뒤늦게 커짐)
    // 리사이즈를 트리거해 타일을 다시 꽉 채운다. 크기가 맞으면 아무것도 안 함
    // (사용자가 지도를 움직여도 방해하지 않기 위해 "어긋났을 때만" 고친다).
    function heal() {
      var sz = map.getSize();                 // 지도가 인지한 크기
      var cw = d.clientWidth, ch = d.clientHeight;
      if (cw > 0 && ch > 0 && (Math.abs(sz.width - cw) > 2 || Math.abs(sz.height - ch) > 2)) {
        naver.maps.Event.trigger(map, 'resize');
        map.setCenter(pos);
      }
    }
    d.__onfHeal = heal;                        // ensureCustomMap 1초 루프가 매번 호출
    [100, 300, 700, 1500, 3000].forEach(function (ms) { setTimeout(heal, ms); });
    if (window.ResizeObserver) new ResizeObserver(heal).observe(d);
    // window 리스너는 1회만 — buildApiMap마다 등록하면 재렌더 때 옛 지도를 잡은
    // 클로저가 계속 쌓임(누수, 2026-07-04 점검). 현재 지도의 heal을 찾아 위임.
    if (!window.__onfMapResizeBound) {
      window.__onfMapResizeBound = true;
      window.addEventListener('resize', function () {
        var cur = document.querySelector('.onf-map-api');
        if (cur && cur.__onfHeal) cur.__onfHeal();
      });
    }
  }
  // 우피가 렌더한 원본 지도 iframe(+빈 래퍼)을 DOM에서 제거하고 내 요소만 남긴다.
  // CSS 숨김은 재렌더와 경쟁해 깜빡임 → 아예 제거. 빈 래퍼가 남으면 API 지도를 아래로
  // 밀어내 잘리므로, iframe 유무와 상관없이 "내가 안 만든 직속 자식"을 통째로 제거한다.
  function cleanBlock(block) {
    Array.prototype.slice.call(block.children).forEach(function (c) {
      var cls = c.className && c.className.toString ? c.className.toString() : '';
      if (cls.indexOf('onf-map-') === -1) c.remove();
    });
  }
  // ⑧-3 지도 아래 도보 길찾기 임베드 (잠실역 2호선 → 오니파이). PC 전용 —
  // 네이버 길찾기 웹페이지를 iframe으로 끼우고 왼쪽 경로 패널은 CSS(.onf-directions)로 크롭.
  // (모바일 UA는 네이버가 iframe을 거부해 빈 화면이 되므로 아예 주입하지 않음)
  var ONF_DIRECTIONS = 'https://map.naver.com/p/directions/3zmKkz,2AJN93,%EC%9E%A0%EC%8B%A4%EC%97%AD(%EB%A0%88%EC%9D%B4%ED%81%AC%ED%8C%B0%EB%A6%AC%EC%8A%A4)4%EB%B2%88%EC%B6%9C%EA%B5%AC,21405356,PLACE_POI/3zmDLo,2AJGJW,%EC%98%A4%EB%8B%88%ED%8C%8C%EC%9D%B4,2094664237,PLACE_POI/-/walk?c=16.00,0,0,0,dh';
  function ensureDirections(block) {
    if (onfIsMobileDevice()) return;
    var wrapEx = document.querySelector('.onf-directions');
    if (wrapEx) {
      // 위치가 틀어졌으면 재배치(중복 생성 방지), URL은 원문 비교
      // (.src는 브라우저가 정규화해 항상 불일치 → 매초 리로드되던 버그, 2026-07-04)
      if (block.nextElementSibling !== wrapEx) block.insertAdjacentElement('afterend', wrapEx);
      var ex = wrapEx.querySelector('.onf-directions-frame');
      if (ex && ex.getAttribute('src') !== ONF_DIRECTIONS) ex.setAttribute('src', ONF_DIRECTIONS);
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'onf-directions';
    var f = document.createElement('iframe');
    f.className = 'onf-directions-frame';
    f.loading = 'lazy';
    f.src = ONF_DIRECTIONS;
    wrap.appendChild(f);
    block.insertAdjacentElement('afterend', wrap);
  }
  function ensureCustomMap() {
    var block = document.querySelector('[data-block-id="2a11866f-119c-4e50-9a8e-058529413e1e"]');
    if (!block) return;
    document.body.classList.add('onf-map-custom');
    cleanBlock(block);
    ensureDirections(block);
    // 우피가 원본 지도를 다시 그려 넣는 즉시 또 제거 (같은 프레임 → 깜빡임 없음, 1회만 등록)
    if (!block.__onfMapGuard) {
      block.__onfMapGuard = new MutationObserver(function () { cleanBlock(block); });
      block.__onfMapGuard.observe(block, { childList: true });
    }
    // 지도 우하단 '네이버지도에서 보기' 버튼 (플레이스 사진·리뷰·길찾기로 연결)
    if (!block.querySelector('.onf-map-link')) {
      var l = document.createElement('a');
      l.className = 'onf-map-link';
      l.href = 'https://map.naver.com/p/entry/place/2094664237';
      l.target = '_blank';
      l.rel = 'noopener';
      l.textContent = '네이버지도에서 보기 →';
      block.appendChild(l);
    }
    // ⑧-1 이미지 폴백 (항상 깔아두고, API 지도가 성공하면 CSS가 이미지를 숨김)
    if (!block.querySelector('.onf-map-mobile')) {
      var a = document.createElement('a');
      a.className = 'onf-map-mobile';
      a.href = 'https://map.naver.com/p/entry/place/2094664237';   // 오니파이 네이버 플레이스
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML =
        '<img alt="오니파이 위치 지도" src="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@fb90fba/assets/ownify-naver-map.png">' +
        '<span>지도를 탭하면 네이버지도가 열려요</span>';
      block.appendChild(a);
    }
    // 이미 만든 지도가 좁게 굳었으면 매 틱 자가 교정 (크기 맞으면 아무 일 안 함)
    var apiDiv = block.querySelector('.onf-map-api');
    if (apiDiv && apiDiv.__onfHeal) apiDiv.__onfHeal();
    // ⑧-2 네이버 지도 API 로드 (1회) 후 지도 생성
    if (window.naver && window.naver.maps) { buildApiMap(block); return; }
    if (window.__onfMapsLoading) return;
    window.__onfMapsLoading = true;
    var s = document.createElement('script');
    s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=vkgwjbsdel';
    s.onload = function () {
      var b = document.querySelector('[data-block-id="2a11866f-119c-4e50-9a8e-058529413e1e"]');
      if (b) buildApiMap(b);
    };
    document.head.appendChild(s);
  }
  setInterval(ensureCustomMap, 1000);
  ensureCustomMap();

  /* ---------- ⑨ How 단계 카드 — 타자 완료 연쇄 등장 ---------- */
  // /how의 3열 카드(2026-07-04 Peter 확정 연출): 처음엔 카드1만 보이고 타자기.
  // 카드1 타자 완료 → 화살표1 등장 → 카드2 등장 → 카드2 타자 → 화살표2 → 카드3 → 타자….
  // 클릭 전개·말풍선은 폐지. 화살표 흔들림 모션은 유지(ownify.css .onf-step-*와 세트).
  var STEP_COL = 'b8fd976b-8eff-4bb5-b837-209e0c1303ea';
  var STEP_EMOJI = 'https://immplee.github.io/ONF_Homepage/assets/how-step-emoji.png';
  var STEP_EMOJI_DOWN = 'https://immplee.github.io/ONF_Homepage/assets/how-step-arrow-down.png';  // 모바일 세로 전개용(Peter 제공)
  var stepBlockSeen = false;
  var stepArrowCount = 0;  // 화살표 개수(바뀔 때 애니메이션 동기화)
  var stepsSettled = false;   // 레이아웃 안정 여부(타자기 시작 게이트)
  var stepReveals = [];       // 타자기 큐: {idx, card, start, started, finished}
  var stepsShown = 1;         // 보이는 카드 수 — 타자 완료에 따라 자동 증가
  var arrowsShown = 0;        // 보이는 화살표 수 — 다음 카드보다 한 박자 먼저
  var stepAdvancing = false;  // 화살표→카드 전환 중 이중 발동 방지
  // ⑨-2 폴링(순차 연쇄): 첫 미완료 카드만 본다 — 화면에 보이면 타자 시작, 진행 중이면 대기.
  // 보이는 카드가 전부 완료되면 화살표(250ms) → 다음 카드(800ms) 순서로 자동 전개.
  setInterval(function () {
    if (!stepsSettled) return;
    var q = stepReveals.slice().sort(function (a, b) { return a.idx - b.idx; });
    for (var i = 0; i < q.length; i++) {
      var e = q[i];
      if (e.card && !e.card.isConnected) e.finished = true;  // 재렌더로 버려진 노드는 통과
      if (e.finished) continue;
      if (!e.started) {
        var r = e.card.getBoundingClientRect();
        if (r.height > 0 && r.bottom > 0 && r.bottom <= window.innerHeight) e.start();
      }
      return;  // 순차 보장: 첫 미완료 카드만 처리
    }
    // 여기 도달 = 보이는 카드 모두 타자 완료 → 다음 단계 전개
    if (stepAdvancing) return;
    var cl = document.querySelector('[data-block-id="' + STEP_COL + '"]');
    if (!cl) return;
    var totalCols = cl.querySelectorAll('.notion-column-block').length;
    if (stepsShown >= totalCols) return;   // 전부 나옴 — 연출 끝
    stepAdvancing = true;
    setTimeout(function () { arrowsShown = stepsShown; ensureSteps(); }, 250);
    setTimeout(function () { stepsShown++; stepAdvancing = false; ensureSteps(); }, 800);
  }, 200);
  // 카드 본문(마지막 텍스트 블록)을 왼쪽부터 한 글자씩 나타냄. 글자 자리는 처음부터 차지해
  // (opacity로만 노출) 높이 균등·줄바꿈이 흔들리지 않는다. 카드가 보일 때 1회만.
  // ⚠️ 완료 표시는 '노드 자체'(dataset)에 — 우피가 로드 초기에 콜아웃을 갈아치우므로
  //    인덱스 플래그면 버려질 초기 노드에 소모돼 교체된 안정 노드가 건너뛰어진다.
  function typeBody(callout, idx) {
    if (!callout) return;
    var blocks = callout.querySelectorAll('.notion-text-block');
    if (blocks.length < 3) return;                 // 제목·태그·본문
    // 본문 = '마지막 비어있지 않은' 텍스트 블록 (카드에 따라 끝에 빈 블록이 있어 마지막 고정 금지)
    var body = null;
    for (var bi = blocks.length - 1; bi >= 0; bi--) {
      if ((blocks[bi].textContent || '').trim()) { body = blocks[bi]; break; }
    }
    if (!body || body.dataset.onfTyped) return;
    var full = body.textContent;
    if (!full.trim()) return;
    body.dataset.onfTyped = '1';
    body.classList.add('onf-type');
    body.textContent = '';
    var spans = [];
    for (var k = 0; k < full.length; k++) {
      var s = document.createElement('span');
      s.className = 'onf-type-c';
      s.textContent = full.charAt(k);
      body.appendChild(s);
      spans.push(s);
    }
    // 실제 타이핑(노출)은 ⑨-2 순차 폴링이 시작시킨다 — 앞 카드가 다 타이핑된 뒤에만
    // 다음 카드 차례가 온다. (글자 자리는 위에서 이미 잡아둬 레이아웃은 안정)
    var entry = { idx: idx || 0, card: callout, started: false, finished: false, start: null };
    entry.start = function () {
      if (entry.started) return;
      entry.started = true;
      var j = 0;
      var iv = setInterval(function () {
        if (j >= spans.length) { clearInterval(iv); entry.finished = true; return; }
        spans[j].classList.add('on');
        j++;
      }, 42);
    };
    stepReveals.push(entry);
  }
  function ensureSteps() {
    var cl = document.querySelector('[data-block-id="' + STEP_COL + '"]');
    if (!cl) { stepBlockSeen = false; return; }
    if (!stepBlockSeen) {  // 페이지 재진입 시 처음부터(타자기 완료표시는 노드 dataset이라 새 노드면 자동 재실행)
      stepBlockSeen = true;
      stepsShown = 1; arrowsShown = 0; stepAdvancing = false;   // 연쇄 처음부터
      stepsSettled = false; stepReveals = [];    // 레이아웃 안정 타이머 재시작
      setTimeout(function () { stepsSettled = true; }, 1800);
    }
    // 카드 블록 폭의 단일 정의처(2026-07-04 일원화). 과거 CSS의 '+36px 확장'(칩 한 줄용)을
    // 우피 기본값으로 오인해 서로 덮던 혼선을 정리 — 폭은 100%(왼쪽 줄 정렬), 칩 한 줄은
    // 화살표 칸·칩 패딩 조임(ownify.css)으로 확보한다.
    cl.style.setProperty('margin-left', '0', 'important');
    cl.style.setProperty('margin-right', '0', 'important');
    cl.style.setProperty('width', '100%', 'important');
    cl.style.setProperty('max-width', '100%', 'important');
    var cols = cl.querySelectorAll('.notion-column-block');
    if (cols.length < 2) return;   // 카드 수가 늘어도 동작(2026-07-04)
    // 컬럼 안의 "빈 문단" 숨김 — 데스크톱에선 티 안 나지만 모바일 세로 스택에서
    // 카드 사이 간격을 벌리고 화살표를 한쪽으로 밀어낸다(2026-07-04 실측)
    cl.querySelectorAll('.notion-text-block').forEach(function (tb) {
      if (!(tb.textContent || '').trim() && !tb.querySelector('img')) tb.style.display = 'none';
    });
    // 컬럼은 개별 래퍼(block)에 싸여 있고, 진짜 가로 flex 행은 그 래퍼들의 부모다.
    // → flex 행을 찾고, 각 컬럼의 "flex 행 직속 자식(래퍼)"을 기준으로 조작한다.
    // 진짜 가로 flex 행 = "모든 카드를 담은" flex 조상. (래퍼를 flex로 만들어도 오인 안 하게
    // '마지막 카드까지 포함'을 조건에 넣는다 — 래퍼는 카드 1개만 담아 걸러진다.)
    var last = cols[cols.length - 1];
    // ⚠️ 탐색은 반드시 "컬럼 리스트 블록(cl) 안"으로 제한한다.
    //    우피는 모바일(≤780px)에서 컬럼 컨테이너를 display:block으로 바꾸므로,
    //    'display:flex' 조건으로 찾으면 페이지 전체(.notion-page-content)까지 올라가
    //    본문 전체가 숨는 대형 사고가 난다(2026-07-03 실측). 컨테이너가 block이어도
    //    조작(래퍼·화살표·숨김)은 동일하게 동작하고, 모바일 세로 스택은 CSS가 담당.
    var flexRow = cols[0].parentElement;
    while (flexRow && cl.contains(flexRow) && !(flexRow !== last && flexRow.contains(last))) {
      flexRow = flexRow.parentElement;
    }
    if (!flexRow || !cl.contains(flexRow)) return;
    // 과거 버전이 페이지에 잘못 붙였을 수 있는 클래스 청소(캐시된 옛 JS 흔적 복구)
    document.querySelectorAll('.onf-steps-flex').forEach(function (el) {
      if (el !== flexRow) el.classList.remove('onf-steps-flex');
    });
    document.querySelectorAll('.onf-step-wrap').forEach(function (el) {
      if (!cl.contains(el) || el === cl) el.classList.remove('onf-step-wrap', 'onf-step-hidden');
    });
    flexRow.classList.add('onf-steps-flex');
    function wrapperOf(col) { var w = col; while (w.parentElement && w.parentElement !== flexRow) w = w.parentElement; return w; }
    cols.forEach(function (c, i) {
      var wrap = wrapperOf(c);
      wrap.classList.add('onf-step-wrap');   // CSS로 폭·높이 제어(우피 간격 요소와 구분)
      var visible = i < stepsShown;
      // 숨김은 visibility 클래스 — 자리는 3장 최종 배치 그대로 차지(크기·위치 불변),
      // 등장은 보이기만 켜는 것(2026-07-04 Peter)
      wrap.classList.toggle('onf-step-hidden', !visible);
      if (visible) typeBody(c.querySelector('.notion-callout-block'), i);  // 타자기 등록(순차는 ⑨-2가)
      // 카드 i 앞 화살표: 처음부터 자리에 넣어두고(레이아웃 고정), 다음 카드보다
      // 한 박자 먼저(arrowsShown 기준) 보이게 한다
      if (i >= 1) {
        var prev = wrap.previousElementSibling;
        var ar = (prev && prev.classList && prev.classList.contains('onf-step-arrow')) ? prev : null;
        if (!ar) {
          ar = document.createElement('div');
          ar.className = 'onf-step-arrow';
          // 가로(데스크톱)·세로(모바일) 화살표를 둘 다 넣고 CSS 미디어쿼리가 표시를 고른다
          ar.innerHTML = '<img class="onf-arrow-h" alt="다음" src="' + STEP_EMOJI + '">' +
            '<img class="onf-arrow-v" alt="다음" src="' + STEP_EMOJI_DOWN + '">';
          flexRow.insertBefore(ar, wrap);
        }
        ar.classList.toggle('onf-step-hidden', i > arrowsShown);
      }
      // 옛 캐시 JS가 남겼을 수 있는 클릭 유도 잔재 청소
      c.classList.remove('onf-step-poke');
      var bubble = c.querySelector('.onf-step-bubble');
      if (bubble) bubble.remove();
    });
    alignCalloutIcons();  // 새로 나타난 단계 카드의 이모지도 첫 줄 중심에 재정렬
    // 높이 균등: 보이는 카드들의 '자연 높이'를 재서 가장 큰 값으로 min-height 통일.
    // ⚠️ 카드가 새로 나타나면 옆 카드 폭이 줄며 줄바꿈이 바뀌므로, rAF로 폭 반영을
    //    기다린 뒤 (min-height 비움 → 강제 리플로 → 측정 → 설정) 해야 정확하다.
    var eqContents = [];   // 숨김 카드도 포함 — 자리·높이가 처음부터 최종값으로 고정되게
    cols.forEach(function (c) {
      var ct = c.querySelector('.notion-callout-block [class*="CalloutBlock_content"]');
      if (ct) eqContents.push(ct);
    });
    requestAnimationFrame(function () {
      eqContents.forEach(function (ct) { ct.style.minHeight = ''; });
      void flexRow.offsetHeight;                       // 폭 변화 반영 강제
      var maxH = 0;
      eqContents.forEach(function (ct) { if (ct.offsetHeight > maxH) maxH = ct.offsetHeight; });
      if (maxH > 0) eqContents.forEach(function (ct) { ct.style.minHeight = maxH + 'px'; });
      // 화살표를 '카드' 세로 정중앙에 맞춤 — 래퍼 여분 높이에 딸리지 않게 카드 기준으로 배치.
      var arrows = flexRow.querySelectorAll('.onf-step-arrow');
      if (eqContents.length && arrows.length) {
        var rowTop = flexRow.getBoundingClientRect().top;
        var cardTop = eqContents[0].getBoundingClientRect().top;
        var cardH = eqContents[0].getBoundingClientRect().height;
        arrows.forEach(function (ar) {
          ar.style.marginTop = Math.round(cardTop - rowTop) + 'px';
          ar.style.height = Math.round(cardH) + 'px';
        });
      }
      // 화살표 개수가 바뀌면(새 화살표 등장) 모든 화살표 애니메이션을 같은 순간에 재시작 → 동기화
      if (arrows.length !== stepArrowCount) {
        stepArrowCount = arrows.length;
        arrows.forEach(function (ar) { var im = ar.querySelector('img'); if (im) im.style.animation = 'none'; });
        void flexRow.offsetHeight;
        arrows.forEach(function (ar) { var im = ar.querySelector('img'); if (im) im.style.animation = ''; });
      }
    });
  }
  setInterval(ensureSteps, 700);
  ensureSteps();

  /* ---------- ⑩ 두 번째 How 카드 섹션 높이 균등 ('한국인 선생님' 3장) ---------- */
  // 순차 등장은 없고 항상 3장. 카드 높이만 자동 균등(테두리는 ownify.css에서 처리).
  var STEP2_COL = 'd28c173e-5cd4-4e01-b514-0d4a90fe7983';
  function ensureSteps2() {
    var cl = document.querySelector('[data-block-id="' + STEP2_COL + '"]');
    if (!cl) return;
    var contents = [];
    cl.querySelectorAll('.notion-callout-block [class*="CalloutBlock_content"]').forEach(function (ct) {
      if (ct.offsetParent !== null) contents.push(ct);
    });
    if (contents.length < 2) return;
    requestAnimationFrame(function () {
      contents.forEach(function (ct) { ct.style.minHeight = ''; });
      void cl.offsetHeight;
      var maxH = 0;
      contents.forEach(function (ct) { if (ct.offsetHeight > maxH) maxH = ct.offsetHeight; });
      if (maxH > 0) contents.forEach(function (ct) { ct.style.minHeight = maxH + 'px'; });
    });
  }
  setInterval(ensureSteps2, 800);
  ensureSteps2();

  /* ---------- ⑪ 페이지 진입 시 항상 맨 위부터 (2026-07-04 Peter 지시) ----------
     재방문·뒤로가기 때 브라우저 스크롤 복원(scrollRestoration)이나 우피 내부 이동의
     이전 위치가 남아 살짝 내려간 채 열리는 문제 → 진입 시 강제로 맨 위.
     앵커(#해시) 링크로 온 경우는 그 위치를 존중해 건드리지 않는다. */
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  function onfToTop() { if (!location.hash) window.scrollTo(0, 0); }
  // 우피(Next.js)는 복원 위치를 sessionStorage(__next_scroll_*)에 두고 pageshow "뒤에"
  // 늦게 복원한다(새로고침 실측 2026-07-04) → 소스 제거 + 진입 후 0.7초 버스트로 방어.
  function onfTopBurst() {
    if (location.hash) return;
    try {
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.indexOf('__next_scroll') === 0) sessionStorage.removeItem(k);
      });
    } catch (e) {}
    var t0 = Date.now();
    (function tick() {
      if (window.scrollY > 0) window.scrollTo(0, 0);
      if (Date.now() - t0 < 700) requestAnimationFrame(tick);
    })();
  }
  window.addEventListener('pageshow', onfTopBurst);   // 첫 로드 + bfcache 복원 모두
  document.addEventListener('DOMContentLoaded', onfToTop);
  // 우피 내부 메뉴 이동(SPA)은 pageshow가 안 뜸 → 경로 변화를 감지해 맨 위로
  var onfPath = location.pathname;
  setInterval(function () {
    if (location.pathname !== onfPath) { onfPath = location.pathname; onfToTop(); }
  }, 250);

})();