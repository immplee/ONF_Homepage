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
  function updateClearTop() {
    document.body.classList.toggle('onf-clear-top', !!document.querySelector('.page_cover'));
  }
  // 스크롤 위치 감지: 기본은 창(window) 스크롤, 일부 레이아웃은 .notion-scroller 내부 스크롤
  // (capture라 둘 다 이 리스너로 들어옴 — 그 외 내부 스크롤 요소는 무시)
  document.addEventListener('scroll', function (e) {
    var t = e.target, y;
    if (t === document) y = window.scrollY;
    else if (t.classList && t.classList.contains('notion-scroller')) y = t.scrollTop;
    else return;
    document.body.classList.toggle('onf-scrolled', y > 40);
  }, true);
  // 페이지 이동(SPA)으로 커버 유무가 바뀔 수 있어 본문 변경 때마다 갱신
  new MutationObserver(function () {
    updateClearTop();
  }).observe(document.body, { childList: true, subtree: true });
  updateClearTop();

  /* ---------- ⑥ SNS 플로팅에 카카오톡 채널 추가 ---------- */
  // SNS 위젯 HTML은 우피 head에 인라인이라(레포 밖) 카카오 항목은 여기서 주입.
  // 위치·등장 애니메이션은 ownify.css 7번 섹션(.onf-sns-k)과 세트 — 메인 버튼 바로 위 첫 슬롯.
  var snsK = setInterval(function () {
    var sns = document.querySelector('.onf-sns');
    if (!sns) return;
    if (!sns.querySelector('.onf-sns-k')) {
      var a = document.createElement('a');
      a.className = 'onf-sns-item onf-sns-k';
      a.href = 'http://pf.kakao.com/_xcBxaPX';   // 오니파이 카카오톡 채널
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<img alt="카카오톡 채널" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjI0IiBmaWxsPSIjRkFFMTAwIi8+PHBhdGggZD0iTTUwIDI0Yy0xNi42IDAtMzAgMTAuNy0zMCAyMy44IDAgOC41IDUuNiAxNS45IDE0IDIwLjFsLTIuOSAxMC43Yy0uMjYuOTYuODQgMS43MiAxLjY2IDEuMTdsMTIuOS04LjZjMS40LjE0IDIuOS4yMiA0LjQuMjIgMTYuNiAwIDMwLTEwLjcgMzAtMjMuOFM2Ni42IDI0IDUwIDI0eiIgZmlsbD0iIzNDMUUxRSIvPjwvc3ZnPg==">';
      sns.appendChild(a);
    }
    clearInterval(snsK);
  }, 400);

})();
