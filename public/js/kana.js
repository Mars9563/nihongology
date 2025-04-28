$(document).ready(function () {
    let kanaData = [];
    let lastClickedKana = null;  // To store the last clicked kana and prevent redundant updates

    // Load kana.json
    $.getJSON("api/kana")
        .done(function (data) {
            console.log("Kana Data Loaded:", data);
            kanaData = data;
            populateCharts();
        })
        .fail(function () {
            console.error("Error loading kana.json");
        });

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

    // Handle character click event to update the info box
    $(document).on("click", ".kana-item", function () {
        let character = $(this).data("character");

        // If the same kana is clicked, do nothing
        if (character === lastClickedKana) {
            return;
        }

        lastClickedKana = character;  // Update the last clicked kana

        if (character) {
            let unicodeHex = character.codePointAt(0).toString(16).toUpperCase(); // Convert to uppercase hex
            let paddedHex = unicodeHex.padStart(5, "0"); // Ensure 5-digit filenames

            let apiURL = `/api/assets/kanji/${paddedHex}`; // API endpoint
    
            $("#kanjiTitle").text(character);
            $("#kanjiSvgContainer").html("<p>Loading...</p>"); // Show loading text while fetching
    
            // Fetch the SVG file via GET request
            $.get(apiURL)
                .done(function (svgData, status, xhr) {
                    console.log("Received SVG Data:", svgData);

                    // Check if the response is a Document, extract the SVG
                    if (svgData instanceof Document) {
                        let svgElement = svgData.documentElement; // Extract the <svg> element
                        $("#kanjiSvgContainer").html(svgElement.outerHTML);
                        fetchKanaDescription(character); // Insert SVG properly
                        animateKanjiGSAP();
                    } else {
                        $("#kanjiSvgContainer").html(svgData); // Fallback
                    }
                })
                .fail(function () {
                    console.error("Failed to fetch SVG");
                    $("#kanjiSvgContainer").html("<p>SVG not found</p>");
                });
        }
    });

    // Clear box on mouse leave (now only for the text)
    $(document).on("mouseleave", ".kana-item", function () {
        if (!lastClickedKana) {
            $("#kanjiTitle").text("Select Kana");
            $("#kanjiSvgContainer").empty();
            $("#kanjiDescription").text("Hover over a kana to see details.");
        }
    });

    // Play pronunciation when character is clicked
    $(document).on("click", ".kana-item", function () {
        let character = $(this).data("character");
        if (character) {
            let utterance = new SpeechSynthesisUtterance(character);
            utterance.lang = "ja-JP";
            speechSynthesis.speak(utterance);
        }
    });

    function animateKanjiGSAP() {
        let tl = gsap.timeline({
            onComplete: function () {
                // Re-enable click to trigger animation again after previous animation is complete
                $("#kanjiSvgContainer").off("click").on("click", function () {
                    animateKanjiGSAP();  // Trigger animation again when clicked
                });
            }
        });
    
        // Reset any previous strokeDasharray and strokeDashoffset before starting the animation
        $("#kanjiSvgContainer path").each(function () {
            let length = this.getTotalLength();
            $(this).css({ strokeDasharray: length, strokeDashoffset: length });
        });
    
        // Start animating the SVG paths
        $("#kanjiSvgContainer path").each(function (index) {
            let length = this.getTotalLength();
            tl.fromTo(this,
                { strokeDasharray: length, strokeDashoffset: length }, // Starting state
                { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" }, // End state
                `+=0.5` // Delay each stroke animation by 0.5s
            );
        });
    
        // Disable click while animation is running (to prevent re-triggering)
        $("#kanjiSvgContainer").off("click");
    }


    function fetchKanaDescription(kana) {
        if (!kana) {
            $("#kanjiDescription").text("Kana not found.");
            return;
        }
        const apiUrl = `/api/jisho/${kana}`;
        $.getJSON(apiUrl, function (data) {
            if (data.data.length > 0) {
                const word = data.data[0].japanese[0].word || kana;
                const reading = data.data[0].japanese[0].reading;
                const meaning = data.data[0].senses[0].english_definitions.join(", ");
                $("#kanjiDescription").text(`${word} (${reading}): ${meaning}`);
            } else {
                $("#kanjiDescription").text("No description found.");
            }
        }).fail(function () {
            $("#kanjiDescription").text("Failed to load data.");
        });
    }
});
