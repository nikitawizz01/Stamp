const { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback, useContext, createContext } = React;

const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const FREE_LIMIT = 2;
const A4W = 794, A4H = 1123, PM = 56;
const PRICE = { month: 9, monthWas: 15, year: 60 };
const DRAFT_KEY = 'pechat.draft.v3';

const LangCtx = createContext('en');
const useL = () => { const lang = useContext(LangCtx); return [lang, T[lang]]; };

/* ---------- utils ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const uid = () => Math.random().toString(36).slice(2, 9);
const num = (s) => { const v = parseFloat(String(s ?? '').replace(/[\s\u00A0\u202F]/g, '').replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const CUR = { USD: '$', EUR: '€', RUB: '₽', PLN: 'zł', KZT: '₸' };
const PREFIX = { en: ['USD', 'EUR'], ru: ['USD'] };
const NF = {};
const nf = (lang, frac) => { const k = lang + frac; return NF[k] || (NF[k] = new Intl.NumberFormat(T[lang].locale, frac ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })); };
function fmt(v, c, lang) {
  const r = Math.round(v * 100) / 100;
  const neg = r < 0;
  const s = nf(lang, Math.abs(r % 1) > 0.004).format(Math.abs(r)).replace(/\u202F/g, '\u00A0');
  const sym = CUR[c] || '$';
  const out = PREFIX[lang].includes(c) ? sym + s : s + '\u00A0' + sym;
  return neg ? '−' + out : out;
}
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s, n) => { const d = s ? new Date(s + 'T00:00:00') : new Date(); if (isNaN(d)) return ''; d.setDate(d.getDate() + n); return iso(d); };
const fmtDate = (s, lang) => {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString(T[lang].locale, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.?$/, '');
};
function plural(n, f, lang) {
  if (lang === 'en') return Math.abs(n) === 1 ? f[0] : f[1];
  n = Math.abs(Math.floor(n)) % 100; const n1 = n % 10;
  if (n > 10 && n < 20) return f[2]; if (n1 > 1 && n1 < 5) return f[1]; if (n1 === 1) return f[0]; return f[2];
}
const initials = (d) => {
  const src = (d.author.company || d.author.name || '').replace(/[«»"'.,]/g, ' ');
  return src.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'KP';
};
const UNITS = ['hour', 'pc', 'day', 'mo', 'project'];
const UNIT_MIGRATE = { 'час': 'hour', 'шт': 'pc', 'день': 'day', 'мес': 'mo', 'проект': 'project' };
const unitLabel = (q, u, lang) => { const f = T[lang].unitShort[u]; return f ? plural(num(q), f, lang) : u; };
const ACCENTS = ['#3B32C8', '#1C1D22', '#0E7A5A', '#8E1F3E', '#A35A12'];
const THEMES = ['strict', 'editorial', 'bold'];

function demo(lang) {
  const today = iso(new Date());
  const base = {
    demo: 'full',
    discount: { type: 'pct', value: '10' },
    style: { theme: 'editorial', accent: '#3B32C8', stamp: true },
  };
  if (lang === 'ru') return {
    ...base,
    author: { name: 'Анна Морозова', company: 'Morozova Studio', contact: 'anna@morozova.studio, +7 900 000-00-00', logo: '' },
    client: { name: 'Игорь Седов', company: 'ООО «Северный ветер»' },
    project: { title: 'Редизайн интернет-магазина', number: 'КП-2026-014', date: today, validDays: '14' },
    items: [
      { id: uid(), name: 'Исследование и аудит текущего сайта', desc: 'Аналитика, интервью с командой, карта проблем', qty: '1', unit: 'project', price: '45000' },
      { id: uid(), name: 'Дизайн ключевых страниц', desc: 'Главная, каталог, карточка товара, корзина', qty: '6', unit: 'pc', price: '18000' },
      { id: uid(), name: 'Адаптивные версии', desc: 'Планшет и мобильный для всех макетов', qty: '1', unit: 'project', price: '38000' },
      { id: uid(), name: 'UI-кит и передача в разработку', desc: 'Компоненты, состояния, спецификация', qty: '12', unit: 'hour', price: '2500' },
    ],
    currency: 'RUB', tax: { label: 'НДС', rate: '20' },
    terms: { start: addDays(today, 7), weeks: '5', prepay: '50', notes: NOTE_CHIPS.ru[0] + '\n' + NOTE_CHIPS.ru[1] },
  };
  return {
    ...base,
    author: { name: 'Anna Moore', company: 'Moore Studio', contact: 'anna@moorestudio.com, +1 555 010 0199', logo: '' },
    client: { name: 'James Carter', company: 'Northwind Ltd' },
    project: { title: 'Online store redesign', number: 'Q-2026-014', date: today, validDays: '14' },
    items: [
      { id: uid(), name: 'Research and audit of the current site', desc: 'Analytics, team interviews, problem map', qty: '1', unit: 'project', price: '3000' },
      { id: uid(), name: 'Key page designs', desc: 'Home, catalog, product page, cart', qty: '6', unit: 'pc', price: '1200' },
      { id: uid(), name: 'Responsive versions', desc: 'Tablet and mobile for every layout', qty: '1', unit: 'project', price: '2400' },
      { id: uid(), name: 'UI kit and developer handoff', desc: 'Components, states, specs', qty: '12', unit: 'hour', price: '100' },
    ],
    currency: 'USD', tax: { label: 'VAT', rate: '20' },
    terms: { start: addDays(today, 7), weeks: '5', prepay: '50', notes: NOTE_CHIPS.en[0] + '\n' + NOTE_CHIPS.en[1] },
  };
}
function starter(lang) {
  const b = demo(lang);
  return { ...b, demo: 'starter', author: { name: '', company: '', contact: '', logo: '' }, client: { name: '', company: '' }, project: { ...b.project, title: '' } };
}
function blank(lang, keep) {
  const today = iso(new Date());
  const b = demo(lang);
  return {
    ...b, demo: false,
    author: { ...keep.author },
    currency: keep.currency, style: { ...keep.style },
    client: { name: '', company: '' },
    project: { title: '', number: (lang === 'ru' ? 'КП-' : 'Q-') + today.slice(0, 4) + '-001', date: today, validDays: '14' },
    items: [{ id: uid(), name: '', desc: '', qty: '1', unit: 'pc', price: '' }],
    discount: { type: 'pct', value: '0' },
    tax: { label: lang === 'ru' ? 'НДС' : 'VAT', rate: '0' },
    terms: { start: addDays(today, 7), weeks: '', prepay: '50', notes: '' },
  };
}
function loadDraft(lang) {
  const raw = store.get(DRAFT_KEY);
  const b = demo(lang);
  if (!raw) return starter(lang);
  try {
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.items) || s.demo) return starter(lang);
    return {
      ...b, ...s,
      author: { ...b.author, ...s.author }, client: { ...b.client, ...s.client }, project: { ...b.project, ...s.project },
      discount: { ...b.discount, ...s.discount }, tax: { ...b.tax, ...s.tax }, terms: { ...b.terms, ...s.terms }, style: { ...b.style, ...s.style },
      items: s.items.map((i) => ({ id: i.id || uid(), name: i.name || '', desc: i.desc || '', qty: i.qty ?? '1', unit: UNIT_MIGRATE[i.unit] || (UNITS.includes(i.unit) ? i.unit : 'pc'), price: i.price ?? '' })),
    };
  } catch (e) { return starter(lang); }
}

function calc(d) {
  const subtotal = d.items.reduce((s, i) => s + num(i.qty) * num(i.price), 0);
  const dv = Math.max(num(d.discount.value), 0);
  const discount = d.discount.type === 'pct' ? subtotal * Math.min(dv, 100) / 100 : Math.min(dv, subtotal);
  const after = subtotal - discount;
  const rate = Math.max(num(d.tax.rate), 0);
  const tax = after * rate / 100;
  const total = after + tax;
  const pp = Math.min(Math.max(num(d.terms.prepay), 0), 100);
  const prepay = total * pp / 100;
  return { subtotal, discount, after, rate, tax, total, pp, prepay, rest: total - prepay };
}

/* ---------- pagination shared by preview & PDF ---------- */
function getBreaks(sheet) {
  const r = sheet.getBoundingClientRect();
  const k = r.width / A4W || 1;
  return [...sheet.querySelectorAll('[data-brk]')].map((el) => (el.getBoundingClientRect().bottom - r.top) / k);
}
function paginate(H, brks) {
  if (H <= A4H * 1.07) return [[0, H]]; // slight overflow: shrink onto one page instead of splitting
  const bs = [...new Set(brks.map((b) => Math.round(b)))].sort((a, b) => a - b);
  const pages = []; let s = 0; let first = true; let guard = 0;
  while (s < H - 1 && guard++ < 60) {
    const fit = first ? A4H : A4H - PM;
    if (H - s <= fit) { pages.push([s, H]); break; }
    const avail = first ? A4H - PM : A4H - 2 * PM;
    let e = bs.filter((b) => b > s + 60 && b <= s + avail).pop();
    if (!e) e = s + avail;
    pages.push([s, e]); s = e; first = false;
  }
  return pages;
}

async function buildPdf(node, d, t) {
  if (!window.html2canvas || !window.jspdf) throw new Error('libs');
  try { await document.fonts.ready; } catch (e) {}
  const H = node.offsetHeight;
  const pages = paginate(H, getBreaks(node));
  const canvas = await window.html2canvas(node, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1440 });
  const ratio = canvas.width / node.offsetWidth;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const W = 595.28, k = W / A4W;
  pages.forEach(([s, e], i) => {
    if (i) pdf.addPage();
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = Math.max(1, Math.round((e - s) * ratio));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, 0, Math.round(s * ratio), canvas.width, c.height, 0, 0, canvas.width, c.height);
    const img = c.toDataURL('image/png');
    if (pages.length === 1 && e - s > A4H) {
      const f = A4H / (e - s);
      pdf.addImage(img, 'PNG', (W - W * f) / 2, 0, W * f, A4H * k, undefined, 'FAST');
    } else {
      pdf.addImage(img, 'PNG', 0, i ? PM * k : 0, W, (e - s) * k, undefined, 'FAST');
    }
  });
  pdf.setProperties({ title: d.project.title || t.dKind, author: d.author.company || d.author.name || '', creator: t.brand });
  return pdf;
}
const fileName = (d, lang) => {
  const who = d.client.company || d.client.name || '';
  const no = (d.project.number || '').trim();
  const pre = lang === 'ru' ? 'КП' : 'Proposal';
  const head = (lang === 'ru' ? /^кп/i : /^(q|proposal)/i).test(no) ? no : (pre + ' ' + no);
  return (head + (who ? ' ' + who : '')).replace(/[\\/:*?"<>|«»]/g, '').replace(/\s+/g, ' ').trim() + '.pdf';
};

/* ---------- small pieces ---------- */
const ICONS = {
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14',
  lock: 'M6.5 11h11v9h-11zM9 11V8.2a3 3 0 016 0V11',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 11v6M14 11v6M6.5 7l.8 12.5h9.4L17.5 7M9.5 7V4.5h5V7',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  upload: 'M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19.5h14',
};
function Ic({ n, s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n]} /></svg>;
}
function Mark({ s = 30, letter }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <g transform="rotate(-12 16 16)">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="16" y="20.2" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="currentColor" fontFamily="Golos Text, Arial, sans-serif">{letter}</text>
      </g>
    </svg>
  );
}

function Anim({ value, cur }) {
  const [lang] = useL();
  const [v, setV] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  const [k, setK] = useState(0);
  useEffect(() => {
    const a = from.current, b = value;
    if (Math.abs(a - b) < 0.005) { setV(b); return; }
    if (REDUCED) { from.current = b; setV(b); return; }
    cancelAnimationFrame(raf.current);
    setK((x) => x + 1);
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 420);
      const e = 1 - Math.pow(1 - p, 3);
      const x = a + (b - a) * e;
      from.current = x;
      setV(p < 1 ? Math.round(x) : b);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span key={k} className={k ? 'flash' : ''}>{fmt(v, cur, lang)}</span>;
}

/* ---------- hero background: "Silk" shader (21st.dev Shader Builder), ported from TSX ---------- */
const SH_VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
const SH_FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;
#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w
float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1], smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}
vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}
vec3 shade(vec2 uv, vec2 p, float t) {
  vec2 q = p * 1.6;
  float amp = 0.25 + u_intensity * 0.85;
  for (float i = 1.0; i < 5.0; i += 1.0) {
    q.x += amp / i * cos(i * 2.4 * q.y + t * 0.8 + u_seed);
    q.y += amp / i * cos(i * 1.7 * q.x + t * 0.6);
  }
  return palette(0.5 + 0.5 * sin(q.x + q.y));
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;
  if (u_cursorPresence > 0.001) {
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(fbm(p * u_detail + u_seed), fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  if (abs(u_contrast - 1.0) > 0.0001) col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001) col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001) col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
const SH_U = {
  colors: [[0.06666666666666667, 0.03529411764705882, 0.16862745098039217], [0.12941176470588237, 0.06274509803921569, 0.33725490196078434], [0.25098039215686274, 0.06274509803921569, 0.592156862745098], [0.11372549019607843, 0.054901960784313725, 0.29411764705882354], [0.11372549019607843, 0.054901960784313725, 0.29411764705882354], [0.11372549019607843, 0.054901960784313725, 0.29411764705882354], [0.11372549019607843, 0.054901960784313725, 0.29411764705882354], [0.11372549019607843, 0.054901960784313725, 0.29411764705882354]],
  colorCount: 4, scale: 1.26, intensity: 0.28, paramA: 0.5, warp: 0, detail: 2.4, contrast: 1.113, brightness: 0, saturation: 1, hue: 0,
  vignette: 0, blur: 0, grain: 0.04, seed: 1581, rotate: 0, offsetX: 0, offsetY: 0, drift: 0,
  cursorEnabled: false, cursorEffect: 2, cursorStrength: 0.65, cursorRadius: 0.46, oklab: 0,
  timeScale: REDUCED ? 0 : 0.385,
};
const shPending = new WeakMap();

function ShaderBackground({ className }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pendingRelease = shPending.get(canvas);
    if (pendingRelease !== undefined) clearTimeout(pendingRelease);
    shPending.delete(canvas);
    const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return; // no WebGL: the CSS gradient behind the canvas stays visible
    const U = SH_U;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, SH_VERT), fs = compile(gl.FRAGMENT_SHADER, SH_FRAG);
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    canvas.classList.add('ready');

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uni = {};
    ['colors', 'scene', 'shape', 'surface', 'finish', 'transform', 'space', 'cursor'].forEach((k) => { uni[k] = gl.getUniformLocation(program, 'u_' + k); });
    gl.uniform3fv(uni.colors, new Float32Array(U.colors.flat()));
    gl.uniform4f(uni.shape, U.scale, U.intensity, U.paramA, U.warp);
    gl.uniform4f(uni.surface, U.detail, U.contrast, U.brightness, U.saturation);
    gl.uniform4f(uni.finish, U.hue, U.vignette, U.blur, U.grain);
    gl.uniform4f(uni.transform, U.seed, U.rotate, U.drift, U.oklab);
    gl.uniform4f(uni.cursor, 0, U.cursorEffect, U.cursorStrength, U.cursorRadius);

    let targetX = 0, targetY = 0, targetPresence = 0, mouseX = 0, mouseY = 0, cursorPresence = 0;
    let pointerKnown = false, pointerClientX = 0, pointerClientY = 0;
    let bounds = canvas.getBoundingClientRect();
    let raf = 0, lastNow = null;
    let visible = document.visibilityState === 'visible', inView = true, disposed = false;
    const start = performance.now();
    const timeAnimated = Math.abs(U.timeScale) > 0.0001;

    const resizeCanvas = () => {
      const rawW = Math.max(1, Math.round(bounds.width));
      const rawH = Math.max(1, Math.round(bounds.height));
      const ps = Math.min(0.6, Math.sqrt(260000 / Math.max(1, rawW * rawH)));
      const w = Math.max(1, Math.round(rawW * ps)), h = Math.max(1, Math.round(rawH * ps));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    function requestRender() { if (!disposed && visible && inView && raf === 0) raf = requestAnimationFrame(render); }
    const updatePointerTarget = () => {
      if (!pointerKnown || bounds.width === 0 || bounds.height === 0) return;
      const inside = pointerClientX >= bounds.left && pointerClientX <= bounds.right && pointerClientY >= bounds.top && pointerClientY <= bounds.bottom;
      if (!inside) { targetPresence = 0; requestRender(); return; }
      const nx = ((pointerClientX - bounds.left) / bounds.width) * 2 - 1;
      const ny = -(((pointerClientY - bounds.top) / bounds.height) * 2 - 1);
      if (targetPresence === 0 && cursorPresence < 0.01) { mouseX = nx; mouseY = ny; }
      targetX = nx; targetY = ny; targetPresence = 1;
      requestRender();
    };
    const onPointerMove = (e) => { pointerKnown = true; pointerClientX = e.clientX; pointerClientY = e.clientY; bounds = canvas.getBoundingClientRect(); updatePointerTarget(); };
    const onPointerLeave = () => { pointerKnown = false; targetPresence = 0; requestRender(); };
    const updateLayout = () => { bounds = canvas.getBoundingClientRect(); resizeCanvas(); updatePointerTarget(); requestRender(); };
    window.addEventListener('resize', updateLayout);
    if (U.cursorEnabled) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointercancel', onPointerLeave);
      window.addEventListener('scroll', updateLayout, true);
      window.addEventListener('blur', onPointerLeave);
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
    const ro = new ResizeObserver(updateLayout); ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry ? entry.isIntersecting : true;
      if (inView) requestRender(); else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; lastNow = null; }
    });
    io.observe(canvas);
    const onVis = () => {
      visible = document.visibilityState === 'visible';
      if (visible) requestRender(); else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; lastNow = null; }
    };
    document.addEventListener('visibilitychange', onVis);

    let lastDraw = -1e9;
    function render(now) {
      raf = 0;
      if (disposed || !visible || !inView) return;
      if (now - lastDraw < 32) { requestRender(); return; }
      lastDraw = now;
      const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.1);
      lastNow = now;
      const follow = 1 - Math.exp(-12 * dt);
      mouseX += (targetX - mouseX) * follow; mouseY += (targetY - mouseY) * follow;
      cursorPresence += (targetPresence - cursorPresence) * follow;
      resizeCanvas();
      gl.uniform4f(uni.scene, canvas.width, canvas.height, ((now - start) / 1000) * U.timeScale, U.colorCount);
      gl.uniform4f(uni.space, U.offsetX, U.offsetY, mouseX, mouseY);
      gl.uniform4f(uni.cursor, U.cursorEnabled ? cursorPresence : 0, U.cursorEffect, U.cursorStrength, U.cursorRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const settling = Math.abs(targetX - mouseX) > 0.001 || Math.abs(targetY - mouseY) > 0.001 || Math.abs(targetPresence - cursorPresence) > 0.001;
      if (timeAnimated || settling) requestRender(); else lastNow = null;
    }
    requestRender();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', updateLayout);
      if (U.cursorEnabled) {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointercancel', onPointerLeave);
        window.removeEventListener('scroll', updateLayout, true);
        window.removeEventListener('blur', onPointerLeave);
        document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      }
      gl.deleteBuffer(buf); gl.deleteProgram(program);
      const timer = setTimeout(() => {
        if (shPending.get(canvas) !== timer) return;
        shPending.delete(canvas);
        const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
        canvas.width = 1; canvas.height = 1;
      }, 0);
      shPending.set(canvas, timer);
    };
  }, []);
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

/* ---------- the A4 document ---------- */
function Stamp({ d, id }) {
  const [, t] = useL();
  const acc = d.style.accent;
  const co = (d.author.company || d.author.name || t.dContractorFallback).toUpperCase();
  const txt = co + ' • ' + t.dStampRing + ' • ';
  return (
    <svg className="d-stamp" viewBox="0 0 120 120" width="108" height="108" aria-hidden="true">
      <defs><path id={'sp' + id} d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" /></defs>
      <g transform="rotate(-14 60 60)">
        <circle cx="60" cy="60" r="56" fill="none" stroke={acc} strokeWidth="2.4" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={acc} strokeWidth="1" />
        <text fill={acc} fontFamily="Arial, Helvetica, sans-serif" fontSize="8.4" fontWeight="700">
          <textPath href={'#sp' + id} textLength="292" lengthAdjust="spacingAndGlyphs">{txt}</textPath>
        </text>
        <text x="60" y="66" textAnchor="middle" fill={acc} fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="700">{initials(d)}</text>
        <text x="60" y="80" textAnchor="middle" fill={acc} fontFamily="Arial, Helvetica, sans-serif" fontSize="6.5" fontWeight="700">{(d.project.number || '').slice(0, 16)}</text>
      </g>
    </svg>
  );
}

function Doc({ d, c, free, live, id }) {
  const [lang, t] = useL();
  const a = d.author, cl = d.client, p = d.project, tm = d.terms;
  const items = d.items.filter((i) => i.name.trim() || num(i.price));
  const until = addDays(p.date, num(p.validDays) || 14);
  const weeks = num(tm.weeks);
  const end = weeks && tm.start ? addDays(tm.start, Math.round(weeks * 7)) : '';
  const cur = d.currency;
  const F = (v) => fmt(v, cur, lang);
  const D = (s) => fmtDate(s, lang);
  const who = cl.company || cl.name;
  const G = (v, ph) => (v ? v : live ? <span className="ghost">{ph}</span> : null);
  const hasId = !!(a.logo || a.company || a.name);
  return (
    <div className={'doc t-' + d.style.theme + (live ? ' live' : '')} style={{ '--acc': d.style.accent }} lang={lang}>
      <div className="d-top" data-brk="">
        <div className="d-from">
          {a.logo ? <img className="d-logo" src={a.logo} alt="" /> : hasId ? <div className="d-mono">{initials(d)}</div> : live ? <div className="d-mono ghost-box">{t.dLogo}</div> : null}
          <div>
            <div className="d-co">{G(a.company || a.name, t.dYourName)}</div>
            {a.company && a.name ? <div className="d-sub">{a.name}</div> : null}
            {a.contact || live ? <div className="d-sub">{G(a.contact, t.dContacts)}</div> : null}
          </div>
        </div>
        <div className="d-right">
          <div className="d-kind">{t.dKind}</div>
          {p.number ? <div>{t.dNo} {p.number}</div> : null}
          <div>{D(p.date)}</div>
        </div>
      </div>

      <div className="d-title" data-brk="">
        <h1>{G(p.title, t.dUntitledProject)}</h1>
        <p>{who ? t.dPrepared(who) : t.dPreparedAnon}</p>
      </div>

      <div className="d-facts" data-brk="">
        <div><div className="d-fl">{t.dClient}</div><div className="d-fv">{cl.name || (live ? <span className="ghost">{t.dClientName}</span> : '—')}</div>{cl.company && cl.name ? <div className="d-fs">{cl.company}</div> : null}</div>
        <div><div className="d-fl">{t.dTimeline}</div><div className="d-fv">{weeks ? weeks + ' ' + plural(weeks, t.dWeeks, lang) : '—'}</div>{tm.start ? <div className="d-fs">{t.dStarts(D(tm.start))}</div> : null}</div>
        <div><div className="d-fl">{t.dValid}</div><div className="d-fv">{t.dValidVal(D(until))}</div></div>
      </div>

      <div className="d-table">
        <div className="d-tr d-th" data-brk=""><div>{t.dService}</div><div className="r">{t.dQty}</div><div className="r">{t.dPrice}</div><div className="r">{t.dAmount}</div></div>
        {items.length === 0 ? <div className="d-empty" data-brk="">{t.dEmpty}</div> : null}
        {items.map((i, n) => (
          <div className="d-tr" data-brk="" key={i.id}>
            <div className="d-svc">
              <div className="d-n">{n + 1}</div>
              <div><div className="d-name">{i.name || t.dUntitled}</div>{i.desc ? <div className="d-desc">{i.desc}</div> : null}</div>
            </div>
            <div className="r">{String(i.qty).trim() || '0'} {unitLabel(i.qty, i.unit, lang)}</div>
            <div className="r">{F(num(i.price))}</div>
            <div className="r d-sum">{F(num(i.qty) * num(i.price))}</div>
          </div>
        ))}
      </div>

      <div className="d-totals" data-brk="">
        <div className="d-tot">
          <div className="d-tl"><span>{t.subtotal}</span><span>{F(c.subtotal)}</span></div>
          {c.discount > 0 ? <div className="d-tl disc"><span>{t.dDiscount}{d.discount.type === 'pct' ? ' ' + num(d.discount.value) + '%' : ''}</span><span>−{F(c.discount)}</span></div> : null}
          {c.rate > 0 ? <div className="d-tl"><span>{(d.tax.label || t.taxFallback) + ' ' + c.rate + '%'}</span><span>{F(c.tax)}</span></div> : null}
          <div className="d-grand"><span className="l">{t.total}</span><span className="v">{live ? <Anim value={c.total} cur={cur} /> : F(c.total)}</span></div>
        </div>
      </div>

      <div className="d-pay" data-brk="">
        <div>
          <div className="d-h">{t.dPayment}</div>
          {c.pp > 0 && c.pp < 100 ? (<>
            <div className="d-row"><span>{t.dDeposit(c.pp)}</span><b>{F(c.prepay)}</b></div>
            <div className="d-row"><span>{t.dOnDelivery}</span><b>{F(c.rest)}</b></div>
          </>) : c.pp >= 100 ? (
            <div className="d-row"><span>{t.dFull}</span><b>{F(c.total)}</b></div>
          ) : (
            <div className="d-row"><span>{t.dOnDelivery}</span><b>{F(c.total)}</b></div>
          )}
        </div>
        <div>
          <div className="d-h">{t.dTimeline}</div>
          <div className="d-row"><span>{t.dStart}</span><b>{D(tm.start)}</b></div>
          <div className="d-row"><span>{t.dDelivery}</span><b>{end ? D(end) : '—'}</b></div>
        </div>
      </div>

      {tm.notes.trim() ? (
        <div className="d-notes" data-brk=""><div className="d-h">{t.dTerms}</div><p>{tm.notes.trim()}</p></div>
      ) : null}

      <div className="d-space" />

      <div className="d-sign" data-brk="">
        <div className="d-signline">
          <div className="ln" />
          <div className="cap">{t.dContractor}{a.name ? ', ' + a.name : ''}</div>
          {d.style.stamp ? <Stamp d={d} id={id} /> : null}
        </div>
        <div className="d-signline">
          <div className="ln" />
          <div className="cap">{t.dAccepted}{cl.name ? ', ' + cl.name : ''}</div>
        </div>
      </div>
      {free ? <div className="d-foot" data-brk="">{t.dFoot}</div> : null}
    </div>
  );
}

function Preview({ d, c, free }) {
  const [lang, t] = useL();
  const inner = useRef(null), sheet = useRef(null);
  const [scale, setScale] = useState(0.62);
  const [h, setH] = useState(A4H);
  const [cuts, setCuts] = useState([]);
  const measure = useCallback(() => {
    const el = sheet.current; if (!el) return;
    const H = el.offsetHeight;
    setH(H);
    const pages = paginate(H, getBreaks(el));
    const next = pages.slice(0, -1).map((p) => p[1]);
    setCuts((prev) => (prev.join() === next.join() ? prev : next));
  }, []);
  useLayoutEffect(() => {
    const el = inner.current;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / A4W)));
    ro.observe(el);
    const ro2 = new ResizeObserver(measure);
    ro2.observe(sheet.current);
    return () => { ro.disconnect(); ro2.disconnect(); };
  }, [measure]);
  useLayoutEffect(measure, [d, scale, lang, measure]);
  return (
    <div className="pv-inner" ref={inner}>
      <div className="sheet-wrap rise" style={{ width: A4W * scale, height: h * scale }}>
        <div className="sheet-scale" ref={sheet} style={{ transform: 'scale(' + scale + ')' }}>
          <Doc d={d} c={c} free={free} live id="pv" />
        </div>
        {cuts.map((y, i) => <div className="pbreak" key={i} style={{ top: y * scale }}><span>{t.pageN(i + 2)}</span></div>)}
      </div>
    </div>
  );
}

/* ---------- form controls ---------- */
function F({ label, children, className = '' }) {
  return <label className={'f ' + className}><span className="lb">{label}</span>{children}</label>;
}
function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button type="button" key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

function Builder({ d, c, up, step, setStep, onDownload, pro, left, onPay, toast, onDemo, onClear }) {
  const [lang, t] = useL();
  const [sphere, setSphere] = useState(0);
  const [removing, setRemoving] = useState({});
  const [focusId, setFocusId] = useState(null);
  const cur = d.currency;
  const Fm = (v) => fmt(v, cur, lang);
  const notes = NOTE_CHIPS[lang];

  const setItem = (id, k, v) => up((n) => { const it = n.items.find((x) => x.id === id); if (it) it[k] = v; });
  const addItem = () => { const id = uid(); up((n) => { n.items.push({ id, name: '', desc: '', qty: '1', unit: 'pc', price: '' }); }); setFocusId(id); };
  const addPreset = (p) => {
    up((n) => {
      const empty = n.items.findIndex((i) => !i.name.trim() && !num(i.price));
      const row = { id: uid(), name: p[0], desc: p[1], qty: p[2], unit: p[3], price: p[4] };
      if (empty >= 0) n.items[empty] = row; else n.items.push(row);
    });
    toast(t.tAdded(p[0]));
  };
  const dup = (id) => up((n) => { const ix = n.items.findIndex((x) => x.id === id); if (ix >= 0) n.items.splice(ix + 1, 0, { ...n.items[ix], id: uid() }); });
  const del = (id) => {
    setRemoving((r) => ({ ...r, [id]: true }));
    setTimeout(() => { up((n) => { n.items = n.items.filter((x) => x.id !== id); }); setRemoving((r) => { const x = { ...r }; delete x[id]; return x; }); }, REDUCED ? 0 : 160);
  };
  const onLogo = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 2e6) { toast(t.tLogo); return; }
    const r = new FileReader();
    r.onload = () => up((n) => { n.author.logo = r.result; });
    r.readAsDataURL(f);
  };
  const addNote = (s) => up((n) => { const cu = n.terms.notes.trim(); if (!cu.includes(s)) n.terms.notes = cu ? cu + '\n' + s : s; });
  const go = (i) => setStep(Math.max(0, Math.min(3, i)));

  return (
    <div className="panel" id="builder">
      <div className="panel-h">
        <h2>{t.builder}</h2>
        <div className="row-btns">
          <button type="button" className="btn btn-t" onClick={onDemo}>{t.example}</button>
          <button type="button" className="btn btn-t" onClick={onClear}>{t.clear}</button>
        </div>
      </div>
      <div className="steps" role="tablist">
        {t.steps.map((s, i) => (
          <button type="button" role="tab" aria-selected={step === i} key={i} className={'step' + (step === i ? ' on' : '') + (i < step ? ' done' : '')} onClick={() => go(i)}>
            <span className="n">{i < step ? <Ic n="check" s={13} /> : i + 1}</span><span className="l">{s}</span>
          </button>
        ))}
      </div>

      <div className="body stepIn" key={step}>
        {step === 0 && (<>
          <div className="group">
            <h3>{t.you}</h3>
            <div className="logo-up">
              <div className={'logo-box' + (!d.author.logo && !d.author.name && !d.author.company ? ' empty' : '')} style={{ background: d.author.logo ? '#fff' : (d.author.name || d.author.company) ? d.style.accent : undefined }}>
                {d.author.logo ? <img src={d.author.logo} alt={t.logoAlt} /> : (d.author.name || d.author.company) ? <span className="mono">{initials(d)}</span> : <Ic n="upload" s={18} />}
              </div>
              <div className="logo-act">
                <label className="btn btn-g sm"><Ic n="upload" s={15} />{d.author.logo ? t.replaceLogo : t.uploadLogo}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onLogo} hidden /></label>
                {d.author.logo ? <button type="button" className="btn btn-t" onClick={() => up((n) => { n.author.logo = ''; })}>{t.removeLogo}</button> : <span className="hint">{t.logoHint}</span>}
              </div>
            </div>
            <div className="grid2">
              <F label={t.name}><input className="in" value={d.author.name} onChange={(e) => up((n) => { n.author.name = e.target.value; })} placeholder={t.namePh} /></F>
              <F label={t.company}><input className="in" value={d.author.company} onChange={(e) => up((n) => { n.author.company = e.target.value; })} placeholder={t.companyPh} /></F>
            </div>
            <F label={t.contacts}><input className="in" value={d.author.contact} onChange={(e) => up((n) => { n.author.contact = e.target.value; })} placeholder={t.contactsPh} /></F>
          </div>
          <div className="group">
            <h3>{t.client}</h3>
            <div className="grid2">
              <F label={t.contactPerson}><input className="in" value={d.client.name} onChange={(e) => up((n) => { n.client.name = e.target.value; })} placeholder={t.clientNamePh} /></F>
              <F label={t.clientCompany}><input className="in" value={d.client.company} onChange={(e) => up((n) => { n.client.company = e.target.value; })} placeholder={t.clientCoPh} /></F>
            </div>
          </div>
          <div className="group">
            <h3>{t.project}</h3>
            <F label={t.title}><input className="in" value={d.project.title} onChange={(e) => up((n) => { n.project.title = e.target.value; })} placeholder={t.titlePh} /></F>
            <div className="grid3">
              <F label={t.number}><input className="in" value={d.project.number} onChange={(e) => up((n) => { n.project.number = e.target.value; })} /></F>
              <F label={t.date}><input className="in" type="date" value={d.project.date} onChange={(e) => up((n) => { n.project.date = e.target.value; })} /></F>
              <F label={t.validDays}>
                <select className="in" value={d.project.validDays} onChange={(e) => up((n) => { n.project.validDays = e.target.value; })}>
                  {['7', '14', '30', '60'].map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </F>
            </div>
          </div>
        </>)}

        {step === 1 && (<>
          <div className="group">
            <h3>{t.quickAdd}</h3>
            <div className="chips" role="radiogroup" aria-label={t.sphere}>
              {SPHERES[lang].map((s, i) => <button type="button" key={s} className={'chip' + (sphere === i ? ' on' : '')} aria-checked={sphere === i} role="radio" onClick={() => setSphere(i)}>{s}</button>)}
            </div>
            <div className="chips presets">
              {PRESETS[lang][sphere].map((p) => <button type="button" key={p[0]} className="chip preset" onClick={() => addPreset(p)}><Ic n="plus" s={13} />{p[0]}</button>)}
            </div>
          </div>

          <div className="group">
            <div className="h-row"><h3>{t.services}</h3><span className="hint">{d.items.length} {plural(d.items.length, t.itemsF, lang)}</span></div>
            {d.items.map((i) => (
              <div className={'item' + (removing[i.id] ? ' out' : '')} key={i.id}>
                <div className="item-top">
                  <input className="in strong" aria-label={t.svcAria} value={i.name} autoFocus={focusId === i.id} onChange={(e) => setItem(i.id, 'name', e.target.value)} placeholder={t.svcPh} />
                  <button type="button" className="icon-btn" title={t.duplicate} aria-label={t.duplicateAria} onClick={() => dup(i.id)}><Ic n="copy" /></button>
                  <button type="button" className="icon-btn del" title={t.del} aria-label={t.delAria} onClick={() => del(i.id)}><Ic n="trash" /></button>
                </div>
                <input className="in soft" aria-label={t.descAria} value={i.desc} onChange={(e) => setItem(i.id, 'desc', e.target.value)} placeholder={t.descPh} />
                <div className="item-nums">
                  <F label={t.qty}><input className="in num" inputMode="decimal" value={i.qty} onChange={(e) => setItem(i.id, 'qty', e.target.value)} /></F>
                  <F label={t.unit}>
                    <select className="in" value={i.unit} onChange={(e) => setItem(i.id, 'unit', e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{t.units[u]}</option>)}</select>
                  </F>
                  <F label={t.price(CUR[cur])}><input className="in num" inputMode="decimal" value={i.price} onChange={(e) => setItem(i.id, 'price', e.target.value)} placeholder="0" /></F>
                  <div className="item-sum">{Fm(num(i.qty) * num(i.price))}</div>
                </div>
              </div>
            ))}
            <button type="button" className="add" onClick={addItem}><Ic n="plus" />{t.addItem}</button>
          </div>

          <div className="group">
            <h3>{t.calc}</h3>
            <div className="grid2">
              <F label={t.currency}>
                <select className="in" value={cur} onChange={(e) => up((n) => { n.currency = e.target.value; })}>
                  {Object.keys(CUR).map((k) => <option key={k} value={k}>{t.curNames[k]}</option>)}
                </select>
              </F>
              <div className="f"><span className="lb">{t.discount}</span>
                <div className="combo">
                  <input className="in num" inputMode="decimal" aria-label={t.discountAria} value={d.discount.value} onChange={(e) => up((n) => { n.discount.value = e.target.value; })} />
                  <Seg label={t.discountType} value={d.discount.type} options={[['pct', '%'], ['abs', CUR[cur]]]} onChange={(v) => up((n) => { n.discount.type = v; })} />
                </div>
              </div>
              <F label={t.taxName}><input className="in" value={d.tax.label} onChange={(e) => up((n) => { n.tax.label = e.target.value; })} placeholder={t.taxPh} /></F>
              <F label={t.rate}><input className="in num" inputMode="decimal" value={d.tax.rate} onChange={(e) => up((n) => { n.tax.rate = e.target.value; })} placeholder="0" /></F>
            </div>
            <div className="mini-totals">
              <div className="mt"><span>{t.subtotal}</span><span className="num">{Fm(c.subtotal)}</span></div>
              {c.discount > 0 ? <div className="mt"><span>{t.discount}</span><span className="num ok">−{Fm(c.discount)}</span></div> : null}
              {c.rate > 0 ? <div className="mt"><span>{(d.tax.label || t.taxFallback) + ' ' + c.rate + '%'}</span><span className="num">{Fm(c.tax)}</span></div> : null}
              <div className="mt total"><span>{t.total}</span><span className="num"><Anim value={c.total} cur={cur} /></span></div>
            </div>
          </div>
        </>)}

        {step === 2 && (<>
          <div className="group">
            <h3>{t.timeline}</h3>
            <div className="grid2">
              <F label={t.start}><input className="in" type="date" value={d.terms.start} onChange={(e) => up((n) => { n.terms.start = e.target.value; })} /></F>
              <F label={t.weeks}><input className="in num" inputMode="decimal" value={d.terms.weeks} onChange={(e) => up((n) => { n.terms.weeks = e.target.value; })} placeholder="4" /></F>
            </div>
          </div>
          <div className="group">
            <h3>{t.deposit}</h3>
            <div className="chips">
              {['0', '30', '50', '70', '100'].map((v) => <button type="button" key={v} className={'chip' + (String(num(d.terms.prepay)) === v ? ' on' : '')} onClick={() => up((n) => { n.terms.prepay = v; })}>{v === '0' ? t.noDeposit : v + '%'}</button>)}
            </div>
            <p className="calc-line">
              {c.pp > 0 && c.pp < 100 ? t.payNow(Fm(c.prepay), Fm(c.rest)) : c.pp >= 100 ? t.payAll(Fm(c.total)) : t.payLater(Fm(c.total))}
            </p>
          </div>
          <div className="group">
            <h3>{t.terms}</h3>
            <div className="chips presets">
              {notes.map((s) => <button type="button" key={s} className={'chip preset' + (d.terms.notes.includes(s) ? ' used' : '')} onClick={() => addNote(s)}><Ic n={d.terms.notes.includes(s) ? 'check' : 'plus'} s={13} />{s.replace(/\.$/, '')}</button>)}
            </div>
            <textarea className="in" rows="5" aria-label={t.termsAria} value={d.terms.notes} onChange={(e) => up((n) => { n.terms.notes = e.target.value; })} placeholder={t.notesPh} />
          </div>
        </>)}

        {step === 3 && (<>
          <div className="group">
            <h3>{t.docStyle}</h3>
            <div className="themes">
              {THEMES.map((k, i) => (
                <button type="button" key={k} className={'theme' + (d.style.theme === k ? ' on' : '')} aria-pressed={d.style.theme === k} onClick={() => up((n) => { n.style.theme = k; })}>
                  <span className={'sw sw-' + k} style={{ '--acc': d.style.accent }}><i /><b /><b /><b className="s" /></span>
                  <span className="tl">{THEME_NAMES[lang][i][0]}</span><span className="ts">{THEME_NAMES[lang][i][1]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="group">
            <h3>{t.color}</h3>
            <div className="swatches">
              {ACCENTS.map((hex, i) => (
                <button type="button" key={hex} className={'swatch' + (d.style.accent.toLowerCase() === hex.toLowerCase() ? ' on' : '')} style={{ background: hex, '--swc': hex }} title={ACCENT_NAMES[lang][i]} aria-label={ACCENT_NAMES[lang][i]} onClick={() => up((n) => { n.style.accent = hex; })} />
              ))}
              {pro ? (
                <label className="swatch custom" title={t.customColor} style={{ '--swc': d.style.accent }}>
                  <input type="color" value={d.style.accent} onChange={(e) => up((n) => { n.style.accent = e.target.value; })} aria-label={t.customColor} />
                </label>
              ) : (
                <button type="button" className="swatch custom locked" title={t.customColorPro} aria-label={t.customColorAria} onClick={() => onPay('color')}><Ic n="lock" s={13} /></button>
              )}
            </div>
          </div>
          <div className="group">
            <label className="switch-row">
              <span><b>{t.stampOn}</b><span className="hint">{t.stampHint}</span></span>
              <input type="checkbox" className="switch" checked={d.style.stamp} onChange={(e) => up((n) => { n.style.stamp = e.target.checked; })} />
            </label>
          </div>
          <div className="final">
            <div className="final-sum"><span>{t.total}</span><b className="num"><Anim value={c.total} cur={cur} /></b></div>
            <button type="button" className={'btn btn-p cta' + (left <= 0 ? ' locked' : '')} onClick={onDownload}><Ic n={left <= 0 ? 'lock' : 'download'} s={18} />{t.download}</button>
            <p className="fine">{pro ? t.proUnlimited : left > 0 ? t.freeLeft(left, FREE_LIMIT) : t.freeOut}</p>
          </div>
        </>)}
      </div>

      <div className="step-nav">
        <button type="button" className="btn btn-g" onClick={() => go(step - 1)} disabled={step === 0}>{t.back}</button>
        {step < 3 ? <button type="button" className="btn btn-p soft" onClick={() => go(step + 1)}>{t.next(t.steps[step + 1])}</button> : null}
      </div>
    </div>
  );
}

/* ---------- overlays ---------- */
function Paywall({ reason, d, c, onClose, onBuy, elapsed }) {
  const [lang, t] = useL();
  const [plan, setPlan] = useState('year');
  const cta = useRef(null);
  useEffect(() => { cta.current && cta.current.focus(); const k = (e) => { if (e.key === 'Escape') onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const copy = (t.pw[reason] || t.pw.upgrade)(FREE_LIMIT);
  const mins = elapsed ? Math.floor(elapsed / 60000) : 0, secs = elapsed ? Math.floor((elapsed % 60000) / 1000) : 0;
  const perMonthYear = (PRICE.year / 12).toFixed(0);
  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pw-h">
        <button type="button" className="icon-btn close" aria-label={t.close} onClick={onClose}><Ic n="x" s={18} /></button>
        <div className="m-left">
          <div className="thumb">
            <Doc d={d} c={c} free={false} id="th" />
            {reason === 'limit' ? <div className="thumb-lock"><Ic n="lock" s={14} />{t.waiting}</div> : null}
          </div>
          <div className="m-meta">
            <b className="num">{fmt(c.total, d.currency, lang)}</b>
            <span>{elapsed > 20000 ? t.builtIn(mins, secs) : t.draftSaved}</span>
          </div>
        </div>
        <div className="m-right">
          <h2 id="pw-h">{copy[0]}</h2>
          <p className="sub">{copy[1]}</p>
          <div className="billing" role="radiogroup" aria-label={t.billing}>
            <button type="button" role="radio" aria-checked={plan === 'month'} className={'bill' + (plan === 'month' ? ' on' : '')} onClick={() => setPlan('month')}>
              <span className="s">{t.monthly}</span>
              <span className="p"><s>${PRICE.monthWas}</s> ${PRICE.month}</span>
              <span className="s">{t.monthlySub}</span>
            </button>
            <button type="button" role="radio" aria-checked={plan === 'year'} className={'bill' + (plan === 'year' ? ' on' : '')} onClick={() => setPlan('year')}>
              <span className="save">−{Math.round((1 - PRICE.year / (PRICE.month * 12)) * 100)}%</span>
              <span className="s">{t.yearly}</span>
              <span className="p">${perMonthYear}</span>
              <span className="s">{t.yearlySub(PRICE.year)}</span>
            </button>
          </div>
          <ul className="feat">
            {t.feats.map((f, i) => <li key={i}><Ic n="check" />{f}{i >= 3 ? <span className="soon">{t.soon}</span> : null}</li>)}
          </ul>
          <button type="button" ref={cta} className="btn btn-p cta" onClick={onBuy}>{plan === 'year' ? t.ctaYear(PRICE.year) : t.ctaMonth(PRICE.month)}</button>
          <p className="fine">{t.pwFine}</p>
          <button type="button" className="btn btn-t later" onClick={onClose}>{t.notNow}</button>
        </div>
      </div>
    </div>
  );
}

function Gen({ g, accent }) {
  const [, t] = useL();
  return (
    <div className="ov" aria-live="polite">
      {g.done ? (
        <div className="done-stamp" style={{ color: accent }}>
          <svg viewBox="0 0 160 160" width="168" height="168" aria-hidden="true"><circle cx="80" cy="80" r="79" fill="#fff" /><g transform="rotate(-12 80 80)" fill="none" stroke="currentColor"><circle cx="80" cy="80" r="74" strokeWidth="4" /><circle cx="80" cy="80" r="62" strokeWidth="1.5" /></g><text x="80" y="90" textAnchor="middle" fill="currentColor" fontSize="30" fontWeight="700" fontFamily="Golos Text, Arial, sans-serif" transform="rotate(-12 80 80)">{t.done}</text></svg>
        </div>
      ) : (
        <div className="gen">
          <b>{t.genTitle}</b>
          <ul>
            {t.genSteps.map((s, i) => (
              <li key={i} className={i < g.stage ? 'ok' : i === g.stage ? 'run' : ''}>
                <span className="ic">{i < g.stage ? <Ic n="check" s={12} /> : null}</span>{s}
              </li>
            ))}
          </ul>
          {g.stage >= 3 ? <p className="fine">{t.genConfirm}</p> : null}
        </div>
      )}
    </div>
  );
}

/* ---------- backend (Supabase) ---------- */
const CFG = window.STAMP_CONFIG || {};
const PRIVACY_VERSION = CFG.PRIVACY_VERSION || '2026-10-03';
const PRIVACY_URL = CFG.PRIVACY_URL || 'privacy.html';
const sb = (window.supabase && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function useEsc(onClose) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
}
function PolicyLink() {
  const [, t] = useL();
  return <a href={PRIVACY_URL} target="_blank" rel="noopener">{t.privacy}</a>;
}

function AuthModal({ reason, onClose, flushDraft }) {
  const [, t] = useL();
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState('form');
  const [err, setErr] = useState('');
  const input = useRef(null);
  useEsc(onClose);
  useEffect(() => { input.current && input.current.focus(); }, [state]);
  const submit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!EMAIL_RE.test(em)) { setErr(t.errEmail); return; }
    if (!agree) { setErr(t.errConsent); return; }
    setErr(''); setState('sending');
    flushDraft();
    store.set('stamp.pendingConsent', PRIVACY_VERSION);
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    if (error) { setState('form'); setErr(t.errSend); return; }
    setState('sent');
  };
  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal small" role="dialog" aria-modal="true" aria-labelledby="au-h">
        <button type="button" className="icon-btn close" aria-label={t.close} onClick={onClose}><Ic n="x" s={18} /></button>
        {state === 'sent' ? (
          <div className="m-pad">
            <div className="sent-mark"><Mark s={44} letter="@" /></div>
            <h2 id="au-h">{t.sentTitle}</h2>
            <p className="sub">{t.sentSub(email.trim())}</p>
            <button type="button" className="btn btn-t" onClick={() => setState('form')}>{t.otherEmail}</button>
          </div>
        ) : (
          <form className="m-pad" onSubmit={submit} noValidate>
            <h2 id="au-h">{reason === 'download' ? t.authTitleDl : t.authTitle}</h2>
            <p className="sub">{t.authSub}</p>
            <label className="f"><span className="lb">{t.email}</span>
              <input ref={input} className="in big" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder={t.emailPh} required />
            </label>
            <label className="check">
              <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr(''); }} />
              <span>{t.consent(<PolicyLink />)}</span>
            </label>
            {err ? <p className="err" role="alert">{err}</p> : null}
            <button type="submit" className="btn btn-p cta" disabled={state === 'sending'}>{state === 'sending' ? t.sending : t.sendLink}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ConsentModal({ onAccepted, onSignOut, onClose }) {
  const [, t] = useL();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEsc(onClose);
  const accept = async () => {
    if (!agree) { setErr(t.errConsent); return; }
    setBusy(true);
    const { data, error } = await sb.rpc('accept_privacy', { v: PRIVACY_VERSION });
    setBusy(false);
    if (error) { setErr(t.tServer); return; }
    onAccepted(data);
  };
  return (
    <div className="ov">
      <div className="modal small" role="dialog" aria-modal="true" aria-labelledby="cs-h">
        <button type="button" className="icon-btn close" aria-label={t.close} onClick={onClose}><Ic n="x" s={18} /></button>
        <div className="m-pad">
          <h2 id="cs-h">{t.consentTitle}</h2>
          <p className="sub">{t.consentSub}</p>
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr(''); }} />
            <span>{t.consent(<PolicyLink />)}</span>
          </label>
          {err ? <p className="err" role="alert">{err}</p> : null}
          <button type="button" className="btn btn-p cta" onClick={accept} disabled={busy}>{t.acceptCta}</button>
          <button type="button" className="btn btn-t later" onClick={onSignOut}>{t.signOut}</button>
        </div>
      </div>
    </div>
  );
}

function AccountMenu({ session, quota, onSignOut, onDelete }) {
  const [, t] = useL();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('mousedown', h); addEventListener('keydown', k);
    return () => { removeEventListener('mousedown', h); removeEventListener('keydown', k); };
  }, [open]);
  const email = session.user.email || '';
  return (
    <div className="acct" ref={ref}>
      <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label={t.account} onClick={() => setOpen((o) => !o)}>{email[0] ? email[0].toUpperCase() : '·'}</button>
      {open ? (
        <div className="menu" role="menu">
          <div className="menu-head"><b>{email}</b><span>{quota ? (quota.pro ? t.planPro : t.planFree(Math.max(0, quota.limit - quota.used), quota.limit)) : '…'}</span></div>
          <a role="menuitem" href={PRIVACY_URL} target="_blank" rel="noopener">{t.privacyNav}</a>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onSignOut(); }}>{t.signOut}</button>
          <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete(); }}>{t.deleteAccount}</button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- app ---------- */
function App() {
  const [lang, setLang] = useState(() => (store.get('pechat.lang') === 'ru' ? 'ru' : 'en'));
  const t = T[lang];
  const [d, setD] = useState(() => loadDraft(store.get('pechat.lang') === 'ru' ? 'ru' : 'en'));
  const c = useMemo(() => calc(d), [d]);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState(null);
  const [quota, setQuota] = useState(null);
  const pro = !!(quota && quota.pro);
  const left = pro ? Infinity : quota ? Math.max(0, quota.limit - quota.used) : FREE_LIMIT;
  const [pay, setPay] = useState(null);
  const [auth, setAuth] = useState(null);
  const [consent, setConsent] = useState(false);
  const [gen, setGen] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const started = useRef(null);
  const exportRef = useRef(null);
  const dl = useRef(null);
  const busy = useRef(false);
  const hadSession = useRef(false);
  const tRef = useRef(t); tRef.current = t;

  const toast = useCallback((m) => setToastMsg({ m, k: Date.now() }), []);
  const flushDraft = () => store.set(DRAFT_KEY, JSON.stringify(d));

  useEffect(() => {
    dl.current = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; document.title = t.pageTitle; }, [lang]);
  useEffect(() => { const tm = setTimeout(() => store.set(DRAFT_KEY, JSON.stringify(d)), 350); return () => clearTimeout(tm); }, [d]);
  useEffect(() => { if (!toastMsg) return; const tm = setTimeout(() => setToastMsg(null), 3600); return () => clearTimeout(tm); }, [toastMsg]);

  const refreshQuota = useCallback(async () => {
    if (!sb) return null;
    const { data, error } = await sb.rpc('get_quota');
    if (error) return null;
    setQuota(data);
    return data;
  }, []);

  // session lifecycle: Supabase reads the sign-in link from the URL on load
  useEffect(() => {
    if (!sb) return;
    const handle = async (evt, s) => {
      setSession(s);
      if (!s) { setQuota(null); if (hadSession.current && evt === 'SIGNED_OUT') toast(tRef.current.tSignedOut); hadSession.current = false; return; }
      if (store.get('stamp.pendingConsent') === PRIVACY_VERSION) {
        const { error } = await sb.rpc('accept_privacy', { v: PRIVACY_VERSION });
        if (!error) store.del('stamp.pendingConsent');
      }
      const q = await refreshQuota();
      if (!hadSession.current && evt === 'SIGNED_IN') toast(tRef.current.tSignedIn(s.user.email));
      hadSession.current = true;
      if (q && !q.privacy_ok) setConsent(true);
    };
    const { data } = sb.auth.onAuthStateChange((evt, s) => {
      if (evt === 'TOKEN_REFRESHED' || evt === 'USER_UPDATED') { setSession(s); return; }
      setTimeout(() => handle(evt, s), 0); // never await Supabase calls inside this callback
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const up = useCallback((fn) => {
    if (!started.current) started.current = Date.now();
    setD((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n); n.demo = false; return n; });
  }, []);
  const switchLang = (l) => {
    if (l === lang) return;
    setLang(l); store.set('pechat.lang', l);
    if (d.demo) setD(d.demo === 'starter' ? starter(l) : demo(l));
  };

  const download = async () => {
    if (busy.current) return;
    if (!d.items.some((i) => i.name.trim() || num(i.price))) { toast(t.tNeedItem); setStep(1); return; }
    if (!sb) { toast(t.setupMissing); return; }
    if (!session) { setAuth('download'); return; }
    busy.current = true;
    const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? 0 : ms));
    try {
      const q = quota || await refreshQuota();
      if (!q) { toast(t.tServer); return; }
      if (!q.privacy_ok) { setConsent(true); return; }
      if (!q.pro && q.used >= q.limit) { setPay('limit'); return; }
      setGen({ stage: 0 }); await wait(300);
      setGen({ stage: 1 });
      const pdf = await buildPdf(exportRef.current, d, t);
      setGen({ stage: 2 });
      // the server decides whether this download is allowed and counts it
      const { data: r, error } = await sb.rpc('consume_download');
      if (error || !r) throw new Error('server');
      setQuota((p) => ({ ...(p || {}), used: r.used, limit: r.limit, pro: r.pro, privacy_ok: r.reason !== 'privacy' }));
      if (!r.ok) {
        setGen(null);
        if (r.reason === 'privacy') setConsent(true); else setPay('limit');
        return;
      }
      const name = fileName(d, lang);
      const cap = await dl.current;
      setGen({ stage: 3 });
      if (cap) await cap.save({ filename: name, data: new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' }) });
      else pdf.save(name);
      setGen({ stage: 3, done: true }); await wait(900);
      setGen(null);
      toast(r.pro ? t.tSaved : r.used >= r.limit ? t.tSavedOut : t.tSavedLeft(r.limit - r.used, r.limit));
    } catch (e) {
      setGen(null);
      const code = e && e.code;
      if (code === 'declined') toast(t.tDeclined);
      else if (code === 'rate_limited') toast(t.tRate);
      else if (e && e.message === 'libs') toast(t.tLibs);
      else if (e && e.message === 'server') toast(t.tServer);
      else toast(t.tFail);
      if (window.console) console.error(e);
    } finally { busy.current = false; }
  };

  const buy = () => {
    if (CFG.CHECKOUT_URL) { location.href = CFG.CHECKOUT_URL; return; }
    setPay(null); toast(t.tPaySoon);
  };
  const signOut = async () => { setConsent(false); if (sb) await sb.auth.signOut(); };
  const deleteAccount = async () => {
    if (!window.confirm(t.deleteConfirm)) return;
    const { error } = await sb.rpc('delete_my_account');
    if (error) { toast(t.tServer); return; }
    hadSession.current = false;
    await sb.auth.signOut({ scope: 'local' });
    toast(t.tDeleted);
  };
  const toBuilder = () => { const el = document.getElementById('builder'); if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); };

  const quotaPill = pro ? <span className="quota pro">Pro</span> : (
    <span className="quota" title={t.quotaTitle}>
      <span className="dots">{Array.from({ length: FREE_LIMIT }).map((_, i) => <i key={i} className={'dot' + (i < left ? '' : ' off')} />)}</span>
      <span className="qt">{t.quota(left, FREE_LIMIT)}</span><span className="qs">{left}/{FREE_LIMIT}</span>
    </span>
  );
  const dlBtn = () => (
    <button type="button" className={'btn btn-p' + (left <= 0 ? ' locked' : '')} onClick={download}>
      <Ic n={left <= 0 ? 'lock' : 'download'} /><span className="lbl">{t.download}</span>
    </button>
  );

  return (
    <LangCtx.Provider value={lang}>
      {!sb ? <div className="setup-bar" role="status">{t.setupMissing}</div> : null}
      <header className="top">
        <div className="wrap">
          <a className="brand" href="#top"><Mark letter={t.brand[0]} />{t.brand}</a>
          <nav className="nav"><a href="#builder">{t.nav[0]}</a><a href="#pricing">{t.nav[1]}</a><a href="#faq">{t.nav[2]}</a></nav>
          <div className="top-r">
            <div className="lang" role="radiogroup" aria-label={t.langAria}>
              {[['en', 'EN', 'English'], ['ru', 'RU', 'Русский']].map(([k, l, full]) => (
                <button type="button" key={k} role="radio" aria-checked={lang === k} aria-label={full} lang={k} className={lang === k ? 'on' : ''} onClick={() => switchLang(k)}>{l}</button>
              ))}
            </div>
            {quotaPill}
            {session ? <AccountMenu session={session} quota={quota} onSignOut={signOut} onDelete={deleteAccount} />
              : <button type="button" className="btn btn-g signin" onClick={() => (sb ? setAuth('header') : toast(t.setupMissing))}>{t.signIn}</button>}
            {dlBtn()}
          </div>
        </div>
      </header>

      <main id="top" key={lang} className="lang-in">
        <section className="hero-shell wrap">
          <div className="hero">
            <ShaderBackground className="hero-bg" />
            <div className="hero-content">
              <h1>{t.h1}</h1>
              <p>{t.lead}</p>
              <div className="hero-cta">
                <button type="button" className="btn btn-light big" onClick={toBuilder}>{t.heroCta}</button>
                <a className="btn btn-glass big" href="#pricing">{t.pricing}</a>
              </div>
              <div className="facts">{t.facts.map((f) => <span key={f}><Ic n="check" />{f}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="builder wrap">
          <Builder d={d} c={c} up={up} step={step} setStep={setStep} onDownload={download} pro={pro} left={left} onPay={setPay} toast={toast}
            onDemo={() => { setD(demo(lang)); setStep(0); }}
            onClear={() => { setD(blank(lang, d)); setStep(0); started.current = Date.now(); }} />
          <div className="pv">
            <div className="pv-bar">
              <span>{t.seeClient}</span>
              <span className="num">{t.total} <b><Anim value={c.total} cur={d.currency} /></b></span>
            </div>
            <div className="pv-scroll">
              <Preview d={d} c={c} free={!pro} />
            </div>
          </div>
        </section>

        <section className="sec wrap">
          <h2>{t.whyH}</h2>
          <div className="three">{t.why.map(([h, p]) => <div key={h}><h3>{h}</h3><p>{p}</p></div>)}</div>
        </section>

        <section className="sec wrap" id="pricing">
          <h2>{t.priceH}</h2>
          <div className="plans">
            <div className="plan">
              <h3>{t.starter}</h3>
              <div className="price">$0</div>
              <ul>
                {t.starterFeats.map((f) => <li key={f}><Ic n="check" />{f}</li>)}
                <li className="muted"><Ic n="check" />{t.starterMuted}</li>
              </ul>
              <button type="button" className="btn btn-g big" onClick={toBuilder}>{t.buildCta}</button>
            </div>
            <div className="plan pro">
              <span className="badge">{t.launch}</span>
              <h3>Pro</h3>
              <div className="price"><span className="was">${PRICE.monthWas}</span>${PRICE.month}<small>{t.perMonth}</small></div>
              <p className="alt">{t.alt(PRICE.year, (PRICE.year / 12).toFixed(0))}</p>
              <ul>
                {t.proFeats.map((f) => <li key={f}><Ic n="check" />{f}</li>)}
                {t.proSoon.map((f) => <li key={f}><Ic n="check" />{f}<span className="soon">{t.soon}</span></li>)}
              </ul>
              <button type="button" className="btn btn-p big" onClick={() => setPay('upgrade')}>{t.goPro}</button>
            </div>
          </div>
        </section>

        <section className="sec wrap" id="faq">
          <h2>{t.faqH}</h2>
          <div className="faq">
            {t.faq.map(([q, a]) => <details key={q}><summary>{q}<span className="pl"><Ic n="plus" /></span></summary><p>{a}</p></details>)}
          </div>
        </section>
      </main>

      <footer className="foot wrap">
        <span>© 2026 {t.brand}</span>
        <span className="foot-links">
          <a href={PRIVACY_URL}>{t.privacyNav}</a>
          {CFG.CONTACT_EMAIL ? <a href={'mailto:' + CFG.CONTACT_EMAIL}>{t.contact}</a> : null}
        </span>
      </footer>

      <div className="mbar">
        <button type="button" className="mb-sum" onClick={() => { const el = document.querySelector('.pv'); if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); }}>
          <span className="hint">{t.mbTotal}</span><b className="num"><Anim value={c.total} cur={d.currency} /></b>
        </button>
        {dlBtn()}
      </div>

      <div className="export-host" aria-hidden="true">
        <div ref={exportRef}><Doc d={d} c={c} free={!pro} id="ex" /></div>
      </div>

      {pay ? <Paywall reason={pay} d={d} c={c} onClose={() => setPay(null)} onBuy={buy} elapsed={started.current ? Date.now() - started.current : 0} /> : null}
      {auth ? <AuthModal reason={auth} onClose={() => setAuth(null)} flushDraft={flushDraft} /> : null}
      {consent && session ? <ConsentModal onAccepted={(q) => { setQuota(q); setConsent(false); }} onSignOut={signOut} onClose={() => setConsent(false)} /> : null}
      {gen ? <Gen g={gen} accent={d.style.accent} /> : null}
      {toastMsg ? <div className="toast" key={toastMsg.k} role="status">{toastMsg.m}</div> : null}
    </LangCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
