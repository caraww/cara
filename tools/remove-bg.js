const fs = require("fs");
const path = require("path");
const { removeBackground } = require("@imgly/background-removal-node");

const inputDir = path.join("img", "bead works");
const outputDir = path.join("img", "works-cutouts");

const extensions = /\.(jpg|jpeg|png|webp)$/i;

(async () => {
  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const files = fs
      .readdirSync(inputDir)
      .filter((file) => extensions.test(file));

    console.log(`Found ${files.length} images\n`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      console.log(`[${i + 1}/${files.length}] ${file}`);

      const input = path.join(inputDir, file);

      const name = path.basename(file, path.extname(file));
      const output = path.join(outputDir, `${name}-cutout.png`);

      try {
        const result = await removeBackground(input, {
          model: "small",
          output: {
            format: "image/png",
          },
        });

        const buffer = Buffer.from(await result.arrayBuffer());

        fs.writeFileSync(output, buffer);

        console.log(`    ✓ saved`);
      } catch (error) {
        console.log(`    ✗ ERROR: ${error.message}`);
      }
    }

    console.log("\n🎉 ALL DONE!");
  } catch (error) {
    console.error("FATAL ERROR:", error);
  }
})();
