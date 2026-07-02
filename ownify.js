/* ============================================================
   OWNIFY 홈페이지 커스텀 JS (www.ownify.co.kr, 우피/Oopy)
   - 정본은 이 파일(GitHub immplee/ONF_Web). 우피 <head>에는
     jsDelivr <script> 한 줄만 넣는다.
   - 역할: ① 스크롤 등장 애니메이션(ownify.css의 .onf-reveal와 세트)
           ② 인스타 버튼 "준비 중" 알림
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

})();
