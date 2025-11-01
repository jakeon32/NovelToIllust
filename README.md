# Novel to Illustration AI 📚✨

소설 텍스트를 AI가 분석하여 자동으로 일러스트를 생성하는 웹 애플리케이션입니다.

## 🌐 Live Demo

**배포된 앱 바로가기:** https://novel-to-illust.vercel.app/

## 📖 프로젝트 소개

Novel to Illustration AI는 작가와 창작자를 위한 도구로, 소설이나 이야기를 입력하면 Google Gemini AI가 자동으로:
- 텍스트를 시각적으로 의미 있는 장면들로 분해
- 캐릭터와 배경 레퍼런스를 참고하여 일관된 스타일의 일러스트 생성
- 자연어로 이미지를 수정하고 재생성

## ✨ 주요 기능

### 1. 스마트 장면 분석
- 소설 텍스트를 입력하면 3-8개의 핵심 장면으로 자동 분해
- 각 장면의 시각적 요소를 분석하여 설명 생성

### 2. 레퍼런스 기반 일러스트 생성
- **캐릭터 레퍼런스**: 캐릭터별 이미지 업로드 또는 AI 생성
- **배경 레퍼런스**: 배경 이미지 업로드 (최대 2개)
- **아트 스타일**: 원하는 화풍/스타일 레퍼런스 이미지
- 스마트 매칭: 장면에 등장하는 캐릭터만 자동으로 참조

### 3. 촬영 구도 설정
각 장면마다 다양한 촬영 구도(Shot Type) 선택 가능:
- Wide Shot (전체 샷)
- Close-up (클로즈업)
- Over-the-shoulder (오버 더 숄더)
- Bird's Eye View (조감도)
- Low Angle / High Angle (저각/고각)

### 4. 이미지 편집 및 재생성
- 자연어 프롬프트로 이미지 수정
- 원하지 않는 장면 삭제 및 재생성
- PNG 형식으로 다운로드

### 5. 멀티 스토리 관리
- 여러 작품을 동시에 관리
- localStorage 기반 자동 저장
- 프로젝트별 독립적인 레퍼런스 관리

## 🛠️ 기술 스택

| 기술 | 용도 |
|------|------|
| React 19.2 | UI 프레임워크 |
| TypeScript | 타입 안전성 |
| Vite | 빌드 도구 |
| Tailwind CSS | 스타일링 |
| Google Gemini API | AI 텍스트 분석 및 이미지 생성 |
| Vercel | 배포 및 Serverless Functions |

## 🚀 로컬 실행 방법

### 사전 요구사항
- Node.js (v20 이상 권장)
- Gemini API 키 ([발급받기](https://aistudio.google.com/app/apikey))

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/jakeon32/NovelToIllust.git
   cd NovelToIllust
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**

   프로젝트 루트에 `.env.local` 파일 생성:
   ```
   GEMINI_API_KEY=여기에_API_키_입력
   ```

4. **개발 서버 실행**

   **옵션 A: Vercel 개발 서버 (API 함수 포함)**
   ```bash
   npm run dev
   ```
   처음 실행 시 `vercel login` 필요

   **옵션 B: Vite만 실행 (UI 테스트용)**
   ```bash
   npm run dev:vite
   ```

   브라우저에서 http://localhost:3000 접속

5. **프로덕션 빌드**
   ```bash
   npm run build
   npm run preview
   ```

## 📂 프로젝트 구조

```
NovelToIllust/
├── index.html                    # 진입점 HTML
├── index.tsx                     # React 앱 진입점
├── App.tsx                       # 메인 애플리케이션 컴포넌트
├── types.ts                      # TypeScript 타입 정의
├── components/                   # React 컴포넌트
│   ├── StorySidebar.tsx          # 스토리 네비게이션
│   ├── SceneCard.tsx             # 장면 카드 컴포넌트
│   ├── ImageModal.tsx            # 이미지 뷰어/편집 모달
│   ├── ReferenceImageUpload.tsx  # 이미지 업로드/생성
│   ├── Loader.tsx                # 로딩 인디케이터
│   └── icons/                    # SVG 아이콘 컴포넌트
├── services/
│   └── geminiService.ts          # API 엔드포인트 호출 로직
├── api/                          # Vercel Serverless Functions
│   ├── generate-title.ts         # 제목 생성 API
│   ├── generate-scenes.ts        # 장면 분석 API
│   ├── generate-illustration.ts  # 일러스트 생성 API
│   ├── edit-illustration.ts      # 이미지 편집 API
│   └── generate-reference.ts     # 레퍼런스 생성 API
├── vite.config.ts                # Vite 설정
├── vercel.json                   # Vercel 설정
├── tsconfig.json                 # TypeScript 설정
└── package.json                  # 프로젝트 의존성
```

## 💡 사용 방법

### 기본 워크플로우

1. **레퍼런스 설정 (선택사항)**
   - 캐릭터 이미지 업로드 또는 텍스트로 생성
   - 배경 이미지 업로드
   - 원하는 화풍의 아트 스타일 이미지 업로드

2. **소설 텍스트 입력**
   - Novel Text 입력란에 소설 또는 장면 묘사 붙여넣기
   - "Analyze Novel & Create Scenes" 클릭

3. **장면 생성 확인**
   - AI가 자동으로 3-8개의 장면으로 분해
   - 각 장면의 설명과 촬영 구도 확인

4. **일러스트 생성**
   - 각 장면 카드의 "Generate Image" 버튼 클릭
   - 레퍼런스를 참고한 일러스트가 생성됨

5. **편집 및 다운로드**
   - 이미지 클릭하여 크게 보기
   - "Edit" 버튼으로 자연어 수정 ("배경을 밤으로 바꿔줘")
   - "Download" 버튼으로 PNG 저장

## 🔒 보안 및 개인정보 보호

### 데이터 저장
- 모든 프로젝트 데이터는 **브라우저의 localStorage**에 저장
- 서버에 프로젝트 데이터 전송 없음
- 생성된 이미지는 base64로 로컬 저장

### API 키 보호
- API 키는 Vercel 환경 변수로 안전하게 관리
- 클라이언트 코드에 API 키 노출 없음
- Vercel Serverless Functions를 통한 프록시 방식으로 Gemini API 호출

**보안 구조:**
```
사용자 → Vercel Frontend → Vercel Serverless Function → Gemini API
                             ↑ API 키는 여기에만 존재
```

## 🚀 배포하기

자세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.

### 빠른 배포 (Vercel)

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 import
3. 환경 변수 `GEMINI_API_KEY` 설정
4. Deploy 버튼 클릭!

## 🤝 기여하기

기여를 환영합니다! 다음과 같은 방법으로 참여하실 수 있습니다:

1. 이 저장소를 Fork
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🔗 관련 링크

- [Google Gemini API 문서](https://ai.google.dev/docs)
- [React 공식 문서](https://react.dev/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)

## 📮 문의

문제가 발생하거나 제안사항이 있으시면 [Issues](https://github.com/jakeon32/NovelToIllust/issues)에 등록해주세요.

---

**Made with ❤️ using Google Gemini AI**
# Force redeploy 2025년 11월  1일 토 오전 10:39:56
