# Cursor rules (`new-authoringtool`)

กฎเหล่านี้อยู่ในโฟลเดอร์ **`.cursor/rules/`** เป็นข้อตกลงสำหรับ AI / ทีมเมื่อแก้โปรเจค **Next.js authoring tool** (โฟลเดอร์ `new-authoringtool`)

| ไฟล์ | ใช้เมื่อไหร่ | สรุป |
|------|----------------|------|
| **`000-core.mdc`** | ทุกเซสชัน (`alwaysApply: true`) | Stack Next.js, ขอบเขต canvas editor, IndexedDB, ความปลอดภัย, `"use client"` |
| **`010-typescript.mdc`** | แก้ `.ts` / `.tsx` | สไตล์ TypeScript, ชนิดใน editor จาก `core/doc` |
| **`020-component.mdc`** | แก้ `.tsx` | แยก `app/` / shadcn กับ `features/editor`, Konva, client components |
| **`030-custom-hooks.mdc`** | แก้ `src/hooks/**` | Hooks + Query; ไม่ย้าย logic editor ไป hooks ถ้ามี store/command แล้ว |
| **`040-tanstack-query.mdc`** | แก้ `src/hooks/query/**` | Query keys, mutation — สำหรับ API ระยะหลัง |
| **`050-axios-http.mdc`** | แก้ `src/libs/**`, `src/services/**` | instance **`api`**, interceptors, `NEXT_PUBLIC_API_BASE_URL` |
| **`060-file-structure.mdc`** | โครงสร้าง / config | เลเยอร์จริง (`app/`, editor, services/api, `next.config.js`) |
| **`070-state-management.mdc`** | state ทั่วไป | docStore + editor Zustand vs Query vs local state |

หมายเหตุ: Cursor โหลดกฎจาก **`.cursor/rules/`** — ถ้ากฎไม่ถูก pick up ให้ตรวจว่า workspace ชี้มาที่โฟลเดอร์ `new-authoringtool` นี้

---

## คำอธิบายแต่ละไฟล์ (อ่านสำหรับทีม — ไม่ใช่คำสั่งเพิ่มของ AI)

ด้านล่างคือสรุปว่า **เนื้อหาในแต่ละไฟล์กฎหมายถึงอะไร** เพื่อให้คนดูแล repo เข้าใจตรงกับไฟล์ `.mdc` จริง

### `000-core.mdc` — กฎหลักของโปรเจกต์นี้

- **Frontmatter (`alwaysApply: true`)** — กฎชุดนี้ถูกนำไปใช้ในทุกเซสชันโดยไม่ต้อง match ไฟล์
- **ขอบเขต** — ใช้กับ `new-authoringtool/` เป็นแอป **Next.js App Router** สำหรับเครื่องมือเขียน canvas
- **Stack baseline** — Next.js 16, React 19, TanStack Query v5, Axios, TypeScript (`tsconfig.json`); editor ใช้ Konva + Immer + Zustand; persistence ผ่าน `docs.service` + IndexedDB; global CSS ที่ `layout.tsx`; Konva ต้อง transpile ใน `next.config.js`
- **Working rules** — อ่านไฟล์ใกล้เคียงก่อนแก้, ใช้ `@/`; Server Component เป็น default — ไฟล์ที่ใช้ hooks/Konva/Zustand ต้องมี `"use client"`
- **Always / Never** — คง path โหลด/บันทึกเอกสาร, route (`/dashboard`, `/editor/:docId`), undo/history; ห้าม eval, innerHTML ไม่ตรวจ, API key ฮาร์ดโค้ด
- **Relationship** — รายละเอียด path/layer ให้ดู `060-file-structure.mdc`

### `010-typescript.mdc` — นิยามและขอบเขต TypeScript

- **เมื่อมีผล** — `src/**/*.{ts,tsx}`
- **Do** — ให้ `next build` ผ่าน; อิง `tsconfig.json`; interface/type ตามมาตรฐาน; `unknown` ที่ขอบเขตภายนอก; โมเดล editor จาก `core/doc/types.ts`; dynamic route ใช้ `params: Promise<...>` + `await params`
- **Don't** — หลีกเลี่ยง `any`, `as` ไม่ตรวจ, `@ts-ignore` โดยไม่มีเหตุผล
- **Security** — JSON/IDB ต้อง migrate/normalize ก่อนเชื่อ type

### `020-component.mdc` — React UI (shell, shadcn, พื้นที่ editor)

- **เมื่อมีผล** — `src/**/*.tsx`
- **App shell vs editor** — `src/app/**`, `components/ui` = routing/layout/shadcn; `features/editor` = canvas และ UI เอดิเตอร์
- **Do** — functional component; `"use client"` สำหรับ interactive; page บาง — ส่ง props ไป `EditorClient`; Konva ใช้ commands/stores
- **Don't** — ไม่ฝัง mutation แค่ใน JSX; ไม่ import Konva ใน Server Component โดยไม่มี client boundary
- **Security** — input/overlay/drag-drop ถือว่าไม่น่าเชื่อถือจน validate

### `030-custom-hooks.mdc` — Hooks ใต้ `src/hooks`

- **เมื่อมีผล** — `src/hooks/**`
- **Do** — prefix `use`; Query ที่ `hooks/query/**` + `*.keys.ts`; HTTP ผ่าน `services` + `api`
- **หมายเหตุ editor** — logic ส่วนใหญ่อยู่ stores/commands ไม่ใช่ hooks
- **Don't** — Rules of Hooks; ไม่ซ้ำ options ของ useQuery/useMutation

### `040-tanstack-query.mdc` — TanStack Query (API ระยะหลัง)

- **เมื่อมีผล** — `src/hooks/query/**`
- **Context** — persistence เอกสารหลัก = IndexedDB; ใช้กฎนี้เมื่อเพิ่ม remote API
- **Do** — useQuery/useMutation; queryKey ใน `*.keys.ts`; จัดการ pending/error/invalidate
- **Don't** — อย่า useEffect+axios สำหรับ read ปกติ; อย่าเก็บความลับใน cache

### `050-axios-http.mdc` — Axios, interceptors, services

- **เมื่อมีผล** — `src/libs/**`, `src/services/**`
- **Do** — instance `api` เดียว; interceptors สำหรับ auth/error/log; base URL จาก `NEXT_PUBLIC_API_BASE_URL`
- **Don't** — ไม่สร้าง axios ชุดที่สอง; ไม่เรียก axios ตรงจาก `src/app/**` page; ไม่ log body เต็ม
- **หมายเหตุ** — `docs.service` ใช้ IndexedDB ไม่ใช่ Axios

### `060-file-structure.mdc` — path, เลเยอร์, import

- **เมื่อมีผล** — `src/**`, `next.config.js`, `tsconfig.json`, `package.json`
- **Layers** — `app/` (routing), `components/`, `features/editor/`, `services/api/`, `shared/`, `lib/`, `hooks/`, `libs/axios/`, `constants/`
- **Do** — alias `@/` ใน `tsconfig.json`; paths ใน `constants/paths.ts`; providers ใน `app/providers.tsx` + `layout.tsx`; mutations ผ่าน commands + docStore
- **Don't** — อย่าย้าย core editor ไป `app/` หรือ root `components/`; อย่า commit `.env` ที่มีความลับ; อย่าเอา `src/router/` หรือ `src/pages/` กลับมา
- **Scope** — เฉพาะ `new-authoringtool/` (แอป Next.js ในโฟลเดอร์นี้)

### `070-state-management.mdc` — Zustand ใน editor vs Query vs state ท้องถิ่น

- **เมื่อมีผล** — `src/**/*.{ts,tsx}`
- **Roles** — เอกสาร/canvas/undo = docStore + history; tool/UI = editor stores; server data อนาคต = Query; UI จุดเล็ก = useState
- **Zustand** — store typed, action เล็ก, select slice ที่จำเป็น
- **Don't** — ไม่ซ้ำ payload เอกสารใน store ใหม่; ไม่เก็บ token ใน Zustand
- **หมายเหตุ** — "pages" ในตารางหมายถึง **หน้าเอกสารใน editor** ไม่ใช่ route ของ Next
