import sharp from "sharp";
import pngToIco from "png-to-ico";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFile } from "node:fs/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const svgPath = join(root, "build", "icon.svg");
const pngPath = join(root, "build", "icon.png");
const icoPath = join(root, "build", "icon.ico");

// 256x256 PNG — используется окном в dev и как исходник для ICO
const png256 = await sharp(svgPath).resize(256, 256).png().toBuffer();
await writeFile(pngPath, png256);
console.log("PNG 256x256:", pngPath, png256.length, "bytes");

// 512x512 PNG — для маркетплейсов/футуры
const png512 = await sharp(svgPath).resize(512, 512).png().toBuffer();
await writeFile(join(root, "build", "icon-512.png"), png512);
console.log("PNG 512x512: written");

// Многоразмерный ICO для Windows (16/24/32/48/64/128/256)
const ico = await pngToIco([png256]);
await writeFile(icoPath, ico);
console.log("ICO:", icoPath, ico.length, "bytes");
