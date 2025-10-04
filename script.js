document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const screens = document.querySelectorAll('.screen');
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackText = document.getElementById('feedback-text');
    const feedbackEmoji = document.getElementById('feedback-emoji');

    // --- Game State ---
    const gameState = {
        participant: null,
        targetNumber: null,
        mathProblem: {},
        heartsGame: {},
        level: 0
    };

    // --- Speech Synthesis ---
    const synth = window.speechSynthesis;
    let voices = [];
    const heartColors = {
        red: '❤️',
        blue: '💙',
        green: '💚',
        yellow: '💛'
    };

    function populateVoiceList() {
        if (!synth) return;
        voices = synth.getVoices().filter(voice => voice.lang.startsWith('he'));
    }

    populateVoiceList();
    if (synth && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    function speak(text, rate = 0.9, pitch = 1.1) {
        if (!synth) {
            console.warn("Speech Synthesis not supported, skipping speak().");
            return;
        }
        if (synth.speaking) {
            console.error('SpeechSynthesis is already speaking.');
            return;
        }
        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.onend = () => {
            console.log('SpeechSynthesisUtterance.onend');
        };
        utterThis.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
        };

        // Use a Hebrew voice if available
        if (voices.length > 0) {
            utterThis.voice = voices[0];
        } else {
            utterThis.lang = 'he-IL';
        }

        utterThis.pitch = pitch;
        utterThis.rate = rate;
        synth.speak(utterThis);
    }

    // --- Core Functions ---
    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    function showFeedback(text, emoji, duration = 2000, isSuccess = false) {
        return new Promise(resolve => {
            feedbackText.textContent = text;
            feedbackEmoji.textContent = emoji;
            feedbackOverlay.classList.add('visible');

            if (isSuccess && typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }

            setTimeout(() => {
                feedbackOverlay.classList.remove('visible');
                setTimeout(resolve, 300);
            }, duration);
        });
    }

    // --- Game Stage Functions ---
    function startFindTheNumber() {
        // 1. Setup game state
        gameState.targetNumber = Math.floor(Math.random() * 10);
        console.log(`Target number: ${gameState.targetNumber}`);

        // 2. Populate the game area with numbers
        const numberContainer = document.getElementById('number-container');
        numberContainer.innerHTML = '';
        for (let i = 0; i <= 9; i++) {
            const numberDiv = document.createElement('div');
            numberDiv.classList.add('number-image');
            numberDiv.dataset.number = i;

            const img = document.createElement('img');
            img.src = `assets/${gameState.participant}/${i}.jpg`;
            numberDiv.appendChild(img);

            // Randomize position and animation
            numberDiv.style.top = `${Math.random() * 85}%`;
            numberDiv.style.left = `${Math.random() * 85}%`;
            numberDiv.style.animationDuration = `${10 + Math.random() * 10}s`;
            numberDiv.style.animationDelay = `-${Math.random() * 5}s`;

            numberDiv.addEventListener('click', handleNumberClick);
            numberContainer.appendChild(numberDiv);
        }

        // 3. Show screen and speak the number
        showScreen('find-the-number-screen');
        setTimeout(() => speak(String(gameState.targetNumber)), 500);
    }

    async function handleNumberClick(event) {
        const clickedEl = event.currentTarget;
        const clickedNumber = parseInt(clickedEl.dataset.number);

        if (clickedNumber === gameState.targetNumber) {
            await showFeedback('כל הכבוד!', '🎉', 1500, true);
            startMathProblems();
        } else {
            clickedEl.style.animation = 'shake 0.5s';
            await showFeedback('אופס, נסה שוב', '🤔', 1500);
            clickedEl.style.animation = 'drift 15s infinite linear alternate'; // Resume drifting
        }
    }

    // Hint buttons logic
    document.getElementById('speak-button').addEventListener('click', () => {
        speak(String(gameState.targetNumber));
    });

    document.getElementById('show-card-button').addEventListener('click', () => {
        showFeedback(`${gameState.targetNumber}`, '🃏', 2000);
    });


    function startMathProblems() {
        gameState.mathProblem = { questionsSolved: 0 };
        setupNumberPad();
        generateMathProblem();
        showScreen('math-problems-screen');
    }

    function setupNumberPad() {
        const numberPad = document.getElementById('number-pad');
        if (numberPad.children.length > 0) return; // Setup only once

        for (let i = 0; i <= 9; i++) {
            const img = document.createElement('img');
            img.src = `assets/${gameState.participant}/${i}.jpg`;
            img.classList.add('number-pad-img');
            img.dataset.number = i;
            img.addEventListener('click', handleNumpadClick);
            numberPad.appendChild(img);
        }
    }

    function generateMathProblem() {
        let num = gameState.targetNumber;
        let otherNum = Math.floor(Math.random() * 10);
        const isAddition = Math.random() > 0.5;
        let problemText, answer;

        if (gameState.mathProblem.questionsSolved === 0) {
            if (isAddition) {
                problemText = `${num} + ${otherNum} = ?`;
                answer = num + otherNum;
            } else {
                if (num < otherNum) [num, otherNum] = [otherNum, num]; // Ensure positive result
                problemText = `${num} - ${otherNum} = ?`;
                answer = num - otherNum;
            }
        } else {
             if (isAddition) {
                problemText = `${otherNum} + ${num} = ?`;
                answer = otherNum + num;
            } else {
                if (otherNum < num) otherNum = num + Math.floor(Math.random() * 5) + 1; // Ensure positive result
                problemText = `${otherNum} - ${num} = ?`;
                answer = otherNum - num;
            }
        }

        gameState.mathProblem.correctAnswer = answer;
        gameState.mathProblem.userAnswer = '';
        document.getElementById('math-problem').textContent = problemText;
        document.getElementById('answer-container').innerHTML = '';
    }

    function handleNumpadClick(event) {
        const digit = event.target.dataset.number;
        gameState.mathProblem.userAnswer += digit;

        // Display the answer as an image
        const answerContainer = document.getElementById('answer-container');
        const img = document.createElement('img');
        img.src = event.target.src;
        img.classList.add('answer-image');
        answerContainer.appendChild(img);

        // Check if the answer is complete
        if (gameState.mathProblem.userAnswer.length === String(gameState.mathProblem.correctAnswer).length) {
            checkMathAnswer();
        }
    }

    async function checkMathAnswer() {
        const userAnswer = parseInt(gameState.mathProblem.userAnswer);
        if (userAnswer === gameState.mathProblem.correctAnswer) {
            gameState.mathProblem.questionsSolved++;

            if (gameState.mathProblem.questionsSolved >= 2) {
                await showFeedback('מעולה!', '🏆', 2000, true);
                startCollectHearts();
            } else {
                await showFeedback('✅', '', 1500, true);
                generateMathProblem();
            }
        } else {
            await showFeedback('אופס, נסה שוב', '❌', 1500);
            gameState.mathProblem.userAnswer = '';
            document.getElementById('answer-container').innerHTML = '';
        }
    }

    function startCollectHearts() {
        const heartsGameArea = document.getElementById('hearts-game-area');
        const instructionEl = document.getElementById('hearts-instruction');

        // 1. Setup game state
        gameState.heartsGame = {
            targetColor: Object.keys(heartColors)[Math.floor(Math.random() * Object.keys(heartColors).length)],
            targetCount: gameState.targetNumber === 0 ? 1 : gameState.targetNumber,
        };

        // 2. Update instruction with emoji
        instructionEl.innerHTML = `אסוף ${gameState.heartsGame.targetCount} לבבות ${heartColors[gameState.heartsGame.targetColor]}`;

        // 3. Clear previous game elements
        heartsGameArea.innerHTML = '';
        document.getElementById('collected-hearts-container').innerHTML = '';

        // 4. Generate raining hearts
        if (gameState.heartsGame.rainInterval) clearInterval(gameState.heartsGame.rainInterval);
        gameState.heartsGame.rainInterval = setInterval(() => {
            createFallingHeart(heartsGameArea);
        }, 400);

        showScreen('collect-hearts-screen');
    }

    function createFallingHeart(container) {
        const availableColors = Object.keys(heartColors);
        const color = availableColors[Math.floor(Math.random() * availableColors.length)];

        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.textContent = heartColors[color];
        heart.dataset.color = color;

        heart.style.left = `${Math.random() * 95}%`;
        heart.style.animationDuration = `${3 + Math.random() * 3}s`;

        heart.addEventListener('click', handleHeartCollect, { once: true });
        heart.addEventListener('animationend', () => heart.remove());

        container.appendChild(heart);
    }

    function handleHeartCollect(event) {
        const heartEl = event.target;
        const color = heartEl.dataset.color;

        const collectedContainer = document.getElementById('collected-hearts-container');
        const collectedHeart = document.createElement('div');
        collectedHeart.classList.add('collected-heart');
        collectedHeart.textContent = heartColors[color];
        collectedHeart.dataset.color = color;

        collectedHeart.addEventListener('click', (e) => e.target.remove(), { once: true });
        collectedContainer.appendChild(collectedHeart);

        heartEl.remove();
    }

    function startDrawTheNumber() {
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas.getContext('2d');
        const traceImage = document.getElementById('trace-image');
        let isDrawing = false;
        let hue = 0;

        // 1. Setup
        document.getElementById('draw-instruction').textContent = `עכשיו, בוא נצייר את המספר ${gameState.targetNumber}!`;
        traceImage.src = `assets/${gameState.participant}/${gameState.targetNumber}.jpg`;

        // 2. Canvas setup
        function setupCanvas() {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 10;
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // 3. Drawing logic
        function getEventPosition(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        }

        function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const { x, y } = getEventPosition(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const { x, y } = getEventPosition(e);
            ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            hue++;
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
        }

        // 4. Event listeners
        // Remove old listeners to prevent duplicates
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        const newCtx = newCanvas.getContext('2d');

        newCanvas.addEventListener('mousedown', startDrawing);
        newCanvas.addEventListener('mousemove', draw);
        newCanvas.addEventListener('mouseup', stopDrawing);
        newCanvas.addEventListener('mouseout', stopDrawing);
        newCanvas.addEventListener('touchstart', startDrawing, { passive: false });
        newCanvas.addEventListener('touchmove', draw, { passive: false });
        newCanvas.addEventListener('touchend', stopDrawing);

        document.getElementById('clear-canvas-button').onclick = clearCanvas;

        // 5. Show screen
        setupCanvas();
        window.addEventListener('resize', setupCanvas); // Adjust canvas on resize
        showScreen('draw-number-screen');
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        document.getElementById('finish-hearts-button').addEventListener('click', async () => {
            const collectedContainer = document.getElementById('collected-hearts-container');
            const collected = collectedContainer.children;
            let correctColorCount = 0;
            let wrongColorCount = 0;

            for (const heart of collected) {
                if (heart.dataset.color === gameState.heartsGame.targetColor) {
                    correctColorCount++;
                } else {
                    wrongColorCount++;
                }
            }

            if (wrongColorCount === 0 && correctColorCount === gameState.heartsGame.targetCount) {
                await showFeedback('נהדר!', '💖', 1500, true);
                if (gameState.heartsGame.rainInterval) clearInterval(gameState.heartsGame.rainInterval);
                startDrawTheNumber();
            } else {
                let message = 'אופס, זו לא התשובה הנכונה.';
                if (wrongColorCount > 0) message += ` יש לך ${wrongColorCount} לבבות בצבע לא נכון.`;
                if (correctColorCount !== gameState.heartsGame.targetCount) message += ` צריך לאסוף ${gameState.heartsGame.targetCount} לבבות, ואספת ${correctColorCount}.`;
                await showFeedback(message, '🤔', 3000);
            }
        });

        document.getElementById('finish-drawing-button').addEventListener('click', async () => {
            await showFeedback('כל הכבוד! סיימת את כל המשחקים!', '🥳', 2500, true);
            showScreen('participant-selection-screen');
        });
    }

    // --- App Initialization ---
    function init() {
        // Splash screen transition
        setTimeout(() => {
            showScreen('participant-selection-screen');
        }, 2500);

        // Participant selection event listener
        document.querySelector('.participant-card').addEventListener('click', (e) => {
            gameState.participant = e.currentTarget.dataset.participant;
            startFindTheNumber();
        });

        // Setup other persistent event listeners
        setupEventListeners();
    }

    // --- Expose functions for testing ---
    window.exposeForTesting = () => {
        window.gameState = gameState;
        window.startMathProblems = startMathProblems;
        window.startCollectHearts = startCollectHearts;
        window.startDrawTheNumber = startDrawTheNumber;
    };

    init(); // Start the app
});