// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // --- Screen Elements ---
    const splashScreen = document.getElementById('splash-screen');
    const participantSelectionScreen = document.getElementById('participant-selection-screen');

    // --- Feedback Elements ---
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackEmoji = document.getElementById('feedback-emoji');

    let gameState = {
        participant: null,
        number: null,
    };

    // --- Screen Management ---
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // --- Feedback System ---
    function showFeedback(text, emoji, duration = 2000, isSuccess = false) {
        return new Promise(resolve => {
            feedbackText.textContent = text;
            feedbackEmoji.textContent = emoji;
            feedbackOverlay.classList.add('visible');

            if (isSuccess && typeof confetti === 'function') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }

            setTimeout(() => {
                feedbackOverlay.classList.remove('visible');
                // Wait for animation to finish before resolving
                setTimeout(resolve, 300);
            }, duration);
        });
    }

    // --- Splash Screen Logic ---
    setTimeout(() => {
        showScreen('participant-selection-screen');
    }, 3000); // 3 seconds delay

    // --- Participant Selection Logic ---
    const participantCards = document.querySelectorAll('.participant-card');
    participantCards.forEach(card => {
        card.addEventListener('click', () => {
            const participantName = card.dataset.participant;
            gameState.participant = participantName;
            startGame_FindTheNumber();
        });
    });

    // --- Game 1: Find the Number ---
    const numberContainer = document.getElementById('number-container');
    const speakButton = document.getElementById('speak-button');
    const showCardButton = document.getElementById('show-card-button');

    function startGame_FindTheNumber() {
        gameState.number = Math.floor(Math.random() * 10);
        console.log(`The target number is: ${gameState.number}`);

        numberContainer.innerHTML = '';
        for (let i = 0; i <= 9; i++) {
            const img = document.createElement('img');
            img.src = `assets/${gameState.participant}/${i}.jpg`;
            img.classList.add('number-image');
            img.dataset.number = i;

            img.style.top = `${Math.random() * 80}%`;
            img.style.left = `${Math.random() * 80}%`;
            const duration = 10 + Math.random() * 10;
            const delay = Math.random() * 5;
            img.style.animationDuration = `${duration}s`;
            img.style.animationDelay = `-${delay}s`;

            img.addEventListener('click', handleNumberClick);
            numberContainer.appendChild(img);
        }

        showScreen('find-the-number-screen');
        speakNumber();
    }

    async function handleNumberClick(event) {
        const clickedEl = event.target;
        const clickedNumber = parseInt(clickedEl.dataset.number);

        if (clickedNumber === gameState.number) {
            await showFeedback('כל הכבוד!', '🎉', 1500, true);
            startGame_MathProblems();
        } else {
            clickedEl.style.animation = 'shake 0.5s';
            await showFeedback('אופס, נסה שוב', '🤔', 1500);
            clickedEl.style.animation = ''; // Reset animation
        }
    }

    function speakNumber() {
        showFeedback(`המספר הוא... ${gameState.number}`, '🔊', 1500);
    }

    speakButton.addEventListener('click', speakNumber);

    showCardButton.addEventListener('click', () => {
        showFeedback(`המספר הוא: ${gameState.number}`, '🃏', 2000);
    });

    // --- Game 2: Math Problems ---
    const numberPad = document.getElementById('number-pad');
    const mathProblemEl = document.getElementById('math-problem');
    const userAnswerEl = document.getElementById('user-answer');

    let mathState = {
        correctAnswer: 0,
        userAnswer: '',
        questionsSolved: 0
    };

    function setupNumberPad() {
        if (numberPad.children.length > 0) return;
        for (let i = 0; i <= 9; i++) {
            const img = document.createElement('img');
            img.src = `assets/${gameState.participant}/${i}.jpg`;
            img.classList.add('number-pad-img');
            img.dataset.number = i;
            img.addEventListener('click', handleNumpadClick);
            numberPad.appendChild(img);
        }
    }

    function startGame_MathProblems() {
        setupNumberPad();
        mathState.questionsSolved = 0;
        generateMathProblem();
        showScreen('math-problems-screen');
    }

    function generateMathProblem() {
        let num = gameState.number;
        let otherNum = Math.floor(Math.random() * 10);
        const isAddition = Math.random() > 0.5;
        let problemText, answer;

        if (mathState.questionsSolved === 0) {
            if (isAddition) {
                problemText = `${num} + ${otherNum} = ?`;
                answer = num + otherNum;
            } else {
                if (num < otherNum) [num, otherNum] = [otherNum, num];
                problemText = `${num} - ${otherNum} = ?`;
                answer = num - otherNum;
            }
        } else {
             if (isAddition) {
                problemText = `${otherNum} + ${num} = ?`;
                answer = otherNum + num;
            } else {
                if (otherNum < num) otherNum = num + Math.floor(Math.random() * 5);
                problemText = `${otherNum} - ${num} = ?`;
                answer = otherNum - num;
            }
        }

        mathState.correctAnswer = answer;
        mathState.userAnswer = '';
        mathProblemEl.textContent = problemText;
        userAnswerEl.textContent = '';
    }

    function handleNumpadClick(event) {
        const digit = event.target.dataset.number;
        mathState.userAnswer += digit;
        userAnswerEl.textContent = mathState.userAnswer;

        if (mathState.userAnswer.length === String(mathState.correctAnswer).length) {
            checkMathAnswer();
        }
    }

    async function checkMathAnswer() {
        if (parseInt(mathState.userAnswer) === mathState.correctAnswer) {
            await showFeedback('תשובה נכונה!', '✅', 1500, true);
            mathState.questionsSolved++;

            if (mathState.questionsSolved >= 2) {
                await showFeedback('מעולה! סיימת את שלב החשבון!', '🏆', 2000, true);
                startGame_CollectHearts();
            } else {
                generateMathProblem();
            }
        } else {
            await showFeedback('תשובה לא נכונה, נסה שוב', '❌', 1500);
            mathState.userAnswer = '';
            userAnswerEl.textContent = '';
        }
    }

    // --- Game 3: Collect Hearts ---
    const heartsGameArea = document.getElementById('hearts-game-area');
    const collectedHeartsContainer = document.getElementById('collected-hearts-container');
    const heartsInstruction = document.getElementById('hearts-instruction');
    const finishHeartsButton = document.getElementById('finish-hearts-button');

    const heartColors = { red: '❤️', blue: '💙', green: '💚', yellow: '💛' };
    const colorNames = { red: 'אדומים', blue: 'כחולים', green: 'ירוקים', yellow: 'צהובים' };

    let heartsState = { targetColor: '', targetCount: 0 };

    function startGame_CollectHearts() {
        heartsState.targetCount = gameState.number === 0 ? 1 : gameState.number; // Can't collect 0 hearts
        const availableColors = Object.keys(heartColors);
        heartsState.targetColor = availableColors[Math.floor(Math.random() * availableColors.length)];

        heartsInstruction.innerHTML = `אסוף <span style="color:${heartsState.targetColor}">${heartsState.targetCount}</span> לבבות בצבע <span style="color:${heartsState.targetColor}">${colorNames[heartsState.targetColor]}</span>`;
        heartsGameArea.innerHTML = '';
        collectedHeartsContainer.innerHTML = '';

        const totalHearts = 25;
        for (let i = 0; i < totalHearts; i++) {
            const color = availableColors[Math.floor(Math.random() * availableColors.length)];
            createHeart(color, heartsGameArea);
        }
        showScreen('collect-hearts-screen');
    }

    function createHeart(color, container) {
        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.textContent = heartColors[color];
        heart.dataset.color = color;

        if (container === heartsGameArea) {
            heart.style.top = `${Math.random() * 85}%`;
            heart.style.left = `${Math.random() * 90}%`;
            heart.style.animationDelay = `-${Math.random() * 10}s`;
            heart.addEventListener('click', handleHeartClick);
        } else {
            heart.classList.remove('heart');
            heart.classList.add('collected-heart');
            heart.addEventListener('click', handleCollectedHeartClick);
        }
        container.appendChild(heart);
    }

    function handleHeartClick(event) {
        const heart = event.target;
        heart.remove();
        createHeart(heart.dataset.color, collectedHeartsContainer);
    }

    function handleCollectedHeartClick(event) {
        const heart = event.target;
        heart.remove();
        createHeart(heart.dataset.color, heartsGameArea);
    }

    finishHeartsButton.addEventListener('click', async () => {
        const collected = collectedHeartsContainer.children;
        let correctColorCount = 0;
        let wrongColorCount = 0;

        for (const heart of collected) {
            if (heart.dataset.color === heartsState.targetColor) correctColorCount++;
            else wrongColorCount++;
        }

        if (wrongColorCount === 0 && correctColorCount === heartsState.targetCount) {
            await showFeedback('נהדר!', '💖', 1500, true);
            startGame_DrawTheNumber();
        } else {
            let message = 'אופס, זו לא התשובה הנכונה.';
            if (wrongColorCount > 0) message += ` יש לך ${wrongColorCount} לבבות בצבע לא נכון.`;
            if (correctColorCount !== heartsState.targetCount) message += ` צריך לאסוף ${heartsState.targetCount} לבבות ${colorNames[heartsState.targetColor]}, ואספת ${correctColorCount}.`;
            await showFeedback(message, '🤔', 3000);
        }
    });

    // --- Game 4: Draw the Number ---
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const drawInstruction = document.getElementById('draw-instruction');
    const clearCanvasButton = document.getElementById('clear-canvas-button');
    const finishDrawingButton = document.getElementById('finish-drawing-button');
    let isDrawing = false;

    function startGame_DrawTheNumber() {
        drawInstruction.textContent = `עכשיו, בוא נצייר את המספר ${gameState.number}!`;
        setupCanvas();
        showScreen('draw-number-screen');
    }

    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 400 * dpr;
        canvas.height = 300 * dpr;
        canvas.style.width = '400px';
        canvas.style.height = '300px';
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#0d47a1';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        clearCanvas();
    }

    function startDrawing(e) { isDrawing = true; draw(e); }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    clearCanvasButton.addEventListener('click', clearCanvas);

    finishDrawingButton.addEventListener('click', async () => {
        await showFeedback('כל הכבוד! סיימת את כל המשחקים!', '🥳', 2500, true);
        showScreen('participant-selection-screen');
    });

    // --- Expose functions for testing ---
    window.gameState = gameState;
    window.startGame_MathProblems = startGame_MathProblems;
    window.startGame_CollectHearts = startGame_CollectHearts;
    window.startGame_DrawTheNumber = startGame_DrawTheNumber;
});