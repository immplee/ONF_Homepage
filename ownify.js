/* ============================================================
   OWNIFY 홈페이지 커스텀 JS (www.ownify.co.kr, 우피/Oopy)
   - 정본은 이 파일(GitHub immplee/ONF_Homepage). 우피 <head>에는
     jsDelivr <script> 한 줄만 넣는다.
   - 역할: ① 스크롤 등장 애니메이션(ownify.css의 .onf-reveal와 세트)
           ② 인스타 버튼 "준비 중" 알림
           ③ 사이트 푸터 주입(ownify.css의 .onf-footer와 세트)
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
      '<img class="onf-footer-logo" alt="OWNIFY" ' +
        'src="https://cdn.jsdelivr.net/gh/immplee/ONF_Homepage@main/assets/ownify-logo-cream.svg">' +
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
    var content = document.querySelector('.notion-page-content');
    if (!content || content.querySelector('.onf-footer')) return;
    var f = document.createElement('footer');
    f.className = 'onf-footer';
    f.innerHTML = FOOTER_HTML;
    content.appendChild(f);
    footIo.observe(f);
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

})();
