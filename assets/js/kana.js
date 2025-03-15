$(document).ready(function () {
    let kanaData = [];

    // Load kana.json
    $.getJSON("../../assets/data/kana.json")
        .done(function (data) {
            console.log("Kana Data Loaded:", data);
            kanaData = data;
            populateCharts();
        })
        .fail(function () {
            console.error("Error loading kana.json");
        });

    // Function to populate Kana Charts
    function populateCharts() {
        $("#hiraganaChart, #katakanaChart").empty();

        const structuredHiragana = [
            ["あ", "い", "う", "え", "お"],
            ["か", "き", "く", "け", "こ"],
            ["さ", "し", "す", "せ", "そ"],
            ["た", "ち", "つ", "て", "と"],
            ["な", "に", "ぬ", "ね", "の"],
            ["は", "ひ", "ふ", "へ", "ほ"],
            ["ま", "み", "む", "め", "も"],
            ["や", "", "ゆ", "", "よ"],
            ["ら", "り", "る", "れ", "ろ"],
            ["わ", "", "", "", "を"],
            ["ん", "", "", "", ""]
        ];

        const structuredKatakana = [
            ["ア", "イ", "ウ", "エ", "オ"],
            ["カ", "キ", "ク", "ケ", "コ"],
            ["サ", "シ", "ス", "セ", "ソ"],
            ["タ", "チ", "ツ", "テ", "ト"],
            ["ナ", "ニ", "ヌ", "ネ", "ノ"],
            ["ハ", "ヒ", "フ", "ヘ", "ホ"],
            ["マ", "ミ", "ム", "メ", "モ"],
            ["ヤ", "", "ユ", "", "ヨ"],
            ["ラ", "リ", "ル", "レ", "ロ"],
            ["ワ", "", "", "", "ヲ"],
            ["ン", "", "", "", ""]
        ];

        function getRomaji(char) {
            let found = kanaData.find(k => k.character === char);
            return found ? found.romaji : "";
        }

        function createKanaTable(structuredData, targetId) {
            let chart = $(targetId);
            structuredData.forEach(row => {
                let rowDiv = $("<div>").addClass("kana-row");
                row.forEach(kanaChar => {
                    let kanaDiv = $("<div>").addClass("kana-item");

                    if (kanaChar !== "") {
                        let romaji = getRomaji(kanaChar);
                        let charSpan = $("<span>").addClass("kana-char").text(kanaChar);
                        let romajiSpan = $("<span>").addClass("romaji").text(romaji);

                        kanaDiv.attr("data-character", kanaChar);
                        kanaDiv.append(charSpan, romajiSpan);
                    } else {
                        kanaDiv.addClass("empty");
                    }

                    rowDiv.append(kanaDiv);
                });
                chart.append(rowDiv);
            });
        }

        createKanaTable(structuredHiragana, "#hiraganaChart");
        createKanaTable(structuredKatakana, "#katakanaChart");
    }

    // Play pronunciation when character is clicked
    $(document).on("click", ".kana-item", function () {
        let character = $(this).data("character");
        if (character) {
            let utterance = new SpeechSynthesisUtterance(character);
            utterance.lang = "ja-JP";
            speechSynthesis.speak(utterance);
        }
    });
});
