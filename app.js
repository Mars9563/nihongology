const express = require("express");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { Pool } = require("pg");
const app = express();
const port = 3000;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "sections/kana")));
app.use(express.static(path.join(__dirname, "sections/kanji")));

// Route for main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/index.html"));
});

// Route for kana page
app.get("/kana", (req, res) => {
    res.sendFile(path.join(__dirname, "/sections/kana/kana.html"));
});

// API route to fetch kana data
app.get("/api/kana", (req, res) => {
    res.sendFile(path.join(__dirname, "/data/kana.json"));
});

// Route for kanji page
app.get("/kanji", (req, res) => {
    res.sendFile(path.join(__dirname, "/sections/kanji/kanji.html"));
});

// API route to fetch kanji levels from the database
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

// API route to fetch Kanji SVG assets
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

// Database connection error handling
pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});

// Start the server
app.listen(port, () => {
    console.log("Server started at port: " + port);
});
