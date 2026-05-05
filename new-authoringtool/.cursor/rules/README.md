# Cursor rules (`new-authoringtool`)

กฎเหล่านี้อยู่ในโฟลเดอร์ **`.cursor/rules/`** เป็นข้อตกลงสำหรับ AI / ทีมเมื่อแก้โปรเจค **Vite authoring tool** (โฟลเดอร์ `new-authoringtool`) ไม่ใช่แอป Next.js ที่ root ของ monorepo

| ไฟล์ | ใช้เมื่อไหร่ | สรุป |
|------|----------------|------|
| **`000-core.mdc`** | ทุกเซสชัน (`alwaysApply: true`) | Stack, ขอบเขต canvas editor, persistence ผ่าน IndexedDB, ความปลอดภัยพื้นฐาน |
| **`010-typescript.mdc`** | แก้ `.ts` / `.tsx` | สไตล์ TypeScript, ชนิดใน editor จาก `core/doc` |
| **`020-component.mdc`** | แก้ `.tsx` | แยก shell/shadcn กับ `features/editor`, Konva |
| **`030-custom-hooks.mdc`** | แก้ `src/hooks/**` | Hooks + Query; ไม่ย้าย logic editor ไป hooks ถ้ามี store/command แล้ว |
| **`040-tanstack-query.mdc`** | แก้ `src/hooks/query/**` | Query keys, mutation — สำหรับ API ระยะหลัง |
| **`050-axios-http.mdc`** | แก้ `src/libs/**`, `src/services/**` | instance **`api`**, interceptors, `VITE_API_BASE_URL` |
| **`060-file-structure.mdc`** | โครงสร้าง / config | เลเยอร์จริงของโปรเจคนี้ (pages, router, editor, services/api) |
| **`070-state-management.mdc`** | state ทั่วไป | docStore + editor Zustand vs Query vs local state |

หมายเหตุ: Cursor บางเวอร์ชันโหลดกฎจาก **`.cursor/rules/`** (มี s) — ถ้ากฎไม่ถูก pick up ให้คัดลอกโฟลเดอร์นี้ไปที่ workspace ที่ Cursor ชี้อยู่ หรือตั้งค่าให้ชี้ path นี้

---

## คำอธิบายแต่ละไฟล์ (อ่านสำหรับทีม — ไม่ใช่คำสั่งเพิ่มของ AI)

ด้านล่างคือสรุปว่า **เนื้อหาในแต่ละไฟล์กฎหมายถึงอะไร** เพื่อให้คนดูแล repo เข้าใจตรงกับไฟล์ `.mdc` จริง

### `000-core.mdc` — กฎหลักของโปรเจกต์นี้
/*
  frontmatter:
    description — บอกว่าเป็น stack หลัก + guardrails ของ canvas editor
    alwaysApply: true — กฎนี้ถูกดึงมาใช้ทุกครั้งโดยไม่ต้อง match ไฟล์

  # new-authoringtool — core
    ขอบเขต: ใช้กับโฟลเดอร์ new-authoringtool/ (Vite + React SPA สำหรับเครื่องมือเขียน canvas)

  ## Stack baseline
    - React 19, Router 7, TanStack Query v5, Axios, TS — อิง tsconfig.app.json
    - แก้ไข canvas: Konva, Immer, Zustand ที่ src/features/editor/stores/**
    - บันทึกเอกสารตอนนี้: docs.service + indexeddb (ไม่ใช่แอป CRUD REST ทั่วไป)
    - สไตล์ global: src/shared/styles/globals.css

  ## Working rules
    - อ่านไฟล์ใกล้เคียงก่อนแก้; import แบบ @/ ตามแพทเทิร์น editor
    - จำกัดขอบเขตงานตามที่ขอ; อย่ารีแฟกเตอร์ส่วนอื่นที่ไม่เกี่ยว
    - คิดว่าเป็นโค้ด production — ถูกต้อง ดูแลต่อได้ ไม่รั่วความลับ

  ## Always / Never
    - Always: คง path โหลด/เบิกเอกสาร, route (/dashboard, /editor/:docId), undo/history
    - Never: eval, innerHTML ไม่ตรวจ, API key ฮาร์ดโค้ด, กลืน error
    - Exception: class component เฉพาะที่จำเป็น (เช่น Error Boundary)

  ## Relationship to other rules
    - รายละเอียด path/layer ให้ดู 060-file-structure.mdc
*/

### `010-typescript.mdc` — นิยามและขอบเขต TypeScript
/*
  frontmatter:
    globs: src/**/*.{ts,tsx} — เปิดใช้เมื่อทำงานกับ TS/TSX ใน src
    alwaysApply: false — ไม่บังคับทุกแชท

  ## Do
    - ให้ tsc -b ผ่าน; อิง tsconfig.app.json
    - interface = รูปทรงวัตถุ; type = union / intersection / utility
    - ขอบเขตภายนอกใช้ unknown แล้วค่อย narrow
    - hook/service ที่ export อาจใส่ return type ให้ชัด
    - โมเดล editor ใช้ core/doc/types เป็นต้นทางเดียว ไม่สร้างโมเดลซ้ำซ้อน

  ## Don't
    - หลีกเลี่ยง any (ถ้าจำเป็นต้องมีคอมเมนต์สั้นๆ)
    - หลีกเลี่ยง as กับ IDB/API โดยไม่ตรวจหรือไม่มี invariant
    - หลีกเลี่ยง ts-ignore โดยไม่มีเหตุผล

  ## Security
    - ยึด 000-core; JSON/IDB ไม่เชื่อว่าตรง type ต้องมี migration/normalize (ดู migrate.ts)
*/

### `020-component.mdc` — React UI (shell, shadcn, พื้นที่ editor)
/*
  frontmatter: globs src/**/*.tsx — เน้น React UI

  ## App shell vs editor
    - pages, router, components/ui = dashboard, routing, shadcn
    - features/editor = layout เอดิเตอร์, sidebar, Konva — แยก concern

  ## Do
    - functional component, ชื่อไฟล์ PascalCase
    - props เป็น interface เมื่อช่วยได้; props ชัดและเล็ก
    - Konva: logic การ mutate เอกสารไม่ยัดใน JSX ก้อนใหญ่ — ใช้ command/store ที่มีอยู่

  ## Don't
    - ไม่เอากฎการแก้เอกสารไปผูกแค่ใน JSX — ใช้ commands / docStore / history
    - ไม่ใช้ dangerouslySetInnerHTML กับ HTML จาก API/ผู้ใช้โดยไม่ sanitize
    - ไม่ข้าม convention selection/history ของ editor

  ## Security
    - ยึด 000-core; input/overlay/drag-drop ถือว่าไม่น่าเชื่อถือจนกว่าจะ validate
*/

### `030-custom-hooks.mdc` — Hooks ใต้ `src/hooks`
/*
  frontmatter: globs src/hooks/** — เฉพาะ hooks

  ## Do
    - hook ต้องขึ้นต้นด้วย use
    - TanStack Query จัดที่ src/hooks/query/** และมี *.keys.ts คู่กัน
    - HTTP ผ่าน services + instance api จาก libs/axios

  ## Editor-specific note
    - logic เอดิเตอร์ส่วนใหญ่อยู่ stores + commands ไม่ใช่ hooks
    - เพิ่ม hooks ตรงนี้เมื่อมี API/Query ใหม่; อย่าซ้ำ state ที่อยู่ใน docStore แล้ว

  ## Don't
    - ห้ามผิด Rules of Hooks
    - อย่าซ้ำ options ของ useQuery/useMutation ทุกที่ — ห่อเป็น hook

  ## Security
    - hook ที่เกี่ยว auth ห้ามส่งความลับไป UI ที่ไม่เกี่ยว
*/

### `040-tanstack-query.mdc` — TanStack Query (API ระยะหลัง)
/*
  frontmatter: globs src/hooks/query/** — เฉพาะเลเยอร์ Query

  ## Context
    - persistence เอกสารหลักคือ IndexedDB + docsService ไม่ใช่ Query
    - ใช้กฎนี้เมื่อเพิ่ม remote API (list, auth, sync) คู่กับ editor

  ## Do
    - อ่านด้วย useQuery; เขียนด้วย useMutation
    - รวม queryKey ใน *.keys.ts ต่อโดเมน
    - จัดการ pending/error, empty, invalidate หลัง mutation

  ## Don't
    - อย่าใช้ useEffect + axios สำหรับการอ่านจากเซิร์ฟเวอร์ปกติ
    - อย่าเก็บความลับใน query cache

  ## Security
    - validate JSON ภายนอกก่อนถือว่าเป็น domain type
*/

### `050-axios-http.mdc` — Axios, interceptors, services
/*
  frontmatter: globs src/libs/** และ src/services/**

  ## Do
    - ใช้ instance เดียว export ชื่อ api จาก libs/axios/instance.ts
    - auth, error ทั่วโลก, log dev อยู่ interceptors
    - endpoint = ฟังก์ชันเล็ก typed ใน services/
    - base URL: VITE_API_BASE_URL; ถ้ามี .env.example ให้บันทึก placeholder

  ## Don't
    - อย่าสร้าง axios.create() ที่สองสำหรับ flow ปกติ
    - อย่าเรียก axios ตรงๆ จาก pages — ผ่าน services (+ Query ถ้าเหมาะ)
    - อย่า log body ทั้งก้อน (อาจมี token/PII)

  ## Local docs note
    - docs.service ใช้ IndexedDB ไม่ใช่ Axios — แยกความรับผิดชอบให้ชัดเมื่อเพิ่ม HTTP

  ## Security
    - ยึด 000-core
*/

### `060-file-structure.mdc` — path, เลเยอร์, import
/*
  frontmatter: globs ครอบ src, vite.config, tsconfig, package.json — เวลาโครงสร้าง/config

  ## Layers (authoring app)
    ตารางบอกหน้าที่แต่ละโฟลเดอร์: pages, router, components, features/editor,
    services/api (docs + IDB), shared, lib (cn), hooks, libs/axios

  ## Do
    - alias @/ ให้ตรงกันระหว่าง vite และ tsconfig
    - path คงที่อยู่ constants/paths.ts
    - การแก้เอกสารใน editor ผ่าน commands + docStore

  ## Don't
    - อย่าย้าย core editor ไป pages/components ราก
    - อย่า commit .env ที่มีความลับ

  ## Barrel files
    - ใช้ index.ts เฉพาะขอบเขตที่มั่นคง; โมดูล editor ใหญ่ๆ อาจ import ตรงเพื่อ tree-shaking

  ## Scope
    - เฉพาะ new-authoringtool/ ไม่รวม Next ที่ root ยกเว้นขอเป็นอย่างอื่น
*/

### `070-state-management.mdc` — Zustand ใน editor vs Query vs state ท้องถิ่น
/*
  frontmatter: globs src/**/*.{ts,tsx} — เวลาคิดเรื่อง state

  ## Roles
    - โมเดลเอกสาร + canvas + undo: docStore (+ Immer), history ใน core/history
    - โหมดเครื่องมือ/UI: toolStore, selectionStore ฯลฯ
    - ข้อมูลจากเซิร์ฟเวอร์ในอนาคต: TanStack Query ที่ hooks/query
    - UI เฉพาะจุด: useState/useReducer ใกล้ที่สุด

  ## Zustand (editor) — Do
    - store มี type, action เล็ก; getState() นอก React ตามที่โค้ดเดิมใช้

  ## Zustand — Don't
    - อย่าซ้ำ payload เต็มเอกสารใน store ใหม่ — doc อยู่ที่ docStore + docsService
    - อย่าพก token/password ใน Zustand

  ## TanStack Query
    - เมื่อมี backend: list/detail จากเซิร์ฟเวอร์อยู่ Query; canvas อยู่ editor store ยกเว้นจงใจ sync

  ## Security
    - DevTools เห็น client state — ห้ามใส่ความลับใน field ธรรมดา
*/