class ConceptMap {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.connectingMode = false;
        this.connectingStart = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.nodeIdCounter = 0;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        this.draw();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }
    
    setupEventListeners() {
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
        document.getElementById('addImageBtn').addEventListener('click', () => this.addImageNode());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveMap());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadMap());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileLoad(e));
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImageLoad(e));
        document.getElementById('clearBtn').addEventListener('click', () => this.clearMap());
        document.getElementById('saveNodeBtn').addEventListener('click', () => this.saveNodeEdit());
        document.getElementById('cancelNodeBtn').addEventListener('click', () => this.cancelNodeEdit());
        document.getElementById('nodeImage').addEventListener('change', (e) => this.handleNodeImageChange(e));
        document.getElementById('removeImageBtn').addEventListener('click', () => this.removeNodeImage());
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'c' && !e.ctrlKey) {
                this.toggleConnectingMode();
            }
            if (e.key === 'Delete' && this.selectedNode) {
                this.deleteNode(this.selectedNode);
            }
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    addNode(x = 200, y = 200, text = 'New Node', color = '#4CAF50', image = null) {
        const node = {
            id: ++this.nodeIdCounter,
            x: x,
            y: y,
            width: 120,
            height: 60,
            text: text,
            color: color,
            image: image,
            imageObj: null
        };
        this.nodes.push(node);
        this.draw();
        return node;
    }

    addImageNode() {
        document.getElementById('imageInput').click();
    }

    handleImageLoad(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                const maxSize = 150;
                let width = maxSize;
                let height = maxSize;
                
                if (aspectRatio > 1) {
                    height = maxSize / aspectRatio;
                } else {
                    width = maxSize * aspectRatio;
                }

                const node = this.addNode(200, 200, '', '#ffffff', event.target.result);
                node.imageObj = img;
                node.width = width + 20;
                node.height = height + 20;
                this.draw();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        e.target.value = '';
    }

    handleNodeImageChange(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                if (this.selectedNode) {
                    this.selectedNode.image = event.target.result;
                    this.selectedNode.imageObj = img;
                    
                    const aspectRatio = img.width / img.height;
                    const maxSize = 150;
                    let width = maxSize;
                    let height = maxSize;
                    
                    if (aspectRatio > 1) {
                        height = maxSize / aspectRatio;
                    } else {
                        width = maxSize * aspectRatio;
                    }
                    
                    this.selectedNode.width = width + 20;
                    this.selectedNode.height = height + 20;
                    
                    document.getElementById('removeImageBtn').style.display = 'inline-block';
                    this.draw();
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    removeNodeImage() {
        if (this.selectedNode) {
            this.selectedNode.image = null;
            this.selectedNode.imageObj = null;
            this.selectedNode.width = 120;
            this.selectedNode.height = 60;
            
            document.getElementById('removeImageBtn').style.display = 'none';
            document.getElementById('nodeImage').value = '';
            this.draw();
        }
    }
    
    deleteNode(node) {
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.connections = this.connections.filter(c => 
            c.from.id !== node.id && c.to.id !== node.id
        );
        this.selectedNode = null;
        this.draw();
    }
    
    findNodeAt(x, y) {
        return this.nodes.find(node => 
            x >= node.x - node.width/2 && 
            x <= node.x + node.width/2 &&
            y >= node.y - node.height/2 && 
            y <= node.y + node.height/2
        );
    }
    
    handleCanvasClick(e) {
        const pos = this.getMousePos(e);
        const clickedNode = this.findNodeAt(pos.x, pos.y);
        
        if (this.connectingMode) {
            if (clickedNode) {
                if (!this.connectingStart) {
                    this.connectingStart = clickedNode;
                    this.canvas.style.cursor = 'crosshair';
                } else if (clickedNode !== this.connectingStart) {
                    this.addConnection(this.connectingStart, clickedNode);
                    this.connectingStart = null;
                    this.toggleConnectingMode();
                }
            }
        } else {
            this.selectedNode = clickedNode;
            this.draw();
        }
    }
    
    handleMouseDown(e) {
        if (this.connectingMode) return;
        
        const pos = this.getMousePos(e);
        const clickedNode = this.findNodeAt(pos.x, pos.y);
        
        if (clickedNode) {
            this.dragging = true;
            this.selectedNode = clickedNode;
            this.dragOffset = {
                x: pos.x - clickedNode.x,
                y: pos.y - clickedNode.y
            };
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    handleMouseMove(e) {
        if (!this.dragging || !this.selectedNode) return;
        
        const pos = this.getMousePos(e);
        this.selectedNode.x = pos.x - this.dragOffset.x;
        this.selectedNode.y = pos.y - this.dragOffset.y;
        this.draw();
    }
    
    handleMouseUp(e) {
        this.dragging = false;
        this.canvas.style.cursor = this.connectingMode ? 'crosshair' : 'default';
    }
    
    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        const clickedNode = this.findNodeAt(pos.x, pos.y);
        
        if (clickedNode) {
            this.editNode(clickedNode);
        } else {
            this.addNode(pos.x, pos.y);
        }
    }
    
    toggleConnectingMode() {
        this.connectingMode = !this.connectingMode;
        this.connectingStart = null;
        this.canvas.style.cursor = this.connectingMode ? 'crosshair' : 'default';
        
        const btn = document.getElementById('addNodeBtn');
        btn.textContent = this.connectingMode ? 'Exit Connect Mode (C)' : 'Add Node';
        btn.style.backgroundColor = this.connectingMode ? '#ff6b6b' : '#4CAF50';
    }
    
    addConnection(fromNode, toNode) {
        const existingConnection = this.connections.find(c =>
            (c.from.id === fromNode.id && c.to.id === toNode.id) ||
            (c.from.id === toNode.id && c.to.id === fromNode.id)
        );
        
        if (!existingConnection) {
            this.connections.push({
                from: fromNode,
                to: toNode
            });
            this.draw();
        }
    }
    
    editNode(node) {
        this.selectedNode = node;
        const editor = document.getElementById('nodeEditor');
        const textInput = document.getElementById('nodeText');
        const colorInput = document.getElementById('nodeColor');
        const removeImageBtn = document.getElementById('removeImageBtn');
        
        textInput.value = node.text;
        colorInput.value = node.color;
        
        if (node.image) {
            removeImageBtn.style.display = 'inline-block';
        } else {
            removeImageBtn.style.display = 'none';
        }
        
        editor.classList.remove('hidden');
        textInput.focus();
    }
    
    saveNodeEdit() {
        if (!this.selectedNode) return;
        
        const textInput = document.getElementById('nodeText');
        const colorInput = document.getElementById('nodeColor');
        
        this.selectedNode.text = textInput.value || 'New Node';
        this.selectedNode.color = colorInput.value;
        
        this.cancelNodeEdit();
        this.draw();
    }
    
    cancelNodeEdit() {
        document.getElementById('nodeEditor').classList.add('hidden');
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawConnections();
        this.drawNodes();
    }
    
    drawConnections() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        
        this.connections.forEach(connection => {
            const from = connection.from;
            const to = connection.to;
            
            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.stroke();
            
            this.drawArrow(from.x, from.y, to.x, to.y);
        });
    }
    
    drawArrow(fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        const arrowX = toX - Math.cos(angle) * 30;
        const arrowY = toY - Math.sin(angle) * 30;
        
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - arrowAngle),
            arrowY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + arrowAngle),
            arrowY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.stroke();
    }
    
    drawNodes() {
        this.nodes.forEach(node => {
            this.ctx.fillStyle = node.color;
            this.ctx.strokeStyle = this.selectedNode === node ? '#ff6b6b' : '#333';
            this.ctx.lineWidth = this.selectedNode === node ? 3 : 2;
            
            this.ctx.fillRect(
                node.x - node.width/2,
                node.y - node.height/2,
                node.width,
                node.height
            );
            
            this.ctx.strokeRect(
                node.x - node.width/2,
                node.y - node.height/2,
                node.width,
                node.height
            );
            
            if (node.image && node.imageObj) {
                const imgWidth = node.width - 20;
                const imgHeight = node.height - 20;
                const imgX = node.x - imgWidth/2;
                const imgY = node.y - imgHeight/2;
                
                this.ctx.drawImage(node.imageObj, imgX, imgY, imgWidth, imgHeight);
                
                if (node.text.trim() !== '') {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.fillRect(
                        node.x - node.width/2,
                        node.y + node.height/2 - 25,
                        node.width,
                        25
                    );
                    
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(node.text, node.x, node.y + node.height/2 - 12);
                }
            } else {
                this.ctx.fillStyle = '#000';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                const words = node.text.split(' ');
                const maxWidth = node.width - 10;
                let line = '';
                let y = node.y - 10;
                
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = this.ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    
                    if (testWidth > maxWidth && n > 0) {
                        this.ctx.fillText(line, node.x, y);
                        line = words[n] + ' ';
                        y += 20;
                    } else {
                        line = testLine;
                    }
                }
                this.ctx.fillText(line, node.x, y);
            }
        });
    }
    
    saveMap() {
        const data = {
            nodes: this.nodes,
            connections: this.connections.map(c => ({
                fromId: c.from.id,
                toId: c.to.id
            }))
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'concept-map.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    loadMap() {
        document.getElementById('fileInput').click();
    }
    
    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.nodes = data.nodes || [];
                this.nodeIdCounter = Math.max(...this.nodes.map(n => n.id), 0);
                
                this.connections = (data.connections || []).map(c => ({
                    from: this.nodes.find(n => n.id === c.fromId),
                    to: this.nodes.find(n => n.id === c.toId)
                })).filter(c => c.from && c.to);
                
                this.selectedNode = null;
                this.draw();
            } catch (error) {
                alert('Error loading file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    clearMap() {
        if (confirm('Are you sure you want to clear the entire map?')) {
            this.nodes = [];
            this.connections = [];
            this.selectedNode = null;
            this.nodeIdCounter = 0;
            this.draw();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ConceptMap();
});