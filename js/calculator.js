let display = document.getElementById('result');
let currentInput = '0';
let shouldResetDisplay = false;
let cursorPosition = 0;
let isScientificOpen = false;

function updateDisplay() {
    display.value = currentInput;
    
    // Восстанавливаем позицию курсора
    setTimeout(() => {
        try {
            display.setSelectionRange(cursorPosition, cursorPosition);
        } catch (e) {
            // Игнорируем ошибки установки курсора
        }
    }, 10);
}

function appendToDisplay(value) {
    if (shouldResetDisplay && !isOperator(value) && value !== '(' && value !== ')') {
        // Если нужно сбросить дисплей и вводится не оператор, сбрасываем
        currentInput = '';
        shouldResetDisplay = false;
        cursorPosition = 0;
    } else if (shouldResetDisplay && isOperator(value)) {
        // Если нужно сбросить дисплей и вводится оператор, оставляем результат
        shouldResetDisplay = false;
    }
    
    if (currentInput === '0' && value !== '.' && !'()'.includes(value) && !isOperator(value)) {
        currentInput = value;
        cursorPosition = 1;
    } else if (currentInput === '0' && '()'.includes(value)) {
        currentInput = value;
        cursorPosition = 1;
    } else {
        currentInput = currentInput.slice(0, cursorPosition) + value + currentInput.slice(cursorPosition);
        cursorPosition += value.length;
    }
    
    updateDisplay();
}

// Проверка, является ли символ оператором
function isOperator(value) {
    return ['+', '-', '*', '/', '%'].includes(value);
}

function clearDisplay() {
    currentInput = '0';
    cursorPosition = 0;
    shouldResetDisplay = false;
    updateDisplay();
}

function deleteLast() {
    if (currentInput.length > 1 && cursorPosition > 0) {
        currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
        cursorPosition--;
    } else if (currentInput.length === 1) {
        currentInput = '0';
        cursorPosition = 0;
    }
    shouldResetDisplay = false;
    updateDisplay();
}

function deleteForward() {
    if (currentInput.length > 1 && cursorPosition < currentInput.length) {
        currentInput = currentInput.slice(0, cursorPosition) + currentInput.slice(cursorPosition + 1);
    } else if (currentInput.length === 1) {
        currentInput = '0';
        cursorPosition = 0;
    }
    shouldResetDisplay = false;
    updateDisplay();
}

function moveCursorLeft() {
    if (cursorPosition > 0) {
        cursorPosition--;
        updateDisplay();
    }
}

function moveCursorRight() {
    if (cursorPosition < currentInput.length) {
        cursorPosition++;
        updateDisplay();
    }
}

function moveCursorToStart() {
    cursorPosition = 0;
    updateDisplay();
}

function moveCursorToEnd() {
    cursorPosition = currentInput.length;
    updateDisplay();
}

// Обработка ввода с клавиатуры напрямую в input
function handleDirectInput(e) {
    e.preventDefault();
    
    const key = e.key;
    
    // Разрешаем только определенные клавиши
    if (key >= '0' && key <= '9') {
        appendToDisplay(key);
    } else if (key === '.') {
        appendToDisplay('.');
    } else if (key === '+') {
        appendToDisplay('+');
    } else if (key === '-') {
        appendToDisplay('-');
    } else if (key === '*') {
        appendToDisplay('*');
    } else if (key === '/') {
        appendToDisplay('/');
    } else if (key === '(') {
        appendToDisplay('(');
    } else if (key === ')') {
        appendToDisplay(')');
    } else if (key === '%') {
        appendToDisplay('%');
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape' || key === 'Delete') {
        clearDisplay();
    } else if (key === 'Backspace') {
        deleteLast();
    } else if (key === 'ArrowLeft') {
        moveCursorLeft();
    } else if (key === 'ArrowRight') {
        moveCursorRight();
    } else if (key === 'Home') {
        moveCursorToStart();
    } else if (key === 'End') {
        moveCursorToEnd();
    }
    // Все остальные клавиши игнорируем
}

function setupCursorControl() {
    // Обработка кликов для установки курсора
    display.addEventListener('click', function(e) {
        const rect = display.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        cursorPosition = Math.max(0, Math.min(currentInput.length, 
            Math.round((clickX / rect.width) * currentInput.length)));
        updateDisplay();
    });
    
    // Обработка всех клавиш
    display.addEventListener('keydown', handleDirectInput);
    
    // Предотвращаем вставку
    display.addEventListener('paste', function(e) {
        e.preventDefault();
    });
    
    // Предотвращаем выделение и перетаскивание
    display.addEventListener('select', function(e) {
        e.preventDefault();
    });
    
    display.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });
}

// Функция переключения научной панели СПРАВА
function toggleScientific() {
    const sidebar = document.getElementById('scientificSidebar');
    const toggleBtn = document.getElementById('scientificToggle');
    
    isScientificOpen = !isScientificOpen;
    
    if (isScientificOpen) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('expanded');
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<span>🔬 Основной</span>';
    } else {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<span>🔬 Научный</span>';
    }
}

function togglePlusMinus() {
    if (currentInput !== '0' && currentInput !== '') {
        if (currentInput.startsWith('-')) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = '-' + currentInput;
        }
        cursorPosition = currentInput.length;
        shouldResetDisplay = false;
        updateDisplay();
    }
}

function calculate() {
    try {
        let expression = currentInput
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/%/g, '/100')
            .replace(/π/g, Math.PI.toString())
            .replace(/e/g, Math.E.toString());
        
        if (!isBalancedParentheses(expression)) {
            throw new Error('Несбалансированные скобки');
        }
        
        if (isValidExpression(expression)) {
            let result = evaluateExpression(expression);
            result = Math.round(result * 10000000000) / 10000000000;
            currentInput = formatResult(result);
            cursorPosition = currentInput.length;
            shouldResetDisplay = true; // Теперь сброс происходит только при вводе чисел
            updateDisplay();
        } else {
            throw new Error('Неверное выражение');
        }
    } catch (error) {
        currentInput = 'Ошибка';
        cursorPosition = 0;
        shouldResetDisplay = true;
        updateDisplay();
        
        setTimeout(() => {
            if (currentInput === 'Ошибка') {
                clearDisplay();
            }
        }, 2000);
    }
}

function isBalancedParentheses(expression) {
    let balance = 0;
    for (let char of expression) {
        if (char === '(') balance++;
        if (char === ')') balance--;
        if (balance < 0) return false;
    }
    return balance === 0;
}

function isValidExpression(expression) {
    const validChars = /^[0-9+\-*/.()% πe\s]+$/;
    return validChars.test(expression.replace(/Math\.PI/g, '').replace(/Math\.E/g, ''));
}

function evaluateExpression(expression) {
    expression = expression.replace(/\+\+/g, '+').replace(/\-\-/g, '+');
    expression = expression.replace(/\+\-/g, '-').replace(/\-\+/g, '-');
    return eval(expression);
}

function formatResult(result) {
    if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Неверный результат');
    }
    if (result % 1 === 0) {
        return result.toString();
    }
    return parseFloat(result.toFixed(8)).toString();
}

// Научные функции
function calculateSquareRoot() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        if (value >= 0) {
            currentInput = Math.sqrt(value).toString();
            cursorPosition = currentInput.length;
            shouldResetDisplay = true;
            updateDisplay();
        } else {
            throw new Error('Отрицательное число');
        }
    } catch (error) {
        showError('Неверное число');
    }
}

function calculatePower(power) {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        currentInput = Math.pow(value, power).toString();
        cursorPosition = currentInput.length;
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        showError('Ошибка');
    }
}

function calculateSin() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        currentInput = Math.sin(value * Math.PI / 180).toString();
        cursorPosition = currentInput.length;
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        showError('Ошибка');
    }
}

function calculateCos() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        currentInput = Math.cos(value * Math.PI / 180).toString();
        cursorPosition = currentInput.length;
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        showError('Ошибка');
    }
}

function calculateTan() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        currentInput = Math.tan(value * Math.PI / 180).toString();
        cursorPosition = currentInput.length;
        shouldResetDisplay = true;
        updateDisplay();
    } catch (error) {
        showError('Ошибка');
    }
}

function calculateLog() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        if (value > 0) {
            currentInput = Math.log10(value).toString();
            cursorPosition = currentInput.length;
            shouldResetDisplay = true;
            updateDisplay();
        } else {
            throw new Error('Неверное число');
        }
    } catch (error) {
        showError('Неверное число');
    }
}

function calculateLn() {
    try {
        if (currentInput === '0') return;
        const value = parseFloat(currentInput);
        if (value > 0) {
            currentInput = Math.log(value).toString();
            cursorPosition = currentInput.length;
            shouldResetDisplay = true;
            updateDisplay();
        } else {
            throw new Error('Неверное число');
        }
    } catch (error) {
        showError('Неверное число');
    }
}

function calculateFactorial() {
    try {
        if (currentInput === '0') return;
        const value = parseInt(currentInput);
        if (value >= 0 && value <= 100) {
            let result = 1;
            for (let i = 2; i <= value; i++) {
                result *= i;
            }
            currentInput = result.toString();
            cursorPosition = currentInput.length;
            shouldResetDisplay = true;
            updateDisplay();
        } else {
            throw new Error('Неверное число');
        }
    } catch (error) {
        showError('Неверное число');
    }
}

function showError(message) {
    currentInput = message;
    cursorPosition = 0;
    shouldResetDisplay = true;
    updateDisplay();
    setTimeout(() => {
        if (currentInput === message) {
            clearDisplay();
        }
    }, 2000);
}

function openParenthesis() {
    appendToDisplay('(');
}

function closeParenthesis() {
    appendToDisplay(')');
}

// Функция для красивой кнопки внизу калькулятора
function handleSpecialAction() {
    if (currentInput !== '0' && currentInput !== 'Ошибка') {
        // Копирование результата в буфер обмена
        navigator.clipboard.writeText(currentInput).then(() => {
            // Визуальная обратная связь
            const actionBtn = document.querySelector('.calculator-action-btn');
            if (actionBtn) {
                const originalText = actionBtn.innerHTML;
                
                actionBtn.innerHTML = '<span class="btn-icon">✅</span><span>Скопировано!</span>';
                actionBtn.classList.add('pulse');
                
                setTimeout(() => {
                    actionBtn.innerHTML = originalText;
                    actionBtn.classList.remove('pulse');
                }, 2000);
            }
        }).catch(err => {
            console.error('Ошибка копирования: ', err);
            // Альтернативный вариант если clipboard не доступен
            showTemporaryMessage('Скопируйте результат вручную: ' + currentInput);
        });
    } else {
        // Если нет результата, предлагаем пример
        currentInput = '2+2*2';
        cursorPosition = currentInput.length;
        shouldResetDisplay = false;
        updateDisplay();
        
        const actionBtn = document.querySelector('.calculator-action-btn');
        if (actionBtn) {
            const originalText = actionBtn.innerHTML;
            
            actionBtn.innerHTML = '<span class="btn-icon">🔢</span><span>Пример добавлен</span>';
            
            setTimeout(() => {
                actionBtn.innerHTML = originalText;
            }, 1500);
        }
    }
}

// Вспомогательная функция для показа временных сообщений
function showTemporaryMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(102, 126, 234, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        if (messageEl.parentNode) {
            document.body.removeChild(messageEl);
        }
    }, 3000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    setupCursorControl();
    updateDisplay();
    
    // Автофокус на дисплей
    setTimeout(() => {
        display.focus();
        cursorPosition = currentInput.length;
        updateDisplay();
    }, 100);
    
    display.style.cursor = 'text';
    display.title = 'Кликните для установки курсора. Используйте стрелки ← → для перемещения.';
    
    // Закрываем научную панель по умолчанию
    const sidebar = document.getElementById('scientificSidebar');
    const toggleBtn = document.getElementById('scientificToggle');
    if (sidebar && toggleBtn) {
        sidebar.classList.add('collapsed');
        toggleBtn.classList.remove('active');
    }
    
    // Добавляем обработчики для улучшения UX
    addButtonAnimations();
});

// Функция для добавления анимаций кнопкам
function addButtonAnimations() {
    const buttons = document.querySelectorAll('.calc-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('mouseup', function() {
            this.style.transform = '';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}