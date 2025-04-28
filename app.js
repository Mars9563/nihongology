import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from 'url';
import axios from "axios";
import JishoAPI from 'unofficial-jisho-api';

const jisho = new JishoAPI();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.set('view engine', 'ejs');
const port = 3000;
// db auth
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// serving static files
app.use(express.static(path.join(__dirname, "public")));

// Route to the main page
app.get("/", (req, res) => {
    res.render("index.ejs");
});

// Kana page Route
app.get("/kana", (req, res) => {
  res.render("kana.ejs");
});
// kana page API's
app.get("/api/kana", (req, res) => {
    res.sendFile(path.join(__dirname, "/data/kana.json"));
});

// Route for kanji page
app.get("/kanji", (req, res) => {
  res.render("kanji.ejs");
});

// Route for Vocabolary page
app.get("/vocab", (req, res) => {
  res.render("vocab.ejs");
});

//This is for the kanji quiz section
app.get("/kanji-quiz", (req, res) => {
  res.render("kanji-quiz.ejs");
});
//
// This is for the vocab-quiz section
app.get("/vocab-quiz", (req, res) => {
  res.render("vocab-quiz.ejs");
});
//

// API route to fetch kanji by levels from the database
app.get("/api/kanji/levels", async (req, res) => {
    try {
        const query = `
            SELECT 
                CASE 
                    WHEN jlpt_level IN (4, 5) THEN 'N4'
                    WHEN jlpt_level = 3 THEN 'N3'
                    WHEN jlpt_level = 2 THEN 'N2'
                    WHEN jlpt_level = 1 THEN 'N1'
                    ELSE 'OTHER'
                END as level,
                literal,
                english,
                onyomi,
                kunyomi
            FROM kanji_data
            WHERE jlpt_level IN (1, 2, 3, 4, 5)
            ORDER BY level, literal
        `;

        const result = await pool.query(query);

        const groupedKanji = result.rows.reduce((acc, row) => {
            if (!acc[row.level]) acc[row.level] = [];
            acc[row.level].push(row);
            return acc;
        }, {});

        res.json(groupedKanji);
    } catch (error) {
        console.error("Error fetching Kanji data:", error);
        res.status(500).json({ error: "Failed to fetch Kanji data" });
    }
});

// API route to fetch Kana SVG assets
app.get("/api/assets/kanji/:hex", (req, res) => {
    const hexCode = req.params.hex.toLowerCase();
    const svgPath = path.join(__dirname, "assets", "kanji", `${hexCode}.svg`);

    fs.readFile(svgPath, "utf8", (err, data) => {
        if (err) {
            return res.status(404).send("SVG not found");
        }
        res.setHeader("Content-Type", "image/svg+xml");
        res.send(data);
    });
});


// jisho api fetch for description
app.get('/api/jisho/:kana', async (req, res) => {
  const kana = req.params.kana;
  try {
    const data = await jisho.searchForPhrase(kana); // or .scrapeForPhrase(kana) for more data
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch from Jisho" });
  }
});

// API route to fetch 10 random sentences for a given kanji
app.get("/api/kanji/examples/:kanji", async (req, res) => {
  const kanji = req.params.kanji;

  try {
    const query = `
      SELECT sp.jp_sentence, sp.en_sentence
      FROM kanji_sentence_map ksm
      JOIN sentence_pairs sp ON ksm.sentence_id = sp.id
      WHERE ksm.kanji_literal = $1
      ORDER BY RANDOM()
      LIMIT 10;
    `;

    const result = await pool.query(query, [kanji]);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching kanji examples:", error);
    res.status(500).json({ error: "Failed to fetch example sentences" });
  }
});

// API route to fetch vocabulary by JLPT level
app.get("/api/vocab/level/:level", async (req, res) => {
  const level = req.params.level.toUpperCase();

  try {
    const query = `
      SELECT id, original, furigana, english
      FROM jlpt_vocab
      WHERE jlpt_level = $1
      ORDER BY id;
    `;
    const result = await pool.query(query, [level]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching vocabulary:", error);
    res.status(500).json({ error: "Failed to fetch vocabulary data" });
  }
});


// New experiment
// Fetch 10 random example sentences for a given vocab ID
// finalized maybe a 2 weeks ago.
app.get("/api/vocab/examples/:vocabId", async (req, res) => {
    const vocabId = parseInt(req.params.vocabId);

    if (isNaN(vocabId)) return res.status(400).send("Invalid vocab ID");

    try {
        const result = await pool.query(`
            SELECT sp.jp_sentence, sp.en_sentence
            FROM sentence_pairs sp
            JOIN sentence_vocab_map svm ON sp.id = svm.sentence_id
            WHERE svm.vocab_id = $1
            ORDER BY RANDOM()
            LIMIT 10;
        `, [vocabId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error fetching examples");
    }
});




// Database connection error handling
pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});
// server starting
app.listen(port, () =>{
  console.log("server Started at port:" + port);
} );