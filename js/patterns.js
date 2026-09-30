/* نمونه الگوها + رسم دستبند حلقه‌ای. برای اضافه کردن الگوی خودت آخر فایل را ببین. */
(() => {
  const C = window.CARA;
  const K = { K: "DB0010", W: "DB0200", R: "DB0727", O: "DB1133", Y: "DB0721", G: "DB0724", B: "DB0726", T: "DB0725", P: "DB2359", D: "DB1832", C: "DB0732", M: "DB1134" };
  const rep = (motif, n, gap = []) => Array.from({ length: n }).flatMap(() => [...motif, ...gap]);
  const fromArt = (rows) => rows.map((s) => [...s].map((ch) => K[ch]));
  const gen = (w, h, fn) => Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => K[fn(r, c)]));

  const EYE = ["BBBBBBBBBBB", "BBBBWWWBBBB", "BBWWTTTWWBB", "BWTTTKTTTWB", "BWTTKKKTTWB", "BWTTTKTTTWB", "BBWWTTTWWBB", "BBBBWWWBBBB", "BBBBBBBBBBB"];
  const DIA = ["MMMMDMMMM", "MMMDCDMMM", "MMDCCCDMM", "MDCCRCCDM", "DCCRRRCCD", "MDCCRCCDM", "MMDCCCDMM", "MMMDCDMMM", "MMMMDMMMM"];
  const HEART = ["WWWWWWWWWWW", "WWRRWWWRRWW", "WRRRRWRRRRW", "WRRRRRRRRRW", "WRRRRRRRRRW", "WWRRRRRRRWW", "WWWRRRRRWWW", "WWWWRRRWWWW", "WWWWWRWWWWW"];
  const STAR = ["KKKKYKKKK", "KKKKYKKKK", "KKYKYKYKK", "KKKYYYKKK", "YYYYOYYYY", "KKKYYYKKK", "KKYKYKYKK", "KKKKYKKKK", "KKKKYKKKK"];
  const sunset = ["D", "O", "R", "M", "P", "B"];
  const rainbow = ["R", "O", "Y", "G", "T", "B", "P"];

  /* photo: اگه از دستبند بافته‌شده‌ات عکس داری، مسیرش رو بنویس (مثلاً "img/gallery/eye.jpg") */
  const S = [
    { id: "eye", title: "چشم‌نظر", tags: ["سنتی", "آبی"], note: "آبی و فیروزه‌ای؛ چشم بد دور.", data: fromArt(rep(EYE, 5, ["BBBBBBBBBBB", "BBBBBBBBBBB"])) },
    { id: "diamond", title: "لوزی‌های طلایی", tags: ["سنتی", "هندسی"], note: "عنابی با لوزی طلایی؛ یه حس ترمه و قالی می‌ده.", data: fromArt(rep(DIA, 6)) },
    { id: "sunset", title: "غروب", tags: ["رنگارنگ"], note: "از طلایی تا آبی، مثل آسمون یه غروب تابستونی.", data: gen(11, 48, (r) => sunset[Math.floor(r / 4) % 6]) },
    { id: "checker", title: "شطرنجی", tags: ["مینیمال", "هندسی"], note: "مشکی و سفید. ساده و همیشه‌شیک.", data: gen(8, 40, (r, c) => (((r >> 1) + (c >> 1)) % 2 ? "K" : "W")) },
    { id: "chevron", title: "زیگزاگ فیروزه‌ای", tags: ["هندسی", "مینیمال"], note: "فیروزه‌ای روی کرم؛ سبک و تابستونی.", data: gen(11, 44, (r, c) => ((r + Math.abs(c - 5)) % 8 < 4 ? "T" : "C")) },
    { id: "heart", title: "قلب", tags: ["عاشقانه"], note: "قرمز روی سفید. برای کادو خیلی می‌شینه.", data: fromArt(rep(HEART, 5)) },
    { id: "star", title: "ستاره‌ی شب", tags: ["هندسی", "عاشقانه"], note: "زرد روی مشکی، مثل ستاره توی شب.", data: fromArt(rep(STAR, 5)) },
    { id: "rainbow", title: "رنگین‌کمان", tags: ["رنگارنگ"], note: "مورب و شاد، هفت‌رنگ.", data: gen(10, 42, (r, c) => rainbow[((r + c) >> 1) % 7]) },
  ];
  S.forEach((s) => { const n = {}; s.data.forEach((row) => row.forEach((c) => (n[c] = (n[c] || 0) + 1))); s.st = { n, colors: Object.keys(n).length, total: s.data.length * s.data[0].length };
    s.level = s.st.colors <= 2 ? "راحت" : s.st.colors <= 4 ? "متوسط" : "وقت‌گیر";
    s.hay = [s.title, s.note, ...s.tags, ...Object.keys(n).map((c) => C.byCode(c).name)].join(" "); });
  C.samples = S;

  /* دستبند حلقه‌ای: هر ردیف الگو یک زاویه دور مچ، هر ستون یک لایه از داخل به بیرون */
  C.drawRing = (cv, data, size) => {
    const h = data.length, w = data[0].length, d = Math.min(2, devicePixelRatio || 1), R = size / 2 - 10, cx = size / 2, cy = size / 2;
    const T = Math.min(R * 0.34, (2 * Math.PI * R) / (h / w + Math.PI)), r0 = R - T, a = (2 * Math.PI) / h, rot = -Math.PI / 2;
    cv.width = cv.height = size * d; cv.style.width = cv.style.height = size + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, size, size);
    const ann = () => { g.beginPath(); g.arc(cx, cy, R, 0, 7); g.arc(cx, cy, r0, 0, 7, true); };
    g.save(); g.shadowColor = "rgba(27,18,38,.3)"; g.shadowBlur = 14; g.shadowOffsetY = 7; g.fillStyle = "#999"; ann(); g.fill(); g.restore();
    g.lineWidth = 0.7; g.strokeStyle = "rgba(0,0,0,.28)";
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      g.beginPath(); g.arc(cx, cy, r0 + (T * (c + 1)) / w, rot + r * a, rot + (r + 1) * a + 0.004);
      g.arc(cx, cy, r0 + (T * c) / w, rot + (r + 1) * a + 0.004, rot + r * a, true); g.closePath();
      g.fillStyle = C.byCode(data[r][c]).hex; g.fill(); g.stroke();
    }
    const rg = g.createRadialGradient(cx, cy, r0, cx, cy, R);
    rg.addColorStop(0, "rgba(0,0,0,.35)"); rg.addColorStop(0.3, "rgba(0,0,0,0)"); rg.addColorStop(0.65, "rgba(255,255,255,.22)"); rg.addColorStop(1, "rgba(0,0,0,.3)");
    g.fillStyle = rg; ann(); g.fill();
    const lg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    lg.addColorStop(0, "rgba(255,255,255,.4)"); lg.addColorStop(0.5, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(0,0,0,.3)");
    g.fillStyle = lg; ann(); g.fill();
  };

  /* دستبند بازشده به شکل نوار */
  C.drawStrip = (cv, data, W) => {
    const h = data.length, w = data[0].length, d = Math.min(2, devicePixelRatio || 1), s = Math.min(12, (W - 8) / h), H = w * s + 8;
    cv.width = W * d; cv.height = H * d; cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const x = 4 + r * s, y = 4 + c * s, hex = C.byCode(data[r][c]).hex; if (s >= 5) C.drawBead(g, x, y, s, s, hex); else { g.fillStyle = hex; g.fillRect(x, y, s + 0.5, s + 0.5); } }
  };

  /* الگوی خودت: با حروف بالا بنویس (هر حرف = یک رنگ از جدول K) و اینجا اضافه کن، مثل:
     S.push({ id: "mine", title: "اسم الگو", tags: ["هندسی"], note: "توضیح کوتاه", photo: "img/gallery/mine.jpg", data: fromArt([...]) }) */
})();
