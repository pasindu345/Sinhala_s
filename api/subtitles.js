import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.baiscope.lk";

export default async function handler(req, res) {
  const query = req.query.search;
  if (!query) {
    return res.status(400).json({ error: "Missing ?search= query parameter" });
  }

  try {
    // 1️⃣ Fetch search results page
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    // 2️⃣ Parse HTML for movie links
    const $ = cheerio.load(html);
    const results = [];

    $("article.elementor-post").each((_, el) => {
      const link =
        $(el)
          .find("a.elementor-post__thumbnail__link, h5.elementor-post__title a")
          .first()
          .attr("href") || "";
      const title = $(el).find("h5.elementor-post__title").text().trim();

      if (title && link && !title.includes("Collection")) {
        results.push({ title, url: link });
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "No subtitles found for that query" });
    }

    // 3️⃣ Get download URL from first result
    const postUrl = results[0].url;
    const { data: postHtml } = await axios.get(postUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $$ = cheerio.load(postHtml);
    const downloadUrl = $$("a[data-e-disable-page-transition=true]").attr("href");

    if (!downloadUrl) {
      return res.status(404).json({ error: "Download link not found on subtitle page" });
    }

    // 4️⃣ Download subtitle ZIP
    const response = await axios.post(downloadUrl, null, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
      },
      responseType: "arraybuffer",
    });

    const filename =
      response.headers["x-dlm-file-name"] ||
      "baiscope_subtitle.zip";

    // 5️⃣ Return ZIP file as response
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/zip");
    return res.status(200).send(response.data);

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({
      error: "Failed to download subtitle",
      details: err.message,
    });
  }
}
