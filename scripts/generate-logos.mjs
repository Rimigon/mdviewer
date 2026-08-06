// Генерация вариантов логотипов: SVG -> PNG (256) + галерея HTML на рабочем столе
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const desktop = join(homedir(), "Desktop", "mdviewer-logos");

// ---------- Пиксельная решётка (J): считаем клетки программно ----------
// Сетка 5x5, ячейка 64, начало (96,96): шаблон # — колонки 1,3 и ряды 1,3
const cell = 64;
const origin = 96;
const cols = [1, 3];
const rows = [1, 3];
const pixelRects = [];
for (const c of cols) {
	for (let r = 0; r < 5; r++) {
		pixelRects.push(
			`<rect x="${origin + c * cell}" y="${origin + r * cell}" width="${cell}" height="${cell}" fill="#ffffff"/>`,
		);
	}
}
for (const r of rows) {
	for (let c = 0; c < 5; c++) {
		if (cols.includes(c)) continue; // уже нарисовано (пересечение)
		pixelRects.push(
			`<rect x="${origin + c * cell}" y="${origin + r * cell}" width="${cell}" height="${cell}" fill="#ffffff"/>`,
		);
	}
}
const pixelHashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  ${pixelRects.join("\n  ")}
</svg>`;

// ---------- Концепты ----------
const concepts = [
	{
		id: "A",
		name: "Хэш (толстый)",
		desc: "Первый вариант: бары 56px, горизонтали касаются — сливаются. Оставлен для сравнения.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="156" y="132" width="56" height="248" rx="18" fill="#ffffff"/>
  <rect x="300" y="132" width="56" height="248" rx="18" fill="#ffffff"/>
  <rect x="112" y="200" width="288" height="56" rx="18" fill="#ffffff"/>
  <rect x="112" y="256" width="288" height="56" rx="18" fill="#ffffff"/>
</svg>`,
	},
	{
		id: "B",
		name: "Документ + решётка",
		desc: "Классика: страница документа с символом Markdown.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="140" y="100" width="232" height="312" rx="28" fill="#ffffff"/>
  <rect x="192" y="156" width="28" height="148" rx="10" fill="#0969da"/>
  <rect x="292" y="156" width="28" height="148" rx="10" fill="#0969da"/>
  <rect x="156" y="206" width="200" height="28" rx="10" fill="#0969da"/>
  <rect x="156" y="264" width="200" height="28" rx="10" fill="#0969da"/>
  <rect x="156" y="350" width="130" height="14" rx="7" fill="#d0d7de"/>
  <rect x="156" y="378" width="92" height="14" rx="7" fill="#d0d7de"/>
</svg>`,
	},
	{
		id: "C",
		name: "Тёмный редактор",
		desc: "Фон тёмной темы приложения, толстая решётка — тоже сливается. Для сравнения.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1b1e24"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="94.5" fill="none" stroke="#2a2f3a" stroke-width="3"/>
  <rect x="156" y="132" width="56" height="248" rx="18" fill="#4c8bf5"/>
  <rect x="300" y="132" width="56" height="248" rx="18" fill="#4c8bf5"/>
  <rect x="112" y="200" width="288" height="56" rx="18" fill="#4c8bf5"/>
  <rect x="112" y="256" width="288" height="56" rx="18" fill="#4c8bf5"/>
</svg>`,
	},
	{
		id: "D",
		name: "M вниз",
		desc: "Символ Markdown — буква M с нисходящей стрелкой.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <path d="M176 150 L176 300 L256 390 L336 300 L336 150" fill="none" stroke="#ffffff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="256" y1="398" x2="256" y2="428" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
  <polygon points="224,432 288,432 256,466" fill="#ffffff"/>
</svg>`,
	},
	{
		id: "E",
		name: "Сплит",
		desc: "Редактор слева, отрендеренный документ справа — о главной фиче.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="128" y="96" width="256" height="320" rx="24" fill="#ffffff"/>
  <rect x="142" y="104" width="104" height="304" rx="14" fill="#1b1e24"/>
  <rect x="162" y="136" width="64" height="12" rx="6" fill="#3a4150"/>
  <rect x="162" y="164" width="84" height="12" rx="6" fill="#4c8bf5"/>
  <rect x="162" y="192" width="56" height="12" rx="6" fill="#3a4150"/>
  <rect x="162" y="220" width="76" height="12" rx="6" fill="#3a4150"/>
  <rect x="162" y="248" width="64" height="12" rx="6" fill="#3a4150"/>
  <rect x="162" y="276" width="80" height="12" rx="6" fill="#3a4150"/>
  <rect x="162" y="304" width="70" height="12" rx="6" fill="#3a4150"/>
  <rect x="264" y="132" width="92" height="18" rx="6" fill="#0969da"/>
  <rect x="264" y="170" width="84" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="190" width="100" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="210" width="88" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="244" width="64" height="12" rx="6" fill="#0969da"/>
  <rect x="264" y="270" width="96" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="290" width="80" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="310" width="100" height="10" rx="5" fill="#d0d7de"/>
  <rect x="264" y="330" width="86" height="10" rx="5" fill="#d0d7de"/>
</svg>`,
	},
	{
		id: "F",
		name: "Хэш (тонкий)",
		desc: "Решётка с зазорами: бары 40px, горизонтали не касаются — читается чётко.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="170" y="130" width="40" height="252" rx="14" fill="#ffffff"/>
  <rect x="302" y="130" width="40" height="252" rx="14" fill="#ffffff"/>
  <rect x="126" y="190" width="260" height="40" rx="14" fill="#ffffff"/>
  <rect x="126" y="282" width="260" height="40" rx="14" fill="#ffffff"/>
</svg>`,
	},
	{
		id: "G",
		name: "Документ с уголком",
		desc: "Страница с загнутым углом и аккуратной решёткой внутри.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <path d="M128 96 H320 L376 152 V416 H128 Z" fill="#ffffff"/>
  <path d="M320 96 L376 152 H320 Z" fill="#dbe3ec"/>
  <rect x="176" y="140" width="28" height="160" rx="10" fill="#0969da"/>
  <rect x="300" y="140" width="28" height="160" rx="10" fill="#0969da"/>
  <rect x="148" y="186" width="208" height="28" rx="10" fill="#0969da"/>
  <rect x="148" y="246" width="208" height="28" rx="10" fill="#0969da"/>
  <rect x="148" y="336" width="110" height="12" rx="6" fill="#d0d7de"/>
  <rect x="148" y="364" width="76" height="12" rx="6" fill="#d0d7de"/>
</svg>`,
	},
	{
		id: "H",
		name: "Терминал",
		desc: "Окно редактора с приглашением «>» и курсором — дух кодинга.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="112" y="104" width="288" height="304" rx="20" fill="#1b1e24"/>
  <circle cx="146" cy="126" r="8" fill="#f47067"/>
  <circle cx="172" cy="126" r="8" fill="#e3b341"/>
  <circle cx="198" cy="126" r="8" fill="#57ab5a"/>
  <path d="M144 236 l22 22 -22 22" fill="none" stroke="#e8eaed" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="184" y="230" width="16" height="52" rx="4" fill="#4c8bf5"/>
  <rect x="144" y="308" width="140" height="12" rx="6" fill="#3a4150"/>
  <rect x="144" y="336" width="96" height="12" rx="6" fill="#3a4150"/>
</svg>`,
	},
	{
		id: "I",
		name: "Монограмма MD",
		desc: "Литеры M и D — бренд «MD» без лишних деталей.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <path d="M162 150 L162 290 L206 340 L250 290 L250 150" fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="306" y1="150" x2="306" y2="340" stroke="#ffffff" stroke-width="36" stroke-linecap="round"/>
  <path d="M306 150 A 95 95 0 0 1 306 340" fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round"/>
</svg>`,
	},
	{
		id: "J",
		name: "Пиксельная решётка",
		desc: "Решётка из пикселей — современно и не сливается.",
		svg: pixelHashSvg,
	},
	{
		id: "K",
		name: "Документ со стрелкой",
		desc: "Страница со стрелкой вниз — «открыть/сохранить», связь с файлами.",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0969da"/>
  <rect x="150" y="90" width="212" height="332" rx="24" fill="#ffffff"/>
  <line x1="256" y1="176" x2="256" y2="296" stroke="#0969da" stroke-width="26" stroke-linecap="round"/>
  <polygon points="216,290 296,290 256,334" fill="#0969da"/>
  <rect x="184" y="352" width="90" height="12" rx="6" fill="#d0d7de"/>
  <rect x="184" y="376" width="64" height="12" rx="6" fill="#d0d7de"/>
</svg>`,
	},
];

// ---------- Рендер PNG ----------
await mkdir(desktop, { recursive: true });
for (const c of concepts) {
	await sharp(Buffer.from(c.svg))
		.resize(256, 256)
		.png()
		.toFile(join(desktop, `${c.id}.png`));
	await sharp(Buffer.from(c.svg))
		.resize(512, 512)
		.png()
		.toFile(join(desktop, `${c.id}-large.png`));
	console.log(`rendered ${c.id}.png`);
}

// ---------- Галерея HTML ----------
const cards = concepts
	.map(
		(c) => `
  <div class="card">
    <div class="tile"><img src="${c.id}-large.png" alt="${c.name}" /></div>
    <h3>${c.id}. ${c.name}</h3>
    <p>${c.desc}</p>
  </div>`,
	)
	.join("");

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>MD Viewer — варианты логотипа</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #16181d; color: #e8eaed; padding: 40px 24px; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .sub { color: #9aa4b2; font-size: 13px; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; max-width: 1400px; }
  .card { background: #1b1e24; border: 1px solid #2a2f3a; border-radius: 12px; padding: 20px; }
  .tile { background: #16181d; border: 1px solid #2a2f3a; border-radius: 10px; padding: 16px; display: flex; justify-content: center; margin-bottom: 14px; }
  .tile img { width: 128px; height: 128px; border-radius: 16px; }
  h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
  p { font-size: 12.5px; color: #9aa4b2; line-height: 1.5; }
</style>
</head>
<body>
  <h1>MD Viewer — варианты логотипа</h1>
  <p class="sub">Выбери вариант и напиши букву (A–K) — встрою его в иконку приложения и пересоберу установщик.</p>
  <div class="grid">${cards}</div>
</body>
</html>`;

await writeFile(join(desktop, "index.html"), html);
console.log("gallery: " + join(desktop, "index.html"));
