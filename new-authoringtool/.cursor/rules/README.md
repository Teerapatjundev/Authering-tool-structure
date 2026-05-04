# Cursor rules (`new-authoringtool`)

กฎเหล่านี้อยู่ในโฟลเดอร์ **`.cursor/rule/`** เป็นข้อตกลงสำหรับ AI / ทีมเมื่อแก้โปรเจค **Vite authoring tool** (โฟลเดอร์ `new-authoringtool`) ไม่ใช่แอป Next.js ที่ root ของ monorepo

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

หมายเหตุ: Cursor บางเวอร์ชันโหลดกฎจาก **`.cursor/rules/`** (มี s) — ถ้ากฎไม่ถูก pick up ให้คัดลอกโฟลเดอร์นี้ไปที่ `.cursor/rules/` หรือตั้งค่าใน Cursor ให้ชี้มาที่ path นี้
