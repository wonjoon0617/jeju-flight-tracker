class FlightTracker {
    constructor() {
        this.flights = [];
        this.filteredFlights = [];
        this.isSearching = false;
        this.viewMode = 'normal'; // 'normal' or 'timeSlots'
        this.timeSlots = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDates();
    }

    setupEventListeners() {
        document.getElementById('searchBtn').addEventListener('click', () => this.searchFlights());
        document.getElementById('filterBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('toggleViewBtn').addEventListener('click', () => this.toggleView());
        document.getElementById('updateTimeViewBtn').addEventListener('click', () => this.updateTimeView());
        
        // Time range selector
        document.getElementById('timeRange').addEventListener('change', (e) => {
            const customFields = ['startTimeDiv', 'endTimeDiv'];
            customFields.forEach(id => {
                document.getElementById(id).style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
            
            if (e.target.value !== 'custom' && this.viewMode === 'timeSlots') {
                this.updateTimeView();
            }
        });
        
        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isSearching) {
                this.searchFlights();
            }
        });

        // Real-time filtering
        ['maxPrice', 'minPrice', 'airline'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                if (this.flights.length > 0) {
                    if (this.viewMode === 'normal') {
                        this.applyFilters();
                    } else {
                        this.updateTimeView();
                    }
                }
            });
        });
    }

    setDefaultDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const departDate = today.toISOString().split('T')[0];
        const returnDate = tomorrow.toISOString().split('T')[0];
        
        document.getElementById('departDate').value = departDate;
        document.getElementById('returnDate').value = returnDate;
    }

    async searchFlights() {
        if (this.isSearching) return;

        const departure = document.getElementById('departure').value;
        const destination = document.getElementById('destination').value;
        const departDate = document.getElementById('departDate').value;
        const returnDate = document.getElementById('returnDate').value;

        if (!departure || !destination || !departDate) {
            this.showStatus('출발지, 목적지, 출발일을 모두 입력해주세요.', 'error');
            return;
        }

        if (departure === destination) {
            this.showStatus('출발지와 목적지가 같을 수 없습니다.', 'error');
            return;
        }

        this.isSearching = true;
        this.updateSearchButton(true);
        this.showStatus('<div class="loading"></div> 항공편을 검색중입니다...');

        try {
            // 실제 API 대신 시뮬레이션된 데이터 사용
            await this.simulateFlightSearch(departure, destination, departDate, returnDate);
        } catch (error) {
            this.showStatus('검색 중 오류가 발생했습니다: ' + error.message, 'error');
        } finally {
            this.isSearching = false;
            this.updateSearchButton(false);
        }
    }

    async simulateFlightSearch(departure, destination, departDate, returnDate) {
        // 실제 환경에서는 여기에 항공사 API 호출 또는 웹 스크래핑 로직이 들어갑니다
        await new Promise(resolve => setTimeout(resolve, 2000)); // 검색 시뮬레이션

        // 가상의 항공편 데이터 생성
        this.flights = this.generateMockFlights(departure, destination, departDate, returnDate);
        
        if (this.flights.length === 0) {
            this.showStatus('검색 결과가 없습니다. 다른 날짜를 시도해보세요.');
            return;
        }

        this.applyFilters();
        this.showStatus(`총 ${this.flights.length}개의 항공편을 찾았습니다.`);
        
        // 시간별 데이터 생성
        this.generateTimeSlots();
    }

    generateMockFlights(departure, destination, departDate, returnDate) {
        const airlines = [
            { code: 'KE', name: '대한항공', logo: '🛩️' },
            { code: 'OZ', name: '아시아나항공', logo: '✈️' },
            { code: '7C', name: '제주항공', logo: '🌺' },
            { code: 'ZE', name: '이스타항공', logo: '⭐' },
            { code: 'TW', name: '티웨이항공', logo: '🌟' },
            { code: 'LJ', name: '진에어', logo: '💎' },
            { code: 'BX', name: '에어부산', logo: '🌊' }
        ];

        const flights = [];
        const flightCount = Math.floor(Math.random() * 15) + 10; // 10-25개 항공편

        for (let i = 0; i < flightCount; i++) {
            const airline = airlines[Math.floor(Math.random() * airlines.length)];
            const isLowCost = ['7C', 'ZE', 'TW', 'LJ', 'BX'].includes(airline.code);
            
            // 가격 범위 설정 (저비용항공사는 더 저렴)
            const basePrice = isLowCost ? 
                Math.floor(Math.random() * 80000) + 40000 : // 4만-12만
                Math.floor(Math.random() * 120000) + 80000; // 8만-20만

            // 시간대별 가격 변동
            const hour = Math.floor(Math.random() * 18) + 6; // 6시-24시
            const priceMultiplier = hour >= 9 && hour <= 18 ? 1.1 : 0.9; // 낮 시간대 더 비쌈
            
            const finalPrice = Math.floor(basePrice * priceMultiplier);

            const flight = {
                id: `${airline.code}${String(Math.floor(Math.random() * 9000) + 1000)}`,
                airline: airline.name,
                airlineCode: airline.code,
                logo: airline.logo,
                departure: departure,
                destination: destination,
                departDate: departDate,
                returnDate: returnDate,
                departTime: `${String(hour).padStart(2, '0')}:${String(Math.floor(Math.random() * 6) * 10).padStart(2, '0')}`,
                arrivalTime: `${String((hour + Math.floor(Math.random() * 3) + 1) % 24).padStart(2, '0')}:${String(Math.floor(Math.random() * 6) * 10).padStart(2, '0')}`,
                duration: `${Math.floor(Math.random() * 2) + 1}시간 ${Math.floor(Math.random() * 6) * 10}분`,
                price: finalPrice,
                stops: Math.random() > 0.7 ? '경유' : '직항',
                seats: Math.floor(Math.random() * 20) + 1,
                aircraft: ['B737', 'A320', 'B777', 'A321'][Math.floor(Math.random() * 4)],
                bookingUrl: `https://example.com/book/${airline.code}/${Math.random().toString(36).substr(2, 9)}`
            };

            flights.push(flight);
        }

        // 가격순 정렬
        return flights.sort((a, b) => a.price - b.price);
    }

    applyFilters() {
        const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;
        const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
        const selectedAirline = document.getElementById('airline').value;

        this.filteredFlights = this.flights.filter(flight => {
            const priceFilter = flight.price >= minPrice && flight.price <= maxPrice;
            const airlineFilter = !selectedAirline || flight.airlineCode === selectedAirline;
            
            return priceFilter && airlineFilter;
        });

        this.displayFlights();
        
        if (this.filteredFlights.length !== this.flights.length) {
            this.showStatus(`필터 적용: ${this.filteredFlights.length}개 항공편 표시 (전체 ${this.flights.length}개 중)`);
        }
    }

    displayFlights() {
        const flightList = document.getElementById('flightList');
        
        if (this.filteredFlights.length === 0) {
            flightList.innerHTML = '<div class="status">조건에 맞는 항공편이 없습니다.</div>';
            return;
        }

        const flightsHTML = this.filteredFlights.map(flight => {
            const priceFormatted = flight.price.toLocaleString('ko-KR');
            const isAffordable = flight.price <= 100000;
            
            return `
                <div class="flight-card ${isAffordable ? 'affordable' : ''}">
                    <div class="flight-header">
                        <div class="airline">
                            ${flight.logo} ${flight.airline}
                            <span style="font-size: 12px; color: #666; margin-left: 10px;">
                                ${flight.id} | ${flight.aircraft}
                            </span>
                        </div>
                        <div class="price">₩${priceFormatted}</div>
                    </div>
                    
                    <div class="flight-info">
                        <div class="info-item">
                            <div class="info-label">출발</div>
                            <div class="info-value">${flight.departTime}</div>
                            <div style="font-size: 12px; color: #666;">${this.getAirportName(flight.departure)}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">소요시간</div>
                            <div class="info-value">${flight.duration}</div>
                            <div style="font-size: 12px; color: #666;">${flight.stops}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">도착</div>
                            <div class="info-value">${flight.arrivalTime}</div>
                            <div style="font-size: 12px; color: #666;">${this.getAirportName(flight.destination)}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">잔여석</div>
                            <div class="info-value">${flight.seats}석</div>
                            <div style="font-size: 12px; color: ${flight.seats < 5 ? '#e74c3c' : '#27ae60'};">
                                ${flight.seats < 5 ? '마감임박' : '예약가능'}
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">예약</div>
                            <button class="btn" style="font-size: 12px; padding: 8px 15px;" 
                                    onclick="window.open('${flight.bookingUrl}', '_blank')">
                                예약하기
                            </button>
                        </div>
                    </div>
                    
                    ${isAffordable ? '<div class="alert">💰 합리적인 가격의 항공편입니다!</div>' : ''}
                </div>
            `;
        }).join('');

        flightList.innerHTML = flightsHTML;
    }

    toggleView() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        const timeControls = document.getElementById('timeControls');
        const priceChart = document.getElementById('priceChart');
        
        if (this.viewMode === 'normal') {
            this.viewMode = 'timeSlots';
            toggleBtn.textContent = '일반 보기';
            toggleBtn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
            timeControls.style.display = 'block';
            priceChart.style.display = 'block';
            this.updateTimeView();
        } else {
            this.viewMode = 'normal';
            toggleBtn.textContent = '시간별 최저가 보기';
            toggleBtn.style.background = 'linear-gradient(45deg, #ff6b6b, #ffa726)';
            timeControls.style.display = 'none';
            priceChart.style.display = 'none';
            this.displayFlights();
        }
    }

    generateTimeSlots() {
        const timeSlotMap = new Map();
        
        // 1시간 간격으로 시간대 생성 (6시부터 23시까지)
        for (let hour = 6; hour <= 23; hour++) {
            const timeKey = `${String(hour).padStart(2, '0')}:00`;
            timeSlotMap.set(timeKey, {
                timeRange: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
                startHour: hour,
                endHour: hour + 1,
                flights: [],
                minPrice: Infinity,
                cheapestFlight: null
            });
        }

        // 항공편을 시간대별로 분류
        this.flights.forEach(flight => {
            const departHour = parseInt(flight.departTime.split(':')[0]);
            
            for (let [timeKey, slot] of timeSlotMap) {
                if (departHour >= slot.startHour && departHour < slot.endHour) {
                    slot.flights.push(flight);
                    if (flight.price < slot.minPrice) {
                        slot.minPrice = flight.price;
                        slot.cheapestFlight = flight;
                    }
                    break;
                }
            }
        });

        // 빈 시간대 제거
        this.timeSlots = Array.from(timeSlotMap.values()).filter(slot => slot.flights.length > 0);
        
        // 최저가 순으로 정렬
        this.timeSlots.sort((a, b) => a.minPrice - b.minPrice);
    }

    updateTimeView() {
        const timeRange = document.getElementById('timeRange').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        let filteredSlots = this.timeSlots;
        
        // 시간대 필터링
        if (timeRange !== 'all') {
            let startHour, endHour;
            
            switch (timeRange) {
                case 'morning':
                    startHour = 6;
                    endHour = 12;
                    break;
                case 'afternoon':
                    startHour = 12;
                    endHour = 18;
                    break;
                case 'evening':
                    startHour = 18;
                    endHour = 24;
                    break;
                case 'custom':
                    startHour = parseInt(startTime.split(':')[0]);
                    endHour = parseInt(endTime.split(':')[0]);
                    break;
            }
            
            filteredSlots = this.timeSlots.filter(slot => 
                slot.startHour >= startHour && slot.startHour < endHour
            );
        }

        // 가격 필터 적용
        const maxPrice = parseInt(document.getElementById('maxPrice').value) || Infinity;
        const minPrice = parseInt(document.getElementById('minPrice').value) || 0;
        const selectedAirline = document.getElementById('airline').value;

        filteredSlots = filteredSlots.filter(slot => {
            const priceFilter = slot.minPrice >= minPrice && slot.minPrice <= maxPrice;
            const airlineFilter = !selectedAirline || slot.cheapestFlight.airlineCode === selectedAirline;
            return priceFilter && airlineFilter;
        });

        this.displayTimeSlots(filteredSlots);
        this.displayPriceChart(filteredSlots);
    }

    displayTimeSlots(slots) {
        const flightList = document.getElementById('flightList');
        
        if (slots.length === 0) {
            flightList.innerHTML = '<div class="status">조건에 맞는 시간대가 없습니다.</div>';
            return;
        }

        // 전체 최저가 찾기
        const globalMinPrice = Math.min(...slots.map(slot => slot.minPrice));
        
        const slotsHTML = slots.map(slot => {
            const isBestPrice = slot.minPrice === globalMinPrice;
            const flight = slot.cheapestFlight;
            const priceFormatted = slot.minPrice.toLocaleString('ko-KR');
            
            // 가격 트렌드 계산 (간단한 시뮬레이션)
            const trendValue = Math.random();
            let trendIcon, trendClass;
            if (trendValue < 0.3) {
                trendIcon = '📈';
                trendClass = 'trend-up';
            } else if (trendValue < 0.6) {
                trendIcon = '📉';
                trendClass = 'trend-down';
            } else {
                trendIcon = '➡️';
                trendClass = 'trend-stable';
            }
            
            return `
                <div class="time-slot ${isBestPrice ? 'best-price' : ''}" onclick="window.flightTracker.showTimeSlotDetails('${slot.timeRange}')">
                    <div class="price-trend ${trendClass}">${trendIcon}</div>
                    
                    <div class="time-slot-header">
                        <div>
                            <div class="time-range">⏰ ${slot.timeRange}</div>
                            <div class="flight-count">${slot.flights.length}개 항공편</div>
                        </div>
                        <div class="min-price">₩${priceFormatted}</div>
                    </div>
                    
                    <div class="flight-info" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="info-item">
                            <div class="info-label">최저가 항공사</div>
                            <div class="info-value">${flight.logo} ${flight.airline}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">출발시간</div>
                            <div class="info-value">${flight.departTime}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">소요시간</div>
                            <div class="info-value">${flight.duration}</div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-label">예약</div>
                            <button class="btn" style="font-size: 12px; padding: 8px 15px;" 
                                    onclick="event.stopPropagation(); window.open('${flight.bookingUrl}', '_blank')">
                                예약하기
                            </button>
                        </div>
                    </div>
                    
                    ${isBestPrice ? '<div class="alert">🏆 이 시간대의 최저가입니다!</div>' : ''}
                </div>
            `;
        }).join('');

        flightList.innerHTML = slotsHTML;
        
        const statusMsg = slots.length === this.timeSlots.length ? 
            `시간대별 최저가 ${slots.length}개 표시` : 
            `필터 적용: ${slots.length}개 시간대 표시 (전체 ${this.timeSlots.length}개 중)`;
        this.showStatus(statusMsg);
    }

    displayPriceChart(slots) {
        const chartContainer = document.getElementById('chartContainer');
        
        if (slots.length === 0) {
            chartContainer.innerHTML = '<div style="text-align: center; color: #666; line-height: 260px;">표시할 데이터가 없습니다.</div>';
            return;
        }

        const maxPrice = Math.max(...slots.map(slot => slot.minPrice));
        const minPrice = Math.min(...slots.map(slot => slot.minPrice));
        const priceRange = maxPrice - minPrice || 1;
        
        const barsHTML = slots.map((slot, index) => {
            const height = Math.max(5, ((slot.minPrice - minPrice) / priceRange) * 250 + 20);
            const left = (index * 100 / slots.length) + '%';
            const width = (80 / slots.length) + '%';
            
            return `
                <div class="chart-bar" 
                     style="left: ${left}; width: ${width}; height: ${height}px;"
                     title="${slot.timeRange}: ₩${slot.minPrice.toLocaleString()}">
                    <div class="chart-time">${slot.timeRange.split(' - ')[0]}</div>
                    <div class="chart-price">₩${(slot.minPrice / 1000).toFixed(0)}k</div>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = `
            <div style="position: relative; height: 100%; padding: 30px 0;">
                ${barsHTML}
            </div>
        `;
    }

    showTimeSlotDetails(timeRange) {
        const slot = this.timeSlots.find(s => s.timeRange === timeRange);
        if (!slot) return;
        
        const details = slot.flights.map(flight => 
            `• ${flight.airline} ${flight.id} - ${flight.departTime} (₩${flight.price.toLocaleString()})`
        ).join('\n');
        
        alert(`${timeRange} 시간대 항공편 상세:\n\n${details}\n\n최저가: ₩${slot.minPrice.toLocaleString()} (${slot.cheapestFlight.airline})`);
    }

    getAirportName(code) {
        const airports = {
            'ICN': '인천',
            'GMP': '김포',
            'PUS': '김해',
            'TAE': '대구',
            'CJU': '제주'
        };
        return airports[code] || code;
    }

    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.innerHTML = message;
        status.className = `status ${type}`;
    }

    updateSearchButton(searching) {
        const btn = document.getElementById('searchBtn');
        if (searching) {
            btn.textContent = '검색중...';
            btn.disabled = true;
        } else {
            btn.textContent = '검색하기';
            btn.disabled = false;
        }
    }

    // 가격 알림 기능 (로컬 스토리지 사용)
    savePriceAlert(flightId, targetPrice) {
        const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
        alerts.push({
            id: Date.now(),
            flightId,
            targetPrice,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('priceAlerts', JSON.stringify(alerts));
    }

    checkPriceAlerts() {
        const alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
        const activeAlerts = alerts.filter(alert => {
            const flight = this.flights.find(f => f.id === alert.flightId);
            if (flight && flight.price <= alert.targetPrice) {
                this.showNotification(`가격 알림: ${flight.airline} 항공편이 목표 가격 ₩${alert.targetPrice.toLocaleString()}에 도달했습니다!`);
                return false; // 알림 발송 후 제거
            }
            return true;
        });
        localStorage.setItem('priceAlerts', JSON.stringify(activeAlerts));
    }

    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('항공권 가격 알림', {
                body: message,
                icon: '✈️'
            });
        } else {
            alert(message);
        }
    }

    // 실제 API 연동 예시 (주석 처리)
    /*
    async searchRealFlights(departure, destination, departDate, returnDate) {
        // 스카이스캐너 API 예시
        try {
            const response = await fetch('/api/flights/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                },
                body: JSON.stringify({
                    departure,
                    destination,
                    departDate,
                    returnDate,
                    adults: 1
                })
            });
            
            const data = await response.json();
            this.flights = this.parseFlightData(data);
            this.applyFilters();
            
        } catch (error) {
            throw new Error('항공편 검색 API 오류: ' + error.message);
        }
    }
    */
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    const tracker = new FlightTracker();
    
    // 브라우저 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // 전역 변수로 설정 (디버깅용)
    window.flightTracker = tracker;
});

// 추가 유틸리티 함수들
function formatPrice(price) {
    return price.toLocaleString('ko-KR');
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
}

function getRandomDelay(min = 500, max = 2000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}