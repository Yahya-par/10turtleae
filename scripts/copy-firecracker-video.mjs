import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = "c:/10Turtle/Extra/firecrackers video.mp4";
const dest = path.join(__dirname, "../public/Videos/firecrackers.mp4");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("Copied to", dest, "size", fs.statSync(dest).size);
