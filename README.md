# Recruitment SaaS Platform Project Specification

## 1. Project Overview
본 프로젝트는 **슈퍼 관리자(컨설턴트), 기업 담당자(HR), 외부 평가자, 지원자** 4가지 계층이 상호작용하는 **채용 평가 플랫폼(SaaS)**입니다.
각 역할별로 데이터 접근 권한이 엄격히 분리되며, 공정성(블라인드 평가)과 안정성(온라인 시험 Fail-Safe)을 최우선으로 합니다.

## 2. User Roles & Authentication (사용자 역할 및 권한)

### A. Super Admin (Platform Owner)
* **정의:** 플랫폼 운영자 및 채용 컨설턴트.
* **핵심 권한:**
    * **Tenant Onboarding:** 기업 계정 생성 및 Master 계정 발급.
    * **God Mode:** 특정 기업 담당자로 로그인하여 문제 해결 (Impersonation).
    * **Global Asset:** 전사 공통 문제은행(인성/적성 Global Question Bank) 관리 및 규준(Norms) 버전 관리.
    * **Security:** 보안 관제 및 서비스 강제 종료(Kill Switch).

### B. Corporate Admin (Client HR)
* **정의:** 채용을 의뢰한 기업의 인사팀.
* **유형:** `MASTER` (결제/초대 권한), `MEMBER` (운영 권한).
* **핵심 권한:**
    * 채용 공고 생성 및 전형 단계(서류/필기/면접) 설계.
    * 외부 평가자 초대 및 지원자 배정.
    * 지원자 합격/불합격 처리 (Decision Making).
    * **Audit Log:** 엑셀 다운로드 시 사유 입력 및 로그 강제 기록.

### C. External Evaluator (Guest)
* **정의:** 전형별 외부 면접관.
* **접속 방식:** 별도 회원가입 없이 **보안 토큰(Secure Link)**으로 접속.
* **제약 사항:**
    * **Stage Isolation:** 초대받은 전형 외 데이터 접근 불가.
    * **Blind Mode:** 설정 시 지원자 이름, 사진, 학교 정보 마스킹 처리.
    * **Recusal:** 이해관계가 있는 지원자에 대해 '회피' 버튼 클릭 시 점수 입력 불가.

### D. Candidate (Applicant)
* **정의:** 입사 지원자.
* **핵심 기능:**
    * 지원서 작성/수정 및 철회(Withdraw).
    * 온라인 필기시험 응시 (인성검사/적성검사, Fail-Safe 적용).
    * 응시 가이드 확인 및 연습 문제 풀이.
    * 마이페이지에서 전형 결과 및 배지 확인.

## 3. Database Schema (PostgreSQL)
*기획서의 `full-schema_init.sql` 내용을 기준으로 함.*

### ENUM Types
* `user_role`: 'SUPER_ADMIN', 'CORPORATE_ADMIN', 'EXTERNAL_EVALUATOR', 'CANDIDATE'.
* `app_status`: 'APPLIED', 'DOC_PASS', 'DOC_FAIL', 'TEST_PENDING', 'TEST_PASS', 'TEST_FAIL', 'INTERVIEW_PENDING', 'FINAL_PASS', 'FAIL', 'WITHDRAWN'.

### Core Tables
1.  **companies:** 기업 정보, 플랜 타입, 서비스 상태(Active/Suspended).
2.  **users:** 사용자 기본 정보, Role, Company ID.
3.  **company_members:** 기업 내 멤버 등급(Master/Member) 관리.
4.  **postings:** 채용 공고, 전형 설정(JSONB), 블라인드 여부.
5.  **questions:** 문제은행, Scope(Global/Local), 문제 유형.
6.  **applications:** 지원서 데이터(JSONB), 암호화된 PII, 현재 상태.
7.  **test_results:** 온라인 시험 결과, 부정행위 로그, 웹캠 URL.
8.  **interview_slots:** 면접 일정 스케줄링.
9.  **evaluations:** 평가 점수(Draft/Submitted), 코멘트, 회피 여부.
10. **audit_logs:** 개인정보 접근 및 다운로드 이력 기록.
11. **admin_contents:** U-Class 콘텐츠(아티클, 비디오) 데이터.
12. **admin_content_comments:** U-Class 아티클의 댓글/답변 데이터(계층형 구조).

## 4. Key Functional Requirements (개발 가이드)

### A. U-Class (Content Platform) [NEW]
1.  **Content Management:**
    * 관리자는 아티클(WYSIWYG 에디터) 및 비디오(YouTube Embed) 콘텐츠를 생성/관리.
    * 게시글 상태 관리 (Public/Private Toggle).
2.  **Interactive Learning:**
    * **Comment System:** 사용자는 아티클에 댓글(질문)을 남길 수 있음 (공개/비공개 지원).
    * **Admin Reply:** 관리자는 대시보드에서 미답변 댓글을 확인하고 답변 작성 가능.
3.  **Security:**
    * 비밀글은 작성자 본인과 관리자만 열람 가능 (Data Masking Server Action 처리).

### B. Frontend Layout & UI
1.  **Evaluator Interface (Split View):**
    * 평가 화면은 반드시 **좌우 분할(Split View)**되어야 함.
    * **Left:** 이력서/포트폴리오 뷰어 (PDF 뷰어 포함).
    * **Right:** 평가표(Scorecard) 및 메모장.
2.  **Corporate Admin (Quick View):**
    * 지원자 리스트에서 클릭 시 페이지 이동 없이 **우측 드로어(Drawer)**가 열려야 함.
    * 키보드 화살표로 이전/다음 지원자 이동 가능.
3.  **Visual Elements:**
    * 합격/불합격 상태는 **배지(Badge)** 형태로 시각화.
    * 자소서 내 핵심 키워드(예: React)는 **하이라이트(형광펜)** 처리.

### B. Online Test Stability (Fail-Safe)
1.  **Timer:** 클라이언트 시간이 아닌 **서버 시간**을 기준으로 잔여 시간을 계산.
2.  **Heartbeat:** 30초마다 서버에 생존 신호 전송, 실패 시 네트워크 불안정 경고.
3.  **Auto-Recovery:** 브라우저 재접속 시 마지막 저장 답안과 남은 시간을 복구.
4.  **Conditional Access:** 적성검사(Webcam 필수)는 **모바일 접속 차단** (PC Only).

### C. Security & Data Protection
1.  **Audit Logging:** `users` 또는 `applications` 테이블의 대량 조회/다운로드 시 반드시 `audit_logs`에 기록.
2.  **Blind Mode:** 공고 설정(`blind_mode = true`) 시, 평가자 화면에서 이름/사진/학교 정보를 마스킹(`***`) 처리.
3.  **Token Access:** 외부 평가자는 이메일 링크 내의 Token을 검증하여 로그인 절차 없이 접속.

## 5. Technology Stack & Constraints (기술 스택 - 필수 준수)

AI 에이전트는 반드시 아래의 기술 스택을 사용하여 코드를 작성해야 한다.

### A. Core Framework
* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript (타입 안정성 필수)
* **State Management:** React Context API 또는 Zustand (복잡도 낮춤)
* **Routing:** Next.js File-system Routing

### B. UI & Styling (디자인 통일성)
* **Styling Engine:** Tailwind CSS (빠른 스타일링 및 일관성 유지)
* **Component Library:** shadcn/ui 또는 Radix UI (접근성 및 고품질 UI 보장)
* **Icons:** Lucide React
* **Editor:** react-quill-new (React 19 호환 WYSIWYG)
* **Layout:**
    * Dashboard: Sidebar Navigation Layout
    * Evaluator Mode: Split View Layout (Left: PDF/Doc Viewer, Right: Form)

### C. Backend Integration
* **Database & Auth:** Supabase (SQL 스키마와 일치하는 Supabase Client 사용)
* **Data Fetching:** TanStack Query (React Query) - 서버 데이터 캐싱 및 로딩 상태 관리 / Server Actions (Mutation)

6.  **Language and Reporting (언어 및 보고 규칙):**
    *   **Korean First:** 모든 태스크(task.md), 구현 계획(implementation_plan.md), 워크쓰루(walkthrough.md) 보고서 및 사용자 통지는 반드시 **한국어**로 작성해야 함.
    *   **Clarity:** 기술적인 용어는 영문을 병기할 수 있으나, 주요 설명과 진행 상황은 한국어로 명확하게 전달할 것.

7.  **Error Handling:** 모든 비동기 요청(API 호출)에는 `try-catch` 구문을 사용하고, 사용자에게 에러 상황을 Toast 메시지 등으로 알릴 것.
8.  **AI Verification Rule (AI 검증 수칙):**
    *   **No Browser Verification:** 브라우저를 통한 AI 모드 자동 검증(`browser_subagent`)은 수행하지 말 것. 이는 불필요한 시간을 소모함.
    *   **User Verification:** 모든 기능 검증은 사용자가 직접 브라우저에서 수행하므로, AI는 코드 구현과 데이터 정합성 확인에 집중할 것.
