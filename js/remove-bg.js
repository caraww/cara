const fs = require("fs");
const path = require("path");
const { removeBackground } = require("@imgly/background-removal-node");

(async () => {
  try {
    console.log("START");

    const result = await removeBackground("img/bead works/10.jpg", {
      model: "small",
      output: { format: "image/png" }
    });

    console.log("REMOVED:", result.size);

    const buffer = Buffer.from(await result.arrayBuffer());

    const outputDir = path.join("img", "works-cutouts");
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, "10-cutout.png"),
      buffer
    );

    console.log("SAVED ✅");
  } catch (e) {
    console.error("ERROR:", e);
  }
})();