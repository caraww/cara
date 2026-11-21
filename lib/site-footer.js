/* Shared compact footer markup. Keep links in one place. */
const links = (items) =>
  items.map(([href, text]) => `<a href="${href}">${text}</a>`).join("");

const footerHTML = () => `<!-- SITE-FOOTER:START -->
<footer class="sf">
  <div class="sf__in">
    <div class="sf__brand">
      <img src="/img/cara-logo-fa-light.webp?v=1" width="395" height="176" alt="کارا" loading="lazy" decoding="async">
      <p>دستبند منجوقی دست‌باف با منجوق دلیکای میوکی. طرحش را تو انتخاب می‌کنی، من منجوق‌به‌منجوق می‌بافمش.</p>
      <p class="sf__note">ساخته‌شده با دست، در ایران.</p>
    </div>
    <nav aria-label="خرید و ساخت">
      <h4>خرید و ساخت</h4>
      ${links([
        ["/gallery.html", "گالری دستبندها"],
        ["/starter.html", "شروع کم‌خطر"],
        ["/builder.html", "طراحی دستبند"],
        ["/name-bracelet.html", "دستبند اسم"],
        ["/upload.html", "عکس به الگو"],
        ["/colors/", "رنگ منجوق‌ها"],
      ])}
    </nav>
    <nav aria-label="راهنما و پشتیبانی">
      <h4>راهنما</h4>
      ${links([
        ["/about.html", "درباره کارا"],
        ["/faq.html", "سوال‌های پرتکرار"],
        ["/size.html", "اندازه‌ی مچ"],
        ["/track.html", "پیگیری سفارش"],
        ["/category/", "راهنمای خرید"],
        ["/blog/", "دفتر کارا"],
        ["/quiz.html", "کدام دستبند مال من است؟"],
      ])}
    </nav>
    <div class="sf__contact">
      <h4>تماس با من</h4>
      <a href="https://instagram.com/_.caraw" target="_blank" rel="noopener">اینستاگرام · _.caraw</a>
      <a href="https://wa.me/989352528201" target="_blank" rel="noopener">واتساپ</a>
      <a href="tel:+989352528201" dir="ltr">۰۹۳۵۲۵۲۸۲۰۱</a>
      <a href="/cart.html">سبد خرید</a>
    </div>
  </div>
  <div class="sf__bottom">
    <span>cara · دستبند منجوقی دست‌باف</span>
    <span>پرداخت امن با درگاه بانکی · ارسال با پست</span>
  </div>
</footer>
<!-- SITE-FOOTER:END -->`;

const footerCSS = '<link rel="stylesheet" href="/css/site-footer.css?v=1">';

module.exports = { footerHTML, footerCSS };
