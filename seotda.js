class SeotdaGame {
    constructor() {
        this.players = [];
        this.deck = this.createDeck();
        this.currentPlayerIndex = 0;
        this.totalBet = 0;
        this.roundNumber = 1;
        this.bettingRound = 1;
        this.gamePhase = 'waiting'; // waiting, playing
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
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
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

    addPlayer(name) {
        if (this.gamePhase !== 'waiting') return false;
        if (this.players.length >= 8) return false;
        if (this.players.some(p => p.name === name)) return false;
        
        this.players.push({
            name,
            cards: [],
            folded: false,
            isActive: true,
            isCurrentPlayer: false
        });
        
        this.updateWaitingDisplay();
        return true;
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
        
        // 다음 플레이어로 이동 후 베팅 종료 조건 체크
        if (this.shouldEndBetting()) {
            this.logAction(`베팅 라운드 완료 - 결과 발표`, 'bet');
            this.endRound();
            return true; // 게임 종료됨을 알림
        }
        return false; // 게임 계속
    }

    fold() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        currentPlayer.folded = true;
        currentPlayer.isActive = false;
        
        this.logAction(`${currentPlayer.name}이(가) 다이했습니다.`, 'fold');
        
        this.activePlayers = this.players.filter(p => !p.folded);
        
        if (this.activePlayers.length <= 1) {
            // 아무도 베팅하지 않고 한 명만 남았을 경우 총 베팅을 1잔으로 설정
            if (this.totalBet === 0) {
                this.totalBet = 1;
                this.logAction(`아무도 베팅하지 않고 한 명만 남아 총 베팅을 1잔으로 설정`, 'bet');
            }
            this.endRound();
            return;
        }
        
        if (this.nextPlayer()) {
            return; // 게임이 종료되었으면 함수 종료
        }
        
        this.updateDisplay();
        this.updateBettingControls();
    }

    call() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        this.hasPlayerCalled = true;
        
        this.logAction(`${currentPlayer.name}이(가) 콜했습니다.`, 'bet');
        
        if (this.isBettingRoundComplete()) {
            this.endRound();
            return;
        }
        
        if (this.nextPlayer()) {
            return; // 게임이 종료되었으면 함수 종료
        }
        
        this.updateDisplay();
        this.updateBettingControls();
    }

    raiseOne() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        this.totalBet += 1;
        this.hasPlayerRaised = true;
        this.lastRaiserIndex = this.currentPlayerIndex; // 가장 최근에 올린 플레이어로 업데이트
        this.hasPlayerCalled = false; // 새로운 베팅이므로 콜 플래그 리셋
        
        this.logAction(`${currentPlayer.name}이(가) 1잔 올렸습니다. (총 베팅: ${this.totalBet}잔)`, 'bet');
        
        if (this.nextPlayer()) {
            return; // 게임이 종료되었으면 함수 종료
        }
        
        this.updateDisplay();
        this.updateBettingControls();
    }


    isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.folded);
        
        // 활성 플레이어가 1명 이하면 베팅 종료
        if (activePlayers.length <= 1) {
            return true;
        }
        
        // 베팅이 없었다면 아직 종료되지 않음
        if (this.totalBet === 0) {
            return false;
        }
        
        // 베팅을 시작한 플레이어로 돌아왔는지 확인
        const currentPlayer = this.players[this.currentPlayerIndex];
        const nextPlayerIndex = this.getNextActivePlayerIndex();
        
        // 다음 플레이어가 베팅을 시작한 플레이어이고, 현재 플레이어가 콜했다면 베팅 종료
        if (nextPlayerIndex === this.bettingStartPlayerIndex && this.hasPlayerCalled) {
            return true;
        }
        
        return false;
    }

    getNextActivePlayerIndex() {
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (this.players[nextIndex].folded && nextIndex !== this.currentPlayerIndex) {
            nextIndex = (nextIndex + 1) % this.players.length;
        }
        return nextIndex;
    }

    shouldEndBetting() {
        const activePlayers = this.players.filter(p => !p.folded);
        
        // 활성 플레이어가 1명 이하면 베팅 종료
        if (activePlayers.length <= 1) {
            return true;
        }
        
        // 베팅이 없었다면 아직 종료되지 않음
        if (this.totalBet === 0) {
            return false;
        }
        
        // 마지막 베터가 없으면 종료되지 않음
        if (this.lastRaiserIndex === -1) {
            return false;
        }
        
        // 디버깅 로그
        console.log(`Debug: currentPlayer=${this.currentPlayerIndex}, lastRaiser=${this.lastRaiserIndex}, hasPlayerCalled=${this.hasPlayerCalled}`);
        
        // 현재 플레이어가 마지막으로 베팅한 플레이어이고, 콜이 있었다면 종료
        if (this.currentPlayerIndex === this.lastRaiserIndex && this.hasPlayerCalled) {
            return true;
        }
        
        return false;
    }

    endRound() {
        const activePlayers = this.players.filter(p => !p.folded);
        
        // 구사파토 특수 처리 - 구사파토를 가진 플레이어가 2명 이상일 때만
        const gusaPlayers = activePlayers.filter(p => {
            const handValue = this.calculateHandValue(p.cards);
            return handValue.specialType === 'gusa';
        });
        
        if (gusaPlayers.length >= 2) {
            this.logAction(`구사파토가 ${gusaPlayers.length}명 이상이므로 베팅 유지하고 다음 판 진행`, 'round');
            this.continueWithCurrentBets();
            return;
        }
        
        // 구사파토가 1명만 있을 때는 일반적인 승부 진행
        
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            
            const foldedPlayers = this.players.filter(p => p.folded);
            if (foldedPlayers.length > 0) {
                const loser = this.findHighestHandAfterCancellation(foldedPlayers);
                if (loser === null) {
                    this.logAction(`${winner.name}이(가) 승리! 모든 족보가 상쇄되어 베팅 유지하고 다음 판 진행`, 'round');
                    this.continueWithCurrentBets();
                    return;
                } else {
                    this.lastLoserIndex = this.players.indexOf(loser);
                    this.logAction(`${winner.name}이(가) 승리! (${loser.name}이(가) 패배)`, 'round');
                }
            } else {
                this.logAction(`${winner.name}이(가) 승리!`, 'round');
            }
        } else {
            // 살아남은 플레이어들의 족보 확인
            const uniqueValues = new Set();
            activePlayers.forEach(player => {
                const handValue = this.calculateHandValue(player.cards);
                uniqueValues.add(handValue.value);
            });
            
            // 모든 플레이어가 같은 족보면 베팅 유지하고 다음 판
            if (uniqueValues.size === 1) {
                this.logAction(`모든 플레이어의 족보가 동일하므로 베팅 유지하고 다음 판 진행`, 'round');
                this.continueWithCurrentBets();
                return;
            }
            
            const winner = this.findWinner(activePlayers);
            const winnerHandValue = this.calculateHandValue(winner.cards);
            
            // 구사파토가 승리한 경우 베팅 유지하고 다음 판 진행
            if (winnerHandValue.specialType === 'gusa') {
                this.logAction(`${winner.name}이(가) 승리! (${winnerHandValue.rank}) 구사파토 승리로 베팅 유지하고 다음 판 진행`, 'round');
                this.continueWithCurrentBets();
                return;
            }
            
            const nonWinners = activePlayers.filter(p => p !== winner);
            const losers = this.findLowestHandPlayers(nonWinners, false);
            
            if (losers.length > 1) {
                this.logAction(`${winner.name}이(가) 승리! (${winnerHandValue.rank}) 꼴등이 ${losers.length}명이므로 베팅 유지하고 다음 판 진행`, 'round');
                this.continueWithCurrentBets();
                return;
            } else if (losers.length === 1) {
                this.lastLoserIndex = this.players.indexOf(losers[0]);
                this.logAction(`${winner.name}이(가) 승리! (${winnerHandValue.rank}) - ${losers[0].name}이(가) 패배`, 'round');
            } else {
                this.logAction(`${winner.name}이(가) 승리! (${winnerHandValue.rank})`, 'round');
            }
        }
        
        // 카드 공개 시작
        this.revealingCards = true;
        this.revealIndex = 0;
        this.revealCardsSequentially();
        
        this.updateDisplay();
        this.updateBettingControls();
    }

    findWinner(players) {
        let winner = players[0];
        let bestValue = this.calculateHandValue(winner.cards).value;
        
        // 특수 족보 처리
        for (let player of players) {
            const handValue = this.calculateHandValue(player.cards);
            
            // 암행어사는 광땡만 잡는다
            if (handValue.specialType === 'amhaeng') {
                const hasGwangDdaeng = players.some(p => {
                    const pHandValue = this.calculateHandValue(p.cards);
                    return pHandValue.value >= 6998 && pHandValue.value <= 7000;
                });
                if (hasGwangDdaeng) {
                    bestValue = handValue.value;
                    winner = player;
                }
            }
            
            // 땡잡이는 땡만 잡는다
            else if (handValue.specialType === 'ddaeng') {
                const hasDdaeng = players.some(p => {
                    const pHandValue = this.calculateHandValue(p.cards);
                    return pHandValue.value >= 5001 && pHandValue.value <= 5010;
                });
                if (hasDdaeng) {
                    bestValue = handValue.value;
                    winner = player;
                }
            }
            
            // 일반적인 높은 값 비교
            else if (handValue.value > bestValue) {
                bestValue = handValue.value;
                winner = player;
            }
        }
        
        return winner;
    }

    findLowestHandPlayers(players, isFolded = false) {
        if (players.length === 0) return [];
        
        let lowestValue = Infinity;
        for (let player of players) {
            const handValue = this.calculateHandValue(player.cards, isFolded).value;
            if (handValue < lowestValue) {
                lowestValue = handValue;
            }
        }
        
        return players.filter(player => {
            const handValue = this.calculateHandValue(player.cards, isFolded).value;
            return handValue === lowestValue;
        });
    }

    findHighestHandAfterCancellation(foldedPlayers) {
        if (foldedPlayers.length === 0) return null;
        
        // 각 플레이어의 족보 값을 계산 (죽은 상태로)
        const playerValues = foldedPlayers.map(player => ({
            player,
            value: this.calculateHandValue(player.cards, true).value
        }));
        
        // 값별로 그룹화
        const valueGroups = {};
        playerValues.forEach(({ player, value }) => {
            if (!valueGroups[value]) {
                valueGroups[value] = [];
            }
            valueGroups[value].push(player);
        });
        
        // 2명 이상인 값들은 상쇄 (제거)
        const remainingPlayers = [];
        Object.entries(valueGroups).forEach(([value, players]) => {
            if (players.length === 1) {
                remainingPlayers.push({ player: players[0], value: parseInt(value) });
            }
        });
        
        // 남은 플레이어가 없으면 모두 상쇄
        if (remainingPlayers.length === 0) {
            return null;
        }
        
        // 남은 플레이어 중 가장 높은 값을 가진 플레이어가 패배
        let highestValue = -1;
        let loser = null;
        
        remainingPlayers.forEach(({ player, value }) => {
            if (value > highestValue) {
                highestValue = value;
                loser = player;
            }
        });
        
        return loser;
    }

    continueWithCurrentBets() {
        this.roundNumber++;
        this.baseBet = this.totalBet; // 현재 베팅을 기본 베팅으로 설정
        
        for (let player of this.players) {
            player.folded = false;
            player.isActive = true;
        }
        
        this.dealCards();
        this.logAction(`=== 라운드 ${this.roundNumber} 시작 (베팅 유지: ${this.baseBet}잔) ===`, 'round');
        this.updateDisplay();
        this.updateBettingControls();
    }

    newRound() {
        this.roundNumber++;
        
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
        this.bettingStartPlayerIndex = 0;
        this.lastRaiserIndex = -1;
        this.baseBet = 0;
        
        for (let player of this.players) {
            player.folded = false;
            player.isActive = true;
        }
        
        this.dealCards();
        document.getElementById('newRoundBtn').style.display = 'none';
        this.logAction(`=== 라운드 ${this.roundNumber} 시작 ===`, 'round');
        this.updateBettingControls();
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
            const isCurrentPlayer = index === this.currentPlayerIndex;
            
            playerDiv.innerHTML = `
                <div class="player-name">${player.name}${isCurrentPlayer ? ' (현재 턴)' : ''}</div>
                <div class="player-cards">
                    ${player.cards.map(card => `
                        <div class="card ${card.isGwang ? 'gwang' : ''} ${this.revealingCards ? '' : ''}">
                            <div class="card-month">${card.month}</div>
                            <div class="card-type">${card.isGwang ? '광' : '월'}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="player-status">
                    <span>족보: ${handValue.rank}</span>
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
        const isCurrentPlayerTurn = currentPlayer && !currentPlayer.folded;
        const activePlayers = this.players.filter(p => !p.folded);
        const gameEnded = activePlayers.length <= 1;
        
        // 모든 플레이어가 차례대로 플레이 (로컬 멀티플레이어)
        document.getElementById('foldBtn').disabled = !isCurrentPlayerTurn || gameEnded;
        
        const canCall = isCurrentPlayerTurn && !gameEnded && this.totalBet > 0;
        document.getElementById('callBtn').disabled = !canCall;
        
        let canRaise = false;
        const maxBet = this.baseBet + 4;
        if (isCurrentPlayerTurn && !gameEnded && this.totalBet < maxBet) {
            if (this.totalBet === this.baseBet) {
                canRaise = true;
            } else if (this.hasPlayerRaised && !this.hasPlayerCalled) {
                canRaise = true;
            }
        }
        
        const raiseBtn = document.getElementById('raiseBtn1');
        raiseBtn.disabled = !canRaise;
        
        if (this.totalBet > 0) {
            document.getElementById('callBtn').textContent = `콜`;
        } else {
            document.getElementById('callBtn').textContent = '콜';
        }
    }

    updateWaitingDisplay() {
        const waitingList = document.getElementById('waitingPlayersList');
        waitingList.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                ${player.name}
                <button onclick="removePlayer(${index})" style="margin-left: 10px; padding: 2px 8px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">제거</button>
            `;
            waitingList.appendChild(playerItem);
        });
        
        const startBtn = document.getElementById('startGameBtn');
        const clearBtn = document.getElementById('clearBtn');
        startBtn.style.display = this.players.length >= 2 ? 'inline-block' : 'none';
        clearBtn.style.display = this.players.length > 0 ? 'inline-block' : 'none';
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

    revealCardsSequentially() {
        if (this.revealIndex >= this.players.length) {
            // 모든 카드 공개 완료, 3초 후 새 라운드
            setTimeout(() => {
                this.revealingCards = false;
                this.newRound();
            }, 3000);
            return;
        }
        
        // 현재 플레이어의 카드 공개 (이미 공개된 상태이므로 디스플레이만 업데이트)
        this.updateDisplay();
        
        // 1초 후 다음 플레이어
        setTimeout(() => {
            this.revealIndex++;
            this.revealCardsSequentially();
        }, 1000);
    }
}

let game = new SeotdaGame();

function addPlayer() {
    const nameInput = document.getElementById('playerNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('플레이어 이름을 입력해주세요');
        return;
    }
    
    if (game.addPlayer(name)) {
        nameInput.value = '';
    } else {
        alert('추가할 수 없습니다. (중복 이름, 최대 8명, 또는 게임 진행중)');
    }
}

function removePlayer(index) {
    if (game.gamePhase !== 'waiting') {
        alert('게임 진행 중에는 플레이어를 제거할 수 없습니다');
        return;
    }
    
    game.players.splice(index, 1);
    game.updateWaitingDisplay();
}

function clearPlayers() {
    if (game.gamePhase !== 'waiting') {
        alert('게임 진행 중에는 플레이어를 제거할 수 없습니다');
        return;
    }
    
    game.players = [];
    game.updateWaitingDisplay();
}

function startGame() {
    if (game.players.length < 2) {
        alert('최소 2명이 필요합니다');
        return;
    }
    
    game.gamePhase = 'playing';
    document.querySelector('.setup-area').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    game.dealCards();
    game.logAction('=== 게임 시작 ===', 'round');
    game.updateBettingControls();
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

function newRound() {
    game.newRound();
}