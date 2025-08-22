class OnlineSeotdaGame {
    constructor() {
        this.players = [];
        this.deck = this.createDeck();
        this.currentPlayerIndex = 0;
        this.totalBet = 0;
        this.roundNumber = 1;
        this.bettingRound = 1;
        this.gamePhase = 'waiting';
        this.activePlayers = [];
        this.hasPlayerCalled = false;
        this.hasPlayerRaised = false;
        this.maxBet = 4;
        this.gameLog = [];
        this.bettingStartPlayerIndex = 0;
        this.lastLoserIndex = -1;
        this.lastRaiserIndex = -1;
        this.baseBet = 0;
        this.revealingCards = false;
        this.revealIndex = 0;
        
        // 온라인 관련
        this.roomCode = null;
        this.playerId = this.generatePlayerId();
        this.isHost = false;
        this.database = window.database;
        this.gameRef = null;
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    createDeck() {
        const deck = [];
        
        for (let month = 1; month <= 10; month++) {
            const isGwangMonth = month === 1 || month === 3 || month === 8;
            
            if (isGwangMonth) {
                deck.push({ month, type: 'gwang', isGwang: true });
                deck.push({ month, type: 'normal', isGwang: false });
            } else {
                deck.push({ month, type: 'normal', isGwang: false });
                deck.push({ month, type: 'normal', isGwang: false });
            }
        }
        
        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    async createOrJoinRoom(roomCode = null) {
        try {
            if (!roomCode) {
                roomCode = this.generateRoomCode();
                this.isHost = true;
            }
            
            this.roomCode = roomCode;
            this.gameRef = this.database.ref(`games/${roomCode}`);
            
            // 방이 존재하는지 확인
            const snapshot = await this.gameRef.once('value');
            if (!snapshot.exists() && !this.isHost) {
                throw new Error('존재하지 않는 방입니다.');
            }
            
            if (this.isHost) {
                // 새 방 생성
                await this.gameRef.set({
                    host: this.playerId,
                    players: {},
                    gameState: {
                        phase: 'waiting',
                        currentPlayerIndex: 0,
                        totalBet: 0,
                        roundNumber: 1
                    },
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            // 실시간 리스너 설정
            this.setupRealtimeListeners();
            
            // UI 업데이트
            document.getElementById('currentRoom').style.display = 'block';
            document.getElementById('roomCode').textContent = roomCode;
            document.getElementById('playerJoinSection').style.display = 'block';
            document.getElementById('roomBtn').textContent = '방 나가기';
            document.getElementById('roomBtn').onclick = () => this.leaveRoom();
            
            return true;
        } catch (error) {
            alert('방 생성/참여 실패: ' + error.message);
            return false;
        }
    }

    setupRealtimeListeners() {
        // 플레이어 목록 변경 감지
        this.gameRef.child('players').on('value', (snapshot) => {
            const playersData = snapshot.val() || {};
            this.updatePlayersFromServer(playersData);
        });

        // 게임 상태 변경 감지
        this.gameRef.child('gameState').on('value', (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.updateGameStateFromServer(gameState);
            }
        });

        // 게임 액션 감지
        this.gameRef.child('actions').on('child_added', (snapshot) => {
            const action = snapshot.val();
            this.handleServerAction(action);
        });
    }

    async joinGame(playerName) {
        if (!this.roomCode || !playerName.trim()) return false;

        try {
            const playerData = {
                id: this.playerId,
                name: playerName.trim(),
                joinedAt: firebase.database.ServerValue.TIMESTAMP,
                isOnline: true
            };

            await this.gameRef.child(`players/${this.playerId}`).set(playerData);
            
            // 연결 끊어짐 감지
            this.gameRef.child(`players/${this.playerId}/isOnline`).onDisconnect().set(false);
            
            return true;
        } catch (error) {
            alert('게임 참여 실패: ' + error.message);
            return false;
        }
    }

    async sendAction(actionType, data = {}) {
        if (!this.roomCode) return;

        const action = {
            type: actionType,
            playerId: this.playerId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            data: data
        };

        await this.gameRef.child('actions').push(action);
    }

    updatePlayersFromServer(playersData) {
        this.players = Object.values(playersData).filter(p => p.isOnline);
        this.updateWaitingDisplay();
    }

    updateGameStateFromServer(gameState) {
        this.gamePhase = gameState.phase;
        this.currentPlayerIndex = gameState.currentPlayerIndex;
        this.totalBet = gameState.totalBet;
        this.roundNumber = gameState.roundNumber;
        
        if (gameState.phase === 'playing') {
            document.querySelector('.setup-area').style.display = 'none';
            document.getElementById('gameArea').style.display = 'block';
        }
        
        this.updateDisplay();
        this.updateBettingControls();
    }

    handleServerAction(action) {
        if (action.playerId === this.playerId) return; // 자신의 액션은 무시

        switch (action.type) {
            case 'fold':
                this.handleRemoteFold(action);
                break;
            case 'call':
                this.handleRemoteCall(action);
                break;
            case 'raise':
                this.handleRemoteRaise(action);
                break;
            case 'start_game':
                this.handleRemoteStartGame(action);
                break;
        }
    }

    // 로컬 액션들을 서버와 동기화
    async fold() {
        await this.sendAction('fold');
        // 로컬에서도 실행
        this.executeFold();
    }

    async call() {
        await this.sendAction('call');
        this.executeCall();
    }

    async raiseOne() {
        await this.sendAction('raise', { amount: 1 });
        this.executeRaise();
    }

    async startGame() {
        if (!this.isHost) {
            alert('방장만 게임을 시작할 수 있습니다.');
            return;
        }
        
        if (this.players.length < 2) {
            alert('최소 2명이 필요합니다.');
            return;
        }

        await this.sendAction('start_game');
        this.executeStartGame();
    }

    // 실제 게임 로직 실행 함수들
    executeFold() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer) {
            currentPlayer.folded = true;
            this.logAction(`${currentPlayer.name}이(가) 다이했습니다.`, 'fold');
        }
        this.nextPlayer();
    }

    executeCall() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer) {
            this.hasPlayerCalled = true;
            this.logAction(`${currentPlayer.name}이(가) 콜했습니다.`, 'bet');
        }
        this.nextPlayer();
    }

    executeRaise() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer) {
            this.totalBet += 1;
            this.hasPlayerRaised = true;
            this.lastRaiserIndex = this.currentPlayerIndex;
            this.hasPlayerCalled = false;
            this.logAction(`${currentPlayer.name}이(가) 1잔 올렸습니다. (총 베팅: ${this.totalBet}잔)`, 'bet');
        }
        this.nextPlayer();
    }

    executeStartGame() {
        this.gamePhase = 'playing';
        this.dealCards();
        document.querySelector('.setup-area').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        this.logAction('=== 게임 시작 ===', 'round');
        this.updateBettingControls();
    }

    // 게임 로직 (기존 코드와 동일)
    calculateHandValue(cards, isFolded = false) {
        if (cards.length !== 2) return { value: 0, rank: '없음', isSpecial: false };
        
        const [card1, card2] = cards;
        const months = cards.map(c => c.month).sort((a, b) => a - b);
        const gwangCount = cards.filter(c => c.isGwang).length;
        
        // 특수 족보 처리
        if (months[0] === 4 && months[1] === 7) {
            if (isFolded) {
                return { value: 1, rank: '1끗 (암행어사-죽음)', isSpecial: true, specialType: 'amhaeng' };
            }
            return { value: 10000, rank: '암행어사', isSpecial: true, specialType: 'amhaeng' };
        }
        
        if (months[0] === 3 && months[1] === 7) {
            if (isFolded) {
                return { value: 0, rank: '0끗 (땡잡이-죽음)', isSpecial: true, specialType: 'ddaeng' };
            }
            return { value: 9000, rank: '땡잡이', isSpecial: true, specialType: 'ddaeng' };
        }
        
        if (months[0] === 4 && months[1] === 9) {
            if (isFolded) {
                return { value: 3, rank: '3끗 (구사파토-죽음)', isSpecial: true, specialType: 'gusa' };
            }
            return { value: 8000, rank: '구사파토', isSpecial: true, specialType: 'gusa' };
        }
        
        // 광땡
        if (gwangCount === 2) {
            if ((months[0] === 3 && months[1] === 8)) {
                return { value: 7000, rank: '38광땡', isSpecial: false };
            }
            if ((months[0] === 1 && months[1] === 3)) {
                return { value: 6999, rank: '13광땡', isSpecial: false };
            }
            if ((months[0] === 1 && months[1] === 8)) {
                return { value: 6998, rank: '18광땡', isSpecial: false };
            }
        }
        
        // 땡 (같은 숫자)
        if (months[0] === months[1]) {
            const value = 5000 + months[0];
            return { value, rank: `${months[0]}땡`, isSpecial: false };
        }
        
        // 특별한 조합들
        if (months[0] === 1 && months[1] === 2) {
            return { value: 4000, rank: '알리', isSpecial: false };
        }
        if (months[0] === 1 && months[1] === 4) {
            return { value: 3999, rank: '독사', isSpecial: false };
        }
        if (months[0] === 1 && months[1] === 9) {
            return { value: 3998, rank: '구삥', isSpecial: false };
        }
        if (months[0] === 1 && months[1] === 10) {
            return { value: 3997, rank: '장삥', isSpecial: false };
        }
        if (months[0] === 4 && months[1] === 10) {
            return { value: 3996, rank: '장사', isSpecial: false };
        }
        if (months[0] === 4 && months[1] === 6) {
            return { value: 3995, rank: '세륙', isSpecial: false };
        }
        
        // 끗
        const sum = (months[0] + months[1]) % 10;
        return { value: sum, rank: `${sum}끗`, isSpecial: false };
    }

    dealCards() {
        this.shuffleDeck();
        let cardIndex = 0;
        
        for (let player of this.players) {
            player.cards = [];
            player.folded = false;
            player.isActive = true;
        }
        
        for (let player of this.players) {
            player.cards.push(this.deck[cardIndex++]);
            player.cards.push(this.deck[cardIndex++]);
        }
        
        this.activePlayers = this.players.filter(p => !p.folded);
        this.updateDisplay();
    }

    nextPlayer() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].folded);
    }

    updateDisplay() {
        document.getElementById('roundNumber').textContent = this.roundNumber;
        document.getElementById('currentPlayer').textContent = this.players[this.currentPlayerIndex]?.name || '-';
        document.getElementById('bettingRound').textContent = this.bettingRound;
        document.getElementById('potAmount').textContent = this.totalBet;
        
        const container = document.getElementById('playersContainer');
        container.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            
            if (index === this.currentPlayerIndex && !player.folded) {
                playerDiv.classList.add('current-turn');
            }
            
            if (player.folded) {
                playerDiv.classList.add('folded');
            }
            
            const handValue = this.calculateHandValue(player.cards, player.folded);
            const isCurrentUser = player.id === this.playerId;
            
            playerDiv.innerHTML = `
                <div class="player-name">${player.name}${isCurrentUser ? ' (나)' : ''}</div>
                <div class="player-cards">
                    ${player.cards.map(card => `
                        <div class="card ${card.isGwang ? 'gwang' : ''} ${!isCurrentUser && !this.revealingCards ? 'hidden' : ''}">
                            <div class="card-month">${card.month}</div>
                            <div class="card-type">${card.isGwang ? '광' : '월'}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="player-status">
                    <span>족보: ${isCurrentUser || this.revealingCards ? handValue.rank : '???'}</span>
                </div>
                <div class="player-status">
                    <span>상태: ${player.folded ? '다이' : '참여중'}</span>
                </div>
            `;
            
            container.appendChild(playerDiv);
        });
    }

    updateBettingControls() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const isCurrentUserTurn = currentPlayer && currentPlayer.id === this.playerId;
        const activePlayers = this.players.filter(p => !p.folded);
        const gameEnded = activePlayers.length <= 1;
        
        document.getElementById('foldBtn').disabled = !isCurrentUserTurn || gameEnded;
        
        const canCall = isCurrentUserTurn && !gameEnded && this.totalBet > 0;
        document.getElementById('callBtn').disabled = !canCall;
        
        let canRaise = false;
        const maxBet = this.baseBet + 4;
        if (isCurrentUserTurn && !gameEnded && this.totalBet < maxBet) {
            if (this.totalBet === this.baseBet) {
                canRaise = true;
            } else if (this.hasPlayerRaised && !this.hasPlayerCalled) {
                canRaise = true;
            }
        }
        
        const raiseBtn = document.getElementById('raiseBtn1');
        raiseBtn.disabled = !canRaise;
    }

    updateWaitingDisplay() {
        const waitingList = document.getElementById('waitingPlayersList');
        waitingList.innerHTML = '';
        
        this.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.id === this.playerId ? 'current-user' : ''}`;
            playerItem.textContent = `${player.name}${player.id === this.playerId ? ' (나)' : ''}`;
            waitingList.appendChild(playerItem);
        });
        
        const startBtn = document.getElementById('startGameBtn');
        startBtn.style.display = this.players.length >= 2 && this.isHost ? 'inline-block' : 'none';
    }

    logAction(message, type = '') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        const gameLogElement = document.getElementById('gameLog');
        gameLogElement.appendChild(logEntry);
        gameLogElement.scrollTop = gameLogElement.scrollHeight;
        
        this.gameLog.push({ time: new Date(), message, type });
    }

    async leaveRoom() {
        if (this.gameRef) {
            await this.gameRef.child(`players/${this.playerId}`).remove();
            this.gameRef.off();
        }
        
        this.roomCode = null;
        this.isHost = false;
        document.getElementById('currentRoom').style.display = 'none';
        document.getElementById('playerJoinSection').style.display = 'none';
        document.getElementById('roomBtn').textContent = '방 만들기/참여';
        document.getElementById('roomBtn').onclick = () => createOrJoinRoom();
    }
}

// 전역 게임 인스턴스
let game = new OnlineSeotdaGame();

// UI 함수들
function createOrJoinRoom() {
    const roomCodeInput = document.getElementById('roomCodeInput');
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    game.createOrJoinRoom(roomCode || null);
}

function joinGame() {
    const nameInput = document.getElementById('playerNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('닉네임을 입력해주세요');
        return;
    }
    
    game.joinGame(name).then(success => {
        if (success) {
            nameInput.value = '';
            nameInput.disabled = true;
            document.querySelector('button[onclick="joinGame()"]').style.display = 'none';
        }
    });
}

function startGame() {
    game.startGame();
}

function fold() {
    game.fold();
}

function call() {
    game.call();
}

function raiseOne() {
    game.raiseOne();
}

function copyRoomCode() {
    const roomCode = game.roomCode;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            alert('게임 링크가 복사되었습니다!');
        });
    } else {
        prompt('이 링크를 복사하여 친구들에게 공유하세요:', url);
    }
}

function leaveRoom() {
    game.leaveRoom();
}

// 페이지 로드 시 URL에서 방 코드 확인
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        document.getElementById('roomCodeInput').value = roomCode;
        setTimeout(() => {
            createOrJoinRoom();
        }, 1000);
    }
});