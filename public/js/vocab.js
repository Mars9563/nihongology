$(document).ready(function () {
    const tableBody = $("#vocabTableBody");
    //
    function showVocabSVG(original) {
        const svgContainer = $("#vocabCharacterContainer");
        svgContainer.html('<p>Loading...</p>');
        $(".svg-placeholder-text").hide();
    
        svgContainer.empty(); // Clear previous SVGs
        const chars = original.split('');
        let countLoaded = 0;
    
        // Use a shared timeline
        const masterTimeline = gsap.timeline();
    
        chars.forEach((char, i) => {
            const hex = char.codePointAt(0).toString(16).toUpperCase().padStart(5, "0");
    
            $.get(`/api/assets/kanji/${hex}`)
                .done(function (svgData) {
                    let svgString = typeof svgData === "string"
                        ? svgData
                        : new XMLSerializer().serializeToString(svgData.documentElement);
    
                    svgString = svgString
                        .replace(/<\?xml[^>]*>/g, "")
                        .replace(/<!DOCTYPE[^>]*>/g, "");
    
                    const wrapper = $(`<div class="inline-svg-wrapper" style="display:inline-block; margin:0 5px;"></div>`);
                    wrapper.html(svgString);
                    svgContainer.append(wrapper);
    
                    const $svg = wrapper.find("svg");
                    $svg.css("cursor", "pointer");
    
                    // Animate in sequence
                    $svg.find("path, line, polyline").each(function () {
                        const len = this.getTotalLength();
                        gsap.set(this, {
                            strokeDasharray: len,
                            strokeDashoffset: len
                        });
    
                        masterTimeline.to(this, {
                            strokeDashoffset: 0,
                            duration: 1.2,
                            ease: "power2.out"
                        }, `+=0.3`); // spacing between strokes
                    });
    
                    // Reanimate on click
                    $svg.on("click", () => {
                        animateSVGWithGSAP($svg);
                    });
    
                    if (++countLoaded === chars.length) {
                        // All done
                    }
                })
                .fail(() => {
                    svgContainer.append(`<div class="text-danger">Missing SVG for ${char}</div>`);
                });
        });
    }

    
    function animateSVGWithGSAP($svg) {
        const tl = gsap.timeline();
        $svg.find("path, line, polyline").each(function () {
            const len = this.getTotalLength();
            tl.fromTo(this,
                { strokeDasharray: len, strokeDashoffset: len },
                { strokeDashoffset: 0, duration: .5, ease: "power2.out" },
                "+=0.3"
            );
        });
    }


    //
    function loadVocabDetailsFromRow(row) {
        const vocabId = row.data("vocab-id");
        const original = row.find(".kanji-cell").text().trim();
        const furigana = row.find(".furigana-cell").text().trim();
        const english = row.find(".english-cell").text().trim();

        // Set furigana and meaning
        $("#furiganaText").text(furigana);
        $("#englishText").text(english);
        $("#vocabType").text("Loading...");

        // Clear SVG area
        showVocabSVG(original);

        // Fetch and display example sentences
        $.get(`/api/vocab/examples/${vocabId}`, function (examples) {
            const list = $("#exampleSentences");
            list.empty();
            if (!examples.length) {
                list.append('<li class="text-muted">No example sentences available.</li>');
            } else {
                examples.forEach(ex => {
                    list.append(`<li>${ex.jp_sentence}<br><small class="text-muted">${ex.en_sentence}</small></li>`);
                });
            }
        });

        // Dummy vocab type (customize later)
        $("#vocabType").text("N/A");
    }

    // JLPT level button click event
    $(".jlpt-btn").click(function () {
        const level = $(this).text().replace("JLPT ", "");

        $(".jlpt-btn").removeClass("active");
        $(this).addClass("active");

        tableBody.empty().html("<tr><td colspan='4'>Loading...</td></tr>");

        $.get(`/api/vocab/level/${level}`, function (data) {
            tableBody.empty();

            if (data.length === 0) {
                tableBody.html("<tr><td colspan='4' class='text-muted'>No vocabulary found.</td></tr>");
                return;
            }

            data.forEach((entry, index) => {
                const row = $(`
                    <tr class="vocab-row" data-vocab-id="${entry.id}">
                        <td class="index-cell">${index + 1}.</td>
                        <td class="kanji-cell custom_style">${entry.original}</td>
                        <td class="furigana-cell">${entry.furigana || "-"}</td>
                        <td class="english-cell">${entry.english}</td>
                    </tr>
                `);
                tableBody.append(row);
            });

            // Add click events and load first by default
            $(".vocab-row").click(function () {
                $(".vocab-row").removeClass("selected");
                $(this).addClass("selected");
                loadVocabDetailsFromRow($(this));
            });

            const firstRow = $(".vocab-row").first();
            firstRow.addClass("selected");
            loadVocabDetailsFromRow(firstRow);
        }).fail(function (error) {
            console.error("API error:", error);
            tableBody.html("<tr><td colspan='4' class='text-danger'>Failed to load vocabulary. Please try again later.</td></tr>");
        });
    });

    // Auto-load N5 by default
    $(".jlpt-btn").first().trigger("click");
});
