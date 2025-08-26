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
        this.callCount = 0; // 현재 베팅 라운드에서 콜한 플레이어 수
        
        // 온라인 관련
        this.roomCode = null;
        this.playerId = this.generatePlayerId();
        this.isHost = false;
        this.database = window.database;
        this.auth = window.auth;
        this.gameRef = null;
        this.currentUser = null;
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    async signInAnonymously() {
        try {
            const result = await this.auth.signInAnonymously();
            this.currentUser = result.user;
            console.log('익명 로그인 성공:', this.currentUser.uid);
            return this.currentUser;
        } catch (error) {
            console.error('익명 로그인 실패:', error);
            throw error;
        }
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
            console.log('createOrJoinRoom 메소드 시작, roomCode:', roomCode);
            
            // 익명 로그인 먼저 수행
            if (!this.currentUser) {
                console.log('익명 로그인 시도 중...');
                await this.signInAnonymously();
                console.log('익명 로그인 완료');
            }
            
            if (!roomCode) {
                roomCode = this.generateRoomCode();
                this.isHost = true;
                console.log('새 방 코드 생성:', roomCode, 'isHost:', this.isHost);
            } else {
                console.log('기존 방 참여 시도, 방 코드:', roomCode);
            }
            
            this.roomCode = roomCode;
            this.gameRef = this.database.ref(`games/${roomCode}`);
            console.log('Firebase 레퍼런스 생성:', `games/${roomCode}`);
            
            // 방이 존재하는지 확인
            console.log('방 존재 여부 확인 중...');
            const snapshot = await this.gameRef.once('value');
            console.log('방 존재 여부:', snapshot.exists(), 'isHost:', this.isHost);
            
            if (!snapshot.exists() && !this.isHost) {
                throw new Error('존재하지 않는 방입니다.');
            }
            
            if (this.isHost) {
                console.log('새 방 생성 중...');
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
                console.log('새 방 생성 완료');
            }
            
            // 실시간 리스너 설정
            console.log('실시간 리스너 설정 중...');
            this.setupRealtimeListeners();
            
            // UI 업데이트
            console.log('UI 업데이트 중...');
            document.getElementById('currentRoom').style.display = 'block';
            document.getElementById('roomCode').textContent = roomCode;
            document.getElementById('playerJoinSection').style.display = 'block';
            document.getElementById('roomBtn').textContent = '방 나가기';
            document.getElementById('roomBtn').onclick = () => this.leaveRoom();
            
            console.log('createOrJoinRoom 성공');
            return true;
        } catch (error) {
            console.error('createOrJoinRoom 에러:', error);
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
        console.log('📥 서버에서 게임 상태 업데이트 받음:', gameState);
        console.log('현재 내 상태 - isHost:', this.isHost, 'playerId:', this.playerId);
        
        const oldPlayerIndex = this.currentPlayerIndex;
        
        this.gamePhase = gameState.phase;
        this.currentPlayerIndex = gameState.currentPlayerIndex ?? 0;
        this.totalBet = gameState.totalBet ?? 0;
        this.roundNumber = gameState.roundNumber ?? 1;
        this.bettingRound = gameState.bettingRound ?? 1;
        this.hasPlayerCalled = gameState.hasPlayerCalled ?? false;
        this.hasPlayerRaised = gameState.hasPlayerRaised ?? false;
        this.lastRaiserIndex = gameState.lastRaiserIndex ?? -1; // ?? 사용으로 0 값도 보존
        this.callCount = gameState.callCount ?? 0;
        this.revealingCards = gameState.revealingCards ?? false;
        
        console.log(`턴 변경: ${oldPlayerIndex} → ${this.currentPlayerIndex}`);
        console.log(`lastRaiserIndex 설정: ${gameState.lastRaiserIndex} → ${this.lastRaiserIndex}`);
        
        // 플레이어 상태 업데이트 (방장이 아닌 경우만)
        if (!this.isHost && gameState.players) {
            console.log('방장이 아니므로 플레이어 상태 동기화');
            gameState.players.forEach((serverPlayer, index) => {
                if (this.players[index]) {
                    this.players[index].folded = serverPlayer.folded || false;
                    if (serverPlayer.cards && serverPlayer.cards.length > 0) {
                        this.players[index].cards = serverPlayer.cards;
                    }
                }
            });
        } else if (this.isHost) {
            console.log('방장이므로 플레이어 상태 동기화 건너뜀');
        }
        
        if (gameState.phase === 'playing') {
            document.querySelector('.setup-area').style.display = 'none';
            document.getElementById('gameArea').style.display = 'block';
        } else if (gameState.phase === 'ended') {
            console.log('게임 종료 상태 감지, 새 라운드 버튼 표시');
            this.showNewRoundButton();
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

    // 원격 액션 처리 함수들
    handleRemoteStartGame(action) {
        console.log('원격 게임 시작 액션 받음:', action);
        this.executeStartGame();
    }

    handleRemoteFold(action) {
        console.log('원격 다이 액션 받음:', action);
        // 액션을 보낸 플레이어의 인덱스 찾기
        const playerIndex = this.players.findIndex(p => p.id === action.playerId);
        if (playerIndex !== -1) {
            console.log(`다이 액션 플레이어: ${action.playerId} (인덱스: ${playerIndex})`);
            this.executeFoldForPlayer(playerIndex);
        } else {
            console.log('다이 액션 플레이어를 찾을 수 없음');
        }
    }

    handleRemoteCall(action) {
        console.log('원격 콜 액션 받음:', action);
        // 액션을 보낸 플레이어의 인덱스 찾기
        const playerIndex = this.players.findIndex(p => p.id === action.playerId);
        if (playerIndex !== -1) {
            console.log(`콜 액션 플레이어: ${action.playerId} (인덱스: ${playerIndex})`);
            this.executeCallForPlayer(playerIndex);
        } else {
            console.log('콜 액션 플레이어를 찾을 수 없음');
        }
    }

    handleRemoteRaise(action) {
        console.log('원격 레이즈 액션 받음:', action);
        // 액션을 보낸 플레이어의 인덱스 찾기
        const playerIndex = this.players.findIndex(p => p.id === action.playerId);
        if (playerIndex !== -1) {
            console.log(`레이즈 액션 플레이어: ${action.playerId} (인덱스: ${playerIndex})`);
            this.executeRaiseForPlayer(playerIndex);
        } else {
            console.log('레이즈 액션 플레이어를 찾을 수 없음');
        }
    }

    // 로컬 액션들을 서버와 동기화
    async fold() {
        console.log('fold() 호출됨, playerId:', this.playerId);
        await this.sendAction('fold');
        // 로컬에서도 실행
        this.executeFold();
    }

    async call() {
        console.log('call() 호출됨, playerId:', this.playerId);
        await this.sendAction('call');
        this.executeCall();
    }

    async raiseOne() {
        console.log('raiseOne() 호출됨, playerId:', this.playerId);
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
        this.executeFoldForPlayer(this.currentPlayerIndex);
    }

    executeFoldForPlayer(playerIndex) {
        console.log('executeFoldForPlayer() 실행, playerIndex:', playerIndex, 'isHost:', this.isHost);
        const player = this.players[playerIndex];
        if (player) {
            player.folded = true;
            this.logAction(`${player.name}이(가) 다이했습니다.`, 'fold');
        }
        
        // 방장만 턴 진행 및 게임 상태 업데이트
        if (this.isHost) {
            console.log('방장이 다이 후 턴 진행 중... 현재 턴:', this.currentPlayerIndex);
            
            // 게임 종료 조건 확인
            if (this.isBettingRoundComplete()) {
                console.log('베팅 라운드 완료, 라운드 종료');
                this.endRound();
            } else if (this.nextPlayer()) {
                console.log('게임이 종료됨');
                return;
            } else {
                console.log('다이 후 다음 턴으로 이동됨:', this.currentPlayerIndex);
            }
            
            this.updateGameStateOnServer();
        } else {
            console.log('방장이 아니므로 다이 후 턴 진행 안함');
        }
        this.updateBettingControls();
    }

    executeCall() {
        this.executeCallForPlayer(this.currentPlayerIndex);
    }

    executeCallForPlayer(playerIndex) {
        console.log('executeCallForPlayer() 실행, playerIndex:', playerIndex, 'isHost:', this.isHost);
        const player = this.players[playerIndex];
        if (player) {
            this.hasPlayerCalled = true;
            this.callCount++;
            console.log(`콜 카운트 증가: ${this.callCount} (${player.name})`);
            this.logAction(`${player.name}이(가) 콜했습니다.`, 'bet');
        }
        
        // 방장만 턴 진행 및 게임 상태 업데이트
        if (this.isHost) {
            console.log('방장이 콜 후 턴 진행 중... 현재 턴:', this.currentPlayerIndex);
            
            // 게임 종료 조건 확인
            if (this.isBettingRoundComplete()) {
                console.log('베팅 라운드 완료, 라운드 종료');
                this.endRound();
            } else if (this.nextPlayer()) {
                console.log('게임이 종료됨');
                return;
            } else {
                console.log('콜 후 다음 턴으로 이동됨:', this.currentPlayerIndex);
            }
            
            this.updateGameStateOnServer();
        } else {
            console.log('방장이 아니므로 콜 후 턴 진행 안함');
        }
        this.updateBettingControls();
    }

    executeRaise() {
        this.executeRaiseForPlayer(this.currentPlayerIndex);
    }

    executeRaiseForPlayer(playerIndex) {
        console.log('executeRaiseForPlayer() 실행, playerIndex:', playerIndex, 'isHost:', this.isHost);
        const player = this.players[playerIndex];
        if (player) {
            this.totalBet += 1;
            this.hasPlayerRaised = true;
            this.lastRaiserIndex = playerIndex; // 올바른 플레이어 인덱스 설정
            this.hasPlayerCalled = false;
            this.callCount = 0; // 레이즈 후 콜 카운트 리셋
            console.log(`레이즈: ${player.name} (인덱스: ${playerIndex}), 콜 카운트 리셋`);
            this.logAction(`${player.name}이(가) 1잔 올렸습니다. (총 베팅: ${this.totalBet}잔)`, 'bet');
        }
        
        // 방장만 턴 진행 및 게임 상태 업데이트
        if (this.isHost) {
            console.log('방장이 레이즈 후 턴 진행 중... 현재 턴:', this.currentPlayerIndex);
            
            // 레이즈 후에는 바로 다음 플레이어로
            if (this.nextPlayer()) {
                console.log('게임이 종료됨');
                return;
            } else {
                console.log('레이즈 후 다음 턴으로 이동됨:', this.currentPlayerIndex);
            }
            
            this.updateGameStateOnServer();
        } else {
            console.log('방장이 아니므로 레이즈 후 턴 진행 안함');
        }
        this.updateBettingControls();
    }

    executeStartGame() {
        console.log('게임 시작 실행 중...');
        this.gamePhase = 'playing';
        this.dealCards();
        document.querySelector('.setup-area').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        this.logAction('=== 게임 시작 ===', 'round');
        this.updateBettingControls();
        
        // 방장인 경우 게임 상태를 Firebase에 업데이트
        if (this.isHost) {
            this.updateGameStateOnServer();
        }
    }

    async updateGameStateOnServer() {
        if (!this.gameRef) {
            console.log('gameRef가 없어서 서버 업데이트 건너뜀');
            return;
        }
        if (!this.isHost) {
            console.log('방장이 아니므로 서버 업데이트 건너뜀');
            return;
        }
        
        const gameState = {
            phase: this.gamePhase,
            currentPlayerIndex: this.currentPlayerIndex,
            totalBet: this.totalBet,
            roundNumber: this.roundNumber,
            bettingRound: this.bettingRound,
            hasPlayerCalled: this.hasPlayerCalled,
            hasPlayerRaised: this.hasPlayerRaised,
            lastRaiserIndex: this.lastRaiserIndex,
            callCount: this.callCount,
            gameEnded: this.gamePhase === 'ended' || false,
            revealingCards: this.revealingCards || false,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                folded: p.folded || false,
                cards: p.cards || []
            })),
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };
        
        console.log('📤 게임 상태 서버 업데이트 시작:', gameState);
        try {
            await this.gameRef.child('gameState').update(gameState);
            console.log('✅ 게임 상태 서버 업데이트 완료');
        } catch (error) {
            console.error('❌ 게임 상태 서버 업데이트 실패:', error);
        }
    }

    // 게임 종료 및 베팅 로직
    isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.folded);
        console.log('베팅 라운드 완료 체크:', {
            activePlayers: activePlayers.length,
            totalBet: this.totalBet,
            callCount: this.callCount,
            lastRaiserIndex: this.lastRaiserIndex,
            currentPlayerIndex: this.currentPlayerIndex
        });
        
        // 활성 플레이어가 1명 이하면 베팅 종료
        if (activePlayers.length <= 1) {
            console.log('활성 플레이어가 1명 이하로 베팅 종료');
            return true;
        }
        
        // 베팅이 있고, 레이즈가 없었을 때: 모든 활성 플레이어가 콜했으면 종료
        if (this.totalBet > 0 && this.lastRaiserIndex === -1) {
            if (this.callCount >= activePlayers.length) {
                console.log(`모든 플레이어가 콜함 (콜: ${this.callCount}, 활성: ${activePlayers.length})`);
                return true;
            }
        }
        
        // 레이즈가 있었을 때: 레이저를 제외한 모든 플레이어가 콜했으면 종료
        if (this.totalBet > 0 && this.lastRaiserIndex !== -1) {
            const needCallCount = activePlayers.length - 1; // 레이저 제외
            if (this.callCount >= needCallCount) {
                console.log(`레이저 제외 모든 플레이어가 콜함 (콜: ${this.callCount}, 필요: ${needCallCount})`);
                return true;
            }
        }
        
        return false;
    }

    getNextActivePlayerIndex() {
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (this.players[nextIndex] && this.players[nextIndex].folded && nextIndex !== this.currentPlayerIndex) {
            nextIndex = (nextIndex + 1) % this.players.length;
        }
        return nextIndex;
    }

    nextPlayer() {
        const activePlayers = this.players.filter(p => !p.folded);
        
        if (activePlayers.length <= 1) {
            console.log('활성 플레이어가 1명 이하, 게임 종료');
            this.endRound();
            return true; // 게임 종료됨
        }
        
        // 다음 플레이어로 이동
        this.currentPlayerIndex = this.getNextActivePlayerIndex();
        console.log('다음 플레이어로 이동:', this.currentPlayerIndex);
        
        // 한 바퀴 돌아서 베팅을 시작한 플레이어에게 돌아왔는지 확인
        if (this.isBettingRoundComplete()) {
            console.log('nextPlayer에서 베팅 라운드 완료 감지, 게임 종료');
            this.endRound();
            return true; // 게임 종료됨
        }
        
        return false; // 게임 계속
    }

    endRound() {
        console.log('라운드 종료 시작');
        const activePlayers = this.players.filter(p => !p.folded);
        
        // 게임 상태를 'ended'로 설정
        this.gamePhase = 'ended';
        
        // 모든 경우에 족보 비교를 통해 패배자 선정
        this.compareHands(this.players.filter(p => true)); // 모든 플레이어 대상
        
        this.showNewRoundButton();
        
        // 방장인 경우 게임 종료 상태를 서버에 업데이트
        if (this.isHost) {
            this.updateGameStateOnServer();
        }
    }

    compareHands(players) {
        // 모든 플레이어의 패 공개
        this.revealingCards = true;
        
        console.log('=== 섯다 승부 판정 시작 ===');
        
        // 각 플레이어의 족보 계산
        const playerHands = players.map(player => {
            const handValue = this.calculateHandValue(player.cards, player.folded);
            console.log(`${player.name}: ${handValue.rank} (값: ${handValue.value}) - ${player.folded ? '다이' : '살아있음'}`);
            return {
                player,
                handValue,
                folded: player.folded
            };
        });
        
        // 살아있는 플레이어와 죽은 플레이어 분리
        const alivePlayers = playerHands.filter(p => !p.folded);
        const deadPlayers = playerHands.filter(p => p.folded);
        
        let loser;
        
        if (alivePlayers.length === 1) {
            // 한 명만 살아있는 경우: 죽은 플레이어 중 최고 족보가 패배
            console.log('한 명만 살아있음, 죽은 플레이어 중 최고 족보 찾기');
            loser = this.findLoserAmongDead(deadPlayers);
        } else if (alivePlayers.length === 0) {
            // 모두 죽은 경우: 죽은 플레이어 중 최고 족보가 패배
            console.log('모두 죽음, 죽은 플레이어 중 최고 족보가 패배');
            loser = this.findLoserAmongDead(deadPlayers);
        } else {
            // 여러 명 살아있는 경우: 살아있는 플레이어 중 최저 족보가 패배
            console.log('여러 명 살아있음, 최저 족보 찾기');
            loser = alivePlayers.reduce((worst, current) => 
                current.handValue.value < worst.handValue.value ? current : worst
            );
        }
        
        // 패배자 기록 (다음 라운드 시작 순서용)
        this.lastLoserIndex = this.players.findIndex(p => p.id === loser.player.id);
        
        console.log(`최종 패배자: ${loser.player.name} (${loser.handValue.rank})`);
        this.logAction(`족보 비교 결과: ${loser.player.name}이(가) 패배! (${loser.handValue.rank})`, 'round');
        
        // 게임 상태를 서버에 동기화 (카드 공개 상태 포함)
        this.updateGameStateOnServer();
        
        // 결과 표시를 위해 화면 업데이트
        this.updateDisplay();
    }
    
    findLoserAmongDead(deadPlayers) {
        // 죽은 플레이어 중 가장 높은 족보가 패배
        return deadPlayers.reduce((highest, current) => 
            current.handValue.value > highest.handValue.value ? current : highest
        );
    }

    showNewRoundButton() {
        const newRoundBtn = document.getElementById('newRoundBtn');
        if (newRoundBtn) {
            // 모든 플레이어가 새 라운드 버튼을 볼 수 있지만, 방장만 클릭 가능
            newRoundBtn.style.display = 'block';
            if (!this.isHost) {
                newRoundBtn.disabled = true;
                newRoundBtn.textContent = '새 라운드 (방장 대기 중)';
            } else {
                newRoundBtn.disabled = false;
                newRoundBtn.textContent = '새 라운드';
            }
        }
    }

    newRound() {
        if (!this.isHost) {
            alert('방장만 새 라운드를 시작할 수 있습니다.');
            return;
        }

        console.log('새 라운드 시작');
        this.roundNumber++;
        this.gamePhase = 'playing'; // 게임 상태를 다시 playing으로 설정
        
        // 패배자가 있으면 패배자부터 시작, 없으면 기본 순서
        if (this.lastLoserIndex !== -1) {
            this.currentPlayerIndex = this.lastLoserIndex;
        } else {
            this.currentPlayerIndex = 0;
        }
        
        this.totalBet = 0;
        this.bettingRound = 1;
        this.hasPlayerCalled = false;
        this.hasPlayerRaised = false;
        this.lastRaiserIndex = -1;
        this.callCount = 0;
        this.revealingCards = false;
        
        for (let player of this.players) {
            player.folded = false;
        }
        
        this.dealCards();
        document.getElementById('newRoundBtn').style.display = 'none';
        this.logAction(`=== 라운드 ${this.roundNumber} 시작 ===`, 'round');
        
        // 게임 상태를 서버에 업데이트
        this.updateGameStateOnServer();
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
        
        console.log('턴 제어 디버깅:', {
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayer: currentPlayer,
            myPlayerId: this.playerId,
            isCurrentUserTurn: isCurrentUserTurn,
            allPlayers: this.players.map(p => ({id: p.id, name: p.name}))
        });
        
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
        
        // 버튼 상태 로그
        console.log('버튼 상태:', {
            foldDisabled: !isCurrentUserTurn || gameEnded,
            callDisabled: !canCall,
            raiseDisabled: !canRaise
        });
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
        // 승리 메시지 추적을 위한 로그
        if (message.includes('승리')) {
            console.error('🚨 승리 메시지 감지! 호출 스택:', new Error().stack);
        }
        
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

console.log('seotda-online.js 로드됨, 게임 인스턴스 생성됨');

// UI 함수들
console.log('UI 함수들 정의 시작');

window.createOrJoinRoom = async function() {
    console.log('createOrJoinRoom 함수 호출됨');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    console.log('입력된 방 코드:', roomCode);
    
    try {
        console.log('게임 방 생성/참여 시도 중...');
        const result = await game.createOrJoinRoom(roomCode || null);
        console.log('방 생성/참여 결과:', result);
    } catch (error) {
        console.error('방 생성/참여 중 오류:', error);
        alert('방 생성/참여 실패: ' + error.message);
    }
}

console.log('createOrJoinRoom 함수 정의됨');

window.joinGame = function() {
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

window.startGame = function() {
    game.startGame();
}

window.fold = function() {
    game.fold();
}

window.call = function() {
    game.call();
}

window.raiseOne = function() {
    game.raiseOne();
}

window.copyRoomCode = function() {
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

window.leaveRoom = function() {
    game.leaveRoom();
}

window.newRound = function() {
    game.newRound();
}

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    console.log('페이지 로드됨, 함수 등록 중...');
    
    // 버튼 이벤트 직접 등록
    const roomBtn = document.getElementById('roomBtn');
    if (roomBtn) {
        roomBtn.onclick = async function() {
            console.log('버튼 클릭됨 (직접 등록)');
            await window.createOrJoinRoom();
        };
        console.log('방 만들기 버튼 이벤트 등록됨');
    }
    
    // URL에서 방 코드 확인
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        document.getElementById('roomCodeInput').value = roomCode;
        setTimeout(async () => {
            await window.createOrJoinRoom();
        }, 1000);
    }
});