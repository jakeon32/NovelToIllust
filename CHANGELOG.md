# Changelog

모든 주요 변경사항이 이 파일에 기록됩니다.

## [Unreleased]

### Phase 2 예정
- 장면 순서 변경 (드래그앤드롭)
- 일괄 다운로드 (ZIP)

### Phase 3 예정
- 진행 상황 개선 (진행률 바, 예상 시간)
- 장면별 추가 지시사항
- 수동 장면 추가

---

## [2025-01-30] - 작화 스타일 일관성 수정 (우선 처리)

### Fixed - 레퍼런스 이미지 생성 시 작화 스타일 적용
**문제**: 배경과 캐릭터 레퍼런스를 AI로 생성할 때 작화 스타일이 반영되지 않음
- 작화 스타일: 수채화 설정
- 생성된 배경/캐릭터: 디지털 아트 스타일
- 최종 장면: 스타일 불일치로 어색함

**해결**: 레퍼런스 이미지 생성 시 작화 스타일 참조
- `generateReferenceImage` 함수에 `artStyle` 파라미터 추가
- API에서 작화 스타일 이미지를 레퍼런스로 포함
- 라인워크, 채색, 쉐이딩, 디테일 레벨 일치 지침 포함

**효과**:
- ✅ 모든 생성 이미지가 작화 스타일과 일치
- ✅ 캐릭터 레퍼런스: 일관된 스타일
- ✅ 배경 레퍼런스: 일관된 스타일
- ✅ 최종 장면: 완벽한 시각적 통일성

**예시 워크플로우**:
1. 작화 스타일 설정: 수채화
2. 캐릭터 생성: 수채화 스타일 적용 ✅
3. 배경 생성: 수채화 스타일 적용 ✅
4. 장면 생성: 모든 요소가 수채화로 통일 ✅

### Technical Details
- `services/geminiService.ts`: `generateReferenceImage`에 artStyle 파라미터 추가
- `api/generate-reference.ts`: artStyle 레퍼런스 포함 및 상세 프롬프트 추가
- `components/ReferenceImageUpload.tsx`: artStyle prop 추가 및 전달
- `App.tsx`: 모든 ReferenceImageUpload에 currentStory.artStyle 전달

---

## [2025-01-30] - Phase 1 완료

### Added - 주요 기능 추가
- **장면 설명 편집 기능**: 장면 설명에 마우스 오버 시 연필 아이콘 표시, 클릭하여 인라인 편집 가능
  - AI가 생성한 설명을 사용자가 직접 수정하여 더 정확한 이미지 생성 가능
  - 저장/취소 버튼으로 편집 제어

- **모든 장면 일괄 생성**: "모든 장면 생성" 버튼으로 이미지가 없는 모든 장면을 자동 생성
  - 진행률 표시 (예: "진행: 3/10")
  - 개별 장면 실패 시에도 다음 장면 계속 진행
  - 사용성 대폭 향상: 10개 장면 → 10번 클릭에서 1번 클릭으로 감소

### Technical Details
- `components/SceneCard.tsx`: 편집 상태 관리 및 UI 추가
- `App.tsx`: `handleSceneDescriptionChange`, `generateAllScenes` 함수 추가
- `App.tsx`: `isGeneratingAll`, `generationProgress` 상태 추가

---

## [2025-01-30] - 배경 시스템 개선

### Changed - 배경 관리 방식 변경
- **배경에 이름 추가**: 배경마다 이름 설정 가능 (예: "왕궁 대전", "마법의 숲")
- **배경 개수 제한 제거**: 이전 최대 2개 → 무제한으로 변경
- **스마트 필터링**: 장면 설명에 언급된 배경만 자동으로 참조
  - 예: "왕궁에서..." → "왕궁" 배경만 사용
  - 불필요한 레퍼런스 제외로 API 효율성 향상
- **UI 개선**: 캐릭터와 동일한 레이아웃 (이름 입력 + 이미지 업로드 + 삭제)

### Technical Details
- `types.ts`: Background에 `name` 필드 추가
- `api/generate-illustration.ts`: `relevantBackgrounds` 필터링 로직 추가
- `utils/storage.ts`: 기존 데이터 마이그레이션 (자동으로 이름 추가)

---

## [2025-01-30] - 저장소 시스템 개선

### Changed - localStorage → IndexedDB 마이그레이션
- **용량 제한 해결**: localStorage 5-10MB → IndexedDB 수백MB~GB
- **자동 데이터 마이그레이션**: 기존 localStorage 데이터를 IndexedDB로 자동 이전
- **디바운스 자동 저장**: 500ms 디바운스로 저장 작업 최적화
- **에러 메시지 개선**: "브라우저 저장 공간이 가득 찼습니다" 오류 해결

### Technical Details
- `utils/storage.ts` 생성: IndexedDB 유틸리티 함수
  - `openDB`, `saveStories`, `loadStories`, `migrateFromLocalStorage`
- `App.tsx`: async 저장/로딩으로 변경

---

## [2025-01-30] - 이미지 비율 선택 기능

### Added - 이미지 비율 옵션
- **5가지 비율 선택**: 1:1 (정사각형), 16:9 (가로), 9:16 (세로), 4:3 (가로), 3:4 (세로)
- **장면별 개별 설정**: 각 장면마다 다른 비율 적용 가능
- **UI 추가**: SceneCard에 비율 선택 드롭다운 추가

### Fixed
- **aspectRatio API 적용 오류 수정**: `imageConfig` 객체 내부로 정확히 전달하도록 수정
  - 이전: `config: { aspectRatio }` (작동 안 함)
  - 수정: `config: { imageConfig: { aspectRatio } }` (정상 작동)

### Technical Details
- `types.ts`: Scene에 `aspectRatio` 필드 추가
- `components/SceneCard.tsx`: 비율 선택 UI 추가
- `api/generate-illustration.ts`: Gemini API에 `imageConfig` 적용

---

## [2025-01-30] - 모바일 다운로드 개선

### Fixed - 모바일 브라우저 호환성
- **iOS Safari 다운로드 오류 수정**: base64 data URL → Blob URL 변환
- **메모리 관리 개선**: 다운로드 후 Blob URL 자동 해제
- **폴백 처리**: 다운로드 실패 시 새 탭에서 이미지 열기

### Technical Details
- `App.tsx`: `handleDownloadImage` 함수 개선
  - base64 → Blob 변환
  - Blob URL 생성 및 cleanup

---

## [2025-01-30] - 일관성 강화

### Changed - 프롬프트 엔지니어링 개선
- **일러스트 생성 프롬프트 강화**: 레퍼런스 이미지 일관성 요구사항 대폭 강화
  - 작화 스타일, 배경, 캐릭터 일관성에 대한 상세 지침 추가
  - MANDATORY, CRITICAL, NON-NEGOTIABLE 등 강한 표현 사용
  - 시각적 구분자(═══, 🎨, 🏞️, 👤) 추가로 가독성 향상

- **이미지 편집 프롬프트 강화**: 편집 시 스타일 보존 지침 추가
  - 원본 스타일 유지 필수 요구사항
  - 최소한의 변경만 수행
  - 자연스러운 통합 가이드라인

### Technical Details
- `api/generate-illustration.ts`: 프롬프트 구조 대폭 개선
- `api/edit-illustration.ts`: 스타일 일관성 프롬프트 추가

---

## [2025-01-29] - 초기 프로젝트 설정

### Added - 기본 기능
- **소설 텍스트 분석**: AI가 자동으로 장면 추출
- **레퍼런스 이미지 시스템**:
  - 아트 스타일 레퍼런스
  - 캐릭터 레퍼런스 (이름 + 이미지)
  - 배경 레퍼런스 (최대 2개)
- **이미지 생성**: Gemini 2.5 Flash Image 사용
- **이미지 편집**: 기존 이미지 부분 수정
- **촬영 구도 선택**: 8가지 옵션 (와이드 샷, 클로즈업 등)
- **스토리 관리**: 여러 스토리 저장 및 전환
- **모바일 반응형 UI**: 다양한 화면 크기 지원

### Technical Details
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash Image
- **Storage**: localStorage (이후 IndexedDB로 마이그레이션)
- **Deployment**: Vercel (이전 GitHub Pages에서 이전)

---

## 기술 스택

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.5 Flash Image
- **Backend**: Vercel Serverless Functions
- **Database**: IndexedDB (브라우저 로컬)
- **Deployment**: Vercel

## 보안

- API 키: Vercel 환경 변수로 관리
- 클라이언트 노출 방지: 서버리스 함수를 통한 프록시
- 이전 이슈: GitHub Pages에서 API 키 노출 → Vercel 이전으로 해결
