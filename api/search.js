import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.baiscope.lk";

export default async function handler(req, res) {
  const query = req.query.query;
  const baseApi = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

  if (!query) {
    return res.status(400).json({ error: "Missing ?query= parameter" });
  }

  try {
    // 1️⃣ Search the site
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    // 2️⃣ Parse results
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
        results.push({
          title,
          download: `${baseApi}/api/download?url=${encodeURIComponent(link)}`,
        });
      }
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "No subtitles found" });
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("Search error:", err.message);
    return res.status(500).json({ error: "Failed to fetch search results", details: err.message });
  }
}
