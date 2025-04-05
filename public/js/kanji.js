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
        
        let tableHTML = `
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
        `;
        
        kanjiList.forEach(kanji => {
            tableHTML += `
                <tr>
                    <td class="literal_table_sec">${kanji.literal}</td>
                    <td>${kanji.onyomi || "-"}</td>
                    <td>${kanji.kunyomi || "-"}</td>
                    <td>${kanji.english || "-"}</td>
                </tr>
            `;
        });
        
        tableHTML += "</tbody></table>";
        kanjiContent.innerHTML = tableHTML;
    }
    
    async function handleJLPTSelection(level) {
        const kanjiData = await fetchKanjiData();
        renderKanjiTable(kanjiData[level] || []);
    }
    
    // Load N4/N5 by default
    handleJLPTSelection("N4");
    
    jlptButtons.forEach(button => {
        button.addEventListener("click", function () {
            let selectedLevel = button.textContent.replace("JLPT ", "");
            console.log("Clicked level:", selectedLevel); 
            jlptButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            if (selectedLevel === "N4/N5") {selectedLevel = "N4"}
            handleJLPTSelection(selectedLevel);
        });
    });
});
