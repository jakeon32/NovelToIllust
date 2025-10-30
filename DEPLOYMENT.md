# Vercel 배포 가이드

이 프로젝트는 백엔드 프록시 서버를 사용하여 API 키를 안전하게 보호합니다.

## 🚀 Vercel로 배포하기

### 1단계: Vercel 계정 생성
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

### 2단계: 프로젝트 Import
1. Vercel 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소에서 **NovelToIllust** 선택
3. **Import** 클릭

### 3단계: 환경 변수 설정
1. **Environment Variables** 섹션에서 다음 추가:
   ```
   Name: GEMINI_API_KEY
   Value: [여기에 Gemini API 키 입력]
   ```
2. **Production**, **Preview**, **Development** 모두 체크

### 4단계: 배포
1. **Deploy** 버튼 클릭
2. 빌드 완료 후 배포 URL 확인 (예: `your-project.vercel.app`)

## 🔧 로컬 개발

### Vercel CLI로 로컬 테스트
```bash
npm run dev
```

이 명령어는 `vercel dev`를 실행하여:
- Vite 개발 서버 시작 (포트 3000)
- Vercel API Functions 로컬 실행
- `.env.local`에서 환경 변수 자동 로드

### 순수 Vite만 실행 (API 함수 없이)
```bash
npm run dev:vite
```

## 📝 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:
```
GEMINI_API_KEY=여기에_API_키_입력
```

**중요**: `.env.local` 파일은 git에 커밋되지 않습니다!

## 🔒 보안

### API 키 보호 구조
```
사용자 브라우저
  → 프론트엔드 (공개)
  → /api/generate-scenes (Vercel Serverless Function)
  → Gemini API (API 키는 서버에만 존재)
```

### 작동 방식
1. 프론트엔드는 `/api/*` 엔드포인트만 호출
2. Vercel Serverless Functions가 요청 처리
3. 서버에서만 Gemini API 호출 (환경 변수 사용)
4. API 키는 절대 클라이언트로 노출되지 않음

## 🛠️ API 엔드포인트

### 생성된 엔드포인트:
- `POST /api/generate-title` - 제목 생성
- `POST /api/generate-scenes` - 장면 분석
- `POST /api/generate-illustration` - 일러스트 생성
- `POST /api/edit-illustration` - 일러스트 편집
- `POST /api/generate-reference` - 레퍼런스 이미지 생성

## 🔄 GitHub Actions 제거

GitHub Pages 배포는 더 이상 사용하지 않습니다.
`.github/workflows/deploy.yml` 파일을 삭제하거나 비활성화하세요.

## ✅ 배포 확인

배포 후 다음을 확인:
1. 브라우저 개발자 도구 → Network 탭
2. API 요청이 `/api/*`로 가는지 확인
3. Sources 탭에서 JavaScript 파일에 API 키가 없는지 확인

## 💡 자동 배포

Vercel은 GitHub와 자동 연동됩니다:
- `main` 브랜치 push → 자동 배포
- Pull Request → Preview 배포 생성
