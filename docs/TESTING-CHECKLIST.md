# DreamFly CRM — চালানো ও টেস্ট করার গাইড

সিস্টেমটা নিজের কম্পিউটারে চালিয়ে প্রতিটা ফিচার যাচাই করার সম্পূর্ণ ধাপ।

---

## পর্ব ১ — সিস্টেম চালু করা

### ১.১ Node.js ইনস্টল করুন (একবারই)

<https://nodejs.org> থেকে **LTS** ভার্সন ডাউনলোড করে ইনস্টল করুন (Windows / Mac দুটোতেই)।

ইনস্টল হয়েছে কিনা দেখতে Terminal (Mac) বা PowerShell (Windows) খুলে লিখুন:

```bash
node -v
```

`v18` বা তার বেশি দেখালে ঠিক আছে।

### ১.২ কোড নামান

```bash
git clone https://github.com/shakilaslam24/thai-evisa-helper.git
cd thai-evisa-helper
git checkout claude/dreamfly-crm-system-4xajri
```

> Git ইনস্টল করা না থাকলে: GitHub-এ branch টা খুলে **Code → Download ZIP** দিয়ে নামিয়ে
> ফোল্ডারটা unzip করুন, তারপর সেই ফোল্ডারে Terminal খুলুন।

### ১.৩ ইনস্টল ও ডেমো ডেটা

```bash
npm install
npm run seed -- --demo
```

`--demo` দিলে কিছু নমুনা lead, customer, file, partner ও invoice তৈরি হয় — টেস্ট করার
জন্য সুবিধা। একদম খালি সিস্টেম চাইলে `--demo` বাদ দিন।

স্ক্রিনে অ্যাডমিন পাসওয়ার্ড দেখাবে — **এটা একবারই দেখায়, লিখে রাখুন**:

```
──────────────────────────────────────────────
 DreamFly CRM — administrator account created
   Email:    admin@dreamfly.local
   Password: XXXXXXXXXXXX
──────────────────────────────────────────────
```

### ১.৩ক নিজের ইমেইল-পাসওয়ার্ড দিতে চাইলে

**যেকোনো সময়** নিচের কমান্ড দিয়ে অ্যাডমিন অ্যাকাউন্ট তৈরি বা পাসওয়ার্ড বদল করা যায় —
নিচের ইমেইল-পাসওয়ার্ডের জায়গায় **আপনার নিজেরটা** বসান:

```bash
npm run admin -- --email apnar-email@gmail.com --password 'ApnarPassword123'
```

> ⚠️ উপরের `apnar-email@gmail.com` শুধু **উদাহরণ** — হুবহু এটা লিখবেন না,
> আপনার নিজের ইমেইল বসান।

**পাসওয়ার্ড ভুলে গেলে** একই কমান্ড দিয়ে যেকোনো অ্যাকাউন্টের পাসওয়ার্ড বদলানো যায়।

কোন কোন অ্যাকাউন্ট আছে দেখতে:

```bash
npm run admin -- --list
```

### ১.৪ চালু করুন

```bash
npm start
```

ব্রাউজারে খুলুন: **<http://localhost:3000>**

> সার্ভার বন্ধ করতে Terminal-এ `Ctrl + C`।

### ১.৫ মোবাইল থেকে দেখতে চাইলে

কম্পিউটার আর ফোন একই WiFi-তে থাকলে, কম্পিউটারের IP বের করুন
(`ipconfig` / `ifconfig`), তারপর ফোনে খুলুন `http://192.168.x.x:3000`।

### ডেমো লগইন (যদি `--demo` দিয়ে থাকেন)

| রোল | ইমেইল | পাসওয়ার্ড |
| --- | --- | --- |
| Admin | admin@dreamfly.local | (স্ক্রিনে দেখানো) |
| Staff | rafiq@dreamfly.local | demo-staff-2026 |
| Accounts | accounts@dreamfly.local | demo-accts-2026 |

---

## পর্ব ২ — টেস্ট চেকলিস্ট

প্রতিটা ঘরে টিক দিতে দিতে এগোন। যেটা কাজ না করে, সেটা নোট করে জানান।

### ২.১ লগইন ও অ্যাকাউন্ট

- [ ] ভুল পাসওয়ার্ড দিলে "Incorrect email or password" দেখায়
- [ ] সঠিক পাসওয়ার্ডে ড্যাশবোর্ড আসে
- [ ] উপরে ডানে নিজের নামে ক্লিক → **Change password** কাজ করে
- [ ] একই মেনু থেকে **Theme** (System / Light / Dark) বদলায়
- [ ] **Sign out** কাজ করে

### ২.২ ড্যাশবোর্ড (§2)

- [ ] Total leads, Today's follow-up, Overdue follow-up, Today's meetings,
      Total customers, Active files — সব সংখ্যা দেখাচ্ছে
- [ ] File & case status বক্সে Under processing / Interview pending /
      Documents pending / Approved / Rejected / Completed আছে
- [ ] B2B partners, Invoices, Pending payments, Monthly sales দেখাচ্ছে
- [ ] যেকোনো সংখ্যায় ক্লিক করলে সেই ফিল্টার করা লিস্ট খোলে
- [ ] **Whole company** ↔ **My work** বাটন সংখ্যা বদলায়

### ২.৩ Lead Management (§3)

- [ ] **Leads → + Add lead** — নাম, ফোন, WhatsApp, ইমেইল, ঠিকানা, Source,
      Service, Country, Priority, Assigned staff, Next follow-up — সব ফিল্ড আছে
- [ ] সেভ করলে সরাসরি lead-এর প্রোফাইল খোলে
- [ ] Lead প্রোফাইলে **Call** বাটনে ফোন নম্বর ওঠে
- [ ] **WhatsApp** বাটনে WhatsApp খোলে
- [ ] **Add follow-up** কাজ করে
- [ ] **Schedule meeting** কাজ করে, আর lead-এর status নিজে থেকে
      "Meeting Fixed" হয়ে যায়
- [ ] Status ড্রপডাউন থেকে status বদলানো যায়
- [ ] নিচে **Notes & activity timeline**-এ প্রতিটা কাজের রেকর্ড জমা হচ্ছে
- [ ] নোট বক্সে লিখে **Add note** দিলে timeline-এ যোগ হয়
- [ ] উপরের সার্চ ও ফিল্টার (Status / Priority / Source / Country / Staff) কাজ করে

### ২.৪ Lead → Customer কনভার্ট (§3.2, §6)

- [ ] Lead প্রোফাইলে **→ Convert to customer** চাপুন
- [ ] পাসপোর্ট নম্বর, জন্মতারিখ, NID, Gender, Nationality দেওয়া যায়
- [ ] সেভ করলে customer প্রোফাইল খোলে
- [ ] Lead-এর status "Converted" হয়ে গেছে
- [ ] Customer প্রোফাইলে "Originated from lead" লিংক দেখাচ্ছে

### ২.৫ Follow-up ও Reminder (§4, §15)

- [ ] **Follow-up** মেনুতে Due today / Overdue / Upcoming / All চিপ কাজ করে
- [ ] নিজের নামের বাটনে চাপলে শুধু নিজের কাজ দেখায়
- [ ] **Complete** চেপে outcome লেখা যায়, এবং সেখান থেকেই পরের follow-up date দেওয়া যায়
- [ ] পরের follow-up টা সাথে সাথে লিস্টে চলে আসে

**রিমাইন্ডার টেস্ট (গুরুত্বপূর্ণ):**

- [ ] একটা follow-up-এর সময় **আজকের, ২ মিনিট পরের** দিন
- [ ] ২ মিনিট অপেক্ষা করে পেজ রিফ্রেশ করুন
- [ ] উপরে ডানে 🔔 ঘণ্টায় লাল সংখ্যা এসেছে
- [ ] ঘণ্টায় ক্লিক করলে ওই রিমাইন্ডার দেখাচ্ছে
- [ ] পুরনো তারিখ দিলে সেটা "Overdue" হিসেবে দেখাচ্ছে

### ২.৬ Meeting Management (§5)

- [ ] **Meetings → + Schedule meeting** — Title, Date, Time, Type
      (Office Visit / Phone Call / Video Call / Follow-up), Staff, Notes,
      Remind before — সব আছে
- [ ] Today / Upcoming / All চিপ কাজ করে
- [ ] **Done** চাপলে status "Completed" হয়
- [ ] **Edit** দিয়ে Rescheduled / Cancelled করা যায়
- [ ] Remind before সময় হলে 🔔-এ নোটিফিকেশন আসে

### ২.৭ Customer Management (§6)

- [ ] **Customers → + Add customer** — Given name, Surname, DOB, Passport,
      Phone, Email, Address, NID, Gender, Nationality, Service, Country,
      Notes — সব ফিল্ড আছে
- [ ] পাসপোর্ট নম্বর দিয়ে সার্চ করলে পাওয়া যায়
- [ ] প্রোফাইলে Files, Invoices, Documents, Timeline — সব সেকশন আছে

### ২.৮ File / Case Management (§7)

- [ ] Customer প্রোফাইল থেকে **+ New file** — file খোলে
- [ ] Reference number নিজে থেকে তৈরি হয় (যেমন `DF-2026-0001`)
- [ ] File-এ Submission date, Embassy/VFS date, Interview date,
      Completion date দেওয়া যায়
- [ ] Status ড্রপডাউনে ১২টা status-ই আছে (Draft … Hold)
- [ ] Approved / Rejected / Completed করলে Completion date নিজে থেকে বসে যায়
- [ ] **Document checklist**-এ Passport Copy, Photo, NID, Bank Statement,
      Air Ticket, Hotel Booking আছে
- [ ] প্রতিটা আইটেম Missing / Received / Not Required করা যায়
- [ ] **+ Add item** দিয়ে নতুন ডকুমেন্ট যোগ করা যায়

### ২.৯ B2B Partner Management (§8) — সবচেয়ে গুরুত্বপূর্ণ

- [ ] **B2B Partners → + Add partner** — Partner name, Company name,
      Company address, Personal address, Personal phone, Company phone,
      WhatsApp, Email, Trade license, NID/Passport, Commission note,
      Agreement note, Status — সব ফিল্ড আছে
- [ ] Partner প্রোফাইলে **Total files, Under processing, Approved, Rejected,
      Interview called, Documents missing, Total billed, Total paid,
      Outstanding** — সব সংখ্যা দেখাচ্ছে
- [ ] Files submitted, Invoice history, Payment history — তিনটা টেবিলই আছে
- [ ] **+ Add file under partner** চাপুন → পাসপোর্ট, Surname, Given name, DOB,
      Phone, Email, Address, Country, Service, Status, Notes, Reference —
      সব দেওয়া যায়
- [ ] সেভ করলে customer + file দুটোই একসাথে তৈরি হয়
- [ ] **ডুপ্লিকেট টেস্ট:** একই পাসপোর্ট নম্বর দিয়ে আবার file যোগ করুন —
      নতুন customer না বানিয়ে আগের customer-এর নিচেই file যোগ হওয়া উচিত

### ২.১০ Document Management (§9)

- [ ] Customer / File / Partner প্রোফাইলে Category বেছে ফাইল আপলোড করা যায়
- [ ] **View** চাপলে ব্রাউজারে খোলে
- [ ] **Download** চাপলে ডাউনলোড হয়
- [ ] `Passport Copy` ক্যাটাগরিতে আপলোড করলে checklist-এর
      "Passport Copy" নিজে থেকে **Received** হয়ে যায়
- [ ] **Documents** মেনুতে প্রথম কলামে **কার ডকুমেন্ট** (নাম + পাসপোর্ট + রেফারেন্স) দেখাচ্ছে
- [ ] নাম বা পাসপোর্ট নম্বর দিয়ে সার্চ করলে ডকুমেন্ট পাওয়া যায়
- [ ] **Uploaded by** ফিল্টার ও **Only my uploads** বাটন কাজ করে

### ২.১০ক ক্লায়েন্ট ট্র্যাকিং পেজ (লগইন ছাড়া)

- [ ] `http://localhost:3000/track.html` খুলুন — লগইন ছাড়াই খোলে
- [ ] ভুল নাম দিলে কিছুই দেখায় না
- [ ] সঠিক পাসপোর্ট + নাম দিলে স্ট্যাটাস, তারিখ ও বাকি ডকুমেন্টের তালিকা দেখায়
- [ ] **শুধু surname** দিলেও কাজ করে
- [ ] নামের আগে **Md.** লিখলেও কাজ করে
- [ ] ছোট/বড় হাতের অক্ষর, বাড়তি স্পেস, উল্টো ক্রম — সবই চলে
- [ ] ফোন নম্বর, ঠিকানা, টাকার অঙ্ক — এসব **দেখায় না**
- [ ] File পেজে **🔗 Tracking link** বাটন লিংক কপি করে
- [ ] Settings → Notification settings → **Public application tracking** বন্ধ করা যায়
- [ ] **Delete** কাজ করে

### ২.১১ Invoice (§10)

- [ ] Customer প্রোফাইল থেকে **+ Invoice** কাজ করে (কাস্টমার আগেই বসানো থাকে)
- [ ] Partner প্রোফাইল থেকেও **+ Invoice** কাজ করে
- [ ] **Invoices → + Create invoice** — উপরে **Direct customer / B2B partner** দুটো বাটন আছে
- [ ] **Direct customer** বেছে নাম বা পাসপোর্ট নম্বর লিখলে কাস্টমার খুঁজে পাওয়া যায়
- [ ] কাস্টমার বাছলে তার **ফাইল লিংক করার ড্রপডাউন** আসে
- [ ] ফাইল লিংক করলে পেমেন্ট দিলে **ফাইলের payment status বদলায়**
- [ ] কাস্টমার না বেছে সেভ করলে আটকায়
- [ ] **B2B partner** বাটনে চাপলে পার্টনার ড্রপডাউন আসে
- [ ] Invoice number নিজে থেকে তৈরি হয় (`DF-INV-2026-0001`)
- [ ] **+ Add line** দিয়ে একাধিক আইটেম যোগ করা যায়
- [ ] Quantity ও Unit price লিখলে Amount ও Total নিজে থেকে হিসাব হয়
- [ ] Discount ও Tax দিলে Total ঠিকভাবে বদলায়
- [ ] Invoice-এ কোম্পানির নাম, ঠিকানা, ফোন, terms দেখাচ্ছে
- [ ] **🖨 Print** চাপলে প্রিন্ট প্রিভিউ আসে (sidebar/menu বাদ, শুধু invoice)
- [ ] প্রিন্টে **"Payments received" অংশ আসে না** (ওটা অফিসের রেকর্ড)
- [ ] ইনভয়েসের নিচে **PREPARED BY** — যে স্টাফ বানিয়েছে তার নাম ও তারিখ
- [ ] নিচে **"computer-generated invoice"** নোট আছে, স্বাক্ষরের জায়গা নেই
- [ ] Settings → Invoice template → **Computer-generated note** বদলানো যায় (বাংলাতেও)

**লম্বা লেখার পরীক্ষা (গুরুত্বপূর্ণ):**

- [ ] একটা invoice-এ **খুব লম্বা description** দিন (২-৩ লাইন) → পরের কলামে উঠে যায় না
- [ ] **স্পেস ছাড়া বিশাল শব্দ** দিন → ভেঙে পরের লাইনে যায়
- [ ] **বড় টাকার অঙ্ক** (১২,৫০,০০০) দিন → UNIT PRICE ও AMOUNT কলাম কাটা পড়ে না
- [ ] লম্বা কোম্পানির নাম/ঠিকানা/ইমেইল দিন → হেডার ভাঙে না
- [ ] লম্বা ক্লায়েন্টের নাম ও ঠিকানা → BILLED TO অংশ উপচে পড়ে না
- [ ] **⬇ Download PDF** চাপলে প্রিন্ট ডায়ালগে **Save as PDF** বেছে PDF নামানো যায়

### ২.১২ Payment (§10, §11)

- [ ] Invoice-এ **Record payment** চাপুন, পুরো টাকার চেয়ে কম দিন
- [ ] Invoice status "Partial Paid" হয়েছে, Balance due ঠিক আছে
- [ ] File-এর Payment status-ও "Partial Paid" হয়ে গেছে
- [ ] বাকি টাকা দিলে status "Paid" হয়
- [ ] **বেশি টাকা দেওয়ার চেষ্টা করুন** — সিস্টেম আটকে দেওয়া উচিত
- [ ] **Payments** মেনুতে সব পেমেন্ট দেখা যায়, ফিল্টার কাজ করে

### ২.১৩ Search & Filter (§12)

উপরের সার্চ বক্সে লিখে দেখুন — প্রতিটাতে ফল আসা উচিত:

- [ ] নাম দিয়ে
- [ ] পাসপোর্ট নম্বর দিয়ে
- [ ] ফোন নম্বর দিয়ে
- [ ] ইমেইল দিয়ে
- [ ] File reference (`DF-2026-...`) দিয়ে
- [ ] Invoice number দিয়ে
- [ ] Partner-এর নাম দিয়ে
- [ ] ফলাফলে ক্লিক করলে সঠিক পেজে যায়

### ২.১৪ Reports (§13)

**Reports** মেনুতে ড্রপডাউন থেকে একটা একটা করে খুলুন:

- [ ] Daily lead report
- [ ] Monthly lead conversion
- [ ] Lead source performance
- [ ] Follow-up pending
- [ ] Active file report
- [ ] Country-wise report
- [ ] Approved vs rejected
- [ ] Partner-wise file report
- [ ] Invoice report
- [ ] Payment due report
- [ ] Payment collection report
- [ ] Staff performance
- [ ] তারিখের রেঞ্জ বদলালে ডেটা বদলায়
- [ ] **⬇ Export CSV** চাপলে ফাইল নামে, Excel-এ খোলে

### ২.১৫ Staff Performance (§14)

- [ ] **Staff Performance**-এ প্রতিটা স্টাফের Leads, Converted, Conversion %,
      Follow-ups, Overdue, Meetings, Files, Approved, Rejected, Revenue দেখাচ্ছে
- [ ] তারিখ বদলালে সংখ্যা বদলায়
- [ ] CSV export কাজ করে

### ২.১৬ Settings (§16, §17)

- [ ] **Company details** — নাম, ঠিকানা, ফোন, ইমেইল সেভ হয়
- [ ] সেভ করার পর invoice-এ নতুন তথ্য দেখাচ্ছে
- [ ] **Invoice template** — prefix, currency, terms, footer সেভ হয়
- [ ] **Countries, services & lists** — ৯টা তালিকাই দেখাচ্ছে
- [ ] নতুন দেশ / সার্ভিস / **পেমেন্ট মাধ্যম** / **মিটিং ধরন** যোগ করা যায়
- [ ] যোগ করা দেশ Lead ও File ফর্মের ড্রপডাউনে চলে আসে
- [ ] **Lead statuses**-এ নিজের status যোগ করুন → lead-এর ড্রপডাউনে আসে
- [ ] বিল্ট-ইন status-এ 🔒 আছে, মোছার বাটন নেই
- [ ] **Default document checklist**-এ আইটেম যোগ করুন → নতুন file-এ সেটা আসে
- [ ] **Invoice template**-এ `File reference prefix` বদলান → নতুন file-এ নতুন prefix
- [ ] একটা আইটেম Remove করলে ড্রপডাউন থেকে যায়, কিন্তু পুরনো রেকর্ড ঠিক থাকে
- [ ] **Users & roles** — নতুন ইউজার তৈরি করা যায়
- [ ] **Reset password** কাজ করে
- [ ] **Notification settings** — On / Off করা যায়

### ২.১৭ রোল টেস্ট (§1) — নিরাপত্তা যাচাই

Sign out করে অন্য রোলে লগইন করুন:

**Staff (`rafiq@dreamfly.local` / `demo-staff-2026`):**
- [ ] Lead, Customer, File, Follow-up তৈরি করতে পারে
- [ ] **Settings** মেনু দেখতে পায় না
- [ ] **Staff Performance** মেনু দেখতে পায় না
- [ ] Invoice তৈরি করতে পারে না

**Accounts (`accounts@dreamfly.local` / `demo-accts-2026`):**
- [ ] Invoice ও Payment তৈরি করতে পারে
- [ ] Lead তৈরি করতে পারে না

**B2B Partner login** (Settings → Users → নতুন ইউজার, Role = "B2B Partner",
একটা partner বেছে দিন):
- [ ] লগইন করলে শুধু Dashboard, Files, Invoices, Notifications মেনু দেখে
- [ ] শুধু **নিজের** file গুলো দেখে, অন্য কারো না
- [ ] Leads / Customers / Reports / Settings-এ ঢুকতে পারে না

### ২.১৮ ডিজাইন ও মোবাইল (§18)

- [ ] মোবাইল ব্রাউজারে খুলে দেখুন — লেখা ছোট হয়ে যাচ্ছে না
- [ ] উপরে বাঁয়ে ☰ চাপলে মেনু বের হয়
- [ ] টেবিল ডানে-বাঁয়ে স্ক্রল করা যায়
- [ ] Dark theme-এ সব লেখা পড়া যায়
- [ ] পেজ দ্রুত লোড হয়

---

## পর্ব ৩ — টেস্ট শেষে ডেটা মুছে ফেলা

টেস্টের ডেটা মুছে আসল কাজ শুরু করতে:

```bash
npm run reset
```

এতে সব lead, customer, file, invoice মুছে যায় — কিন্তু **admin ইউজার ও
Settings থেকে যায়**।

একদম শূন্য থেকে শুরু করতে (সব মুছে যাবে, admin-সহ):

```bash
# Mac / Linux
rm -rf data
# Windows PowerShell
Remove-Item -Recurse -Force data
```

তারপর আবার `npm start`।

---

## পর্ব ৪ — সমস্যা হলে

| সমস্যা | সমাধান |
| --- | --- |
| `node: command not found` | Node.js ইনস্টল হয়নি — পর্ব ১.১ দেখুন |
| `Error: listen EADDRINUSE :::3000` | পোর্ট ব্যস্ত। `PORT=3001 npm start` দিয়ে চালান |
| পাসওয়ার্ড হারিয়ে গেছে | `npm run admin -- --email <ইমেইল> --password 'notun-password'` |
| "Incorrect email or password" | `npm run admin -- --list` দিয়ে দেখুন কোন ইমেইলগুলো আছে, তারপর উপরের কমান্ডে পাসওয়ার্ড বদলান |
| পেজ সাদা দেখাচ্ছে | ব্রাউজারে `Ctrl + Shift + R` (hard refresh) |
| আপলোড হচ্ছে না | ফাইল ১৫ MB-এর কম কিনা দেখুন; ছবি, PDF, Word, Excel সাপোর্ট করে |

---

## পর্ব ৫ — যা মনে রাখবেন

- সব ডেটা `data/` ফোল্ডারে থাকে (`dreamfly.db` + `uploads/`)।
  **নিয়মিত এই ফোল্ডারের ব্যাকআপ রাখুন।**
- আসল ব্যবহারের জন্য সার্ভারে বসানোর নিয়ম `README.md`-তে দেওয়া আছে।
- ইন্টারনেটে চালালে অবশ্যই **HTTPS**-এর পিছনে চালাবেন।
- ফিচারগুলোর বিস্তারিত ব্যবহার `docs/USER_GUIDE.md`-তে আছে।
