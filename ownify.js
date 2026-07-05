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
        '<p class="onf-footer-copy">© 2026 Ownify. All rights reserved.</p>' +
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
    // /reviews·리뷰 상세에도 하위 배너 주입 — 노션에 커버가 없어 배너가 안 떴음(2026-07-04 Peter).
    // 다른 하위 페이지와 같은 클래스·인라인으로 만들면 기존 커버 CSS·교체 로직이 그대로 먹는다.
    var rp = location.pathname.replace(/\/$/, '');
    if ((rp === '/reviews' || document.body.classList.contains('onf-review-detail')) &&
        !document.querySelector('.page_cover')) {
      var wp = document.querySelector('.width.padding');
      if (wp && wp.parentElement) {
        var ci = document.createElement('img');
        ci.className = 'page_cover css-1xdhyk6 e5kxa4l0';
        ci.setAttribute('style', 'display:block;object-fit:cover;border-radius:0px;width:100%;height:var(--page-cover-height)');
        wp.parentElement.insertBefore(ci, wp);
      }
    }
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
  var onfRawTitle = '';   // 우피가 쓰려던 원제목(리뷰 상세 = 작성자명, 🧡 포함) 보관
  // 리뷰 상세 여부를 body 클래스 없이 직접 판정 — 스크립트 실행 즉시(head 단계,
  // body 생기기 전) 제목을 치환해야 작성자명이 먼저 떴다 바뀌는 깜빡임이 없다(2026-07-04).
  function onfIsReviewDetail() {
    var m = location.pathname.replace(/\/+$/, '').match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
    if (!m) return false;
    try {
      return JSON.parse(localStorage.getItem('onfReviewOrder') || '[]').indexOf(m[1]) !== -1;
    } catch (e) { return false; }
  }
  function onfWantTitle() {
    var fixed = ONF_TITLES[location.pathname.replace(/\/$/, '')];
    if (fixed) return fixed;
    // 리뷰 상세: Ownify┃Reviews┃작성자명 (2026-07-04 Peter)
    if (onfIsReviewDetail()) {
      var raw = onfRawTitle;
      if (!raw && titleDesc) {
        var cur = titleDesc.get.call(document);   // 스크립트보다 먼저 쓰인 초기 <title> 대비
        if (cur && cur.indexOf('Ownify┃') !== 0) raw = cur.trim();
      }
      if (raw) return 'Ownify┃Reviews┃' + raw;
    }
    return undefined;
  }
  var titleDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
  // ⑦-1 쓰기 가로채기: 우피가 제목을 바꿔 써도 매핑된 페이지에선 즉시 우리 제목으로 치환
  //     (잘못된 제목이 탭에 그려질 틈이 없음 → 깜빡임 제거)
  try {
    Object.defineProperty(document, 'title', {
      configurable: true,
      get: function () { return titleDesc.get.call(document); },
      set: function (v) {
        if (v && v.indexOf('Ownify┃') !== 0) onfRawTitle = String(v).trim();  // 원제목 갱신
        titleDesc.set.call(document, onfWantTitle() || v);
      }
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
      // 첫 미완료가 아직 등장 전(숨김 래퍼) = 보이는 카드는 다 끝남 → 아래 전개 단계로.
      // (스테이징 조기 등록 때문에 숨김 엔트리가 큐에 먼저 들어와 있다 — 2026-07-04)
      if (e.card.closest('.onf-step-hidden')) break;
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
    // 연출 스테이징(2026-07-04 Peter "부드럽게"): 아이콘·제목·칩을 숨겨뒀다가
    // start()가 순서대로 등장시킨다 — 등록과 같은 동기 블록이라 원본이 비칠 틈 없음.
    callout.classList.add('onf-stagecard');
    var title = null;
    for (var ti2 = 0; ti2 < blocks.length; ti2++) {
      if ((blocks[ti2].textContent || '').trim()) { title = blocks[ti2]; break; }
    }
    if (title && title !== body) title.classList.add('onf-head-t');
    var chips = [];
    callout.querySelectorAll('span[style*="SFMono"]').forEach(function (ch) {
      if (!body.contains(ch)) { ch.classList.add('onf-chip-stage'); chips.push(ch); }
    });
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
    // 시작은 ⑨-2 순차 폴링이 — 앞 카드가 다 끝난 뒤에만 다음 카드 차례.
    // start() 내부 연출 순서: (카드 박스는 CSS onfCardIn이 이미 페이드인)
    // +250ms 이모지·제목 스윽 → +700ms부터 칩 130ms 간격 팝 → 그 뒤 본문 타자기.
    var entry = { idx: idx || 0, card: callout, started: false, finished: false, start: null };
    entry.start = function () {
      if (entry.started) return;
      entry.started = true;
      // 빈칸 시간 단축(2026-07-06 Peter): 카드가 보이면 이모지·제목→칩→본문이 바로 순서대로.
      setTimeout(function () { callout.classList.add('onf-head-in'); }, 100);
      chips.forEach(function (ch, k) {
        setTimeout(function () { ch.classList.add('onf-chip-in'); }, 300 + k * 90);
      });
      setTimeout(function () {
        var j = 0;
        var iv = setInterval(function () {
          if (j >= spans.length) { clearInterval(iv); entry.finished = true; return; }
          spans[j].classList.add('on');
          j++;
        }, 42);
      }, 300 + chips.length * 90 + 120);
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
      setTimeout(function () { stepsSettled = true; }, 500);   // 1800→500: 첫 카드 빈칸 시간 단축(2026-07-06 Peter)
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
      // 스테이징(제목·칩 숨김+타자 등록)은 카드가 보이기 "전"에 미리 — 등장 순간
      // 원본 내용이 한 프레임이라도 비치면 이중 연출로 보임(2026-07-04 Peter 리포트).
      // 숨김 카드의 조기 타이핑은 ⑨-2가 onf-step-hidden 확인으로 막는다.
      typeBody(c.querySelector('.notion-callout-block'), i);
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
  // /reviews로 '갤러리 보기'인 채 돌아오는 경우(뒤로가기)엔 맨위 강제를 건너뛴다 —
  // 저장해둔 스크롤 위치를 ⑬이 복원하게(2026-07-06 Peter). 그 외 페이지는 기존대로 맨위.
  function onfIsReviewDetailPath() {
    return /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(location.pathname.replace(/\/+$/, ''));
  }
  function onfSkipTop() {
    try {
      var rp = location.pathname.replace(/\/+$/, '');
      // 갤러리 보기로 뒤로가기 복귀 → 저장 스크롤 복원(⑬)에 맡김
      if (rp === '/reviews' && sessionStorage.getItem('onfRvView') === 'gallery' &&
          parseInt(sessionStorage.getItem('onfRvScroll') || '0', 10) > 0) return true;
      // 데스크톱 리뷰 상세: 배너 보이는 선까지 내려주므로(task1) 맨위 강제 스킵
      if (window.innerWidth > 780 && onfIsReviewDetailPath()) return true;
      return false;
    } catch (e) { return false; }
  }
  function onfToTop() { if (!location.hash && !onfSkipTop()) window.scrollTo(0, 0); }
  // 우피(Next.js)는 복원 위치를 sessionStorage(__next_scroll_*)에 두고 pageshow "뒤에"
  // 늦게 복원한다(새로고침 실측 2026-07-04) → 소스 제거 + 진입 후 0.7초 버스트로 방어.
  function onfTopBurst() {
    if (location.hash || onfSkipTop()) return;
    try {
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.indexOf('__next_scroll') === 0) sessionStorage.removeItem(k);
      });
    } catch (e) {}
    // ⚠️ 사용자가 스크롤을 시작하면 즉시 중단 — 버스트가 사용자 스크롤을 맨 위로
    // 되돌려 "막혔다 다시 내려가는" 느낌을 만들었음(2026-07-04 /how 실측, Peter 리포트).
    var stop = false;
    function stopper() { stop = true; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) {
      window.addEventListener(t, stopper, { once: true, passive: true });
    });
    var t0 = Date.now();
    (function tick() {
      if (stop) return;
      if (window.scrollY > 0) window.scrollTo(0, 0);
      if (Date.now() - t0 < 700) requestAnimationFrame(tick);
    })();
  }
  window.addEventListener('pageshow', onfTopBurst);   // 첫 로드 + bfcache 복원 모두
  document.addEventListener('DOMContentLoaded', onfToTop);
  // 우피 내부 메뉴 이동(SPA)은 pageshow가 안 뜸 → 경로 변화를 감지해 맨 위로
  var onfPath = location.pathname;
  setInterval(function () {
    if (location.pathname !== onfPath) {
      onfPath = location.pathname;
      onfToTop();
      onfReviewTick();   // 리뷰 상세 판정도 즉시 — 확대 CSS가 첫 렌더 전에 걸리게(⑫)
    }
  }, 250);

  /* ---------- ⑫ 리뷰 상세: 이미지 확대 + 뒤로/다음 내비 (2026-07-04 Peter) ---------- */
  // /reviews 갤러리에서 카드 순서를 기억해두고(localStorage), 카드 상세(/<페이지id>)에
  // 들어가면 좌우 고정 버튼(왼쪽=목록으로, 오른쪽=다음 리뷰)을 붙인다. 이미지 확대는
  // CSS(body.onf-review-detail, §14)가 담당. 목록을 안 거친 직접 진입은 내비 생략.
  var REV_KEY = 'onfReviewOrder';
  var REV_ARROW_L = 'https://immplee.github.io/ONF_Homepage/assets/review-arrow-left.png';
  var REV_ARROW_R = 'https://immplee.github.io/ONF_Homepage/assets/review-arrow-right.png';
  var REV_EXIT = 'https://immplee.github.io/ONF_Homepage/assets/review-exit-emoji.png';
  function onfReviewNavClear() {
    ['.onf-rev-back', '.onf-rev-next', '.onf-rev-close'].forEach(function (sel) {
      var el = document.querySelector(sel); if (el) el.remove();
    });
  }
  // task1(2026-07-06 Peter): 데스크톱에서 갤러리 카드로 상세 진입 시 배너 보이는 선까지 스크롤
  //   (리스트뷰 썸네일 클릭과 동일 수준 = 커버 하단 −120). onfSkipTop이 이 경로의 맨위 강제를 꺼둠.
  var onfRvLastDetail = null;
  function onfReviewDetailScroll() {
    if (window.innerWidth <= 780) return;   // 데스크톱만
    try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('__next_scroll') === 0) sessionStorage.removeItem(k); }); } catch (e) {}
    var stop = false;
    function stopper() { stop = true; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, stopper, { once: true, passive: true }); });
    [50, 200, 450, 800].forEach(function (d) {
      setTimeout(function () {
        if (stop || !onfIsReviewDetailPath()) return;
        var cover = document.querySelector('.page_cover');
        var target = cover ? (cover.getBoundingClientRect().bottom + window.scrollY - 120) : 0;
        if (target < 0) target = 0;
        window.scrollTo(0, target);
      }, d);
    });
  }
  // 좌우 스와이프 헬퍼(모바일 리뷰 넘기기, 2026-07-06 Peter). 요소당 1회만 부착(__onfSwipe 가드).
  // 수평 이동이 세로보다 크고 40px 넘을 때만 발동 → 세로 스크롤과 충돌 안 함.
  function onfAddSwipe(el, onLeft, onRight) {
    if (!el || el.__onfSwipe) return;
    el.__onfSwipe = true;
    var x0 = 0, y0 = 0, tracking = false;
    el.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = (e.changedTouches && e.changedTouches[0]); if (!t) return;
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;   // 수평 스와이프만
      if (dx < 0) { if (onLeft) onLeft(); } else { if (onRight) onRight(); }
    }, { passive: true });
  }
  // 판정을 함수로 분리해 즉시·DOMContentLoaded·경로변경 때도 호출(2026-07-04):
  // 인터벌만으로는 첫 렌더보다 늦어 이미지가 '작게 보였다 커지는' 깜빡임이 생겼음.
  function onfReviewTick() {
    if (!document.body) return;
    var path = location.pathname.replace(/\/+$/, '');
    if (path === '/reviews') {
      // 갤러리 순서 수집 — '더 보기'로 카드가 늘면 다음 틱에 자동 갱신
      var ids = Array.prototype.map.call(
        document.querySelectorAll('.notion-collection-item'),
        function (el) { return el.getAttribute('data-block-id'); }
      ).filter(Boolean);
      if (ids.length) { try { localStorage.setItem(REV_KEY, JSON.stringify(ids)); } catch (e) {} }
      document.body.classList.add('onf-reviews');       // 목록 전용 스타일(구분선 제거 등)
      document.body.classList.remove('onf-review-detail');
      onfRvLastDetail = null;
      onfReviewNavClear();
      return;
    }
    document.body.classList.remove('onf-reviews');
    var m = path.match(/^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
    var ids2 = [];
    try { ids2 = JSON.parse(localStorage.getItem(REV_KEY) || '[]'); } catch (e) {}
    var idx = m ? ids2.indexOf(m[1]) : -1;
    if (idx === -1) {
      document.body.classList.remove('onf-review-detail');
      onfRvLastDetail = null;
      onfReviewNavClear();
      return;
    }
    document.body.classList.add('onf-review-detail');
    if (onfRvLastDetail !== m[1]) {   // task1: 새 상세 진입 1회만 배너 보이는 선까지 스크롤(데스크톱)
      onfRvLastDetail = m[1];
      onfReviewDetailScroll();
    }
    // 내비 3종(이전·다음·X)은 전부 '카드(이미지 블록)'에 부착 — 화면 고정이 아니라
    // 카드와 함께 스크롤(2026-07-05 Peter). 블록이 아직 없으면 다음 틱에.
    var imgBlock = document.querySelector('.notion-image-block');
    if (!imgBlock) return;
    // 모바일 스와이프: 왼쪽=다음 리뷰, 오른쪽=이전 리뷰(있는 화살표를 클릭해 동일 내비 재사용,
    //   첫/끝이면 화살표가 없어 자동으로 넘어가지 않음). 화살표는 그대로 유지(2026-07-06 Peter).
    onfAddSwipe(imgBlock,
      function () { var n = document.querySelector('.onf-rev-next'); if (n) n.click(); },
      function () { var p = document.querySelector('.onf-rev-back'); if (p) p.click(); });
    function onfRevBtn(cls, label, innerHTML) {
      var el = document.querySelector('.' + cls);
      if (!el) {
        el = document.createElement('a');
        el.className = cls;
        el.setAttribute('aria-label', label);
        el.innerHTML = innerHTML;
      }
      if (el.parentElement !== imgBlock) imgBlock.appendChild(el);  // 재렌더로 떨어져도 재부착
      return el;
    }
    // 왼쪽 화살표 = 이전 리뷰. 첫 리뷰면 숨김.
    var prevId = (idx > 0) ? ids2[idx - 1] : null;
    if (prevId) {
      onfRevBtn('onf-rev-back', '이전 리뷰', '<img src="' + REV_ARROW_L + '" alt="이전">').setAttribute('href', '/' + prevId);
    } else {
      var back = document.querySelector('.onf-rev-back');
      if (back) back.remove();
    }
    // 나가기 버튼(리뷰 목록으로) — 사진 하단 정중앙 pill, 이모티콘+글자(2026-07-05 Peter)
    onfRevBtn('onf-rev-close', '리뷰 목록으로 나가기',
      '<img src="' + REV_EXIT + '" alt=""><span>나가기</span>').setAttribute('href', '/reviews');
    // 오른쪽 화살표 = 다음 리뷰. 마지막 리뷰면 숨김.
    var nextId = (idx + 1 < ids2.length) ? ids2[idx + 1] : null;
    if (nextId) {
      onfRevBtn('onf-rev-next', '다음 리뷰', '<img src="' + REV_ARROW_R + '" alt="다음">').setAttribute('href', '/' + nextId);
    } else {
      var next = document.querySelector('.onf-rev-next');
      if (next) next.remove();
    }
  }
  onfReviewTick();
  document.addEventListener('DOMContentLoaded', onfReviewTick);
  setInterval(onfReviewTick, 400);

  /* ---------- ⑬ 리뷰 '리스트 보기' (좌 목록 + 우 상세) (2026-07-05 Peter) ----------
     '갤러리 보기' 옆에 토글을 넣고, 켜면 갤러리 그리드를 숨기고 좌측 세로 썸네일
     목록 + 우측 큰 리뷰 사진(이전/다음 화살표)로 보여준다. 나가기 버튼은 이 모드엔 없음.
     데이터는 갤러리 카드의 이미지(full-res src)에서 수집 — 모두 로드 후 구성. */
  var onfRList = { on: false, idx: 0, items: [], built: false, defaulted: false, activating: false };
  var onfRvLoadingGuard = null;   // task3: 갤러리 깜빡임 방지용 로딩 클래스 안전해제 타이머
  function onfRvClearLoading() {
    document.body.classList.remove('onf-rv-loading');
    if (onfRvLoadingGuard) { clearTimeout(onfRvLoadingGuard); onfRvLoadingGuard = null; }
  }
  function onfRlOnReviews() { return location.pathname.replace(/\/+$/, '') === '/reviews'; }

  function onfRlCollect() {
    var items = [];
    document.querySelectorAll('.notion-collection-item').forEach(function (it) {
      var img = it.querySelector('img');   // 사진 없는 빈 카드만 제외(display 체크 금지 — 그리드 숨김 상태서도 수집)
      if (img && img.src) items.push({ src: img.src, id: it.getAttribute('data-block-id') });
    });
    return items;
  }
  // Load more를 끝까지 눌러 전부 로드한 뒤 콜백
  function onfRlLoadAll(cb, guard) {
    guard = guard || 0;
    var more = document.querySelector('.has-more + [role="button"]');
    if (more && more.offsetHeight > 0 && guard < 15) {
      more.click();
      setTimeout(function () { onfRlLoadAll(cb, guard + 1); }, 350);
    } else { cb(); }
  }

  // task2(2026-07-06 Peter): 썸네일 클릭 시 리뷰 패널이 화면 상단(상단바 아래)에 오도록
  //   페이지를 아래로 스크롤 — 배너가 걷히고 선택한 리뷰가 크게 보인다.
  function onfRlScrollToPanel() {
    if (window.innerWidth <= 780) return;   // 모바일은 썸네일 클릭 시 자동스크롤 안 함(2026-07-06 Peter task2)
    var box = document.querySelector('.onf-rlist');
    if (!box) return;
    var tb = document.querySelector('.notion-topbar');
    var off = (tb ? tb.getBoundingClientRect().height : 64) + 16;
    var target = window.scrollY + box.getBoundingClientRect().top - off;
    // 배너(커버)가 보이는 선까지만 스크롤(2026-07-06 Peter): 커버 하단 기준 ~120px는 남겨 상한을 둔다.
    //   기존엔 패널을 상단바 바로 아래로 올려 배너가 완전히 가려졌음. 커버가 없으면 상한 없음.
    var cover = document.querySelector('.page_cover');
    if (cover) {
      var cap = cover.getBoundingClientRect().bottom + window.scrollY - 120;
      if (target > cap) target = cap;
    }
    if (target < 0) target = 0;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }
  function onfRlRender() {
    var box = document.querySelector('.onf-rlist');
    if (!box) return;
    var side = box.querySelector('.onf-rlist-side');
    var main = box.querySelector('.onf-rlist-main-img');
    if (!side || !main) return;
    // 썸네일 목록(개수 바뀔 때만 다시 그림)
    if (side.children.length !== onfRList.items.length) {
      side.innerHTML = '';
      onfRList.items.forEach(function (r, i) {
        var t = document.createElement('div');
        t.className = 'onf-rlist-thumb';
        t.innerHTML = '<img src="' + r.src + '" alt="리뷰 ' + (i + 1) + '">';
        t.addEventListener('click', function () { onfRList.idx = i; onfRlRender(); onfRlScrollToPanel(); });
        side.appendChild(t);
        onfAddTeacherBadge(t, onfTeacherOf(r.id));   // 썸네일 우상단 선생님 배지(호버)
      });
    }
    if (onfRList.idx >= onfRList.items.length) onfRList.idx = 0;
    var cur = onfRList.items[onfRList.idx];
    if (cur && main.getAttribute('src') !== cur.src) main.setAttribute('src', cur.src);
    // 활성 썸네일 표시. ⚠️ scrollIntoView는 '선택이 바뀔 때만' — 매 렌더(500ms틱)마다
    //    부르면 사용자가 목록을 스크롤해도 활성 썸네일로 계속 되돌아가 튐(2026-07-06 수정).
    var idxChanged = onfRList._lastIdx !== onfRList.idx;
    var isMobile = window.innerWidth <= 780;
    Array.prototype.forEach.call(side.children, function (t, i) {
      var on = i === onfRList.idx;
      t.classList.toggle('on', on);
      if (on && idxChanged) {
        if (isMobile) {
          // 모바일: 가로 썸네일 스트립만 스크롤(페이지 세로 스크롤 금지 — scrollIntoView가
          //   페이지까지 끌어내려 클릭 시 화면이 내려가던 문제, 2026-07-06 Peter task2).
          side.scrollLeft += t.getBoundingClientRect().left - side.getBoundingClientRect().left
            - (side.clientWidth - t.clientWidth) / 2;
        } else {
          t.scrollIntoView({ block: 'nearest' });   // 데스크톱: 세로 목록에서 활성 썸네일 보이게
        }
      }
    });
    onfRList._lastIdx = onfRList.idx;
    // 이전/다음 노출(양 끝에서 숨김)
    var prev = box.querySelector('.onf-rlist-prev'), next = box.querySelector('.onf-rlist-next');
    if (prev) prev.style.visibility = onfRList.idx > 0 ? 'visible' : 'hidden';
    if (next) next.style.visibility = onfRList.idx < onfRList.items.length - 1 ? 'visible' : 'hidden';
  }

  function onfRlBuild() {
    var cv = document.querySelector('.notion-collection_view-block');
    if (!cv || document.querySelector('.onf-rlist')) return;
    var box = document.createElement('div');
    box.className = 'onf-rlist';
    box.innerHTML =
      '<div class="onf-rlist-side"></div>' +
      '<div class="onf-rlist-main">' +
        '<div class="onf-rlist-imgwrap">' +
          '<img class="onf-rlist-main-img" alt="선택한 리뷰">' +
          '<a class="onf-rlist-prev" aria-label="이전 리뷰"><img src="' + REV_ARROW_L + '" alt="이전"></a>' +
          '<a class="onf-rlist-next" aria-label="다음 리뷰"><img src="' + REV_ARROW_R + '" alt="다음"></a>' +
        '</div>' +
      '</div>';
    cv.appendChild(box);
    box.querySelector('.onf-rlist-prev').addEventListener('click', function () {
      if (onfRList.idx > 0) { onfRList.idx--; onfRlRender(); }
    });
    box.querySelector('.onf-rlist-next').addEventListener('click', function () {
      if (onfRList.idx < onfRList.items.length - 1) { onfRList.idx++; onfRlRender(); }
    });
    // 모바일 스와이프: 큰 이미지에서 왼쪽=다음, 오른쪽=이전 리뷰(하단 화살표는 모바일에서 CSS로 숨김, 2026-07-06 Peter)
    onfAddSwipe(box.querySelector('.onf-rlist-imgwrap'),
      function () { if (onfRList.idx < onfRList.items.length - 1) { onfRList.idx++; onfRlRender(); } },
      function () { if (onfRList.idx > 0) { onfRList.idx--; onfRlRender(); } });
    onfRList.built = true;
  }

  function onfSetRList(on) {
    if (on) {
      // ⚠️ 안전: '카드 수집 성공' 시에만 갤러리를 숨긴다(수집=Load more 클릭이 필요한데
      //    먼저 숨기면 display:none이라 못 눌러 빈 목록→빈 화면. 2026-07-05 회귀 수정).
      //    수집 0이면 갤러리 유지+defaulted 안 세워 다음 틱 재시도. activating로 중복 방지.
      if (onfRList.activating) return;
      onfRList.activating = true;
      onfRlBuild();
      onfRlLoadAll(function () {
        onfRList.activating = false;
        var items = onfRlCollect();
        if (!items.length) return;                 // 수집 실패 — 갤러리 유지(빈 화면 방지)
        onfRList.items = items;
        onfRList.on = true;
        onfRList.defaulted = true;
        try { sessionStorage.setItem('onfRvView', 'list'); } catch (e) {}   // 뒤로가기 대비 뷰 기억
        document.body.classList.add('onf-rlist-on');
        onfRvClearLoading();   // task3: 리스트 준비 완료 → 로딩 가림 해제(이후엔 :has로 갤러리 숨김)
        onfRlRender();
      });
    } else {
      // 갤러리로 전환: 리스트 패널(썸네일)을 제거해야 :has(.onf-rlist-thumb)가 풀려
      // 갤러리 그리드가 다시 보인다(2026-07-05). on=false면 tick이 재구성 안 함.
      onfRList.on = false;
      try { sessionStorage.setItem('onfRvView', 'gallery'); } catch (e) {}
      var box = document.querySelector('.onf-rlist');
      if (box) box.remove();
      document.body.classList.remove('onf-rlist-on');
      onfRvClearLoading();   // task3: 갤러리로 갈 땐 로딩 가림도 확실히 해제
    }
  }

  // 갤러리 보기 탭 옆에 '리스트 보기' 토글 주입 + 상태 유지(재렌더 대비)
  function onfReviewsListTick() {
    if (!onfRlOnReviews()) {
      // /reviews 이탈: 리스트 상태만 정리하고 저장된 뷰(onfRvView)는 건드리지 않는다.
      // ⚠️ 예전엔 onfSetRList(false)를 불러 이탈 때마다 stored='gallery'로 오염 → 리스트로 보다가
      //    다른 메뉴 갔다 오면 갤러리로 뜨던 버그(2026-07-06 수정). defaulted 리셋으로 재진입 시
      //    저장된 뷰(기본 리스트)대로 다시 세팅.
      onfRList.on = false;
      onfRList.defaulted = false;
      var lb = document.querySelector('.onf-rlist'); if (lb) lb.remove();
      document.body.classList.remove('onf-rlist-on');
      onfRvClearLoading();
      return;
    }
    // 토글 주입
    var gTab = null;
    var btns = document.querySelectorAll('.notion-collection_view-block [role="button"]');
    for (var i = 0; i < btns.length; i++) {
      if (/갤러리 보기/.test(btns[i].textContent || '')) { gTab = btns[i]; break; }
    }
    if (gTab && gTab.parentElement && !gTab.parentElement.querySelector('.onf-listview-tab')) {
      // 갤러리 보기 탭을 그대로 복제 → 폰트·크기·색·간격이 완전히 동일(2026-07-05 Peter).
      // 아이콘만 리스트(가로 3줄)로, 텍스트만 '리스트 보기'로 교체. 커스텀 밑줄 없음.
      var t = gTab.cloneNode(true);
      t.classList.add('onf-listview-tab');
      t.style.opacity = '1';
      var sp = t.querySelector('span');
      if (sp) sp.textContent = '리스트 보기'; else t.textContent = '리스트 보기';
      var svg = t.querySelector('svg');
      if (svg) {
        svg.setAttribute('viewBox', '0 0 14 14');
        svg.innerHTML =
          '<rect x="0" y="1.2" width="14" height="2" rx="1"></rect>' +
          '<rect x="0" y="6" width="14" height="2" rx="1"></rect>' +
          '<rect x="0" y="10.8" width="14" height="2" rx="1"></rect>';
      }
      t.addEventListener('click', function () { onfSetRList(true); });
      gTab.addEventListener('click', function () { onfSetRList(false); });
      // 리스트 보기를 갤러리 보기 '앞'에 — 위치 교체(2026-07-05 Peter)
      gTab.parentElement.insertBefore(t, gTab);
    }
    // 기본 보기: 리스트. 단 직전에 사용자가 갤러리를 골랐으면(뒤로가기 등) 갤러리 유지(2026-07-06 Peter).
    if (!onfRList.defaulted) {
      var storedView = null; try { storedView = sessionStorage.getItem('onfRvView'); } catch (e) {}
      if (storedView === 'gallery') { onfRList.defaulted = true; onfRvRestoreScroll(); }
      else {
        // task3(2026-07-06 Peter): 리스트가 뜨기 전 갤러리 그리드가 잠깐 보이는 깜빡임 제거.
        //   opacity로만 가리므로 Load more .click()은 계속 됨. 5s 안에 못 뜨면 안전 해제(갤러리 폴백).
        document.body.classList.add('onf-rv-loading');
        if (!onfRvLoadingGuard) {
          onfRvLoadingGuard = setTimeout(function () { document.body.classList.remove('onf-rv-loading'); }, 5000);
        }
        onfSetRList(true);
      }
    }
    // 선택 표시: 현재 보기 탭을 강조(밑줄 대신 색·굵기 — .onf-tab-sel, 2026-07-06 Peter)
    var lt2 = document.querySelector('.onf-listview-tab');
    if (lt2 && gTab) {
      lt2.classList.toggle('onf-tab-sel', onfRList.on);
      gTab.classList.toggle('onf-tab-sel', !onfRList.on);
    }
    // 리스트 뷰가 켜져 있으면 유지(재렌더로 사라졌으면 재구성)
    if (onfRList.on) {
      if (!document.querySelector('.onf-rlist')) { onfRlBuild(); onfRList.items = onfRlCollect(); }
      onfRlRender();
    }
  }
  // 갤러리 스크롤 위치 저장/복원(뒤로가기 시 이전 위치 유지, 2026-07-06 Peter)
  window.addEventListener('scroll', function () {
    if (!onfRlOnReviews() || onfRList.on) return;   // /reviews 갤러리 보기일 때만 위치 저장
    try { sessionStorage.setItem('onfRvScroll', String(window.scrollY)); } catch (e) {}
  }, { passive: true });
  function onfRvRestoreScroll() {
    var y = 0; try { y = parseInt(sessionStorage.getItem('onfRvScroll') || '0', 10); } catch (e) {}
    if (!y) return;
    // 갤러리 콘텐츠가 그려질 시간을 두고 여러 번 시도(레이아웃 안정 후 정확히)
    [60, 200, 450, 800].forEach(function (d) { setTimeout(function () { if (!onfRList.on) window.scrollTo(0, y); }, d); });
  }
  // 안전망: 한 틱이 예외를 던져도 인터벌·다른 기능이 죽지 않게(2026-07-05)
  function onfRlTickSafe() { try { onfReviewsListTick(); } catch (e) {} }
  onfRlTickSafe();
  setInterval(onfRlTickSafe, 500);

  /* ---------- ⑭ 리뷰 선생님 배지 — 호버 시 우상단에 Peter/Mary 일러스트 쏙 (2026-07-05 Peter) ----------
     판별: 리뷰 제목의 하트로 선생님 구분(block-id↔이미지 대조로 확정, 2026-07-05) —
     🧡=Mary, 🤎(구 💙)=Peter. 노션 이모지 전환(💙→🤎) 전후 모두 대응해 둘 다 Peter.
     제목은 런타임 __NEXT_DATA__(recordMap)에서 block-id→title로 읽는다. */
  var ONF_TEACHER_IMG = {
    peter: 'https://immplee.github.io/ONF_Homepage/assets/review-teacher-peter.png',
    mary:  'https://immplee.github.io/ONF_Homepage/assets/review-teacher-mary.png'
  };
  var onfTeacherMap = null;
  function onfBuildTeacherMap() {
    if (onfTeacherMap) return onfTeacherMap;
    onfTeacherMap = {};
    try {
      var el = document.getElementById('__NEXT_DATA__');
      if (!el) return onfTeacherMap;
      var d = JSON.parse(el.textContent);
      var rm = (function find(o) {
        if (o && typeof o === 'object') {
          if (o.block && typeof o.block === 'object') {
            var k = Object.keys(o.block)[0];
            if (k && /[0-9a-f-]{36}/.test(k)) return o;
          }
          for (var key in o) { var r = find(o[key]); if (r) return r; }
        }
      })(d);
      if (!rm || !rm.block) return onfTeacherMap;
      for (var id in rm.block) {
        var v = (rm.block[id] || {}).value || {};
        if (v.type === 'page' && v.parent_table === 'collection' && v.properties && v.properties.title) {
          var t = v.properties.title.map(function (s) { return s[0]; }).join('');
          if (t.indexOf('🧡') >= 0) onfTeacherMap[id] = 'mary';
          else if (t.indexOf('🤎') >= 0 || t.indexOf('💙') >= 0) onfTeacherMap[id] = 'peter';
        }
      }
    } catch (e) {}
    return onfTeacherMap;
  }
  // 정적 맵: __NEXT_DATA__엔 초기 25개만 있어 Load more로 늘어난 리뷰는 판별 불가 →
  // 전체 33개를 block-id→선생님으로 고정(2026-07-06 Notion DB 기준). 🧡=Mary, 🤎=Peter.
  // ⚠️ 리뷰 추가·하트 변경 시 이 맵도 갱신해야 함(세션에 요청).
  var ONF_TEACHER_STATIC = {
    '381d6a62-96ae-8006-8ccf-c5f40b5f09a2':'mary','381d6a62-96ae-8018-90f4-d46188096298':'mary',
    '381d6a62-96ae-801e-a0de-c64fde84be6a':'peter','381d6a62-96ae-801f-8b08-c85ab1cdd815':'peter',
    '381d6a62-96ae-8020-9aa5-f9026933182c':'peter','381d6a62-96ae-8020-bad4-d2fd068c178d':'peter',
    '381d6a62-96ae-8028-a8f7-e1b4d726f603':'peter','381d6a62-96ae-802b-a9cb-f96b6284a56b':'mary',
    '381d6a62-96ae-802b-bfb7-c04d469a4423':'peter','381d6a62-96ae-8034-a24e-c16c20549842':'peter',
    '381d6a62-96ae-8037-8398-dba3de10ac90':'mary','381d6a62-96ae-804f-9191-c57458724d6c':'mary',
    '381d6a62-96ae-8059-a76f-c0d55b69fb2b':'mary','381d6a62-96ae-806a-89af-d4f502e8caae':'mary',
    '381d6a62-96ae-806d-b38d-de2ab421e989':'mary','381d6a62-96ae-8093-9f19-e51a69e894f0':'mary',
    '381d6a62-96ae-8095-a47b-df038fae553f':'peter','381d6a62-96ae-809b-b98b-ce18cc84df63':'peter',
    '381d6a62-96ae-80a3-82a7-c09ba535a287':'mary','381d6a62-96ae-80a4-b6c1-d59b0c661935':'mary',
    '381d6a62-96ae-80b0-b0e9-d5ddaf7b7e10':'peter','381d6a62-96ae-80c9-ade9-f3a124c031c4':'mary',
    '381d6a62-96ae-80ce-a6d9-edeebce7ac18':'mary','381d6a62-96ae-80df-87a1-dd4704bd3010':'peter',
    '381d6a62-96ae-80df-ac0b-e6b48288ae8f':'peter','381d6a62-96ae-80e0-8fa0-f8558a5936a5':'peter',
    '381d6a62-96ae-80e3-8de2-e271e9a20c02':'peter','381d6a62-96ae-80e4-849f-d9fcc8896120':'peter',
    '381d6a62-96ae-80e5-824d-eed94da0e06d':'peter','381d6a62-96ae-80ec-af48-f9c98efe6b0f':'mary',
    '381d6a62-96ae-80ed-85db-ff7de99c36ab':'mary','381d6a62-96ae-80ee-86b9-d463b3bd2fa0':'peter',
    '381d6a62-96ae-80f8-af83-d2a86d17e6d1':'peter'
  };
  function onfTeacherOf(id) { return onfBuildTeacherMap()[id] || ONF_TEACHER_STATIC[id] || null; }

  function onfAddTeacherBadge(host, teacher) {
    // ⚠️ ONF_TEACHER_IMG는 ⑭에서 정의 — ⑬의 즉시 tick이 ⑭보다 먼저 이 함수를 호출하면
    //    undefined 접근으로 throw돼 setInterval·⑭ 전체가 죽었음(2026-07-05 SSR 렌더 시 실측).
    if (typeof ONF_TEACHER_IMG === 'undefined' || !ONF_TEACHER_IMG) return;
    if (!teacher || !host || host.querySelector('.onf-teacher-badge')) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var b = document.createElement('div');
    b.className = 'onf-teacher-badge';
    var img = document.createElement('img');
    img.src = ONF_TEACHER_IMG[teacher];
    img.alt = teacher;
    img.onerror = function () { b.style.display = 'none'; };   // 이미지 없으면 배지 숨김(깨진 아이콘 방지)
    b.appendChild(img);
    host.appendChild(b);
  }

  // 갤러리 카드에 배지(재렌더 대비 매 틱). 리스트 썸네일은 onfRlRender가 직접 붙임.
  setInterval(function () {
    if (location.pathname.replace(/\/+$/, '') !== '/reviews') return;
    document.querySelectorAll('.notion-collection-item').forEach(function (it) {
      if (!it.querySelector('img')) return;
      var host = it.querySelector('[role="button"]') || it;
      onfAddTeacherBadge(host, onfTeacherOf(it.getAttribute('data-block-id')));
    });
  }, 500);

})();