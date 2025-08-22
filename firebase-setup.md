# Firebase 설정 가이드

온라인 멀티플레이어 섯다 게임을 위해 Firebase를 설정하는 방법입니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `seotda-game-online` 입력
4. Google Analytics는 선택사항 (사용하지 않아도 됨)
5. "프로젝트 만들기" 클릭

## 2. 웹 앱 추가

1. 프로젝트 개요에서 웹 아이콘 `</>` 클릭
2. 앱 닉네임: `섯다 게임` 입력
3. Firebase Hosting 설정은 체크하지 않음
4. "앱 등록" 클릭

## 3. Realtime Database 설정

1. 왼쪽 메뉴에서 "Realtime Database" 클릭
2. "데이터베이스 만들기" 클릭
3. 위치: 기본값 (us-central1) 선택
4. 보안 규칙: **"테스트 모드에서 시작"** 선택 (나중에 변경 가능)
5. "완료" 클릭

## 4. Firebase 구성 정보 복사

1. 프로젝트 설정 (톱니바퀴 아이콘) 클릭
2. "일반" 탭에서 "내 앱" 섹션 찾기
3. "Firebase SDK 스니펫" 에서 "구성" 선택
4. `const firebaseConfig = { ... }` 부분 복사

## 5. 코드에 Firebase 구성 정보 적용

`seotda.html` 파일의 Firebase 구성 부분을 수정:

```javascript
const firebaseConfig = {
    // 여기에 복사한 구성 정보 붙여넣기
    apiKey: "실제_API_키",
    authDomain: "실제_프로젝트.firebaseapp.com",
    databaseURL: "https://실제_프로젝트-default-rtdb.firebaseio.com",
    projectId: "실제_프로젝트_ID",
    storageBucket: "실제_프로젝트.appspot.com",
    messagingSenderId: "실제_숫자",
    appId: "실제_앱_ID"
};
```

## 6. 보안 규칙 설정 (선택사항)

데이터베이스 보안을 강화하려면 "규칙" 탭에서 다음과 같이 설정:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt"]
      }
    }
  }
}
```

## 7. 배포 및 테스트

1. 수정된 파일들을 GitHub에 커밋/푸시
2. GitHub Pages에서 자동 배포
3. 여러 기기/브라우저에서 동시 접속 테스트

## 주의사항

- Firebase의 무료 플랜에서도 충분히 사용 가능
- Realtime Database는 동시 접속자 100명까지 무료
- 월 1GB 데이터 전송까지 무료
- 실제 서비스에서는 보안 규칙을 더 엄격하게 설정 권장