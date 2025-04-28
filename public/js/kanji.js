document.addEventListener("DOMContentLoaded", function () {
    const kanjiContent = document.querySelector(".kanji-content");
    const jlptButtons = document.querySelectorAll(".btn-group .btn");
    
    async function fetchKanjiData() {
        try {
            const response = await fetch("/api/kanji/levels");
            if (!response.ok) throw new Error("Failed to fetch data");
            const kanjiData = await response.json();
            return kanjiData;
        } catch (error) {
            console.error("Error fetching Kanji data:", error);
            return {};
        }
    }
    function renderKanjiTable(kanjiList) {
        if (!kanjiList || kanjiList.length === 0) {
            kanjiContent.innerHTML = "<p>No Kanji found for this level.</p>";
            return;
        }
    
        kanjiContent.innerHTML = `
            <div class="d-flex flex-wrap flex-md-nowrap gap-4 width_setting">
                <!-- Table Section -->
                <div class="scroll-box table-responsive flex-grow-1">
                    <table class="table table-bordered mt-3 kanji-table">
                        <thead class="table-dark">
                            <tr>
                                <th>Kanji</th>
                                <th>Onyomi</th>
                                <th>Kunyomi</th>
                                <th>English</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${kanjiList.map(kanji => `
                                <tr>
                                    <td class="literal_table_sec">${kanji.literal}</td>
                                    <td>${kanji.onyomi || "-"}</td>
                                    <td>${kanji.kunyomi || "-"}</td>
                                    <td>${kanji.english || "-"}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        attachKanjiRowListeners(kanjiList);
    }
    
    async function handleJLPTSelection(level) {
        const kanjiData = await fetchKanjiData();
        renderKanjiTable(kanjiData[level] || []);
    }
    
    // Load N4/N5 by default
    handleJLPTSelection("N4");
    
    jlptButtons.forEach(button => {
        button.addEventListener("click", function () {
          let selectedLevel = button.value;
            jlptButtons.forEach(btn => btn.classList.remove("active"));
          button.classList.add("active");
            handleJLPTSelection(selectedLevel);
        });
    });
});

// experimental code
function attachKanjiRowListeners(kanjiList) {
    const rows = document.querySelectorAll(".kanji-table tbody tr");

    rows.forEach((row, index) => {
        row.addEventListener("click", function () {
            const selected = kanjiList[index];

            // Highlight selected row
            rows.forEach(r => r.classList.remove("table-primary"));
            row.classList.add("table-primary");

            const character = selected.literal;
            const unicodeHex = character.codePointAt(0).toString(16).toUpperCase().padStart(5, "0");
            const apiURL = `/api/assets/kanji/${unicodeHex}`;

            const svgContainer = $("#kanjiSVG");
            svgContainer.html("<p>Loading...</p>");

            // Load Kanji SVG
            $.get(apiURL)
                .done(function (svgData) {
                    let svgString = typeof svgData === "string" ? svgData : new XMLSerializer().serializeToString(svgData.documentElement);

                    svgString = svgString
                        .replace(/<\?xml[^>]*>/g, "")
                        .replace(/<!DOCTYPE[^>]*>/g, "");

                    svgContainer.html(svgString);
                    // Re-animate on SVG click
                    svgContainer.off("click").on("click", function () {
                        animateKanjiGSAP();
                    });
                    animateKanjiGSAP();
                })
                .fail(function () {
                    console.error("SVG Load error");
                    svgContainer.html("<p class='text-danger'>SVG not found</p>");
                });

            // Update kanji info
            $("#kunyomiText").text(selected.kunyomi || "-");
            $("#onyomiText").text(selected.onyomi || "-");
            $("#englishText").text(selected.english || "-");

            // Fetch and display example sentences
            const exampleList = $("#exampleSentences");
            exampleList.empty().html("<li>Loading examples...</li>");

            fetch(`/api/kanji/examples/${character}`)
                .then(res => res.json())
                .then(sentences => {
                    exampleList.empty();
                    if (sentences.length) {
                        sentences.forEach(({ jp_sentence, en_sentence }) => {
                            const listItem = $(`
                                <li class="mb-2">
                                    <strong>${jp_sentence}</strong><br>
                                    <em>${en_sentence}</em>
                                </li>
                            `);
                            exampleList.append(listItem);
                        });
                    } else {
                        exampleList.html("<li class='text-muted'>No examples available.</li>");
                    }
                })
                .catch(err => {
                    console.error("Error loading examples:", err);
                    exampleList.html("<li class='text-danger'>Failed to load examples.</li>");
                });
        });
    });
    // Trigger click on the first row by default
        if (rows.length > 0) {
            rows[0].click();
        }
}

let isAnimating = false;

function animateKanjiGSAP() {
    if (isAnimating) return; // Prevent re-animation during animation

    isAnimating = true;
    const tl = gsap.timeline({
        onComplete: () => {
            isAnimating = false; // Reset flag once animation completes
        }
    });

    $("#kanjiSVG path").each(function () {
        const length = this.getTotalLength();
        tl.fromTo(this,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" },
            "+=0.5"
        );
    });
}
