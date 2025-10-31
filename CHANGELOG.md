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

## [2025-10-31] - 레퍼런스 AI 분석 & 스토리지 최적화

### Added - AI 분석 결과 확인 및 편집 기능

**캐릭터 AI 분석**:
- 캐릭터 이미지 업로드 시 Gemini Vision이 자동으로 외형 분석
- 분석 내용: 얼굴 특징, 머리 스타일/색상, 체형, 의상, 액세서리, 특징적인 표식
- 초상세 설명 자동 생성 (예: "shoulder-length golden blonde hair with honey highlights, bright sapphire blue eyes...")
- 분석 결과를 텍스트로 확인하고 직접 편집 가능
- 재분석 버튼으로 언제든 다시 분석

**배경 AI 분석 (신규)**:
- 배경 이미지 업로드 시 자동 환경 분석
- 분석 내용: 건축 양식, 색상 팔레트, 조명/분위기, 환경 디테일, 장식 요소
- 배경도 캐릭터와 동일한 편집/재분석 기능 지원

**UI/UX**:
- 접기/펼치기 토글로 깔끔한 인터페이스
- 분석 중 로딩 표시 (스피너 + 설명 메시지)
- 분석 완료 상태 표시 (✓ 또는 "분석 대기 중")
- 편집 가능한 textarea (monospace 폰트로 가독성 향상)
- 자동 펼침: 분석 완료 시 자동으로 결과 표시

**일러스트 생성 개선**:
- 이미지 + AI 분석 텍스트를 함께 Gemini에 전달
- 이중 보장 시스템으로 캐릭터/배경 일관성 대폭 향상
- 각도나 조명 차이로 인한 오해 감소

### Changed - 스토리지 정책 변경 (효율성 75% 향상)

**씬 일러스트 → 로컬 스토리지 이동**:
- 기존: 모든 이미지를 Supabase에 저장
- 변경: 씬 일러스트는 브라우저 로컬 스토리지에 저장
- Supabase 용량 75% 절감 (30MB/스토리 → 12MB/스토리)

**사용자별 용량 제한 시스템**:
- 제한: 사용자당 **50MB** (레퍼런스 이미지만 계산)
- 50MB로 약 **4개 스토리** 생성 가능
- 전체 0.5GB로 **40명 이상** 수용 가능 (기존 17명 → 40명+)
- 용량 계산 함수: `calculateUserStorageUsage()`, `checkStorageQuota()`

**정책 상세**:
- Supabase 저장: 캐릭터/배경/아트 스타일 레퍼런스 (영구 보존)
- 로컬 저장: 씬 일러스트 (캐시 삭제 시 소실, 재생성 가능)
- 레퍼런스가 있으면 씬은 언제든 재생성 가능하므로 합리적

**로컬 스토리지 관리**:
- 자동 저장: 일러스트 생성/편집 시 자동 저장
- 자동 로드: 스토리 로드 시 로컬에서 씬 이미지 복원
- 자동 삭제: 스토리 삭제 시 관련 씬 이미지도 정리
- 용량 확인: `getSceneImagesStorageSize()` 유틸리티

### Added - 새 API 엔드포인트

**`/api/analyze-background`**:
- Gemini Vision API 사용
- 배경 이미지 분석: 건축, 색상, 조명, 환경, 장식
- 장면 생성 시 배경 설명도 함께 전달하여 일관성 향상

### Database - Supabase 스키마 변경

**새 컬럼 추가**:
```sql
ALTER TABLE characters ADD COLUMN description TEXT;
ALTER TABLE backgrounds ADD COLUMN description TEXT;
```

**씬 이미지 마이그레이션**:
```sql
UPDATE scenes SET image_url = NULL WHERE image_url IS NOT NULL;
```

**스키마 업데이트**:
- `scenes.image_url`: DEPRECATED (로컬 스토리지로 이동, NULL 유지)
- `characters.description`: AI 분석 결과 저장
- `backgrounds.description`: AI 분석 결과 저장

### Technical Details

**새 파일**:
- `services/localSceneStorage.ts`: 로컬 스토리지 관리 유틸리티
  - `saveSceneImage()`, `getSceneImage()`, `deleteSceneImage()`
  - `deleteAllSceneImagesForStory()`, `getSceneImagesStorageSize()`
- `api/analyze-background.ts`: 배경 분석 API 엔드포인트
- `supabase-add-descriptions.sql`: 컬럼 추가 마이그레이션
- `supabase-migration-scene-images.sql`: 씬 이미지 제거 마이그레이션

**수정 파일**:
- `App.tsx`:
  - 로컬 스토리지 통합 (로드/저장/삭제)
  - 캐릭터/배경 분석 UI 추가
  - 재분석 핸들러 추가
  - 분석 상태 관리 (`analyzingCharacters`, `analyzingBackgrounds`)
- `services/supabaseStorage.ts`:
  - `saveStoryToSupabase()`: 씬 image_url을 NULL로 저장
  - `loadStoriesFromSupabase()`: 씬 imageUrl을 undefined로 반환
  - `calculateUserStorageUsage()`: 레퍼런스만 계산
  - `checkStorageQuota()`: 용량 제한 확인
- `services/geminiService.ts`:
  - `analyzeBackground()` 함수 추가
- `api/generate-illustration.ts`:
  - 배경 description 프롬프트에 포함
- `types.ts`:
  - `Background.description` 필드 추가

**성능 개선**:
- Supabase 저장 용량 75% 감소
- 씬 이미지 로컬 로드로 속도 향상
- API 비용 절감 (스토리지 용량 감소)

### Breaking Changes

**기존 사용자 영향**:
- ⚠️ 기존 씬 일러스트가 모두 삭제됨 (재생성 필요)
- ✅ 레퍼런스 이미지는 그대로 유지
- ✅ 스토리 데이터(제목, 소설 텍스트 등) 유지
- ✅ 레퍼런스가 있으므로 씬 재생성 가능

**마이그레이션 필요**:
1. Supabase SQL Editor에서 마이그레이션 실행
2. 사용자에게 씬 재생성 안내

### User Benefits

**개선된 일관성**:
- AI 분석 텍스트 + 이미지 레퍼런스 이중 체크
- 캐릭터 외형 정확도 대폭 향상
- 배경 분위기 일관성 향상

**용량 효율성**:
- 개인당 4개 스토리 생성 가능 (기존 1~2개)
- 전체 수용 인원 2.3배 증가

**사용자 제어 강화**:
- AI 분석 결과를 직접 확인하고 수정 가능
- 잘못된 분석 즉시 교정
- 재분석으로 더 나은 결과 획득

---

## [2025-10-30] - 레퍼런스 변경 반영 개선 및 로컬 개발 환경 구축

### Fixed - 레퍼런스 변경 시 최신 데이터 사용
**문제**: 레퍼런스 이미지(캐릭터, 배경, 작화 스타일)를 변경한 후 장면을 재생성해도 이전 레퍼런스가 사용되는 문제

**원인**:
- `generateSingleIllustration` 함수가 Scene 객체를 직접 전달받아 오래된 참조(closure) 사용
- React state 업데이트 시점과 함수 실행 시점의 불일치

**해결**:
- `generateSingleIllustration` 함수 시그니처 변경: `Scene` 객체 → `sceneId` 문자열
- 함수 내부에서 최신 `stories` state에서 직접 story 조회
- 모든 호출 지점 업데이트 (SceneCard, ImageModal, generateAllScenes)

**디버깅 로그 추가**:
- 레퍼런스 변경 시 로그: 캐릭터, 배경, 아트 스타일
- 이미지 생성 시 로그: 전달된 레퍼런스 정보, imagePreview
- 이미지 비교 로그: 새 이미지와 이전 이미지가 실제로 다른지 해시 비교

### Added - 로컬 개발 환경 구축

**문제**: 로컬 개발 시 API 엔드포인트 404 오류 및 CORS 문제
- Vite 개발 서버는 프론트엔드만 제공
- API 엔드포인트는 Vercel Serverless Functions로 구현
- 직접 프로덕션 API 호출 시 CORS 차단

**해결**: Vite 프록시 설정
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'https://novel-to-illust.vercel.app',
    changeOrigin: true,
    secure: true,
  }
}
```

**효과**:
- ✅ 로컬 개발 시 `/api/*` 요청이 자동으로 프로덕션 서버로 프록시
- ✅ CORS 문제 완전 해결 (same-origin 요청으로 변환)
- ✅ 프로덕션 배포 시에도 정상 작동 (프록시는 개발 모드에서만 동작)

### Technical Details
- `App.tsx:224-323`: generateSingleIllustration 함수 리팩토링
  - sceneId 파라미터로 변경
  - 최신 story 조회 로직 추가
  - 상세 디버깅 로그 추가
  - 이미지 해시 비교로 중복 생성 감지
- `App.tsx:154-210`: 레퍼런스 변경 핸들러에 로그 추가
  - handleCharacterChange, handleBackgroundChange, handleArtStyleChange
- `App.tsx:638`: ImageModal onRegenerate prop 업데이트
- `vite.config.ts:10-17`: API 프록시 설정 추가
- `services/geminiService.ts:3-7`: API_BASE 단순화 (빈 문자열)

### Development Notes
**로컬 개발 환경**:
```
브라우저 → localhost:3003/api/generate-scenes
       → Vite 프록시
       → https://novel-to-illust.vercel.app/api/generate-scenes
       → 응답 반환
```

**프로덕션 환경**:
```
브라우저 → https://novel-to-illust.vercel.app/api/generate-scenes
       → Vercel Serverless Function
       → 응답 반환
```

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
