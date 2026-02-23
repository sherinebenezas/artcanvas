class SnapshotCommand {
    constructor(imageData) {
        this.imageData = imageData;
    }

    execute(ctx) {
        ctx.putImageData(this.imageData, 0, 0);
    }
}

class CommandManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.history = [];
        this.currentIndex = -1;
        this.saveState();
    }

    saveState() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(new SnapshotCommand(imageData));
        this.currentIndex++;
    }

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.history[this.currentIndex].execute(this.ctx);
            return true;
        }
        return false;
    }

    redo() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            this.history[this.currentIndex].execute(this.ctx);
            return true;
        }
        return false;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.history = [];
        this.currentIndex = -1;
        this.saveState();
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    exportImage() {
        return this.canvas.toDataURL('image/png');
    }

    importImage(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            this.history = [];
            this.currentIndex = -1;
            this.saveState();
            updateButtons();
        };
        img.src = dataURL;
    }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');
const saveJpgBtn = document.getElementById('saveJpg');
const loadBtn = document.getElementById('load');
const toolInput = document.getElementById('tool');
const toolBtns = document.querySelectorAll('.tool-btn');
const colorInput = document.getElementById('color');
const paletteColors = document.querySelectorAll('.palette-color');
const sizeInput = document.getElementById('size');
const sizeLabel = document.getElementById('sizeLabel');
const fillBtn = document.getElementById('fill');
const opacityInput = document.getElementById('opacity');
const opacityLabel = document.getElementById('opacityLabel');
const bgColorSelect = document.getElementById('bgColor');
const uploadBtn = document.getElementById('upload');
const fileInput = document.getElementById('fileInput');

canvas.width = 800;
canvas.height = 600;

const manager = new CommandManager(canvas, ctx);
let isDrawing = false;
let currentPoints = [];
let startX, startY;
let fillMode = false;
let tempCanvas = document.createElement('canvas');
let tempCtx = tempCanvas.getContext('2d');
tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;

function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(800, container.clientWidth - 40);
    const maxHeight = Math.min(600, container.clientHeight - 40);
    
    if (window.innerWidth <= 768) {
        canvas.width = Math.min(maxWidth, window.innerWidth - 40);
        canvas.height = Math.min(maxHeight, window.innerHeight * 0.5);
    } else {
        canvas.width = 800;
        canvas.height = 600;
    }
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    if (manager.history.length > 0 && manager.currentIndex >= 0) {
        manager.history[manager.currentIndex].execute(ctx);
    }
}

window.addEventListener('resize', resizeCanvas);

toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        toolInput.value = btn.dataset.tool;
    });
});

paletteColors.forEach(color => {
    color.addEventListener('click', () => {
        paletteColors.forEach(c => c.classList.remove('active'));
        color.classList.add('active');
        colorInput.value = color.dataset.color;
    });
});

function updateButtons() {
    undoBtn.disabled = !manager.canUndo();
    redoBtn.disabled = !manager.canRedo();
}

function drawShape(x1, y1, x2, y2) {
    const tool = toolInput.value;
    const opacity = opacityInput.value / 100;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = colorInput.value;
    ctx.fillStyle = colorInput.value;
    ctx.lineWidth = sizeInput.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if (tool === 'rectangle') {
        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        fillMode ? ctx.fill() : ctx.stroke();
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        fillMode ? ctx.fill() : ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    const tool = toolInput.value;
    
    if (tool === 'text') {
        const text = prompt('Enter text:');
        if (text && text.trim()) {
            const opacity = opacityInput.value / 100;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = colorInput.value;
            ctx.font = `${sizeInput.value * 5}px Arial`;
            ctx.fillText(text, startX, startY);
            ctx.globalAlpha = 1;
            manager.saveState();
            updateButtons();
        }
        return;
    }
    
    isDrawing = true;
    currentPoints = [{ x: startX, y: startY }];
    
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tool = toolInput.value;
    const opacity = opacityInput.value / 100;
    
    if (tool === 'pen' || tool === 'eraser') {
        ctx.globalAlpha = tool === 'eraser' ? 1 : opacity;
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : colorInput.value;
        ctx.lineWidth = sizeInput.value;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        currentPoints.push({ x, y });
    } else if (tool === 'spray') {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = colorInput.value;
        for (let i = 0; i < 10; i++) {
            const offsetX = (Math.random() - 0.5) * sizeInput.value * 2;
            const offsetY = (Math.random() - 0.5) * sizeInput.value * 2;
            ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
        ctx.globalAlpha = 1;
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        drawShape(startX, startY, x, y);
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && currentPoints.length > 0) {
        manager.saveState();
        updateButtons();
    }
    isDrawing = false;
    currentPoints = [];
});

canvas.addEventListener('mouseleave', () => {
    if (isDrawing && currentPoints.length > 0) {
        manager.saveState();
        updateButtons();
    }
    isDrawing = false;
    currentPoints = [];
});

undoBtn.addEventListener('click', () => {
    if (manager.undo()) {
        updateButtons();
    }
});

redoBtn.addEventListener('click', () => {
    if (manager.redo()) {
        updateButtons();
    }
});

clearBtn.addEventListener('click', () => {
    manager.clear();
    updateButtons();
});

saveBtn.addEventListener('click', () => {
    const dataURL = manager.exportImage();
    localStorage.setItem('drawingSnapshot', dataURL);
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = dataURL;
    link.click();
});

saveJpgBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = 'drawing.jpg';
    link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
});

loadBtn.addEventListener('click', () => {
    const saved = localStorage.getItem('drawingSnapshot');
    if (saved) {
        manager.importImage(saved);
    } else {
        alert('No saved drawing found!');
    }
});

fillBtn.addEventListener('click', () => {
    fillMode = !fillMode;
    fillBtn.textContent = `Fill: ${fillMode ? 'On' : 'Off'}`;
});

sizeInput.addEventListener('input', () => {
    sizeLabel.textContent = sizeInput.value + 'px';
});

opacityInput.addEventListener('input', () => {
    opacityLabel.textContent = opacityInput.value + '%';
});

bgColorSelect.addEventListener('change', () => {
    const bg = bgColorSelect.value;
    canvas.className = '';
    canvas.style.background = '';
    
    if (bg === 'white') {
        canvas.style.background = 'white';
    } else if (bg === 'transparent') {
        canvas.style.background = 'transparent';
    } else if (bg === 'black') {
        canvas.style.background = 'black';
    } else if (bg === 'grid') {
        canvas.className = 'grid';
    } else if (bg === 'dots') {
        canvas.className = 'dots';
    } else if (bg === 'blueprint') {
        canvas.className = 'blueprint';
    } else if (bg === 'cream') {
        canvas.className = 'cream';
    } else if (bg === 'dark') {
        canvas.className = 'dark';
    }
});

uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                manager.saveState();
                updateButtons();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        manager.undo();
        updateButtons();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        manager.redo();
        updateButtons();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveBtn.click();
    }
});

updateButtons();
