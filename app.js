const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

//1. This is for the main page
app.use(express.static(path.join(__dirname, "public")));

// This serves the main page "GET" request
app.get("/", (req,res) => {
    res.sendFile(__dirname+"/public/index.html");
});
//-----


//2.This is for the kana page
app.use(express.static(path.join(__dirname,"/sections/kana")));

// This serves the kana page "GET" request
app.get("/kana",(req,res) =>{
    res.sendFile(__dirname+"/sections/kana/kana.html");
});

// setting up my own api to fetch kana.json
app.get("/api/kana", (req, res) => {
    res.sendFile(path.join(__dirname, "/data/kana.json"));
});
// this is the get function to fetch the svg data to show in the box
app.get("/api/assets/kanji/:hex", (req, res) => {
    const hexCode = req.params.hex.toLowerCase(); // Ensure uppercase
    console.log(hexCode);
    const svgPath = path.join(__dirname, "assets", "kanji", `${hexCode}.svg`);
    console.log(svgPath);
    // Check if the file exists
    fs.readFile(svgPath, "utf8", (err, data) => {
        if (err) {
            return res.status(404).send("SVG not found");
        }
        res.setHeader("Content-Type", "image/svg+xml");
        res.send(data);
    });
});
//-----

//3. This is for the kanji page
app.use(express.static(path.join(__dirname,"/sections/kanji")));

app.get("/kanji", (req,res) => {
    res.sendFile(__dirname+"/sections/kanji/kanji.html");
});
//-----


app.listen(port, () =>{
    console.log("server started at port: "+ port);
})