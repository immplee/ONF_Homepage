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
      if (!el.classList.contains('onf-reveal')) {
        el.classList.add('onf-reveal');
        io.observe(el);
      }
    });
  }

  // 우피(노션)는 블록을 늦게 그리므로: 10초 동안 0.5초마다 재스캔
  var n = 0, t = setInterval(function () {
    scan();
    if (++n > 20) clearInterval(t);
  }, 500);
  window.addEventListener('load', scan);

  /* ---------- ② 인스타 버튼 (오픈 전 임시 알림) ---------- */
  // 버튼(#onfInsta)이 늦게 생기므로 나타날 때까지 0.3초마다 확인
  // 인스타 오픈하면: 이 블록을 지우고 우피 본문에서 버튼을 <a href>로 교체
  var it = setInterval(function () {
    var b = document.getElementById('onfInsta');
    if (b) {
      b.addEventListener('click', function () {
        alert('📸 인스타그램 오픈 준비 중입니다 🙏🏻');
      });
      clearInterval(it);
    }
  }, 300);

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

  // 화면에 15% 들어오면 .onf-show → 아래에서 위로 떠오르는 등장
  var footIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('onf-show');
        footIo.unobserve(e.target);
      }
    });
  }, { threshold: .15 });

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
    });
  }).observe(document.body, { childList: true, subtree: true });
  ensureFooter();

  /* ---------- ④ 탑바 우측 상담 CTA ---------- */
  // 로고(왼쪽 40px)와 대칭인 오른쪽 40px 위치. 문구·화살표는 본문 띠 배너(.onf-band)와 동일.
  // 스타일은 ownify.css 11번 섹션(.onf-top-cta)과 세트. 1100px 이하에선 CSS가 숨김.
  // 홈(/)에는 본문 띠 배너가 있으므로 하위 페이지(/how·/where 등)에서만 표시 (2026-07-02 Peter 지시).
  function ensureTopCta() {
    var bar = document.querySelector('.notion-topbar');
    if (!bar) return;
    // CTA 오른쪽 여백 = 로고 왼쪽 여백 (좌우 대칭 자동 유지 — 2026-07-03 Peter 지시)
    var logo = bar.querySelector('img:not(.onf-band-arrow)');
    if (logo) {
      var lx = Math.round(logo.getBoundingClientRect().left);
      if (lx > 0) document.documentElement.style.setProperty('--onf-cta-right', lx + 'px');
    }
    var isHome = location.pathname === '/' || location.pathname === '';
    var existing = bar.querySelector('.onf-top-cta');
    if (isHome) {                     // 홈이면 있던 것도 제거(SPA 이동 대응)
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var a = document.createElement('a');
    a.className = 'onf-top-cta';
    a.href = 'https://own-ify.notion.site/309d6a6296ae80ebbedfe2bfdeabc5db?pvs=105'; // 상담 신청서(띠 배너와 동일)
    a.innerHTML = '👨🏻‍💻 상담 신청하러 가기 ' +
      '<img class="onf-band-arrow" alt="→" src="https://immplee.github.io/ONF_Homepage/assets/cta-arrow.webp">';
    bar.appendChild(a);
  }
  // 우피가 탑바를 다시 그릴 수 있어 2초마다 존재 확인 후 재주입
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
  }
  // 색칠(젖빛 유리) 전환 기준: 커버 배너가 탑바 뒤에서 완전히 벗어나는 지점
  // (배너 높이 - 탑바 100px). 커버 없는 페이지는 40px.
  function scrolledThreshold() {
    var c = document.querySelector('.page_cover');
    return c ? Math.max(40, c.offsetHeight - 100) : 40;
  }
  // 스크롤 위치 감지: 기본은 창(window) 스크롤, 일부 레이아웃은 .notion-scroller 내부 스크롤
  // (capture라 둘 다 이 리스너로 들어옴 — 그 외 내부 스크롤 요소는 무시)
  document.addEventListener('scroll', function (e) {
    var t = e.target, y;
    if (t === document) y = window.scrollY;
    else if (t.classList && t.classList.contains('notion-scroller')) y = t.scrollTop;
    else return;
    document.body.classList.toggle('onf-scrolled', y > scrolledThreshold());
  }, true);
  // 창 크기가 바뀌면 메뉴 분리 여부도 바뀔 수 있어 리사이즈 때도 갱신
  window.addEventListener('resize', function () { setTimeout(updateClearTop, 50); });
  // 페이지 이동(SPA)으로 커버 유무가 바뀔 수 있어 본문 변경 때마다 갱신
  new MutationObserver(function () {
    updateClearTop();
  }).observe(document.body, { childList: true, subtree: true });
  updateClearTop();

  /* ---------- ②-2 SNS 인스타 버튼 — 오픈 전 알림 (페이지 이동 차단) ---------- */
  // SNS 위젯(우피 head 인라인)의 인스타(a.onf-sns-b)는 아직 실제 계정이 없어
  // 자리표시 href 상태 → 클릭해도 이동하지 않고 준비 중 알림만 띄운다.
  // 인스타 오픈하면: 이 블록을 지우고 우피 head의 .onf-sns-b href를 실제 주소로 교체.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.onf-sns-b');
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
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
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
  // 인증 실패 시 네이버가 이 전역 함수를 호출 → API 지도 제거하고 이미지 폴백 유지
  window.navermap_authFailure = function () {
    document.body.classList.remove('onf-map-api-on');
    var d = document.querySelector('.onf-map-api');
    if (d) d.remove();
  };
  function buildApiMap(block) {
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
    window.addEventListener('resize', heal);
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
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    var next = block.nextElementSibling;
    if (next && next.classList && next.classList.contains('onf-directions')) {
      // 이미 있으면 URL만 최신으로 (경로 변경 대응)
      var ex = next.querySelector('.onf-directions-frame');
      if (ex && ex.src !== ONF_DIRECTIONS) ex.src = ONF_DIRECTIONS;
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

  /* ---------- ⑨ How 단계 카드 순차 등장 ---------- */
  // /how의 3열 카드(발음기호/미드/팟캐스트)를 클릭으로 하나씩 가로로 등장시킨다.
  // 처음엔 1번만(통통 튀며 "눌러서 다음 단계" 말풍선) → 클릭 시 화살표+다음 카드 등장 → 3번까지.
  // 스타일·애니메이션은 ownify.css(.onf-step-*)와 세트. 우피 재렌더 대비 매 틱 상태 재적용.
  var STEP_COL = 'b8fd976b-8eff-4bb5-b837-209e0c1303ea';
  var STEP_EMOJI = 'https://immplee.github.io/ONF_Homepage/assets/how-step-emoji.png';
  var stepsShown = 1;      // 현재 보이는 카드 수
  var stepBlockSeen = false;
  function ensureSteps() {
    var cl = document.querySelector('[data-block-id="' + STEP_COL + '"]');
    if (!cl) { stepBlockSeen = false; return; }
    if (!stepBlockSeen) { stepBlockSeen = true; stepsShown = 1; }  // 페이지 재진입 시 처음부터
    var cols = cl.querySelectorAll('.notion-column-block');
    if (cols.length < 3) return;
    var total = cols.length;
    // 컬럼은 개별 래퍼(block)에 싸여 있고, 진짜 가로 flex 행은 그 래퍼들의 부모다.
    // → flex 행을 찾고, 각 컬럼의 "flex 행 직속 자식(래퍼)"을 기준으로 조작한다.
    var w0 = cols[0];
    while (w0.parentElement && getComputedStyle(w0.parentElement).display !== 'flex') w0 = w0.parentElement;
    var flexRow = w0.parentElement;
    if (!flexRow) return;
    flexRow.classList.add('onf-steps-flex');
    function wrapperOf(col) { var w = col; while (w.parentElement && w.parentElement !== flexRow) w = w.parentElement; return w; }
    cols.forEach(function (c, i) {
      var wrap = wrapperOf(c);
      var visible = i < stepsShown;
      wrap.style.display = visible ? '' : 'none';
      // 카드 앞(i>=1) 화살표: flex 행에서 래퍼 앞에 넣고, 숨기면 뺀다
      if (i >= 1) {
        var prev = wrap.previousElementSibling;
        var hasArrow = prev && prev.classList && prev.classList.contains('onf-step-arrow');
        if (visible && !hasArrow) {
          var ar = document.createElement('div');
          ar.className = 'onf-step-arrow';
          ar.innerHTML = '<img alt="다음" src="' + STEP_EMOJI + '">';
          flexRow.insertBefore(ar, wrap);
        } else if (!visible && hasArrow) {
          prev.remove();
        }
      }
      // '다음 클릭' 대상 = 마지막으로 보이는 카드(더 남았을 때)
      var isNext = (i === stepsShown - 1) && (stepsShown < total);
      c.classList.toggle('onf-step-poke', isNext);
      // 말풍선
      var content = c.querySelector('.notion-callout-block [class*="CalloutBlock_content"]');
      if (content) {
        var bubble = content.querySelector('.onf-step-bubble');
        if (isNext && !bubble) {
          var b = document.createElement('div');
          b.className = 'onf-step-bubble';
          b.textContent = '눌러서 다음 단계를 확인해보세요 👆';
          content.appendChild(b);
        } else if (!isNext && bubble) {
          bubble.remove();
        }
      }
      // 클릭 → 다음 카드 등장 (재렌더로 새 요소면 다시 바인딩)
      if (!c.__onfStepClick) {
        c.__onfStepClick = true;
        c.addEventListener('click', function () {
          var live = document.querySelector('[data-block-id="' + STEP_COL + '"]');
          if (!live) return;
          var all = live.querySelectorAll('.notion-column-block');
          var idx = Array.prototype.indexOf.call(all, c);
          if (idx === stepsShown - 1 && stepsShown < all.length) {
            stepsShown++;
            ensureSteps();
          }
        });
      }
    });
  }
  setInterval(ensureSteps, 700);
  ensureSteps();

})();