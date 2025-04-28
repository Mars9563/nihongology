$(document).ready(function () {
  // Main data objects
  let kanjiData = {};    // Store kanji grouped by level
  let currentQuiz = [];  // Current quiz questions
  let currentQuestionIndex = 0;
  let score = 0;
  let quizType = "both";  // Default quiz type
  let mistakesList = [];  // Track mistakes for review
    
  // Local storage keys
  const STATS_KEY = "nihongology_quiz_stats";
  const STREAK_KEY = "nihongology_streak";
    
  // Load user stats from local storage
  loadUserStats();
    
  // Update level description when level changes
  $("#level-select").change(function () {
    updateLevelDescription($(this).val());
  });
    
  // Initialize with N5 description
  updateLevelDescription("n4");
    
  function updateLevelDescription(level) {
    const descriptions = {
      "n4": "<strong>N5:</strong> Basic kanji for beginners (approx. 100 characters)",
      "n3": "<strong>N4:</strong> Elementary kanji (approx. 180 characters)",
      "n2": "<strong>N2/N3:</strong> Intermediate kanji (approx. 750 characters)",
      "n1": "<strong>N1:</strong> Advanced kanji (approx. 1200 characters)"
    };
        
    $("#level-description").html(descriptions[level]);
  }

  // Load Kanji Data with loading indicator
  $.ajax({
    url: "/api/kanji/levels",
    method: "GET",
    beforeSend: function () {
      // Show loading spinner
      $(".quiz-settings").append('<div class="text-center mt-4" id="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Loading kanji data...</p></div>');
    },
    success: function (data) {
      console.log("Kanji Data Loaded");
      // Process data to extract first meaning for each kanji
      Object.keys(data).forEach(level => {
        data[level] = data[level].map(kanji => {
          // Extract first meaning (before first comma) for display
          kanji.primaryMeaning = extractPrimaryMeaning(kanji.english);
          return kanji;
        });
      });
      kanjiData = data;
      $("#loading-spinner").remove();
    },
    error: function () {
      console.error("Error loading kanji data");
      $("#loading-spinner").remove();
      $(".quiz-settings").append('<div class="alert alert-danger">Error loading kanji data. Please refresh the page and try again.</div>');
    }
  });

  // Helper function to extract primary meaning
  function extractPrimaryMeaning(englishText) {
    // Take text before first comma, or the whole string if no comma
    return englishText.split(',')[0].trim();
  }

  // Start Quiz
  $("#start-quiz").click(function () {
    if (Object.keys(kanjiData).length === 0) {
      showNotification("Kanji data is still loading. Please wait a moment.");
      return;
    }
        
    const selectedLevel = $("#level-select").val().toUpperCase();
    const numberOfQuestions = parseInt($("#question-count").val());
    quizType = $('input[name="quizType"]:checked').val();
        
    if (!kanjiData[selectedLevel] || kanjiData[selectedLevel].length === 0) {
      showNotification("Kanji data for selected level not available yet.");
      return;
    }
        
    // Reset mistakes list for new quiz
    mistakesList = [];
        
    // Initialize quiz with selected parameters
    startQuiz(selectedLevel, numberOfQuestions, quizType);
  });
    
  // Show notification
  function showNotification(message, type = "warning") {
    // Remove any existing notifications
    $(".notification").remove();
        
    // Create notification element
    const notification = $(`
            <div class="notification notification-${type} fade-in">
                <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close ms-2"></button>
            </div>
        `);
        
    // Add to page
    $(".quiz-container").prepend(notification);
        
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.fadeOut(300, function () {
        $(this).remove();
      });
    }, 5000);
        
    // Allow manual dismiss
    notification.find(".btn-close").click(function () {
      notification.fadeOut(300, function () {
        $(this).remove();
      });
    });
  }

  function startQuiz(level, number, quizType) {
    $(".quiz-settings").addClass("d-none");
    $("#quiz-result").addClass("d-none");
    $("#quiz-area").removeClass("d-none");
    $("#quiz-area").attr("data-type", quizType);
        
    // Hide mistake review if visible
    $("#mistake-review").addClass("d-none");

    // Shuffle and pick random kanjis
    const allKanjis = [...kanjiData[level]];
    shuffleArray(allKanjis);
    currentQuiz = allKanjis.slice(0, number);

    currentQuestionIndex = 0;
    score = 0;
        
    // Reset and update counter display
    $(".question-counter").text(`Question 1/${currentQuiz.length}`);
    $(".score-counter").text(`Score: 0`);

    showQuestion();
  }

  function showQuestion() {
    const questionData = currentQuiz[currentQuestionIndex];
    const currentQuizType = $("#quiz-area").attr("data-type");
    let questionType;

    // Clear previous content
    $("#quiz-kanji").empty();
    $("#quiz-options").empty();
    $("#feedback-area").addClass("d-none").empty();
    $("#next-question").addClass("d-none");
    $("#quiz-reading").addClass("d-none").empty();

    // Update progress bar and counter
    const progressPercentage = (currentQuestionIndex / currentQuiz.length) * 100;
    $(".progress-bar").css("width", progressPercentage + "%");
    $(".question-counter").text(`Question ${currentQuestionIndex + 1}/${currentQuiz.length}`);
    $(".score-counter").text(`Score: ${score}`);

    // Determine question type based on quiz type
    if (currentQuizType === "both") {
      questionType = Math.random() < 0.5 ? "kanji-to-meaning" : "meaning-to-kanji";
    } else {
      questionType = currentQuizType;
    }

    // Set up question content
    if (questionType === "kanji-to-meaning") {
      // Show Kanji, options are meanings
      $("#quiz-kanji").text(questionData.literal).addClass("kanji-text");
      const options = generateMeaningOptions(questionData);
      displayOptions(options, "meaning");
    } else {
      // Show Meaning, options are kanji
      $("#quiz-kanji").text(questionData.primaryMeaning).removeClass("kanji-text");
      const options = generateKanjiOptions(questionData);
      displayOptions(options, "kanji");
    }

    // Store the actual question type for checking the answer
    $("#quiz-area").attr("data-question-type", questionType);
        
    // Add animation
    $("#quiz-kanji").addClass("pulse-in");
    setTimeout(() => {
      $("#quiz-kanji").removeClass("pulse-in");
    }, 500);
  }

  function displayOptions(options, type) {
    // Create a grid of options
    options.forEach(option => {
      const optionButton = $(`<button class="option-btn" data-type="${type}">${option}</button>`);
      $("#quiz-options").append(optionButton);
    });
        
    // Add animation delay to each button for cascade effect
    $(".option-btn").each(function (index) {
      $(this).css("animation-delay", `${index * 0.1}s`);
    });
  }

  // Handle clicking on an answer option
  $(document).on("click", ".option-btn", function () {
    if ($(this).hasClass("btn-success") || $(this).hasClass("btn-danger")) {
      return; // Already answered
    }

    const selectedAnswer = $(this).text();
    const questionData = currentQuiz[currentQuestionIndex];
    const quizQuestionType = $("#quiz-area").attr("data-question-type");

    let isCorrect = false;

    if (quizQuestionType === "kanji-to-meaning") {
      isCorrect = selectedAnswer === questionData.primaryMeaning;
    } else {
      isCorrect = selectedAnswer === questionData.literal;
    }

    // Disable all option buttons
    $(".option-btn").prop("disabled", true);

    // Mark the clicked button as correct or incorrect
    if (isCorrect) {
      score++;
      $(this).addClass("btn-success");
      showFeedback(true, questionData);
      playSound("correct");
    } else {
      $(this).addClass("btn-danger");
            
      // Track mistake for review
      mistakesList.push({
        kanji: questionData.literal,
        meaning: questionData.primaryMeaning,
        reading: questionData.on || questionData.kun || "",
        userAnswer: selectedAnswer,
        questionType: quizQuestionType
      });

      // Highlight the correct answer
      $(".option-btn").each(function () {
        const btnText = $(this).text();
        let correctAnswer;
        if (quizQuestionType === "kanji-to-meaning") {
          correctAnswer = questionData.primaryMeaning;
        } else {
          correctAnswer = questionData.literal;
        }

        if (btnText === correctAnswer) {
          $(this).addClass("btn-success");
        }
      });
            
      showFeedback(false, questionData);
      playSound("incorrect");
    }

    // Update score counter
    $(".score-counter").text(`Score: ${score}`);
        
    // Show the next question button
    $("#next-question").removeClass("d-none");
  });
    
  // Show feedback after answering
  function showFeedback(isCorrect, questionData) {
    const feedbackArea = $("#feedback-area");
    feedbackArea.removeClass("d-none").empty();
        
    if (isCorrect) {
      feedbackArea.html(`
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>Correct!
                    ${questionData.on || questionData.kun ?
          `<div class="reading-hint mt-2">Reading: <strong>${questionData.on || ""} ${questionData.kun || ""}</strong></div>` :
          ''}
                </div>
            `);
    } else {
      feedbackArea.html(`
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle me-2"></i>Incorrect!
                    <div class="correct-answer mt-1">The correct answer is <strong>${$("#quiz-area").attr("data-question-type") === "kanji-to-meaning" ? questionData.primaryMeaning : questionData.literal}</strong></div>
                    ${questionData.on || questionData.kun ?
          `<div class="reading-hint mt-2">Reading: <strong>${questionData.on || ""} ${questionData.kun || ""}</strong></div>` :
          ''}
                </div>
            `);
    }
        
    // Animate feedback entrance
    feedbackArea.addClass("fade-in");
  }
    
  // Play sound effects
  function playSound(type) {
    // Check if audio is enabled in browser settings
    try {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  }

  // Next Question Button Click
  $("#next-question").click(function () {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuiz.length) {
      showQuestion();
    } else {
      endQuiz();
    }
  });

  function endQuiz() {
    $("#quiz-area").addClass("d-none");
    $("#quiz-result").removeClass("d-none");
        
    const percentage = Math.round((score / currentQuiz.length) * 100);
    $("#score-text").text(`You scored ${score} out of ${currentQuiz.length}!`);
    $("#score-percentage").text(`${percentage}%`);
        
    // Set result message based on score
    if (percentage >= 90) {
      $("#result-message").text("Outstanding! Your kanji knowledge is excellent!");
    } else if (percentage >= 75) {
      $("#result-message").text("Great job! You're making good progress.");
    } else if (percentage >= 60) {
      $("#result-message").text("Good effort! Keep practicing to improve further.");
    } else {
      $("#result-message").text("Keep practicing! Consistent study will help you improve.");
    }
        
    // Update stats in local storage
    updateUserStats(percentage);
        
    // Show or hide review mistakes button based on if there were any mistakes
    if (mistakesList.length > 0) {
      $("#review-mistakes").removeClass("d-none");
    } else {
      $("#review-mistakes").addClass("d-none");
    }
  }
    
  // Update user statistics
  function updateUserStats(scorePercentage) {
    let stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"quizzesTaken": 0, "totalScore": 0}');
        
    // Update quiz count and average score
    stats.quizzesTaken += 1;
    stats.totalScore += scorePercentage;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        
    // Update streak
    let streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastQuizDate": "", "currentStreak": 0}');
    const today = new Date().toDateString();
        
    if (streak.lastQuizDate !== today) {
      if (isConsecutiveDay(streak.lastQuizDate)) {
        streak.currentStreak += 1;
      } else if (streak.lastQuizDate === "") {
        streak.currentStreak = 1;
      } else {
        streak.currentStreak = 1; // Reset streak if not consecutive
      }
      streak.lastQuizDate = today;
      localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    }
        
    // Update UI
    loadUserStats();
  }
    
  // Check if date is consecutive
  function isConsecutiveDay(lastDateStr) {
    if (!lastDateStr) return false;
        
    const lastDate = new Date(lastDateStr);
    const today = new Date();
        
    // Set time to midnight for accurate day comparison
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
        
    // Calculate difference in days
    const diffTime = today - lastDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
    return diffDays === 1;
  }
    
  // Load user stats from local storage
  function loadUserStats() {
    const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"quizzesTaken": 0, "totalScore": 0}');
    const streak = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastQuizDate": "", "currentStreak": 0}');
        
    // Calculate average score
    const avgScore = stats.quizzesTaken > 0 ? Math.round(stats.totalScore / stats.quizzesTaken) : 0;
        
    // Update UI
    $("#quizzes-taken").text(stats.quizzesTaken);
    $("#avg-score").text(`${avgScore}%`);
    $("#current-streak").text(`${streak.currentStreak} days`);
  }

  // Restart quiz button
  $("#restart-quiz").click(function () {
    $(".quiz-settings").removeClass("d-none");
    $("#quiz-result").addClass("d-none");
    $("#mistake-review").addClass("d-none");
  });
    
  // Review mistakes button
  $("#review-mistakes").click(function () {
    // Toggle mistake review visibility
    const reviewSection = $("#mistake-review");
    reviewSection.toggleClass("d-none");
        
    if (!reviewSection.hasClass("d-none")) {
      // Populate review items
      const reviewItems = $(".review-items");
      reviewItems.empty();
            
      if (mistakesList.length === 0) {
        reviewItems.html("<p>No mistakes to review!</p>");
        return;
      }
            
      mistakesList.forEach((mistake, index) => {
        const reviewItem = $(`
                    <div class="review-item">
                        <div class="review-kanji">${mistake.kanji}</div>
                        <div class="review-details">
                            <div class="review-meaning">Meaning: <strong>${mistake.meaning}</strong></div>
                            ${mistake.reading ? `<div class="review-reading">Reading: <strong>${mistake.reading}</strong></div>` : ''}
                            <div class="review-error">Your answer: <span class="text-danger">${mistake.userAnswer}</span></div>
                        </div>
                    </div>
                `);
        reviewItems.append(reviewItem);
      });
            
      // Scroll to the review section
      $('html, body').animate({
        scrollTop: reviewSection.offset().top - 100
      }, 500);
    }
  });
  // These are the missing functions to complete the kanji-quiz.js file
    
  function generateMeaningOptions(questionData) {
    // Create an array with the correct answer
    const correctMeaning = questionData.primaryMeaning;
    let options = [correctMeaning];
        
    // Add 3 different incorrect options from the same level
    const level = Object.keys(kanjiData).find(lvl =>
      kanjiData[lvl].some(k => k.literal === questionData.literal));
        
    // Get all meanings from same level, excluding the correct one
    const levelMeanings = kanjiData[level]
      .filter(k => k.literal !== questionData.literal)
      .map(k => k.primaryMeaning);
        
    // Shuffle and pick 3 random meanings
    shuffleArray(levelMeanings);
        
    // Add unique distractors until we have 4 total options
    for (let meaning of levelMeanings) {
      if (options.length < 4 && !options.includes(meaning)) {
        options.push(meaning);
      }
      if (options.length === 4) break;
    }
        
    // If we still don't have 4 options (rare case), generate some generic distractors
    const genericDistractors = ["water", "fire", "mountain", "person", "tree", "heart", "sun", "moon"];
    while (options.length < 4) {
      const distractor = genericDistractors[Math.floor(Math.random() * genericDistractors.length)];
      if (!options.includes(distractor)) {
        options.push(distractor);
      }
    }
        
    // Shuffle options so correct answer isn't always in same position
    shuffleArray(options);
    return options;
  }
    
  function generateKanjiOptions(questionData) {
    // Create an array with the correct answer
    const correctKanji = questionData.literal;
    let options = [correctKanji];
        
    // Add 3 different incorrect options from the same level
    const level = Object.keys(kanjiData).find(lvl =>
      kanjiData[lvl].some(k => k.literal === questionData.literal));
        
    // Get all kanji from same level, excluding the correct one
    const levelKanji = kanjiData[level]
      .filter(k => k.literal !== questionData.literal)
      .map(k => k.literal);
        
    // Shuffle and pick random kanji
    shuffleArray(levelKanji);
        
    // Add 3 more unique kanji to options
    for (let kanji of levelKanji) {
      if (options.length < 4 && !options.includes(kanji)) {
        options.push(kanji);
      }
      if (options.length === 4) break;
    }
        
    // Shuffle options so correct answer isn't always in same position
    shuffleArray(options);
    return options;
  }
    
  // Fisher-Yates shuffle algorithm to randomly reorder array elements
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
});