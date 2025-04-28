$(document).ready(function () {
  // Main data objects
  let vocabData = {};    // Store vocabulary grouped by level
  let currentQuiz = [];  // Current quiz questions
  let currentQuestionIndex = 0;
  let score = 0;
  let quizType = "jp-to-en";  // Default quiz type
  let mistakesList = [];  // Track mistakes for review
    
  // Local storage keys
  const STATS_KEY = "nihongology_vocab_quiz_stats";
  const STREAK_KEY = "nihongology_vocab_streak";
    
  // Load user stats from local storage
  loadUserStats();
    
  // Update level description when level changes
  $("#level-select").change(function () {
    updateLevelDescription($(this).val());
  });
    
  // Initialize with N5 description
  updateLevelDescription("n5");
    
  function updateLevelDescription(level) {
    const descriptions = {
      "n5": "<strong>N5:</strong> Basic vocabulary for beginners (approx. 800 words)",
      "n4": "<strong>N4:</strong> Elementary vocabulary (approx. 1500 words)",
      "n3": "<strong>N3:</strong> Intermediate vocabulary (approx. 3000 words)",
      "n2": "<strong>N2:</strong> Upper-intermediate vocabulary (approx. 6000 words)",
      "n1": "<strong>N1:</strong> Advanced vocabulary (approx. 10000 words)"
    };
        
    $("#level-description").html(descriptions[level]);
  }

  // Load Vocabulary Data with loading indicator
  function loadVocabularyData(level = "N5") {
    $.ajax({
      url: `/api/vocab/level/${level}`,
      method: "GET",
      beforeSend: function () {
        // Show loading spinner
        $(".quiz-settings").append('<div class="text-center mt-4" id="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Loading vocabulary data...</p></div>');
      },
      success: function (data) {
        console.log(`${level} Vocabulary Data Loaded: ${data.length} words`);
        vocabData[level] = data;
        $("#loading-spinner").remove();
      },
      error: function () {
        console.error(`Error loading vocabulary data for ${level}`);
        $("#loading-spinner").remove();
        $(".quiz-settings").append('<div class="alert alert-danger">Error loading vocabulary data. Please refresh the page and try again.</div>');
      }
    });
  }

  // Initial data loading when page loads - start with N5
  loadVocabularyData("N5");

  // Start Quiz
  $("#start-quiz").click(function () {
    const selectedLevel = $("#level-select").val().toUpperCase();
    const numberOfQuestions = parseInt($("#question-count").val());
    quizType = $('input[name="quizType"]:checked').val();
    
    // Check if we have the selected level's data
    if (!vocabData[selectedLevel]) {
      // If not loaded yet, load it first
      showNotification("Loading vocabulary data for this level. Please wait...");
      loadVocabularyData(selectedLevel);
      
      // Wait and check again after 3 seconds
      setTimeout(() => {
        if (vocabData[selectedLevel] && vocabData[selectedLevel].length > 0) {
          // Now we have the data, start the quiz
          initializeQuiz(selectedLevel, numberOfQuestions, quizType);
        } else {
          showNotification("Data is still loading. Please try again in a moment.");
        }
      }, 3000);
    } else if (vocabData[selectedLevel].length === 0) {
      showNotification("Vocabulary data for selected level not available yet.");
    } else {
      // We already have the data, start the quiz
      initializeQuiz(selectedLevel, numberOfQuestions, quizType);
    }
  });
  
  function initializeQuiz(selectedLevel, numberOfQuestions, quizType) {
    // Reset mistakes list for new quiz
    mistakesList = [];
        
    // Initialize quiz with selected parameters
    startQuiz(selectedLevel, numberOfQuestions, quizType);
  }
    
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

    // Shuffle and pick random vocabulary
    const allVocab = [...vocabData[level]];
    shuffleArray(allVocab);
    currentQuiz = allVocab.slice(0, number);

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

    // Clear previous content
    $("#quiz-word").empty();
    $("#quiz-options").empty();
    $("#feedback-area").addClass("d-none").empty();
    $("#next-question").addClass("d-none");
    $("#quiz-reading").addClass("d-none").empty();
    $("#audio-button").addClass("d-none");

    // Update progress bar and counter
    const progressPercentage = (currentQuestionIndex / currentQuiz.length) * 100;
    $(".progress-bar").css("width", progressPercentage + "%");
    $(".question-counter").text(`Question ${currentQuestionIndex + 1}/${currentQuiz.length}`);
    $(".score-counter").text(`Score: ${score}`);

    // Set up question content based on quiz type
    if (currentQuizType === "jp-to-en") {
      // Show Japanese, options are English
      if (questionData.furigana && questionData.furigana !== questionData.original) {
        $("#quiz-word").html(questionData.original);
        $("#quiz-reading").html(questionData.furigana).removeClass("d-none");
      } else {
        $("#quiz-word").html(questionData.original);
      }
      $("#quiz-word").addClass("japanese-text");
      
      const options = generateEnglishOptions(questionData);
      displayOptions(options, "english");
    } else {
      // Show English, options are Japanese
      $("#quiz-word").text(questionData.english).removeClass("japanese-text");
      const options = generateJapaneseOptions(questionData);
      displayOptions(options, "japanese");
    }

    // Add animation
    $("#quiz-word").addClass("pulse-in");
    setTimeout(() => {
      $("#quiz-word").removeClass("pulse-in");
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
    const quizType = $("#quiz-area").attr("data-type");

    let isCorrect = false;

    if (quizType === "jp-to-en") {
      isCorrect = selectedAnswer === questionData.english;
    } else {
      isCorrect = selectedAnswer === questionData.original;
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
        japanese: questionData.original,
        furigana: questionData.furigana,
        english: questionData.english,
        userAnswer: selectedAnswer,
        questionType: quizType
      });

      // Highlight the correct answer
      $(".option-btn").each(function () {
        const btnText = $(this).text();
        const correctAnswer = quizType === "jp-to-en" ? questionData.english : questionData.original;

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
    
    const quizType = $("#quiz-area").attr("data-type");
    const correctAnswer = quizType === "jp-to-en" ? questionData.english : questionData.original;
    const furiganaDisplay = questionData.furigana && questionData.furigana !== questionData.original ? 
      `<div class="reading-hint mt-2">Reading: <strong>${questionData.furigana}</strong></div>` : '';
        
    if (isCorrect) {
      feedbackArea.html(`
        <div class="alert alert-success">
          <i class="fas fa-check-circle me-2"></i>Correct!
          ${quizType === "en-to-jp" ? furiganaDisplay : ''}
        </div>
      `);
    } else {
      feedbackArea.html(`
        <div class="alert alert-danger">
          <i class="fas fa-times-circle me-2"></i>Incorrect!
          <div class="correct-answer mt-1">The correct answer is <strong>${correctAnswer}</strong></div>
          ${quizType === "en-to-jp" ? furiganaDisplay : ''}
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
      $("#result-message").text("Outstanding! Your vocabulary knowledge is excellent!");
    } else if (percentage >= 75) {
      $("#result-message").text("Great job! Your vocabulary is expanding nicely.");
    } else if (percentage >= 60) {
      $("#result-message").text("Good effort! Keep building your vocabulary.");
    } else {
      $("#result-message").text("Keep practicing! Regular vocabulary review will help you improve.");
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
            
      mistakesList.forEach((mistake) => {
        const reviewItem = $(`
          <div class="review-item">
            <div class="review-vocab">${mistake.japanese}</div>
            <div class="review-details">
              ${mistake.furigana && mistake.furigana !== mistake.japanese ? 
                `<div class="review-reading">Reading: <strong>${mistake.furigana}</strong></div>` : ''}
              <div class="review-meaning">Meaning: <strong>${mistake.english}</strong></div>
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
    
  function generateEnglishOptions(questionData) {
    // Create an array with the correct answer
    const correctAnswer = questionData.english;
    let options = [correctAnswer];
    
    // Get current level
    const selectedLevel = $("#level-select").val().toUpperCase();
    
    // If we have enough vocab data for this level
    if (vocabData[selectedLevel] && vocabData[selectedLevel].length >= 10) {
      // Get all English meanings from same level, excluding the correct one
      const levelMeanings = vocabData[selectedLevel]
        .filter(v => v.english !== correctAnswer)
        .map(v => v.english);
      
      // Shuffle and pick 3 random meanings
      shuffleArray(levelMeanings);
      
      // Add unique distractors until we have 4 total options
      for (let meaning of levelMeanings) {
        if (options.length < 4 && !options.includes(meaning)) {
          options.push(meaning);
        }
        if (options.length === 4) break;
      }
    } else {
      // Fallback generic English options if not enough vocabulary loaded
      const genericDistractors = [
        "house", "car", "book", "school", "food", "water", 
        "friend", "family", "work", "study", "morning", "night",
        "teacher", "student", "computer", "phone", "city", "country"
      ];
      
      while (options.length < 4) {
        const distractor = genericDistractors[Math.floor(Math.random() * genericDistractors.length)];
        if (!options.includes(distractor)) {
          options.push(distractor);
        }
      }
    }
    
    // Shuffle options so correct answer isn't always in same position
    shuffleArray(options);
    return options;
  }
    
  function generateJapaneseOptions(questionData) {
    // Create an array with the correct answer
    const correctAnswer = questionData.original;
    let options = [correctAnswer];
    
    // Get current level
    const selectedLevel = $("#level-select").val().toUpperCase();
    
    // If we have enough vocab data for this level
    if (vocabData[selectedLevel] && vocabData[selectedLevel].length >= 10) {
      // Get all Japanese words from same level, excluding the correct one
      const levelWords = vocabData[selectedLevel]
        .filter(v => v.original !== correctAnswer)
        .map(v => v.original);
      
      // Shuffle and pick random words
      shuffleArray(levelWords);
      
      // Add 3 more unique words to options
      for (let word of levelWords) {
        if (options.length < 4 && !options.includes(word)) {
          options.push(word);
        }
        if (options.length === 4) break;
      }
    } else {
      // Fallback generic Japanese options if not enough vocabulary loaded
      const genericDistractors = [
        "家", "車", "本", "学校", "食べ物", "水", 
        "友達", "家族", "仕事", "勉強", "朝", "夜",
        "先生", "学生", "コンピューター", "電話", "都市", "国"
      ];
      
      while (options.length < 4) {
        const distractor = genericDistractors[Math.floor(Math.random() * genericDistractors.length)];
        if (!options.includes(distractor)) {
          options.push(distractor);
        }
      }
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