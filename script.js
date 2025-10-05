document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const appContainer = document.getElementById('app-container');
    const screens = document.querySelectorAll('.screen');
    const feedbackContainer = document.getElementById('feedback-container');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const confetti = window.confetti.create(confettiCanvas, {
        resize: true,
        useWorker: true
    });

    // --- Game State ---
    const gameState = {
        participant: null,
        targetNumber: null,
    };

    const heartColors = {
        red: '❤️',
        blue: '💙',
        green: '💚',
        yellow: '💛'
    };

    // --- Speech Synthesis ---
    const synth = window.speechSynthesis;
    let hebrewVoice = null;

    function setupVoices() {
        if (!synth) return;
        let voices = synth.getVoices();
        hebrewVoice = voices.find(v => v.lang === 'he-IL' && v.name.includes('Google')) || voices.find(v => v.lang === 'he-IL');
        console.log("Selected voice:", hebrewVoice ? hebrewVoice.name : "Default");
    }

    setupVoices();
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = setupVoices;
    }

    function speak(text, rate = 0.9, pitch = 1.1) {
        if (!synth || !text) return;
        if (synth.speaking) {
            synth.cancel();
        }
        const utterThis = new SpeechSynthesisUtterance(text);
        if (hebrewVoice) {
            utterThis.voice = hebrewVoice;
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

    function triggerConfetti() {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    }

    function showFeedback(emoji) {
        feedbackContainer.innerHTML = ''; // Clear previous feedback
        const emojiEl = document.createElement('div');
        emojiEl.textContent = emoji;
        emojiEl.classList.add('feedback-emoji');
        feedbackContainer.appendChild(emojiEl);
        setTimeout(() => {
            emojiEl.remove();
        }, 1500);
    }

    // --- Game Logic ---
    let numberCreationInterval = null;
    let fallingElements = [];

    function startFindTheNumber() {
        if (numberCreationInterval) clearInterval(numberCreationInterval);

        gameState.targetNumber = Math.floor(Math.random() * 10);
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = '';
        fallingElements = [];

        showScreen('find-the-number-screen');

        // Create a few numbers immediately
        for(let i = 0; i < 5; i++) {
            createFallingNumber(gameArea);
        }
        // Then create more over time
        numberCreationInterval = setInterval(() => createFallingNumber(gameArea), 800);

        setTimeout(() => speak(String(gameState.targetNumber)), 500);
    }

    function createFallingNumber(container) {
        const number = Math.floor(Math.random() * 10);
        const el = document.createElement('div');
        el.classList.add('number-image');
        // Use the same animation as the hearts
        el.style.animation = `rain ${5 + Math.random() * 5}s linear`;
        el.style.left = `${Math.random() * 90}%`;
        el.style.transform = `scale(${0.8 + Math.random() * 0.4})`;

        el.innerHTML = `<img src="assets/${gameState.participant}/${number}.jpg" alt="${number}">`;
        el.dataset.number = number;

        el.addEventListener('click', () => handleNumberClick(number, el));

        container.appendChild(el);
        fallingElements.push(el);

        // Clean up element when animation ends to prevent DOM clutter
        el.addEventListener('animationend', () => {
            el.remove();
            const index = fallingElements.indexOf(el);
            if (index > -1) {
                fallingElements.splice(index, 1);
            }
        });
    }

    async function handleNumberClick(clickedNumber, element) {
        if (clickedNumber === gameState.targetNumber) {
            if (numberCreationInterval) clearInterval(numberCreationInterval);

            fallingElements.forEach(el => {
                // Stop all other animations
                el.style.animationPlayState = 'paused';
                if (el !== element) {
                   el.style.opacity = '0.2';
                }
            });

            element.classList.add('correct-guess');

            triggerConfetti();
            await new Promise(r => setTimeout(r, 2000));
            startMathProblems();
        } else {
            showFeedback('❌');
            element.style.animation = 'shake 0.5s';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    // --- Math Problems ---
    function startMathProblems() {
        gameState.mathProblem = { questionsSolved: 0 };
        setupNumberPad();
        generateMathProblem();
        showScreen('math-problems-screen');
    }

    function setupNumberPad() {
        const numberPad = document.getElementById('number-pad');
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
                if (num < otherNum) [num, otherNum] = [otherNum, num];
                problemText = `${num} - ${otherNum} = ?`;
                answer = num - otherNum;
            }
        } else {
             if (isAddition) {
                problemText = `${otherNum} + ${num} = ?`;
                answer = otherNum + num;
            } else {
                if (otherNum < num) otherNum = num + Math.floor(Math.random() * 5) + 1;
                problemText = `${otherNum} - ${num} = ?`;
                answer = otherNum - num;
            }
        }
        gameState.mathProblem.correctAnswer = answer;
        gameState.mathProblem.userAnswer = '';
        document.getElementById('problem-container').textContent = problemText;
        document.getElementById('answer-container').innerHTML = '';
    }

    function handleNumpadClick(event) {
        const digit = event.target.dataset.number;
        gameState.mathProblem.userAnswer += digit;

        const answerContainer = document.getElementById('answer-container');
        const img = document.createElement('img');
        img.src = event.target.src;
        img.classList.add('answer-image');
        answerContainer.appendChild(img);

        if (gameState.mathProblem.userAnswer.length === String(gameState.mathProblem.correctAnswer).length) {
            checkMathAnswer();
        }
    }

    async function checkMathAnswer() {
        const userAnswer = parseInt(gameState.mathProblem.userAnswer);
        if (userAnswer === gameState.mathProblem.correctAnswer) {
            triggerConfetti();
            gameState.mathProblem.questionsSolved++;
            await new Promise(r => setTimeout(r, 1500));
            if (gameState.mathProblem.questionsSolved >= 2) {
                startCollectHearts();
            } else {
                generateMathProblem();
            }
        } else {
            showFeedback('❌');
            await new Promise(r => setTimeout(r, 800));
            document.getElementById('answer-container').innerHTML = '';
            gameState.mathProblem.userAnswer = '';
        }
    }

    function startCollectHearts() {
        if (gameState.heartsGame && gameState.heartsGame.rainInterval) {
            clearInterval(gameState.heartsGame.rainInterval);
        }

        const heartsGameArea = document.getElementById('hearts-game-area');
        const instructionEl = document.getElementById('hearts-instruction');
        const collectedContainer = document.getElementById('collected-hearts-container');

        gameState.heartsGame = {
            targetColor: Object.keys(heartColors)[Math.floor(Math.random() * Object.keys(heartColors).length)],
            targetCount: gameState.targetNumber === 0 ? 1 : gameState.targetNumber,
        };

        instructionEl.innerHTML = `אסוף ${gameState.heartsGame.targetCount} לבבות ${heartColors[gameState.heartsGame.targetColor]}`;
        heartsGameArea.innerHTML = '';
        collectedContainer.innerHTML = '';

        gameState.heartsGame.rainInterval = setInterval(() => {
            createFallingHeart(heartsGameArea);
        }, 600); // Slower rate for less clutter

        showScreen('collect-hearts-screen');
    }

    function createFallingHeart(container) {
        const availableColors = Object.keys(heartColors);
        const color = availableColors[Math.floor(Math.random() * availableColors.length)];

        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.textContent = heartColors[color];
        heart.dataset.color = color;

        heart.style.left = `${Math.random() * 90}%`;
        heart.style.animationDuration = `${4 + Math.random() * 3}s`; // Slightly slower rain

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
        const wrapper = document.getElementById('canvas-wrapper');
        let isDrawing = false;
        let hue = 0;
        let resizeHandler = null; // To keep track of the listener

        // --- Setup ---
        document.getElementById('draw-instruction').textContent = `עכשיו, בוא נצייר את המספר ${gameState.targetNumber}!`;
        traceImage.src = `assets/${gameState.participant}/${gameState.targetNumber}.jpg`;

        // --- Canvas Sizing ---
        function resizeCanvas() {
            // Clear previous drawing on resize
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 12;
        }

        // Show screen first to get dimensions
        showScreen('draw-number-screen');

        // Defer canvas sizing until after the screen is visible
        requestAnimationFrame(() => {
            resizeCanvas();
            // Assign the handler function to a variable so it can be removed later
            resizeHandler = resizeCanvas;
            window.addEventListener('resize', resizeHandler);
        });


        // --- Drawing Logic ---
        function getEventPosition(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function start(e) {
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
            hue = (hue + 1) % 360;
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        function stop() {
            isDrawing = false;
        }

        // --- Event Listeners ---
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseout', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stop);

        // --- Button Controls ---
        document.getElementById('clear-canvas-button').onclick = () => {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        document.getElementById('finish-drawing-button').onclick = async () => {
            // Cleanup listeners to prevent memory leaks when stage restarts
            if (resizeHandler) {
                window.removeEventListener('resize', resizeHandler);
            }
            triggerConfetti();
            await new Promise(r => setTimeout(r, 1500));
            showScreen('participant-selection-screen');
        };
    }

    function showHintCard() {
        if (document.getElementById('hint-card')) return;

        const hintCard = document.createElement('div');
        hintCard.id = 'hint-card';
        hintCard.innerHTML = `<img src="assets/${gameState.participant}/${gameState.targetNumber}.jpg" alt="Hint: ${gameState.targetNumber}">`;

        document.getElementById('app-container').appendChild(hintCard);

        setTimeout(() => {
            if (hintCard) {
                hintCard.remove();
            }
        }, 2000);
    }

    // --- App Initialization ---
    function init() {
        setTimeout(() => {
            showScreen('participant-selection-screen');
        }, 2500);

        document.querySelectorAll('.participant-card').forEach(card => {
            card.addEventListener('click', (e) => {
                gameState.participant = e.currentTarget.dataset.participant;
                startFindTheNumber();
            });
        });

        // Event listeners for Find the Number controls
        document.getElementById('speak-button').addEventListener('click', () => {
            if (gameState.targetNumber !== null) {
                speak(String(gameState.targetNumber));
            }
        });

        document.getElementById('show-card-button').addEventListener('click', showHintCard);

        document.getElementById('finish-hearts-button').addEventListener('click', async () => {
            if (gameState.heartsGame.rainInterval) clearInterval(gameState.heartsGame.rainInterval);

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
                triggerConfetti();
                await new Promise(r => setTimeout(r, 1500));
                startDrawTheNumber();
            } else {
                showFeedback('❌');
                await new Promise(r => setTimeout(r, 1500));
                startCollectHearts();
            }
        });
    }

    init();

    // --- Expose for testing ---
    window.gameState = gameState;
    window.startFindTheNumber = startFindTheNumber;
    window.startMathProblems = startMathProblems;
    window.startCollectHearts = startCollectHearts;
    window.startDrawTheNumber = startDrawTheNumber;
});