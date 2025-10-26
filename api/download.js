import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const postUrl = req.query.url;
  if (!postUrl) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  try {
    // 1️⃣ Load post page
    const { data: postHtml } = await axios.get(postUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(postHtml);
    const downloadUrl = $("a[data-e-disable-page-transition=true]").attr("href");

    if (!downloadUrl) {
      return res.status(404).json({ error: "Download link not found on page" });
    }

    // 2️⃣ Download ZIP file
    const response = await axios.post(downloadUrl, null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
      responseType: "arraybuffer",
    });

    const filename =
      response.headers["x-dlm-file-name"] ||
      `baiscope_subtitle_${Date.now()}.zip`;

    // 3️⃣ Send ZIP to user
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/zip");
    return res.status(200).send(response.data);
  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).json({ error: "Failed to download subtitle", details: err.message });
  }
}
