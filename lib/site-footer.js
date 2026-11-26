/* Shared compact footer markup. Keep links in one place. */
const links = (items) =>
  items.map(([href, text]) => `<a href="${href}">${text}</a>`).join("");

const instagramIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>`;
const phoneIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18.5h2"/></svg>`;
const cartIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 6h15l-1.7 8.2a2 2 0 0 1-2 1.6H9.3a2 2 0 0 1-2-1.6L5.4 4.5A1.5 1.5 0 0 0 3.9 3.2H2.5"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>`;

const footerHTML = () => `<!-- SITE-FOOTER:START -->
<footer class="sf">
  <div class="sf__in">
    <div class="sf__brand">
      <a class="sf__logo" href="/" aria-label="کارا، صفحه‌ی اصلی">
        <img src="/img/cara-logo-fa-light.webp?v=2" width="395" height="176" alt="کارا" loading="lazy" decoding="async">
      </a>
      <p>طرح و رنگ رو تو انتخاب می‌کنی؛ من همون رو با منجوق‌های دلیکای میوکی، دونه‌به‌دونه می‌بافم.</p>
      <a class="sf__seal" referrerpolicy="origin" target="_blank" rel="noopener" href="https://trustseal.enamad.ir/?id=8005519&amp;Code=l6ZvIdVKpflNBLRq62mOcOthCU4MYP5a">
        <img referrerpolicy="origin" src="https://trustseal.enamad.ir/logo.aspx?id=8005519&amp;Code=l6ZvIdVKpflNBLRq62mOcOthCU4MYP5a" alt="نماد اعتماد الکترونیکی" width="88" height="88" decoding="async">
      </a>
    </div>
    <nav class="sf__col" aria-label="خرید و ساخت">
      <h2 class="sf__title">خرید و ساخت</h2>
      ${links([
        ["/gallery.html", "گالری دستبندها"],
        ["/builder.html", "طراحی دستبند"],
        ["/upload.html", "عکس به الگو"],
        ["/name-bracelet.html", "دستبند اسم"],
        ["/starter.html", "دستبندهای خوش‌قیمت"],
        ["/colors/", "رنگ منجوق‌ها"],
      ])}
    </nav>
    <nav class="sf__col" aria-label="راهنما و پشتیبانی">
      <h2 class="sf__title">راهنما</h2>
      ${links([
        ["/about.html", "درباره کارا"],
        ["/faq.html", "سوال‌های پرتکرار"],
        ["/size.html", "اندازه‌ی مچ"],
        ["/track.html", "پیگیری سفارش"],
        ["/category/", "راهنمای خرید"],
        ["/blog/", "دفتر کارا"],
        ["/quiz.html", "کدوم دستبند به سلیقه‌م می‌خوره؟"],
      ])}
    </nav>
    <div class="sf__col sf__contact">
      <h2 class="sf__title">تماس با من</h2>
      <a href="https://instagram.com/_.caraw" target="_blank" rel="noopener">${instagramIcon}<span class="sf__hint">اینستاگرام</span><bdi dir="ltr">_.caraw</bdi></a>
      <a href="tel:+989352528201">${phoneIcon}<span class="sf__hint">تماس تلفنی</span><bdi dir="ltr">۰۹۳۵۲۵۲۸۲۰۱</bdi></a>
      <a href="/cart.html">${cartIcon}<span class="sf__hint">سبد خرید</span></a>
    </div>
  </div>
  <div class="sf__bottom">
    <span>cara · دستبند منجوقی دست‌باف</span>
    <span class="sf__bottom-note">پرداخت امن با درگاه بانکی · ارسال با پست</span>
    <a class="sf__top" href="#main-content">↑ برگرد به بالا</a>
  </div>
</footer>
<!-- SITE-FOOTER:END -->`;

const footerCSS = '<link rel="stylesheet" href="/css/site-footer.css?v=20261125-enamad">';

module.exports = { footerHTML, footerCSS };
