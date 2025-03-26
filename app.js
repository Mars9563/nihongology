const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// this is letting me use the static file 

//1. This is for the main page
app.use(express.static(path.join(__dirname, "public")));
//-----

//2.This is for the kana page
app.use(express.static(path.join(__dirname,"/sections/kana")));

// This serves the main page "GET" request
app.get("/", (req,res) => {
    res.sendFile(__dirname+"/public/index.html");
});

// This serves the kana page "GET" request
app.get("/kana",(req,res) =>{
    res.sendFile(__dirname+"/sections/kana/kana.html");
});

// setting up my own api to fetch kana.json
app.get("/api/kana", (req, res) => {
    res.sendFile(path.join(__dirname, "/data/kana.json"));
});

app.listen(port, () =>{
    console.log("server started at port: "+ port);
})