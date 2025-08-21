# ✈️ 제주도 항공권 가격 추적기

제주도 항공권 최저가를 찾아주는 스마트한 가격 추적 시스템입니다.

## 🚀 [Live Demo](https://your-username.github.io/jeju-flight-tracker)

## 📋 주요 기능

### 🔍 **항공편 검색**
- 다양한 출발지에서 제주도로의 항공편 검색
- 편도/왕복 옵션 지원
- 실시간 검색 상태 표시

### 💰 **가격 필터링**
- 최소/최대 가격 범위 설정
- 항공사별 필터링
- 합리적 가격 하이라이트

### ⏰ **시간별 최저가 분석**
- 1시간 단위 시간대별 최저가 표시
- 오전/오후/저녁 시간대 필터링
- 사용자 정의 시간 범위 설정
- 시간대별 가격 차트 시각화

### 📊 **데이터 시각화**
- 가격 트렌드 표시 (상승/하락/안정)
- 인터랙티브 차트
- 최저가 시간대 하이라이트

### 📱 **사용자 경험**
- 반응형 디자인 (모바일/데스크톱)
- 직관적인 인터페이스
- 실시간 필터 적용

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Design**: 반응형 웹 디자인, CSS Grid/Flexbox
- **Deployment**: GitHub Pages

## 📁 프로젝트 구조

```
jeju-flight-tracker/
├── index.html              # 메인 HTML 파일
├── flight-tracker.js        # 메인 JavaScript 로직
├── flight-tracker.html      # 별도 페이지 (선택사항)
├── README.md               # 프로젝트 문서
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions 배포 설정
```

## 🚀 배포 방법

### GitHub Pages로 배포하기

1. **GitHub 저장소 생성**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 제주도 항공권 가격 추적기"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/jeju-flight-tracker.git
   git push -u origin main
   ```

2. **GitHub Pages 활성화**
   - GitHub 저장소 → Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save 클릭

3. **배포 완료**
   - 몇 분 후 `https://YOUR_USERNAME.github.io/jeju-flight-tracker` 에서 접속 가능

### 로컬에서 실행하기

```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/jeju-flight-tracker.git
cd jeju-flight-tracker

# 브라우저에서 index.html 파일 열기
# 또는 간단한 HTTP 서버 실행
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 📖 사용법

1. **출발지/목적지 선택**: 원하는 공항 선택
2. **날짜 설정**: 출발일/도착일 입력
3. **검색 실행**: "검색하기" 버튼 클릭
4. **필터 적용**: 가격 범위, 항공사 필터링
5. **시간별 보기**: "시간별 최저가 보기" 버튼으로 모드 전환

## ⚡ 향후 개선 계획

- [ ] 실제 항공사 API 연동
- [ ] 가격 알림 기능 확장
- [ ] 여행 달력 연동
- [ ] 가격 히스토리 추적
- [ ] 소셜 공유 기능
- [ ] PWA (Progressive Web App) 지원

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## ⚠️ 면책 조항

이 사이트는 시뮬레이션 데이터를 사용합니다. 실제 항공편 예약을 위해서는 각 항공사의 공식 웹사이트를 방문해주세요.

## 📞 연락처

프로젝트 문의사항이 있으시면 GitHub Issues를 통해 연락해주세요.

---

Made with ❤️ for travelers