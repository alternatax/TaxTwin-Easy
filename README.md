# Thai Tax Compare (เปรียบเทียบภาษี บุคคลธรรมดา vs นิติบุคคล)

เครื่องมือเปรียบเทียบภาษีบุคคลธรรมดาและภาษีนิติบุคคลแบบเรียลไทม์ พร้อมระบบวิเคราะห์แนะนำด้วย AI (Gemini)

## สถาปัตยกรรม

ไม่มี build step หรือ Node server อีกต่อไป — เป็นเว็บ static ล้วนๆ:

- **หน้าเว็บ**: [index.html](index.html) + [app.tsx](app.tsx) — React (JSX/TypeScript) รันตรงในเบราว์เซอร์ผ่าน
  [Babel Standalone](https://babeljs.io/docs/babel-standalone) และโหลด React/lucide-react/motion/react-markdown
  ผ่าน [esm.sh](https://esm.sh) ด้วย import map ไม่ต้อง `npm install` หรือ build ใดๆ
  ใช้ [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) สำหรับ utility classes
- **Backend**: [apps-script/Code.gs](apps-script/Code.gs) — Google Apps Script deploy เป็น Web App
  ทำหน้าที่เรียก Gemini API และบันทึก log การเข้าใช้งานลง Google Sheet โดยตรง

## ติดตั้ง Backend (Google Apps Script) — ทำครั้งเดียว

1. เปิด [script.google.com](https://script.google.com) แล้วสร้างโปรเจกต์ใหม่
2. คัดลอกโค้ดจาก [apps-script/Code.gs](apps-script/Code.gs) ไปวางแทนที่โค้ดเริ่มต้น และคัดลอก
   [apps-script/appsscript.json](apps-script/appsscript.json) ไปแทนที่ manifest (เปิดผ่าน **Project Settings > Show "appsscript.json"**)
3. ไปที่ **Project Settings > Script Properties** แล้วเพิ่มค่า `GEMINI_API_KEY`
   (ไม่ใส่ก็ได้ — ระบบจะใช้คำแนะนำสำรองแบบกฎเกณฑ์แทน)
4. ตรวจสอบว่าตัวแปร `SPREADSHEET_ID` ที่ต้นไฟล์ `Code.gs` ตรงกับ Google Sheet ที่ต้องการเก็บ log
   (ค่าเริ่มต้นชี้ไปที่ Sheet ที่ตั้งค่าไว้แล้ว) — บัญชีที่ใช้ deploy สคริปต์ต้องมีสิทธิ์แก้ไข Sheet นี้ด้วย
5. กด **Deploy > New deployment** เลือกประเภท **Web app**
6. ตั้งค่า **Execute as: Me** และ **Who has access: Anyone** แล้วกด Deploy
7. คัดลอก Web App URL ที่ได้ ไปวางแทนที่ `GAS_API_URL` ใน [app.tsx](app.tsx)

ทุกครั้งที่มีคนล็อกอินเข้าเว็บ ระบบจะเขียน log ลง sheet ชื่อ "Logs" ใน Google Sheet ที่ตั้งค่าไว้ข้างต้นโดยอัตโนมัติ
ดูลิงก์ชีทได้จากแท็บ "🛡️ ระบบผู้ดูแล" ในเว็บ (บัญชี `acct.prom@gmail.com`)

หากแก้โค้ดใน `Code.gs` ภายหลัง (เช่นเปลี่ยน `SPREADSHEET_ID`) ต้องไปที่ **Deploy > Manage deployments**
กดไอคอนดินสอ แล้วเลือก **Version: New version** ก่อนกด Deploy อีกครั้ง ไม่เช่นนั้น Web App URL เดิม
จะยังรันโค้ดเวอร์ชันเก่าอยู่

## รันดูในเครื่อง

เนื่องจากใช้ ES module + import map ต้องเปิดผ่าน HTTP server (เปิดไฟล์ `index.html` ตรงๆ ผ่าน `file://` จะไม่ทำงาน):

```bash
npx serve .
# หรือ
python -m http.server 8000
```

แล้วเปิด URL ที่เครื่องมือแสดง (เช่น http://localhost:3000 หรือ http://localhost:8000)

## Deploy ขึ้น GitHub Pages

1. Push repo นี้ขึ้น GitHub
2. ไปที่ **Settings > Pages** เลือก **Deploy from a branch** และเลือก branch/root
3. เว็บจะพร้อมใช้งานที่ `https://<username>.github.io/<repo>/`
