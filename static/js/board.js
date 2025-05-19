const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// 地圖背景圖
const background = new Image();
background.src = '/static/images/main_low.jpg';

// 圖片資源：塔 & 旗
const images = {
    'flag_blue': new Image(),
    'flag_red': new Image(),
    'tower_blue': new Image(),
    'tower_red': new Image(),
};

let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

for (let key in images) {
    images[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages && background.complete) {
            addAllStructures();
        }
    };
}

images['flag_blue'].src = '/static/images/flag_blue.png';
images['flag_red'].src = '/static/images/flag_red.png';
images['tower_blue'].src = '/static/images/town_blue.png';
images['tower_red'].src = '/static/images/town_red.png';


// 所有單位物件（塔、旗子、棋子）
let units = [];

// 改為使用集合追蹤使用中的編號
let markerLabels = {
    yellow: new Set(),
    black: new Set(),
    white: new Set(),
    red: new Set(),
    blue: new Set(),
    green: new Set(),
    purple: new Set()
};


function getNextAvailableNumber(color) {
    for (let i = 1; i <= 99; i++) {
        if (!markerLabels[color].has(i)) return i;
    }
    return null; // 超過限制
}

function addMarker(color) {
    const label = getNextAvailableNumber(color);
    if (label === null) return;

    markerLabels[color].add(label);
    units.push(new Unit(600, 300, color, label));
    draw();
}

const structureTemplates = [
    // 🔴 敵方塔
    { x: 170, y: 306, type: 'tower_red' },
    { x: 297, y: 165, type: 'tower_red' },
    { x: 538, y: 104, type: 'tower_red' },
    { x: 234, y: 371, type: 'tower_red' },
    { x: 377, y: 379, type: 'tower_red' },
    { x: 552, y: 387, type: 'tower_red' },
    { x: 162, y: 444, type: 'tower_red' },
    { x: 294, y: 570, type: 'tower_red' },
    { x: 526, y: 634, type: 'tower_red' },

    // 🚩 敵方旗子
    { x: 164, y: 369, type: 'flag_red' },

    // 🟦 我方塔
    { x: 1050, y: 397, type: 'tower_blue' },
    { x: 920, y: 388, type: 'tower_blue' },
    { x: 749, y: 386, type: 'tower_blue' },
    { x: 1102, y: 322, type: 'tower_blue' },
    { x: 993, y: 179, type: 'tower_blue' },
    { x: 762, y: 113, type: 'tower_blue' },
    { x: 1109, y: 473, type: 'tower_blue' },
    { x: 980, y: 597, type: 'tower_blue' },
    { x: 759, y: 634, type: 'tower_blue' },

    // 🚩 我方旗子
    { x: 1120, y: 406, type: 'flag_blue' }
];


function addAllStructures() {
    for (const u of structureTemplates) {
        units.push(new Unit(u.x, u.y, u.type));
    }
    draw();
}
// 單位定義
class Unit {
    constructor(x, y, type, label = '') {
        this.x = x;
        this.y = y;
        this.size = 50;
        this.type = type;
        this.label = label;
        this.dragging = false;
    }

    draw(ctx) {
        if (this.type.startsWith('tower') || this.type.startsWith('flag')) {
            const img = images[this.type];
            if (img.complete) {
                ctx.drawImage(img, this.x - 24, this.y - 24, 48, 48); // 固定比例，不會被拉伸
            }
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = this.type;
            ctx.fill();
            ctx.fillStyle = (this.type === 'yellow' || this.type === 'white') ? 'black' : 'white';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, this.x, this.y);

        }

        if (deleteLineMode && eraseCursorPos) {
            ctx.beginPath();
            ctx.arc(eraseCursorPos.x, eraseCursorPos.y, 10, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 6;
            ctx.stroke();
        }
    }

    isInside(x, y) {
        return (
            x >= this.x - this.size / 2 &&
            x <= this.x + this.size / 2 &&
            y >= this.y - this.size / 2 &&
            y <= this.y + this.size / 2
        );
    }
}


function addUnit(type) {
    const presets = {
        'flag_blue': { x: 1000, y: 640 },
        'flag_red':  { x: 190,  y: 90 },
        'tower_blue': { x: 850, y: 180 },
        'tower_red':  { x: 350, y: 180 }
    };

    if (presets[type]) {
        const pos = presets[type];
        units.push(new Unit(pos.x, pos.y, type));
        draw();
    } else {
        alert('⚠️ 無效單位類型：' + type);
    }
}



// 拖曳與刪除
let draggingUnit = null;

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode) {
        // 畫線模式啟動 → 不處理拖曳，進入畫線
        isDrawing = true;
        if (currentLineType === 'free') {
            currentLine = { color: currentLineColor, points: [{ x, y }] };
        } else if (currentLineType === 'straight') {
            currentLine = { color: currentLineColor, points: [{ x, y }] };  // 只記起點
        }
        return;
    }

    // ⚠ 非畫線模式才允許拖曳
    for (let unit of units) {
        if (unit.isInside(x, y)) {
            draggingUnit = unit;
            unit.dragging = true;
            break;
        }
    }
});


canvas.addEventListener('mousemove', e => {
    if (draggingUnit) {
        const rect = canvas.getBoundingClientRect();
        draggingUnit.x = e.clientX - rect.left;
        draggingUnit.y = e.clientY - rect.top;
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (draggingUnit) {
        draggingUnit.dragging = false;
        draggingUnit = null;
    }
});

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = units.length - 1; i >= 0; i--) {
        const unit = units[i];
        if (unit.isInside(x, y)) {
            // 若是棋子，釋放編號
            if (['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black'].includes(unit.type)) {
                markerLabels[unit.type].delete(unit.label);
            }
            units.splice(i, 1);
            break;
        }
    }
    
    draw();
});

// 繪圖函數
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    for (let unit of units) {
        unit.draw(ctx);
    }
}

background.onload = () => {
    if (imagesLoaded === totalImages) {
        addAllStructures();
    }
};

// --- 畫線功能相關 ---
let isDrawing = false;
let drawingMode = false;
let currentLineColor = 'red';
let currentLineType = null; // 'free' 或 'straight'
let lines = [];

let currentLine = null;
let straightLineStart = null;
let previewLineEnd = null;

let isDashed = false;
let arrowMode = 'none'; // none, start, end, both
let deleteLineMode = false;

let isErasing = false;
let eraseCursorPos = null;

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 🧽 啟用橡皮擦模式
    if (deleteLineMode) {
        isErasing = true;
        eraseCursorPos = { x, y };
        eraseLinesAt(x, y);
        draw();
        return;
    }

    if (drawingMode) {
        if (currentLineType === 'free') {
            isDrawing = true;
            currentLine = { color: currentLineColor, points: [{ x, y }] };
        } else if (currentLineType === 'straight') {
            if (!straightLineStart) {
                straightLineStart = { x, y };
            } else {
                const end = { x, y };
                lines.push({
                    color: currentLineColor,
                    points: [...pts],
                    dashed: isDashed,
                    arrow: arrowMode
                });
                straightLineStart = null;
                draw();
            }
        }
        return;
    }

    // 拖曳單位
    for (let unit of units) {
        if (unit.isInside(x, y)) {
            draggingUnit = unit;
            unit.dragging = true;
            break;
        }
    }
});


canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    eraseCursorPos = { x, y }; // 記住滑鼠位置

    if (isErasing) {
        eraseLinesAt(x, y);
        draw();
        return;
    }

    if (drawingMode && currentLineType === 'free' && isDrawing && currentLine) {
        currentLine.points.push({ x, y });
        draw();
    } else if (drawingMode && currentLineType === 'straight' && straightLineStart) {
        previewLineEnd = { x, y }; // 滑鼠移動時記錄當前終點
        draw();
    } else if (draggingUnit) {
        draggingUnit.x = x;
        draggingUnit.y = y;
        draw();
    }
});



canvas.addEventListener('mouseup', e => {

    if (isErasing) {
        isErasing = false;
        return;
    }

    if (drawingMode && currentLineType === 'free' && isDrawing && currentLine) {
        lines.push(currentLine);
        currentLine = null;
        isDrawing = false;
        draw();
        return;
    }

    if (drawingMode && currentLineType === 'straight' && straightLineStart) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
    
        const end = { x, y };
        lines.push({
            color: currentLineColor,
            points: [straightLineStart, end],
            dashed: isDashed,
            arrow: arrowMode
        });
        straightLineStart = null;
        previewLineEnd = null;
        draw();
        return;
    }
    

    if (draggingUnit) {
        draggingUnit.dragging = false;
        draggingUnit = null;
    }
});


// 🔁 修改 draw() 加上畫線邏輯
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    for (let unit of units) {
        unit.draw(ctx);
    }

    // 🎨 畫所有線
    for (const line of lines) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.setLineDash(line.dashed ? [10, 5] : []);
        
        const pts = line.points;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
            else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    
        if (line.arrow && pts.length >= 2) {
            const start = pts[0], end = pts[pts.length - 1];
            if (line.arrow === 'start' || line.arrow === 'both') drawArrow(end, start, line.color);
            if (line.arrow === 'end' || line.arrow === 'both') drawArrow(start, end, line.color);
        }
    }
    

    // 🎨 畫當前正在畫的線（跟滑鼠移動）
    if (drawingMode && currentLine) {
        ctx.strokeStyle = currentLine.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < currentLine.points.length; i++) {
            const p = currentLine.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    if (drawingMode && currentLineType === 'straight' && straightLineStart && previewLineEnd) {
        ctx.strokeStyle = currentLineColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(straightLineStart.x, straightLineStart.y);
        ctx.lineTo(previewLineEnd.x, previewLineEnd.y);
        ctx.stroke();
    }
    
}

function toggleDrawMode() {
    drawingMode = !drawingMode;
    const btn = document.getElementById('drawToggleBtn');
    btn.style.backgroundColor = drawingMode ? '#4da6ff' : '';
    btn.style.color = drawingMode ? '#fff' : '';
    canvas.style.cursor = drawingMode ? 'crosshair' : 'default';

    // 同時切換子按鈕狀態
    updateLineToolStates();
    straightLineStart = null; // 重置直線起點
}

function setLineType(type) {
    if (!drawingMode) return; // 只有啟用畫線時才能選

    currentLineType = type;
    updateLineToolStates();
}

function updateLineToolStates() {
    const btnFree = document.getElementById('btnFree');
    const btnLine = document.getElementById('btnLine');

    btnFree.disabled = !drawingMode;
    btnLine.disabled = !drawingMode;

    btnFree.style.backgroundColor = (drawingMode && currentLineType === 'free') ? '#4da6ff' : '';
    btnLine.style.backgroundColor = (drawingMode && currentLineType === 'straight') ? '#4da6ff' : '';
}

// 畫箭頭
function drawArrow(from, to, color) {
    const headlen = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
    ctx.strokeStyle = color;
    ctx.stroke();
}

// 畫線模組相關
function setLineDash(dashed) {
    isDashed = dashed;
    document.getElementById('btnSolid').style.backgroundColor = dashed ? '' : '#4da6ff';
    document.getElementById('btnDashed').style.backgroundColor = dashed ? '#4da6ff' : '';
}

function setArrowMode(mode) {
    arrowMode = mode;

    const modeMap = {
        'none': 'arrowNone',
        'start': 'arrowStart',
        'end': 'arrowEnd',
        'both': 'arrowBoth'
    };

    for (let key in modeMap) {
        const btn = document.getElementById(modeMap[key]);
        btn.style.backgroundColor = (key === mode) ? '#4da6ff' : '';
    }
}


function toggleDeleteLineMode() {
    deleteLineMode = !deleteLineMode;
    const btn = document.getElementById('btnDeleteLineMode');
    btn.style.backgroundColor = deleteLineMode ? '#ff6666' : '';
}

function setLineColor(color) {
    currentLineColor = color;
    drawingMode = true;
}

function clearLines() {
    lines = [];
    draw();
}

// 工具函式
function isNearLine(x, y, p1, p2, tolerance = 5) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    const dot = ((x - p1.x) * dx + (y - p1.y) * dy) / (length * length);
    if (dot < 0 || dot > 1) return false;

    const projX = p1.x + dot * dx;
    const projY = p1.y + dot * dy;
    const dist = Math.hypot(x - projX, y - projY);
    return dist <= tolerance;
}

// 點擊刪除線條（僅在刪除模式下啟用）
canvas.addEventListener('click', e => {
    if (!deleteLineMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const pts = line.points;
        for (let j = 0; j < pts.length - 1; j++) {
            if (isNearLine(x, y, pts[j], pts[j + 1], 8)) {
                lines.splice(i, 1);
                draw();
                return;
            }
        }
    }
});

function eraseLinesAt(x, y) {
    for (let i = lines.length - 1; i >= 0; i--) {
        const pts = lines[i].points;
        for (let j = 0; j < pts.length - 1; j++) {
            if (isNearLine(x, y, pts[j], pts[j + 1], 10)) {
                lines.splice(i, 1);
                break;
            }
        }
    }
}

//清除線條
function clearAllLines() {
    lines = [];
    draw();
}



/**
// ✅ 除錯用：點擊畫布顯示座標
// 建立一個紀錄面板
const logPanel = document.createElement('div');
logPanel.style.position = 'fixed';
logPanel.style.top = '10px';
logPanel.style.right = '10px';
logPanel.style.width = '300px';
logPanel.style.maxHeight = '400px';
logPanel.style.overflowY = 'auto';
logPanel.style.background = 'rgba(0,0,0,0.8)';
logPanel.style.color = '#0f0';
logPanel.style.fontFamily = 'monospace';
logPanel.style.fontSize = '14px';
logPanel.style.padding = '10px';
logPanel.style.borderRadius = '8px';
logPanel.style.zIndex = 1000;
logPanel.innerHTML = '<b>📍 點擊座標紀錄：</b><br><br>';
document.body.appendChild(logPanel);

// 當使用者點擊 canvas，就紀錄座標
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const entry = `{ x: ${x}, y: ${y}, type: '' },<br>`;
    logPanel.innerHTML += entry;
});
* */