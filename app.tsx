import React, { useState, useEffect, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { 
  Calculator, 
  ArrowRight, 
  Building2, 
  User, 
  Percent, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Info, 
  Coins, 
  Layers, 
  AlertCircle, 
  BookOpen, 
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Sliders,
  HelpCircle,
  Trash2,
  RefreshCw,
  Lock,
  LogOut,
  Key,
  UserCheck,
  Plus,
  X,
  UploadCloud,
  UserSquare2,
  Database,
  FileBarChart2,
  Printer,
  Settings,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

// --- BACKEND CONFIG ---
// Paste the Web App URL you get after deploying apps-script/Code.gs (see README.md).
export const GAS_API_URL = "https://script.google.com/macros/s/AKfycbz_0_FMxsbDg8nmMhl0bi5wfLooN1Z8qD_QoM4b6zdkYsfovQ6NY-OCcJJGf0CmFlrOdg/exec";

// Calls the Google Apps Script backend via GET, with the action + payload
// JSON-encoded in a single "data" query param. Apps Script Web App URLs
// always 302-redirect to script.googleusercontent.com, and per the Fetch
// spec a browser silently downgrades a POST to a bodyless GET when
// following that redirect — so a POST body never actually reaches the
// script. Using GET from the start sidesteps that entirely.
async function callApi(action: string, payload: Record<string, any> = {}) {
  const url = GAS_API_URL + "?data=" + encodeURIComponent(JSON.stringify({ action, ...payload }));
  const res = await fetch(url);
  return res.json();
}

// Types
interface TaxBracket {
  bracket: string;
  rate: number;
  incomeInBracket: number;
  taxInBracket: number;
}

interface PersonalTaxResult {
  totalTax: number;
  breakdown: TaxBracket[];
  netTaxableIncome: number;
  totalDeductions: number;
  totalExpenses: number;
  avgRate: number;
  marginalRate: number;
}

interface CorporateTaxResult {
  corpTax: number;
  dividendTax: number;
  totalCost: number;  // corpTax + dividendTax + auditFee
  breakdown: TaxBracket[];
  netProfit: number;
  netProfitAfterTax: number;
  avgRate: number;
  totalExpenses?: number;
  marginalRate: number;
}

export const INCOME_TYPES = [
  { id: "40_1", name: "40(1) เงินเดือน ค่าจ้างแรงงาน โบนัส เบี้ยเลี้ยง", desc: "หักแบบเหมา 50% แต่สูงสุดไม่เกิน 100,000 บาท (สำหรับกลุ่ม 40(1) และ 40(2))", rate: 0.50, hasCap: true, maxCap: 100000 },
  { id: "40_2", name: "40(2) ค่ารับจ้างทั่วไป ค่าบริการ ค่านายหน้า ฟรีแลนซ์", desc: "หักแบบเหมา 50% แต่สูงสุดไม่เกิน 100,000 บาท (สำหรับกลุ่ม 40(1) และ 40(2))", rate: 0.50, hasCap: true, maxCap: 100000 },
  { id: "40_3", name: "40(3) ค่าลิขสิทธิ์ ทรัพย์สินทางปัญญา หรือสิทธิบัตร", desc: "หักแบบเหมา 50% แต่สูงสุดไม่เกิน 100,000 บาท", rate: 0.50, hasCap: true, maxCap: 100000 },
  { id: "40_4", name: "40(4) เงินลงทุน ดอกเบี้ย เงินปันผล ส่วนแบ่งกำไร", desc: "ไม่สามารถหักค่าใช้จ่ายได้ทุกกรณี (หักแบบเหมา 0% / ไม่สามารถหักตามจริงได้)", rate: 0.00, hasCap: false, maxCap: 0 },
  { id: "40_5", name: "40(5) เงินได้จากการให้เช่าทรัพย์สิน (บ้าน อาคาร ที่ดิน ยานพาหนะ)", desc: "หักแบบเหมา 30% (กรณีสิ่งปลูกสร้าง/อาคาร/ยานพาหนะ) ดึงเกณฑ์คำนวณเต็มจำนวน ไม่มีเพดานจำกัด", rate: 0.30, hasCap: false, maxCap: 0 },
  { id: "40_6_med", name: "40(6) วิชาชีพอิสระ - โรคศิลปะ (แพทย์/พยาบาล)", desc: "หักแบบเหมา 60% ดึงเกณฑ์คำนวณเต็มจำนวน ไม่มีเพดานจำกัด", rate: 0.60, hasCap: false, maxCap: 0 },
  { id: "40_6_other", name: "40(6) วิชาชีพอิสระอื่น (กฎหมาย บัญชี วิศวกร สถาปนิก งานศิลปะ)", desc: "หักแบบเหมา 30% ดึงเกณฑ์คำนวณเต็มจำนวน ไม่มีเพดานจำกัด", rate: 0.30, hasCap: false, maxCap: 0 },
  { id: "40_7", name: "40(7) รับเหมาก่อสร้าง (จัดซื้อวัสดุและอุปกรณ์ รวมค่าแรงงานครบถ้วน)", desc: "หักแบบเหมา 60% ดึงเกณฑ์คำนวณเต็มจำนวน ไม่มีเพดานจำกัด", rate: 0.60, hasCap: false, maxCap: 0 },
  { id: "40_8", name: "40(8) อื่นๆ ค้าปลีก ค้าส่ง ขายสินค้าออนไลน์ พรีออเดอร์ ร้านอาหาร ธุรกิจทั่วไป", desc: "หักแบบเหมา 60% ดึงเกณฑ์คำนวณเต็มจำนวน ไม่มีเพดานจำกัด (43 ประเภทธุรกิจ)", rate: 0.60, hasCap: false, maxCap: 0 },
];

export default function App() {
  // --- INPUT STATES ---
  const [revenue, setRevenue] = useState<number>(1800000); // 1.8M THB default (VAT limit)
  const [incomeType, setIncomeType] = useState<string>("40_8");
  const [selectedPersona, setSelectedPersona] = useState<string>("ขายของออนไลน์");
  const [personalTaxStep, setPersonalTaxStep] = useState<number>(1);
  const [pnd94Dismissed, setPnd94Dismissed] = useState<boolean>(false);
  const [useMultipleIncomes, setUseMultipleIncomes] = useState<boolean>(false);
  const [incomes, setIncomes] = useState<{ id: string; typeId: string; amount: number }[]>([
    { id: "1", typeId: "40_8", amount: 1800000 }
  ]);
  const [expenseType, setExpenseType] = useState<"flat" | "actual">("flat");
  const [actualExpensePercent, setActualExpensePercent] = useState<number>(35); // 35% of revenue if actual expense selected
  const [actualExpenseInput, setActualExpenseInput] = useState<number>(630000); // computed dynamically as revenue * 35%
  
  // Personal Deductions and Allowances
  const [childrenCount, setChildrenCount] = useState<number>(1); // 30,000 THB per child
  const [socialSecurity, setSocialSecurity] = useState<number>(9000); // Max 9,000 THB
  const [insuranceCost, setInsuranceCost] = useState<number>(25000); // Slider up to 100,000 THB
  const [investmentSavings, setInvestmentSavings] = useState<number>(30000); // SSF/RMF/ThaiESG up to 200,000 THB
  const [hasSpouse, setHasSpouse] = useState<boolean>(false); // Spouse allowance: 60,000 THB

  // --- DETAILED TAX DEDUCTIONS (20 ITEMS) ---
  const [useDetailedDeductions, setUseDetailedDeductions] = useState<boolean>(false);
  const [childCountFirst, setChildCountFirst] = useState<number>(1);
  const [childCountSecondPlus, setChildCountSecondPlus] = useState<number>(0);
  const [pregnancyExpense, setPregnancyExpense] = useState<number>(0);
  const [parentCount, setParentCount] = useState<number>(0);
  const [disabledCount, setDisabledCount] = useState<number>(0);
  const [lifeInsurancePremium, setLifeInsurancePremium] = useState<number>(25000);
  const [parentHealthInsurance, setParentHealthInsurance] = useState<number>(0);
  const [selfHealthInsurance, setSelfHealthInsurance] = useState<number>(0);
  const [mortgageInterest, setMortgageInterest] = useState<number>(0);
  const [providentFundAmount, setProvidentFundAmount] = useState<number>(0);
  const [rmfAmount, setRmfAmount] = useState<number>(0);
  const [nsfAmount, setNsfAmount] = useState<number>(0);
  const [pensionInsuranceAmount, setPensionInsuranceAmount] = useState<number>(0);
  const [ssfAmount, setSsfAmount] = useState<number>(30000);
  const [doubleDonationAmount, setDoubleDonationAmount] = useState<number>(0);
  const [generalDonationAmount, setGeneralDonationAmount] = useState<number>(0);
  const [edcWelfareAmount, setEdcWelfareAmount] = useState<number>(0);
  const [politicalDonationAmount, setPoliticalDonationAmount] = useState<number>(0);
  const [detailedSubTab, setDetailedSubTab] = useState<"family" | "saving" | "donation">("family");
  
  // Corporate Configurations
  const [isSme, setIsSme] = useState<boolean>(true); // Registered Capital <= 5M & Revenue <= 30M
  const [auditFee, setAuditFee] = useState<number>(0); // Bookkeeper & Audit fee per year (real costs)
  const [personalBookkeepingFee, setPersonalBookkeepingFee] = useState<number>(0); // Bookkeeping fee for Personal Actual
  const [dividendPayout, setDividendPayout] = useState<number>(0); // Amount of dividend distributed, gets 10% tax automatically

  // Overrides for direct text input editing
  const [customDeductions, setCustomDeductions] = useState<number | null>(null);
  const [corporateExpensesOverride, setCorporateExpensesOverride] = useState<number | null>(null);

  // --- ANALYSIS STATE ---
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState<boolean>(false);
  const [errorAdvice, setErrorAdvice] = useState<string | null>(null);
  const [customAdvicePrompt, setCustomAdvicePrompt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"calculator" | "personal_tax" | "director_salary" | "learn" | "admin_logs">("personal_tax");

  // --- DIRECTOR SALARY PLANNER STATES ---
  const [plannerCase, setPlannerCase] = useState<number>(1); // 1 = Case 1, 2 = Case 2, 3 = Case 3, 0 = Custom
  const [plannerRevenue, setPlannerRevenue] = useState<number>(50000000);
  const [plannerExpenses, setPlannerExpenses] = useState<number>(40000000);
  const [plannerSalary, setPlannerSalary] = useState<number>(200000); // Monthly salary
  const [plannerCase1Salary, setPlannerCase1Salary] = useState<number>(200000); // Case 1 Monthly salary
  const [plannerCase2Salary, setPlannerCase2Salary] = useState<number>(100000); // Case 2 Monthly salary
  const [plannerCase3Salary, setPlannerCase3Salary] = useState<number>(50000); // Case 3 Monthly salary
  const [plannerSme, setPlannerSme] = useState<boolean>(false);
  const [plannerDividendTax, setPlannerDividendTax] = useState<boolean>(true);
  const [plannerUseCustomDeductions, setPlannerUseCustomDeductions] = useState<boolean>(false);
  const [plannerInterestIncome, setPlannerInterestIncome] = useState<number>(0);
  const [plannerRentalIncome, setPlannerRentalIncome] = useState<number>(0);

  // --- USER AUTHENTICATION STATES ---
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; isGuest?: boolean } | null>({
    email: "guest@taxsync.co",
    name: "ผู้ใช้งานทั่วไป",
    isGuest: true
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // --- GOOGLE SHEETS & USER LOGS STATES ---
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [sheetsWebhook, setSheetsWebhook] = useState<string>("");
  const [sheetsStatusMessage, setSheetsStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper to log user login via the Apps Script backend
  const logUserLogin = async (name: string, email: string) => {
    try {
      await callApi("logLogin", { name, email });
      // If active tab is logs and we are logged in as admin, reload logs list
      if (currentUser?.email.toLowerCase() === "acct.prom@gmail.com") {
        fetchLogsAndConfig();
      }
    } catch (err) {
      console.error("Failed to post user login log:", err);
    }
  };

  // Fetch all logs and the Google Sheet URL (Admin only)
  const fetchLogsAndConfig = async () => {
    try {
      const [logsData, configData] = await Promise.all([
        callApi("getUserLogs"),
        callApi("getSheetsConfig"),
      ]);
      setUserLogs(logsData.logs || []);
      setSheetsWebhook(configData.sheetUrl || "");
    } catch (err) {
      console.error("Failed to fetch logs and config:", err);
    }
  };

  // Initialize users and session
  useEffect(() => {
    // 1. Setup mock users database if empty or missing the admin user
    const existingUsers = localStorage.getItem("thai_tax_users");
    let users = [];
    if (!existingUsers) {
      users = [
        { email: "acct.prom@gmail.com", name: "ผู้ดูแลระบบ (Admin)", password: "acct.prom123" },
        { email: "acct.prompt@gmail.com", name: "User Prompt (Default)", password: "123" },
        { email: "demo@taxsync.co", name: "เจ้าของธุรกิจป้ายแดง", password: "123" }
      ];
      localStorage.setItem("thai_tax_users", JSON.stringify(users));
    } else {
      try {
        users = JSON.parse(existingUsers);
        // Ensure acct.prom@gmail.com admin account always exists
        const adminExists = users.some((u: any) => u.email.toLowerCase() === "acct.prom@gmail.com");
        if (!adminExists) {
          users.push({ email: "acct.prom@gmail.com", name: "ผู้ดูแลระบบ (Admin)", password: "acct.prom123" });
          localStorage.setItem("thai_tax_users", JSON.stringify(users));
        }
      } catch (e) {
        users = [
          { email: "acct.prom@gmail.com", name: "ผู้ดูแลระบบ (Admin)", password: "acct.prom123" },
          { email: "acct.prompt@gmail.com", name: "User Prompt (Default)", password: "123" },
          { email: "demo@taxsync.co", name: "เจ้าของธุรกิจป้ายแดง", password: "123" }
        ];
        localStorage.setItem("thai_tax_users", JSON.stringify(users));
      }
    }

    // 2. Load active session if exists
    const activeUser = localStorage.getItem("thai_tax_active_user");
    if (activeUser) {
      try {
        const parsed = JSON.parse(activeUser);
        setCurrentUser(parsed);
        if (parsed && parsed.email) {
          logUserLogin(parsed.name, parsed.email);
        }
      } catch (e) {
        console.error("Error parsing active user:", e);
      }
    } else {
      // Log guest initial access
      logUserLogin("ผู้ใช้งานทั่วไป (Guest)", "guest@taxsync.co");
    }
  }, []);

  // Fetch logs on mount/activeTab change if admin
  useEffect(() => {
    if (currentUser?.email.toLowerCase() === "acct.prom@gmail.com") {
      fetchLogsAndConfig();
    }
  }, [activeTab, currentUser]);

  // Keep incomes list synchronized in simple mode (only when not using multiple incomes)
  useEffect(() => {
    if (!useMultipleIncomes) {
      setIncomes([{ id: "1", typeId: incomeType, amount: revenue }]);
    }
  }, [revenue, incomeType, useMultipleIncomes]);

  // Keep total revenue and primary incomeType synchronized when managing multiple incomes
  useEffect(() => {
    if (useMultipleIncomes) {
      const total = incomes.reduce((sum, item) => sum + item.amount, 0);
      if (total !== revenue) {
        setRevenue(total);
      }
      if (incomes.length > 0 && incomes[0].typeId !== incomeType) {
        setIncomeType(incomes[0].typeId);
      }
    }
  }, [incomes, useMultipleIncomes]);

  // Synchronize actual expenses when revenue, expenseType, or incomeType changes
  useEffect(() => {
    let computedVal = 0;
    if (expenseType === "flat") {
      const selectedType = INCOME_TYPES.find(t => t.id === incomeType) || INCOME_TYPES[4];
      let flatExpense = revenue * selectedType.rate;
      if (selectedType.hasCap) {
        flatExpense = Math.min(flatExpense, selectedType.maxCap);
      }
      computedVal = Math.round(flatExpense);
    } else {
      computedVal = Math.round(revenue * (actualExpensePercent / 100));
    }
    setActualExpenseInput(computedVal);
    if (corporateExpensesOverride !== null) {
      setCorporateExpensesOverride(computedVal);
    }
  }, [revenue, expenseType, incomeType]);

  // Adjust SME automatically if revenue exceeds 30 million THB
  useEffect(() => {
    if (revenue > 30000000) {
      setIsSme(false);
    }
  }, [revenue]);

  const handleActualExpenseChange = (valNum: number) => {
    setActualExpenseInput(valNum);
    setCorporateExpensesOverride(valNum);
    if (revenue > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((valNum / revenue) * 100)));
      setActualExpensePercent(pct);
    }
  };

  const handlePercentSliderChange = (pct: number) => {
    setActualExpensePercent(pct);
    const computedVal = Math.round(revenue * (pct / 100));
    setActualExpenseInput(computedVal);
    setCorporateExpensesOverride(computedVal);
  };

  // --- PRESETS ---
  const handleApplyPreset = (value: number) => {
    setRevenue(value);
  };

  // --- CALCULATION LOGIC ---
  const calculateProgressivePersonalTax = (taxableIncome: number): number => {
    const brackets = [
      { limit: 150000, rate: 0 },
      { limit: 300000, rate: 0.05 },
      { limit: 500000, rate: 0.10 },
      { limit: 750000, rate: 0.15 },
      { limit: 1000000, rate: 0.20 },
      { limit: 2000000, rate: 0.25 },
      { limit: 5000000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 },
    ];

    let remaining = taxableIncome;
    let totalTax = 0;
    let previousLimit = 0;

    for (const b of brackets) {
      if (remaining <= 0) break;
      const range = b.limit - previousLimit;
      const incomeInBracket = Math.min(remaining, range);
      totalTax += incomeInBracket * b.rate;
      remaining -= incomeInBracket;
      previousLimit = b.limit;
    }
    return Math.round(totalTax);
  };

  const calculatePersonalTax = (overrideExpenseType?: "flat" | "actual"): PersonalTaxResult => {
    // 1. Calculate Expenses based on selected Section 40 type
    let allowedExpenses = 0;
    const activeExpenseType = overrideExpenseType || expenseType;
    if (activeExpenseType === "flat") {
      if (useMultipleIncomes) {
        allowedExpenses = incomes.reduce((sum, item) => {
          const matchedType = INCOME_TYPES.find((t) => t.id === item.typeId) || INCOME_TYPES[8];
          let itemExpense = item.amount * matchedType.rate;
          if (matchedType.hasCap) {
            itemExpense = Math.min(itemExpense, matchedType.maxCap);
          }
          return sum + itemExpense;
        }, 0);
      } else {
        const selectedType = INCOME_TYPES.find(t => t.id === incomeType) || INCOME_TYPES[8];
        let flatExpense = revenue * selectedType.rate;
        if (selectedType.hasCap) {
          flatExpense = Math.min(flatExpense, selectedType.maxCap);
        }
        allowedExpenses = flatExpense;
      }
    } else {
      if (!useMultipleIncomes && incomeType === "40_4") {
        allowedExpenses = 0;
      } else {
        allowedExpenses = actualExpenseInput + personalBookkeepingFee;
      }
    }

    // 2. Calculate Deductions
    const allowancePersonal = 60000;
    const allowanceSpouse = hasSpouse ? 60000 : 0;
    
    let calculatedDeductions = 0;
    
    if (useDetailedDeductions) {
      // 1. ค่าลดหย่อนผู้มีเงินได้
      const d1 = 60000;
      // 2. ค่าลดหย่อนคู่สมรส
      const d2 = hasSpouse ? 60000 : 0;
      // 3. ค่าลดหย่อนบุตร (คนแรก 30k, ถัดไปหลังปี 2561 คนละ 60k)
      const d3 = (childCountFirst * 30000) + (childCountSecondPlus * 60000);
      // 4. ค่าฝากครรภ์และทำคลอด (ไม่เกิน 60k)
      const d4 = Math.min(60000, pregnancyExpense);
      // 5. ค่าลดหย่อนบิดามารดา (คนละ 30k)
      const d5 = parentCount * 30000;
      // 6. ลดหย่อนพิการ/ทุพพลภาพ (คนละ 60k)
      const d6 = disabledCount * 60000;
      // 7. เบี้ยประกันชีวิต (ไม่เกิน 100k)
      const d7 = Math.min(100000, lifeInsurancePremium);
      // 8. เบี้ยประกันสุขภาพบิดามารดา (ไม่เกิน 15k)
      const d8 = Math.min(15000, parentHealthInsurance);
      // 9. เบี้ยประกันสุขภาพตนเอง (ไม่เกิน 25k)
      const d9 = Math.min(25000, selfHealthInsurance);
      
      // รวมเบี้ยประกันชีวิต + สุขภาพตนเอง (ข้อ 7 + ข้อ 9) ต้องไม่เกิน 100,000 บาท
      const d7_9_combined = Math.min(100000, d7 + d9);
      
      // 10. ดอกเบี้ยกู้ยืมซื้อที่อยู่อาศัย (ไม่เกิน 100k)
      const d10 = Math.min(100000, mortgageInterest);
      // 11. กองทุนสำรองเลี้ยงชีพ/กบข./สงเคราะห์ครู (ตามจริง ไม่เกิน 15% ของเงินได้ และไม่เกิน 500k)
      const d11 = Math.min(500000, Math.min(revenue * 0.15, providentFundAmount));
      // 12. RMF (ตามจริง ไม่เกิน 30% ของเงินได้ และไม่เกิน 500k)
      const d12 = Math.min(500000, Math.min(revenue * 0.30, rmfAmount));
      // 13. กองทุนการออมแห่งชาติ กอช. (ไม่เกิน 13,200)
      const d13 = Math.min(13200, nsfAmount);
      // 14. เบี้ยประกันชีวิตแบบบำนาญ (ตามจริง ไม่เกิน 15% ของเงินได้ และไม่เกิน 200k)
      const d14 = Math.min(200000, Math.min(revenue * 0.15, pensionInsuranceAmount));
      // 15. ประกันสังคม (ไม่เกิน 5,100 ตามเกณฑ์ปกติ)
      const d15 = Math.min(5100, socialSecurity);
      // 16. SSF (ตามจริง ไม่เกิน 30% ของเงินได้ และไม่เกิน 200k)
      const d16 = Math.min(200000, Math.min(revenue * 0.30, ssfAmount));
      
      // กลุ่มกองทุนเพื่อการเกษียณสะสม (11 + 12 + 13 + 14 + 16) รวมกันสูงสุดไม่เกิน 500,000 บาท
      const retirementCombined = d11 + d12 + d13 + d14 + d16;
      const retirementAllowed = Math.min(500000, retirementCombined);
      
      // 19. ค่าธรรมเนียม EDC บัตรเดบิต (1 เท่าของจ่ายจริง)
      const d19 = edcWelfareAmount;
      
      // รวมสิทธิ์ลดหย่อนก่อนหักเงินบริจาค
      const sumBeforeDonations = d1 + d2 + d3 + d4 + d5 + d6 + d7_9_combined + d8 + d10 + retirementAllowed + d15 + d19;
      
      // 17 & 18 & 20: บริจาคอิงตามเงินรายได้คงเหลือหลังหักค่าใช้จ่ายและลดหย่อนอื่นๆ แล้ว
      const netIncomeBeforeDonations = Math.max(0, revenue - allowedExpenses - sumBeforeDonations);
      
      // 17. เงินบริจาคสนับสนุนการศึกษา/กีฬา/พัฒนาสังคม (2 เท่า แต่ไม่เกิน 10% ของเงินได้หลังหักลดหย่อนอื่นๆ)
      const d17 = Math.min(netIncomeBeforeDonations * 0.10, doubleDonationAmount * 2);
      
      // เงินได้คงเหลือหลังบริจาคเพื่อการศึกษา
      const netIncomeAfterEducation = Math.max(0, netIncomeBeforeDonations - d17);
      
      // 18. เงินบริจาคทั่วไป (ตามจริง ไม่เกิน 10% ของเงินคงเหลือหลังหักการบริจาคอื่นๆ ก่อนหน้า)
      const d18 = Math.min(netIncomeAfterEducation * 0.10, generalDonationAmount);
      
      // 20. เงินบริจาคพรรคการเมือง (ไม่เกิน 10,000)
      const d20 = Math.min(10000, politicalDonationAmount);
      
      calculatedDeductions = sumBeforeDonations + d17 + d18 + d20;
    } else {
      const allowanceChildren = childrenCount * 30000;
      calculatedDeductions = allowancePersonal + allowanceSpouse + allowanceChildren + socialSecurity + insuranceCost + investmentSavings;
    }
    const totalDeductions = customDeductions !== null ? customDeductions : calculatedDeductions;

    // 3. Taxable Income (เงินได้สุทธิ = รายได้ - ค่าใช้จ่าย - ค่าลดหย่อน)
    const netTaxableIncome = Math.max(0, revenue - allowedExpenses - totalDeductions);

    // 4. Progressive Slabs calculation
    const brackets = [
      { maxLimit: 150000, rate: 0, label: "0 - 150,000 (ยกเว้นภาษี)" },
      { maxLimit: 300000, rate: 0.05, label: "150,001 - 300,000 (5%)" },
      { maxLimit: 500000, rate: 0.10, label: "300,001 - 500,000 (10%)" },
      { maxLimit: 750000, rate: 0.15, label: "500,001 - 750,000 (15%)" },
      { maxLimit: 1000000, rate: 0.20, label: "750,001 - 1,000,000 (20%)" },
      { maxLimit: 2000000, rate: 0.25, label: "1,000,001 - 2,000,000 (25%)" },
      { maxLimit: 5000000, rate: 0.30, label: "2,000,001 - 5,000,000 (30%)" },
      { maxLimit: Infinity, rate: 0.35, label: "เกิน 5,000,000 (35%)" },
    ];

    let remaining = netTaxableIncome;
    let totalTax = 0;
    const breakdown: TaxBracket[] = [];
    let previousLimit = 0;

    for (const b of brackets) {
      if (remaining <= 0) {
        breakdown.push({
          bracket: b.label,
          rate: b.rate,
          incomeInBracket: 0,
          taxInBracket: 0,
        });
        continue;
      }

      const range = b.maxLimit - previousLimit;
      const incomeInBracket = Math.min(remaining, range);
      const taxInBracket = incomeInBracket * b.rate;

      totalTax += taxInBracket;
      breakdown.push({
        bracket: b.label,
        rate: b.rate,
        incomeInBracket,
        taxInBracket,
      });

      remaining -= incomeInBracket;
      previousLimit = b.maxLimit;
    }

    const avgRate = netTaxableIncome > 0 ? (totalTax / netTaxableIncome) * 100 : 0;

    let marginalRate = 0;
    for (const b of breakdown) {
      if (b.incomeInBracket > 0) {
        marginalRate = Math.round(b.rate * 100);
      }
    }

    return {
      totalTax: Math.round(totalTax),
      breakdown,
      netTaxableIncome,
      totalDeductions,
      totalExpenses: Math.round(allowedExpenses),
      avgRate,
      marginalRate,
    };
  };

  const calculateCorporateTax = (): CorporateTaxResult => {
    // Net profit for corporation (กำไรสุทธิทางบัญชีก่อนคิดพิกัดภาษี = รายรับ - ค่าใช้จ่ายจริง)
    // Note: in a real corporation, we subtract actual business expenses, not flat rate (unless it mimics a standard actual deduction)
    const defaultCorpExpenses = expenseType === "flat" ? revenue * 0.45 : actualExpenseInput;
    const activeExpense = corporateExpensesOverride !== null ? corporateExpensesOverride : defaultCorpExpenses;

    const netProfit = Math.max(0, revenue - activeExpense);

    let corpTax = 0;
    const breakdown: TaxBracket[] = [];

    if (isSme) {
      // SME tax slabs for companies in Thailand
      // 0 - 300,000: Exempt (0%)
      // 300,001 - 3,000,000: 15%
      // 3,000,001 - 5,000,000: 20%
      // Over 5,000,000: 30%
      const brackets = [
        { maxLimit: 300000, rate: 0, label: "0 - 300,000 (SME ยกเว้น)" },
        { maxLimit: 3000000, rate: 0.15, label: "300,001 - 3,000,000 (SME 15%)" },
        { maxLimit: 5000000, rate: 0.20, label: "3,000,001 - 5,000,000 (SME 20%)" },
        { maxLimit: Infinity, rate: 0.30, label: "เกิน 5,000,000 (SME 30%)" },
      ];

      let remaining = netProfit;
      let previousLimit = 0;

      for (const b of brackets) {
        if (remaining <= 0) {
          breakdown.push({
            bracket: b.label,
            rate: b.rate,
            incomeInBracket: 0,
            taxInBracket: 0,
          });
          continue;
        }

        const range = b.maxLimit - previousLimit;
        const incomeInBracket = Math.min(remaining, range);
        const taxInBracket = incomeInBracket * b.rate;

        corpTax += taxInBracket;
        breakdown.push({
          bracket: b.label,
          rate: b.rate,
          incomeInBracket,
          taxInBracket,
        });

        remaining -= incomeInBracket;
        previousLimit = b.maxLimit;
      }
    } else {
      // General Corporate Rate: progressive 20% and 30% to fit the "15 20 30 depending on profit" request
      const brackets = [
        { maxLimit: 5000000, rate: 0.20, label: "0 - 5,000,000 (ทั่วไป 20%)" },
        { maxLimit: Infinity, rate: 0.30, label: "เกิน 5,000,000 (ทั่วไป 30%)" },
      ];

      let remaining = netProfit;
      let previousLimit = 0;

      for (const b of brackets) {
        if (remaining <= 0) {
          breakdown.push({
            bracket: b.label,
            rate: b.rate,
            incomeInBracket: 0,
            taxInBracket: 0,
          });
          continue;
        }

        const range = b.maxLimit - previousLimit;
        const incomeInBracket = Math.min(remaining, range);
        const taxInBracket = incomeInBracket * b.rate;

        corpTax += taxInBracket;
        breakdown.push({
          bracket: b.label,
          rate: b.rate,
          incomeInBracket,
          taxInBracket,
        });

        remaining -= incomeInBracket;
        previousLimit = b.maxLimit;
      }
    }

    // Net Profit after corporate taxes
    const netProfitAfterTax = Math.max(0, netProfit - corpTax);
    
    // Dividend Tax: 10% of user specified dividendPayout
    const dividendTax = dividendPayout * 0.10;

    // Total cost in Corporate Structure (accounting, audit fee, corp tax, withholding)
    const totalCost = corpTax + dividendTax + auditFee;
    const avgRate = netProfit > 0 ? ((corpTax + dividendTax) / netProfit) * 100 : 0;

    let marginalRate = 0;
    for (const b of breakdown) {
      if (b.incomeInBracket > 0) {
        marginalRate = Math.round(b.rate * 100);
      }
    }

    return {
      corpTax: Math.round(corpTax),
      dividendTax: Math.round(dividendTax),
      totalCost: Math.round(totalCost),
      breakdown,
      netProfit: Math.round(netProfit),
      netProfitAfterTax: Math.round(netProfitAfterTax),
      avgRate,
      totalExpenses: Math.round(activeExpense),
      marginalRate,
    };
  };

  const personalResult = calculatePersonalTax();
  const personalFlatResult = calculatePersonalTax("flat");
  const personalActualResult = calculatePersonalTax("actual");
  const corporateResult = calculateCorporateTax();

  const compIncomesVal = useMultipleIncomes
    ? incomes.reduce((sum, item) => sum + item.amount, 0)
    : revenue;

  const compCases = [
    {
      id: "personal_flat",
      title: "บุคคลธรรมดา (หักเหมา)",
      tag: "40(1)-(8) หักเหมาจ่าย",
      revenue: compIncomesVal,
      expenses: personalFlatResult.totalExpenses,
      tax: personalFlatResult.totalTax,
      avgRate: personalFlatResult.avgRate,
      marginalRate: personalFlatResult.marginalRate,
      color: "emerald",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200/50",
      accentBorder: "border-blue-500",
      textColor: "text-blue-700",
      desc: "หักจ่ายเหมาตามเรทกฎหมาย 30% - 60% โดยไม่ต้องมีเอกสารใบรับเงินหรือใบเสร็จใดๆ"
    },
    {
      id: "personal_actual",
      title: "บุคคลธรรมดา (หักตามจริง)",
      tag: "40(8) หักตามบันทึกจริง",
      revenue: compIncomesVal,
      expenses: personalActualResult.totalExpenses,
      tax: personalActualResult.totalTax,
      avgRate: personalActualResult.avgRate,
      marginalRate: personalActualResult.marginalRate,
      color: "amber",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200/50",
      accentBorder: "border-amber-500",
      textColor: "text-amber-700",
      desc: "หักรายจ่ายตามหน้างานจริงสะสม ต้องมีรายงานรับ-จ่ายรายวัน และหลักฐานครบถ้วนชัดเจน"
    },
    {
      id: "corporate",
      title: "จัดตั้งนิติบุคคล (บริษัท)",
      tag: "SME / อัตราก้าวหน้าบริษัท",
      revenue: compIncomesVal,
      expenses: (corporateResult.totalExpenses || 0) + auditFee, 
      tax: corporateResult.totalCost,
      avgRate: corporateResult.avgRate,
      marginalRate: corporateResult.marginalRate,
      color: "indigo",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
      accentBorder: "border-indigo-500",
      textColor: "text-indigo-700",
      desc: "จดทะเบียนบริษัทจำกัด หักค่าใช้จ่ายตามจริง พร้อมคิดรวมภาษีปันผลและค่าสอบบัญชี CPA ครบสูตร"
    }
  ];

  const rankedCompCases = [...compCases].sort((a, b) => a.tax - b.tax);

  const getRankDetails = (id: string) => {
    const rankIndex = rankedCompCases.findIndex((x) => x.id === id);
    if (rankIndex === 0) {
      return {
        num: 1,
        medal: "🏆 อันดับ 1",
        label: "ประหยัดภาษีที่สุด",
        badgeStyle: "bg-blue-600 text-white border-blue-500 shadow-xs",
        bannerText: "แนะนำมากที่สุด"
      };
    } else if (rankIndex === 1) {
      return {
        num: 2,
        medal: "🥈 อันดับ 2",
        label: "ดีลำดับสอง",
        badgeStyle: "bg-slate-600 text-white border-slate-500 shadow-xs",
        bannerText: "ทางเลือกสำรอง"
      };
    } else {
      return {
        num: 3,
        medal: "🥉 อันดับ 3",
        label: "ภาระภาษีสูงที่สุด",
        badgeStyle: "bg-rose-500 text-white border-rose-400 shadow-xs",
        bannerText: "ควรหลีกเลี่ยง"
      };
    }
  };

  const renderCardAnalysis = (caseId: "personal_flat" | "personal_actual" | "corporate") => {
    let caseTax = 0;
    let caseExpenses = 0;
    
    if (caseId === "personal_flat") {
      caseTax = personalFlatResult.totalTax;
      caseExpenses = personalFlatResult.totalExpenses;
    } else if (caseId === "personal_actual") {
      caseTax = personalActualResult.totalTax;
      caseExpenses = personalActualResult.totalExpenses;
    } else {
      caseTax = corporateResult.totalCost;
      caseExpenses = (corporateResult.totalExpenses || 0) + auditFee;
    }

    const taxPercent = compIncomesVal > 0 ? (caseTax / compIncomesVal) * 105 : 0; // slight scale for visibility
    const expPercent = compIncomesVal > 0 ? (caseExpenses / compIncomesVal) * 100 : 0;
    const cashLeft = Math.max(0, compIncomesVal - caseExpenses - caseTax);
    const cashLeftPercent = compIncomesVal > 0 ? (cashLeft / compIncomesVal) * 100 : 0;

    const rank = getRankDetails(caseId);

    return (
      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/65 space-y-3 mt-4 text-xs">
        {/* Header containing Ranking Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            สรุปอันดับและความคุ้มค่า
          </span>
          <div className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black border ${rank.badgeStyle}`}>
              {rank.medal}
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
              rank.num === 1 ? "bg-blue-100 text-blue-800 border border-blue-200/50" : "bg-slate-200 text-slate-600 border border-slate-300/50"
            }`}>
              {rank.bannerText}
            </span>
          </div>
        </div>

        {/* Visual Proportional Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>📊 สัดส่วนกระจายรายรับรวม</span>
            <span className="font-mono text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200/60 font-bold">
              {compIncomesVal.toLocaleString()} ฿
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-200 rounded-full flex overflow-hidden">
            {taxPercent > 0 && (
              <div
                style={{ width: `${taxPercent}%` }}
                className="bg-rose-500 h-full transition-all duration-320 hover:opacity-90"
                title={`ส่วนจ่ายภาษี ${(caseTax / compIncomesVal * 100).toFixed(1)}%`}
              />
            )}
            {expPercent > 0 && (
              <div
                style={{ width: `${expPercent}%` }}
                className="bg-amber-400 h-full transition-all duration-310 hover:opacity-90"
                title={`ส่วนค่าใช้จ่าย ${expPercent.toFixed(1)}%`}
              />
            )}
            {cashLeftPercent > 0 && (
              <div
                style={{ width: `${cashLeftPercent}%` }}
                className="bg-blue-500 h-full transition-all duration-300 hover:opacity-90"
                title={`เงินคงเหลือสุทธิ ${cashLeftPercent.toFixed(1)}%`}
              />
            )}
          </div>
        </div>

        {/* Small Legend Values Grid */}
        <div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px] text-slate-500 leading-tight">
          <div>
            <div className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-rose-650 font-bold truncate">ภาษี ({(caseTax / compIncomesVal * 100).toFixed(0)}%)</span>
            </div>
            <span className="font-mono font-extrabold text-rose-600 block text-[11px] mt-0.5">
              {caseTax.toLocaleString()} ฿
            </span>
          </div>
          <div className="border-l border-slate-200 pl-1">
            <div className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">ใช้/เหมา ({expPercent.toFixed(0)}%)</span>
            </div>
            <span className="font-mono font-bold text-slate-800 block text-[11px] mt-0.5">
              {caseExpenses.toLocaleString()} ฿
            </span>
          </div>
          <div className="border-l border-slate-200 pl-1">
            <div className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">เหลือเก็บ ({cashLeftPercent.toFixed(0)}%)</span>
            </div>
            <span className="font-mono font-bold text-slate-800 block text-[11px] mt-0.5">
              {cashLeft.toLocaleString()} ฿
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Helper for rendering deduction placeholders
  const defaultPersonalDeductions = 60000 + (hasSpouse ? 60000 : 0) + (childrenCount * 30000) + socialSecurity + insuranceCost + investmentSavings;

  // Comparison Indicators
  const costDiff = Math.abs(personalResult.totalTax - corporateResult.totalCost);
  const corporateIsBetter = corporateResult.totalCost < personalResult.totalTax;

  const hasPnd94Requirement = useMultipleIncomes
    ? incomes.some(item => ["40_5", "40_6_med", "40_6_other", "40_7", "40_8"].includes(item.typeId))
    : ["40_5", "40_6_med", "40_6_other", "40_7", "40_8"].includes(incomeType);

  // ภ.ง.ด. 94 requirement notice — shown as a dismissible popup rather than
  // an inline banner, since it's the same condition/content regardless of
  // which tab triggered it.
  const renderPnd94Modal = () => (
    <AnimatePresence>
      {hasPnd94Requirement && !pnd94Dismissed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl border border-amber-200/80 text-sm text-slate-800 space-y-4 shadow-2xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setPnd94Dismissed(true)}
              aria-label="ปิดหน้าต่างนี้"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-8">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-950 text-base md:text-lg flex items-center gap-1.5">
                  💡 คำแนะนำ: ต้องยื่นแบบ &ldquo;ภ.ง.ด. 94&rdquo; (ภาษีเงินได้ครึ่งปี)
                </h4>
                <p className="text-slate-700 text-[13.5px] md:text-[14.5px] mt-1.5 leading-relaxed">
                  เนื่องจากคุณมีเงินได้ตามมาตรา <span className="font-bold text-amber-850">40(5) - 40(8)</span> สรรพากรบังคับให้บุคคลธรรมดาต้องยื่นรายการภาษีครึ่งปี เพื่อความโปร่งใสและเฉลี่ยภาระภาษีไม่ให้กระจุกตัวตอนปลายปี
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-amber-200/55 pt-3.5">
              <div className="space-y-1.5">
                <p className="font-extrabold text-amber-950 text-[13.5px] md:text-[14px] flex items-center gap-1">
                  📅 ยื่นเมื่อไหร่?
                </p>
                <ul className="list-disc list-inside text-slate-700 text-[12.5px] md:text-[13px] space-y-1.5 pl-1 leading-relaxed">
                  <li><span className="font-semibold text-slate-900">ยื่นแบบกระดาษ:</span> 1 ก.ค. - 30 ก.ย. ของทุกปี</li>
                  <li><span className="font-bold text-blue-800">ยื่นแบบออนไลน์ (E-Filing):</span> ได้ขยายเวลาเพิ่มอีก 8 วัน (ปกติถึง 8 ต.ค.)</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-extrabold text-amber-950 text-[13.5px] md:text-[14px] flex items-center gap-1">
                  📍 ยื่นได้ที่ไหนบ้าง?
                </p>
                <ul className="list-disc list-inside text-slate-700 text-[12.5px] md:text-[13px] space-y-1.5 pl-1 leading-relaxed">
                  <li><span className="font-semibold text-slate-900">ออนไลน์สะดวกที่สุด:</span> เว็บไซต์สรรพากร <a href="https://rd.go.th" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">rd.go.th</a></li>
                  <li>สำนักงานสรรพากรพื้นที่สาขาทุกแห่งทั่วประเทศ</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-100/35 p-3.5 rounded-xl border border-amber-200/40 text-[12.5px] md:text-[13px] text-amber-905 leading-relaxed">
              <p className="font-extrabold text-amber-950 text-[13.5px]">⚠️ วิธีคำนวณภาษี & เครดิตภาษี:</p>
              <p className="text-slate-700 mt-1 leading-relaxed text-[12.5px] md:text-[13px]">
                คำนวณจากรายได้ส่วนที่เกิดขึ้นระหว่าง ม.ค. - มิ.ย. หักค่าใช้จ่ายเหมา/จริงและลดหย่อนได้กึ่งหนึ่ง (50%) ของสิทธิ์ทั้งปี โดยภาษีที่จ่ายครึ่งปีนี้จะถูกนำไปเป็น <strong className="text-amber-800 font-bold">เครดิตหักล้างภาษีปลายปี (ภ.ง.ด. 90)</strong> ได้เต็มจำนวน ทำให้ไม่ต้องจ่ายซ้ำซ้อน
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // --- USER AUTHENTICATION HANDLERS ---
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const emailTrimmed = authEmail.trim().toLowerCase();
    if (!emailTrimmed || !authPassword) {
      setAuthError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    const usersStr = localStorage.getItem("thai_tax_users") || "[]";
    let users = [];
    try {
      users = JSON.parse(usersStr);
    } catch (err) {
      users = [];
    }

    const matchedUser = users.find((u: any) => u.email.toLowerCase() === emailTrimmed && u.password === authPassword);
    if (matchedUser) {
      const userSession = { email: matchedUser.email, name: matchedUser.name };
      setCurrentUser(userSession);
      localStorage.setItem("thai_tax_active_user", JSON.stringify(userSession));
      setAuthSuccess("เข้าสู่ระบบเรียบร้อยแล้ว!");
      logUserLogin(matchedUser.name, matchedUser.email);
      // Clear forms
      setAuthEmail("");
      setAuthPassword("");
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setAuthSuccess(null);
      }, 800);
    } else {
      setAuthError("อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านเริ่มต้นของบัญชีระบบคือ 123)");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const emailTrimmed = authEmail.trim().toLowerCase();
    const nameTrimmed = authName.trim();
    if (!emailTrimmed || !authPassword || !nameTrimmed) {
      setAuthError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const usersStr = localStorage.getItem("thai_tax_users") || "[]";
    let users = [];
    try {
      users = JSON.parse(usersStr);
    } catch (err) {
      users = [];
    }

    const userExists = users.some((u: any) => u.email.toLowerCase() === emailTrimmed);
    if (userExists) {
      setAuthError("อีเมลนี้ได้รับการลงทะเบียนแล้วในระบบ");
      return;
    }

    const newUser = { email: emailTrimmed, name: nameTrimmed, password: authPassword };
    users.push(newUser);
    localStorage.setItem("thai_tax_users", JSON.stringify(users));

    const userSession = { email: newUser.email, name: newUser.name };
    setCurrentUser(userSession);
    localStorage.setItem("thai_tax_active_user", JSON.stringify(userSession));
    setAuthSuccess("สมัครสมาชิกสำเร็จ!");
    logUserLogin(newUser.name, newUser.email);
    // Clear forms
    setAuthEmail("");
    setAuthName("");
    setAuthPassword("");
    setTimeout(() => {
      setIsAuthModalOpen(false);
      setAuthSuccess(null);
    }, 800);
  };

  const handleQuickLogin = (email: string) => {
    setAuthError(null);
    setAuthSuccess(null);
    const usersStr = localStorage.getItem("thai_tax_users") || "[]";
    let users = [];
    try {
      users = JSON.parse(usersStr);
    } catch (err) {
      users = [];
    }

    const matched = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      const userSession = { email: matched.email, name: matched.name };
      setCurrentUser(userSession);
      localStorage.setItem("thai_tax_active_user", JSON.stringify(userSession));
      setAuthSuccess("เข้าสู่ระบบเร็วสำเร็จ!");
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setAuthSuccess(null);
      }, 800);
    } else {
      const name = email === "acct.prompt@gmail.com" ? "User Prompt" : "เจ้าของธุรกิจป้ายแดง";
      const newUser = { email, name, password: "123" };
      users.push(newUser);
      localStorage.setItem("thai_tax_users", JSON.stringify(users));
      const userSession = { email: newUser.email, name: newUser.name };
      setCurrentUser(userSession);
      localStorage.setItem("thai_tax_active_user", JSON.stringify(userSession));
      setAuthSuccess("สลับบัญชีทดสอบเรียบร้อย!");
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setAuthSuccess(null);
      }, 800);
    }
  };

  const handleSignOut = () => {
    setCurrentUser({ email: "guest@taxsync.co", name: "ผู้ใช้งานทั่วไป", isGuest: true });
    localStorage.removeItem("thai_tax_active_user");
    setAuthError(null);
    setAuthSuccess(null);
  };

  // --- CALL SERVER SERVICE FOR GEMINI AI STRATEGY ADVICE ---
  const handleGetAiAdvice = async () => {
    setIsLoadingAdvice(true);
    setErrorAdvice(null);
    setAdvice(null);

    try {
      const data = await callApi("taxAdvisor", {
        revenue,
        expenses: actualExpenseInput,
        expenseType,
        deductions: personalResult.totalDeductions,
        personalTax: personalResult.totalTax,
        personalTaxable: personalResult.netTaxableIncome,
        corporateTax: corporateResult.corpTax,
        corporateNetProfit: corporateResult.netProfit,
        smeStatus: isSme,
        customPrompt: customAdvicePrompt,
      });
      if (data.error) {
        throw new Error(data.error);
      }
      setAdvice(data.advice);
    } catch (err: any) {
      console.error(err);
      setErrorAdvice(err.message || "ไม่สามารถเชื่อมต่อกับ AI หรือรับบริการล้มเหลว");
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // Director Planner Tax Calculator Helper
  const computeCaseSummary = (sal: number) => {
    const annualSal = sal * 12;
    const rev = plannerRevenue;
    const exp = plannerExpenses;
    const sme = plannerSme;
    const divTaxEnabled = plannerDividendTax;
    const useCustDeductions = plannerUseCustomDeductions;

    // Corporate tax before any salary deduction
    const profitBefore = Math.max(0, rev - exp);
    const calcCorpTax = (p: number) => {
      if (p <= 0) return 0;
      if (sme) {
        if (p <= 300000) return 0;
        if (p <= 3000000) return (p - 300000) * 0.15;
        return 405000 + (p - 3000000) * 0.2;
      }
      return p * 0.2;
    };

    const corpTaxBefore = calcCorpTax(profitBefore);
    const divTaxBefore = Math.max(0, profitBefore - corpTaxBefore) * (divTaxEnabled ? 0.1 : 0);
    const totalTaxBefore = corpTaxBefore + divTaxBefore;

    // Corporate tax after salary, rent, and interest deductions
    const corporationAdditionalExpenses = annualSal + plannerRentalIncome + plannerInterestIncome;
    const profitAfter = Math.max(0, rev - (exp + corporationAdditionalExpenses));
    const corpTaxAfter = calcCorpTax(profitAfter);
    const divTaxAfter = Math.max(0, profitAfter - corpTaxAfter) * (divTaxEnabled ? 0.1 : 0);
    const totalTaxAfter = corpTaxAfter + divTaxAfter;

    const corpSaved = totalTaxBefore - totalTaxAfter;

    // Personal tax
    const stdDed = Math.min(annualSal * 0.5, 100000);
    const persAllow = 60000;
    const extAllow = useCustDeductions ? (
      (hasSpouse ? 60000 : 0) + (childrenCount * 30000) + socialSecurity + insuranceCost + investmentSavings
    ) : 0;
    const taxableRent = plannerRentalIncome * 0.7; // Standard 30% expense deduction
    const taxableInterest = plannerInterestIncome; // 0% standard expense deduction
    const taxable = Math.max(0, (annualSal - stdDed) + taxableRent + taxableInterest - persAllow - extAllow);
    const persTax = calculateProgressivePersonalTax(taxable);

    const netSaved = corpSaved - persTax;

    const netProfitBefore = profitBefore - corpTaxBefore;
    const netProfitAfter = profitAfter - corpTaxAfter;
    const netReceivedBefore = netProfitBefore - divTaxBefore;
    const netReceivedAfter = netProfitAfter - divTaxAfter;

    return {
      profitBefore,
      profitAfter,
      corpTaxBefore,
      corpTaxAfter,
      divTaxBefore,
      divTaxAfter,
      netProfitBefore,
      netProfitAfter,
      netReceivedBefore,
      netReceivedAfter,
      corpSaved,
      persTax,
      netSaved,
      annualSal,
      taxable,
      corporationAdditionalExpenses
    };
  };

  const res1 = computeCaseSummary(plannerCase1Salary);
  const res2 = computeCaseSummary(plannerCase2Salary);
  const res3 = computeCaseSummary(plannerCase3Salary);
  const resCustom = plannerSalary !== plannerCase1Salary && plannerSalary !== plannerCase2Salary && plannerSalary !== plannerCase3Salary 
    ? computeCaseSummary(plannerSalary) 
    : null;

  const activeRes = computeCaseSummary(plannerSalary);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased font-sans flex flex-col justify-between">
      {/* Header Bar - Sticky on Tablet and PC, Flow on Mobile to maximize viewport */}
      <header className="bg-white border-b border-slate-200 sm:sticky sm:top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md cursor-pointer hover:bg-blue-700 transition">
              <Calculator id="app-logo" className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Tax Twin Easy
              </h1>
              <p className="text-xs text-slate-500">
                เครื่องมือเปรียบเทียบคำนวณและประเมินภาษีบุคคลธรรมดา VS จดนิติบุคคลไทย
              </p>
            </div>
          </div>

          {/* User Account Capsule & Tab Navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {currentUser && !currentUser.isGuest ? (
              <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <div className="text-left">
                    <span className="font-semibold text-slate-800 block text-[10px] leading-none max-w-[120px] truncate">{currentUser.name}</span>
                    <span className="font-mono text-slate-500 text-[9px] leading-tight max-w-[150px] truncate">{currentUser.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="ออกจากระบบ เพื่อความพึ่งใจส่วนบุคคล"
                  className="bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 p-1 rounded-lg border border-slate-200 hover:border-red-200 transition cursor-pointer flex items-center justify-center shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3.5 py-2 rounded-2xl cursor-pointer transition select-none w-full sm:w-auto justify-center shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>🔐 ล็อกอินสร้างบัญชีส่วนตัว</span>
              </button>
            )}

            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setActiveTab("personal_tax")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${
                  activeTab === "personal_tax"
                    ? "bg-white text-slate-900 shadow-xs animate-fade-in"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👤 ภาษีบุคคลธรรมดา
              </button>
              <button
                onClick={() => setActiveTab("calculator")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${
                  activeTab === "calculator"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 เปรียบเทียบสองระบบ
              </button>
              <button
                onClick={() => setActiveTab("director_salary")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${
                  activeTab === "director_salary"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💼 แผนเงินเดือนกรรมการ
              </button>
              <button
                onClick={() => setActiveTab("learn")}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition ${
                  activeTab === "learn"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💡 โครงสร้างภาษี
              </button>
              {currentUser?.email.toLowerCase() === "acct.prom@gmail.com" && (
                <button
                  onClick={() => setActiveTab("admin_logs")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                    activeTab === "admin_logs"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  🛡️ ระบบผู้ดูแล (Sheets & Logs)
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {activeTab === "calculator" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDE: Inputs / Parameter Panels */}
            <section className="lg:col-span-12 space-y-6">

              {/* Plain-language intro for first-time users */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3.5 text-sm text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>กรอกข้อมูล 3 ขั้นตอนด้านล่าง ผลลัพธ์ด้านบนจะอัปเดตให้ทันทีทุกครั้งที่แก้ตัวเลข ไม่ต้องกดปุ่มคำนวณ</span>
              </div>

              {/* Hero Result Summary: the headline takeaway, up front */}
              <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-md">
                <span className="text-xs font-bold uppercase tracking-wide opacity-80">ผลลัพธ์เบื้องต้นของคุณ</span>
                <h3 className="text-xl font-bold mt-1.5">
                  {corporateIsBetter ? "จดนิติบุคคลคุ้มกว่า" : "อยู่แบบบุคคลธรรมดาคุ้มกว่า"}
                </h3>
                <p className="text-sm opacity-90 mt-1 max-w-md">
                  {corporateIsBetter
                    ? "การจดบริษัทจะช่วยประหยัดภาษีได้มากกว่าการทำในนามบุคคลธรรมดาสำหรับรายรับนี้"
                    : "ค่าใช้จ่ายในการจดบริษัทและทำบัญชีอาจสูงกว่าภาษีที่ประหยัดได้ ยังไม่คุ้มที่จะจดในตอนนี้"}
                </p>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-3xl font-black font-mono">{costDiff.toLocaleString()}</span>
                  <span className="text-sm opacity-85">บาท/ปี ที่ประหยัดได้เพิ่ม</span>
                </div>
              </div>

              {/* Top Row: Revenue and Corporate Settings side-by-side on md+ screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card 1: Revenue Input */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full mb-3">
                      ขั้นที่ 1 · กรอกรายได้และประเภทงาน
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="text-sm font-semibold text-slate-950 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-blue-600" />
                        รายรับทั้งหมดต่อปี (Revenue)
                      </label>
                      {!useMultipleIncomes && (
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: "500k", val: 500000 },
                            { label: "1.2M", val: 1200000 },
                            { label: "1.8M (VAT)", val: 1800000 },
                            { label: "3M", val: 3000000 },
                            { label: "5M", val: 5000000 },
                            { label: "10M", val: 10000000 },
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => handleApplyPreset(preset.val)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition border cursor-pointer ${
                                revenue === preset.val
                                  ? "bg-slate-900 text-white border-slate-950 shadow-xs"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                                {preset.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative mt-1 rounded-xl shadow-xs">
                      <input
                        type="text"
                        value={revenue === 0 ? "" : revenue.toLocaleString("en-US")}
                        disabled={useMultipleIncomes}
                        onChange={(e) => setRevenue(Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                        className={`w-full pl-4 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg font-semibold transition-all ${
                          useMultipleIncomes
                            ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                        placeholder="เช่น 1,500,000"
                      />
                      <div className="absolute inset-y-0 right-0 py-3 pr-4 flex items-center pointer-events-none text-slate-400 font-bold font-mono">
                        ฿
                      </div>
                    </div>

                    {useMultipleIncomes && (
                      <div className="mt-2 text-[10.5px] bg-slate-50 text-slate-600 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span>ยอดรวมจากทุกประเภทเงินได้ที่จัดแจงในตกลงด้านล่าง ({incomes.length} แหล่งรายรับ)</span>
                      </div>
                    )}
                  </div>

                  {/* Section 40 Income Category Selector — same card as Revenue */}
                  <div className="space-y-4 pt-4 mt-2 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <label className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          ประเภทเงินได้พึงประเมิน (มาตรา 40)
                        </label>
                        <p className="text-[10px] text-slate-500 mt-0.5">ระบุประเภทและรายละเอียดแหล่งรายรับของคุณ</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseMultipleIncomes(!useMultipleIncomes)}
                        className={`text-[10.5px] px-3 py-1 rounded-full font-bold border cursor-pointer transition flex items-center gap-1 ${
                          useMultipleIncomes
                            ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {useMultipleIncomes ? "✓ โหมดหลายประเภท" : "➕ รวมรายได้หลายประเภท"}
                      </button>
                    </div>

                    {!useMultipleIncomes ? (
                      // Simple Single Income Selector
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            id="incomeTypeSelect"
                            value={incomeType}
                            onChange={(e) => setIncomeType(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition"
                          >
                            {INCOME_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2 leading-relaxed">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span>
                            {INCOME_TYPES.find((t) => t.id === incomeType)?.desc}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Multiple Incomes Management
                      <div className="space-y-3.5">
                        <div className="space-y-3">
                          {incomes.map((item, idx) => {
                            const matchedType = INCOME_TYPES.find((t) => t.id === item.typeId) || INCOME_TYPES[4];
                            return (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={item.id}
                                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                                    แหล่งเงินได้ที่ {idx + 1}
                                  </span>
                                  {incomes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIncomes(incomes.filter((x) => x.id !== item.id));
                                      }}
                                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-200 transition cursor-pointer"
                                    >
                                      ลบแหล่งนี้
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                  {/* Type Select */}
                                  <div className="md:col-span-8 relative">
                                    <select
                                      value={item.typeId}
                                      onChange={(e) => {
                                        const updated = incomes.map((x) =>
                                          x.id === item.id ? { ...x, typeId: e.target.value } : x
                                        );
                                        setIncomes(updated);
                                      }}
                                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      {INCOME_TYPES.map((type) => (
                                        <option key={type.id} value={type.id}>
                                          {type.name}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </div>
                                  </div>

                                  {/* Amount Input */}
                                  <div className="md:col-span-4 relative">
                                    <input
                                      type="text"
                                      value={item.amount === 0 ? "" : item.amount.toLocaleString("en-US")}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                        const updated = incomes.map((x) =>
                                          x.id === item.id ? { ...x, amount: val } : x
                                        );
                                        setIncomes(updated);
                                      }}
                                      placeholder="ยอดเงิน (บาท)"
                                      className="w-full pl-2 pr-7 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-950 font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="absolute right-2.5 inset-y-0 flex items-center text-[10px] font-bold text-slate-400">
                                      ฿
                                    </span>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-550 flex items-start gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                  <span>{matchedType.desc}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                            setIncomes([...incomes, { id, typeId: "40_8", amount: 200000 }]);
                          }}
                          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-blue-600" />
                          เพิ่มแหล่งเงินได้ มาตรา 40 ตัวอื่น
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Box 3: Corporate Settings (นิติบุคคล) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
                    ขั้นที่ 2 · ตั้งค่านิติบุคคล (ถ้ามี)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    พารามิเตอร์การวางโครงสร้าง นิติบุคคล
                  </h3>
                  <p className="text-xs text-slate-500 -mt-2">ถ้ายังไม่มีบริษัท ข้ามส่วนนี้ไปได้เลย ใช้ค่าเริ่มต้นก็พอ</p>

                  <div className="text-xs space-y-3.5">
                    {/* SME Status Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-900 flex items-center gap-1">
                          กิจการอยู่ในเกณฑ์ SME ไทย
                          <span className="cursor-help" title="จดทะเบียนทุน < 5 ล้านบาท และรายรับสะสม < 30 ล้านบาท/ปี">
                            <Info className="w-3 h-3 text-slate-400" />
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ได้รับพิกัดภาษีอัตราพิเศษ (0% / 15% / 20%)
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isSme} 
                          disabled={revenue > 30000000} // Force disable if revenue is gigantic
                          onChange={() => setIsSme(!isSme)} 
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:bg-slate-300"></div>
                      </label>
                    </div>



                    {/* Dividend Withholding Tax Numeric Input */}
                    <div className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-800 block text-xs">ระบุจำนวนเงินปันผลที่ต้องการจ่าย (บาท)</span>
                          <span className="text-[10px] text-slate-500 block">หักภาษี ณ ที่จ่าย 10% อัตโนมัติ</span>
                        </div>
                        <div className="relative flex items-center max-w-[150px] shrink-0">
                          <input
                            type="text"
                            value={dividendPayout === 0 ? "" : dividendPayout.toLocaleString("en-US")}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const valNum = parseInt(val) || 0;
                              setDividendPayout(valNum);
                            }}
                            placeholder="0"
                            className="w-full pl-2 pr-5 py-1 text-right font-mono text-blue-600 font-bold bg-white focus:ring-1 focus:ring-indigo-500 rounded border border-slate-200 focus:border-indigo-500 text-xs focus:outline-none"
                          />
                          <span className="absolute right-1.5 text-slate-400 font-semibold text-[10px]">฿</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">กำไรหลังภาษีสูงสุด:</span>
                          <span className="font-mono font-medium text-slate-700">
                            {corporateResult.netProfitAfterTax.toLocaleString()} ฿
                          </span>
                        </div>
                        {corporateResult.netProfitAfterTax > 0 && (
                          <button
                            type="button"
                            onClick={() => setDividendPayout(corporateResult.netProfitAfterTax)}
                            className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                          >
                            [ ปันผลทั้งหมด ]
                          </button>
                        )}
                      </div>

                      <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-lg text-[10px] border border-indigo-100/30">
                        <span className="text-slate-600 font-semibold">ภาษีเงินปันผลหัก ณ ที่จ่าย (10%):</span>
                        <span className="font-mono font-bold text-indigo-600 text-[11px]">
                          {Math.round(dividendPayout * 0.10).toLocaleString()} ฿
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Box 1.5: Income Categories and Expenses */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">

                {/* VAT Warning Banner */}
                {revenue > 1800000 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-2.5 items-start text-xs text-amber-800"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">ข้อควรระวัง: รายรับเกิน 1.8 ล้านบาทต่อปี</p>
                      <p className="text-slate-600 mt-0.5">
                        กฎหมายกำหนดให้ผู้มีรายรับเกิน 1,800,000 บาท/ปี ต้องจดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%) ภายใน 30 วันนับแต่วันที่รายรับถึงเกณฑ์ ไม่ว่าจะเป็นบุคคลธรรมดาหรือนิติบุคคล
                      </p>
                    </div>
                  </motion.div>
                )}


                {/* Business Expense Toggle Selection */}
                <div>
                  <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full mb-3">
                    ขั้นที่ 3 · เลือกวิธีหักค่าใช้จ่าย
                  </span>
                  <label className="text-sm font-semibold text-slate-950 flex items-center gap-1.5 mb-1">
                    <Layers className="w-4 h-4 text-blue-600" />
                    ค่าใช้จ่ายในธุรกิจ (Expenses Deductible)
                  </label>
                  <p className="text-xs text-slate-500 mb-3">ไม่แน่ใจให้เลือก "หักแบบเหมา" ไว้ก่อน ง่ายที่สุด ไม่ต้องมีใบเสร็จ</p>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setExpenseType("flat")}
                      className={`text-xs py-2 rounded-lg font-medium transition ${
                        expenseType === "flat"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      หักแบบเหมา (60%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseType("actual")}
                      className={`text-xs py-2 rounded-lg font-medium transition ${
                        expenseType === "actual"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      หักค่าใช้จ่ายตามจริง
                    </button>
                  </div>

                  {expenseType === "flat" ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 align-middle">
                      <p className="flex justify-between font-medium text-slate-900">
                        <span>ฐานหักค่าใช้จ่ายเหมา (60%):</span>
                        <span className="font-mono text-slate-950 font-bold">
                          {(revenue * 0.60).toLocaleString()} บาท
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 border-t border-slate-200/60 pt-1.5 mt-1">
                        *หักค่าใช้จ่ายเหมาอัตราร้อยละ 60 อัตโนมัติจากรายได้ทั้งหมด
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold">กรอกค่าใช้จ่ายจริง (บาท)</label>
                          <input
                            type="text"
                            value={actualExpenseInput === 0 ? "" : actualExpenseInput.toLocaleString("en-US")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              handleActualExpenseChange(val);
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-950 text-right focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold">ระบุสัดส่วน (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={actualExpensePercent || ""}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              handlePercentSliderChange(val);
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-950 text-right focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[10.5px] text-slate-500 leading-normal border-t border-slate-200/60 pt-2.5 mt-1.5">
                        <p className="flex items-start gap-1">
                          <span className="text-indigo-600 font-bold shrink-0">💻 นิติบุคคล:</span>
                          <span>บังคับใช้ระบบบันทึกค่าใช้จ่ายตามจริง และต้องมีใบเสร็จ+บัญชีถูกต้องเท่านั้น</span>
                        </p>
                        <p className="flex items-start gap-1">
                          <span className="text-blue-600 font-bold shrink-0">👤 บุคคลธรรมดา:</span>
                          <span>หากเลือกหักตามจริง จะต้องจัดทำ&ldquo;รายงานรายรับ-รายจ่าย&rdquo; และเก็บรักษาใบกำกับภาษี/ใบเสร็จรับเงินเป็นหลักฐานเพื่อให้สรรพากรตรวจสอบย้อนหลังได้</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </section>

            {/* RIGHT SIDE: SIDE-BY-SIDE CALCULATIONS AND REAL-TIME COMPARISON (7 Cols) */}
            <section className="lg:col-span-12 space-y-6">

              {/* Side by Side Detailed Grid columns: NOW 3 COLUMNS! */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* COLUMN 1: บุคคลธรรมดา (หักเหมา) */}
                <div className={`relative bg-white p-5 rounded-2xl border transition shadow-xs flex flex-col justify-between ${expenseType === "flat" ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200"}`}>
                  {/* Vertical Divider for desktop to separate Column 1 & 2 */}
                  <div className="hidden md:block absolute -right-3 top-6 bottom-6 w-px bg-slate-200/80" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4 h-12">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">บุคคล (หักเหมา)</h3>
                            <p className="text-[10px] text-slate-400 font-medium">จ่ายภาษีเฉลี่ยแบบเหมา %</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {(() => {
                              const t = INCOME_TYPES.find(x => x.id === incomeType);
                              if (t?.id === "40_1") return "40(1)";
                              if (t?.id === "40_2") return "40(2)";
                              if (t?.id === "40_3") return "40(3)";
                              if (t?.id === "40_4") return "40(4)";
                              if (t?.id === "40_5") return "40(5)";
                              if (t?.id === "40_6_med" || t?.id === "40_6_other") return "40(6)";
                              if (t?.id === "40_7") return "40(7)";
                              return "40(8)";
                            })()}
                          </span>
                          {expenseType === "flat" && (
                            <span className="text-[8.5px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-300">
                              กำลังใช้งาน
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3.5 text-sm sm:text-base">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">รายรับประเภท 40</span>
                          <div className="relative flex items-center w-[145px]">
                            <input
                              type="text"
                              readOnly
                              value={revenue.toLocaleString()}
                              className="w-full pl-2 pr-4 py-1 text-right font-mono text-slate-900 font-bold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">หักเหมา (60%)</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              readOnly
                              value={personalFlatResult.totalExpenses.toLocaleString()}
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">ลบ ค่าลดหย่อนรวม</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={customDeductions === null ? "" : customDeductions.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = e.target.value === "" ? null : (parseInt(val) || 0);
                                setCustomDeductions(valNum);
                              }}
                              placeholder={defaultPersonalDeductions.toLocaleString()}
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded border border-slate-200 focus:border-blue-500 transition-all focus:outline-none placeholder-red-400/70"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-600 text-xs sm:text-sm">เงินได้สุทธิสุทธิ:</span>
                            <span className="font-mono font-bold text-sm sm:text-base text-blue-700">
                              {personalFlatResult.netTaxableIncome.toLocaleString()} ฿
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Analysis Summary Card */}
                    <div className="mt-auto pt-4">
                      {renderCardAnalysis("personal_flat")}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono block">อัตราขั้นสุดท้าย</span>
                        <strong className="text-slate-900 text-sm md:text-base font-mono">{personalFlatResult.marginalRate}%</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">ภาษีสุทธิแบบเหมา</span>
                        <span className="text-base md:text-lg font-bold font-mono text-blue-600 block">
                          {personalFlatResult.totalTax.toLocaleString()} บ.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: บุคคลธรรมดา (หักตามจริง) */}
                <div className={`relative bg-white p-5 rounded-2xl border transition shadow-xs flex flex-col justify-between ${expenseType === "actual" ? "border-amber-500 ring-2 ring-amber-500/15" : "border-slate-200"}`}>
                  {/* Vertical Divider for desktop to separate Column 2 & 3 */}
                  <div className="hidden md:block absolute -right-3 top-6 bottom-6 w-px bg-slate-200/80" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4 h-12">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">บุคคล (หักจริง)</h3>
                            <p className="text-[10px] text-slate-400 font-medium">ยื่นตามค่าใช้จ่ายจริงในธุรกิจ</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {(() => {
                              const t = INCOME_TYPES.find(x => x.id === incomeType);
                              if (t?.id === "40_1") return "40(1)";
                              if (t?.id === "40_2") return "40(2)";
                              if (t?.id === "40_3") return "40(3)";
                              if (t?.id === "40_4") return "40(4)";
                              if (t?.id === "40_5") return "40(5)";
                              if (t?.id === "40_6_med" || t?.id === "40_6_other") return "40(6)";
                              if (t?.id === "40_7") return "40(7)";
                              return "40(8)";
                            })()}
                          </span>
                          {expenseType === "actual" && (
                            <span className="text-[8.5px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                              กำลังใช้งาน
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3.5 text-sm sm:text-base">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">รายรับประเภท 40</span>
                          <div className="relative flex items-center w-[145px]">
                            <input
                              type="text"
                              readOnly
                              value={revenue.toLocaleString()}
                              className="w-full pl-2 pr-4 py-1 text-right font-mono text-slate-900 font-bold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">หักตามจริง ({actualExpensePercent}%)</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={actualExpenseInput === 0 ? "" : actualExpenseInput.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = parseInt(val) || 0;
                                handleActualExpenseChange(valNum);
                              }}
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded border border-slate-200 focus:border-amber-500 transition-all focus:outline-none"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">ลบ ค่าทำบัญชี</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={personalBookkeepingFee === 0 ? "" : personalBookkeepingFee.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = parseInt(val) || 0;
                                setPersonalBookkeepingFee(valNum);
                              }}
                              placeholder="12,000"
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded border border-slate-200 focus:border-amber-500 transition-all focus:outline-none placeholder-red-400/70"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">ลบ ค่าลดหย่อนรวม</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={customDeductions === null ? "" : customDeductions.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = e.target.value === "" ? null : (parseInt(val) || 0);
                                setCustomDeductions(valNum);
                              }}
                              placeholder={defaultPersonalDeductions.toLocaleString()}
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded border border-slate-200 focus:border-amber-500 transition-all focus:outline-none placeholder-red-400/70"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-600 text-xs sm:text-sm">เงินได้สุทธิสุทธิ:</span>
                            <span className="font-mono font-bold text-sm sm:text-base text-amber-700">
                              {personalActualResult.netTaxableIncome.toLocaleString()} ฿
                            </span>
                          </div>
                        </div>

                        {/* Informational report badge */}
                        <div className="p-2.5 bg-amber-50/75 rounded-lg border border-amber-200/50 space-y-0.5">
                          <span className="text-[10px] font-bold text-amber-900 flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            เงื่อนไขและวินัยเอกสาร:
                          </span>
                          <p className="text-[9px] text-slate-600 leading-normal">
                            ต้องทำบัญชีรายรับ-รายจ่ายประจำวัน และเก็บหลักฐานใบเสร็จรับเงิน/ใบส่งของครบถ้วน เพื่อรองรับตรวจย้อนหลัง
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Analysis Summary Card */}
                    <div className="mt-auto pt-4">
                      {renderCardAnalysis("personal_actual")}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono block">อัตราขั้นสุดท้าย</span>
                        <strong className="text-slate-900 text-sm md:text-base font-mono">{personalActualResult.marginalRate}%</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">ภาษีสุทธิหักตามจริง</span>
                        <span className="text-base md:text-lg font-bold font-mono text-amber-600 block">
                          {personalActualResult.totalTax.toLocaleString()} บ.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: จัดตั้งนิติบุคคล */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4 h-12">
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg animate-pulse">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">จัดตั้งนิติบุคคล</h3>
                            <p className="text-[10px] text-slate-400 font-medium">โครงสร้างจัดตั้งบริษัทจำกัด</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                          {isSme ? "SME อัตราเบา" : "บจ. ทั่วไป"}
                        </span>
                      </div>

                      <div className="space-y-3.5 text-sm sm:text-base">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">รายรับนิติบุคคลรวม</span>
                          <div className="relative flex items-center w-[145px]">
                            <input
                              type="text"
                              readOnly
                              value={revenue.toLocaleString()}
                              className="w-full pl-2 pr-4 py-1 text-right font-mono text-slate-900 font-bold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 font-medium">หักรายจ่ายจริงนิติบุคคล</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={corporateExpensesOverride === null ? "" : corporateExpensesOverride.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = e.target.value === "" ? null : (parseInt(val) || 0);
                                setCorporateExpensesOverride(valNum);
                                
                                // Auto sync to personal actual expense
                                const syncVal = valNum === null ? 0 : valNum;
                                setActualExpenseInput(syncVal);
                                if (revenue > 0) {
                                  const pct = Math.min(100, Math.max(0, Math.round((syncVal / revenue) * 100)));
                                  setActualExpensePercent(pct);
                                }
                              }}
                              placeholder={(expenseType === "flat" ? revenue * 0.45 : actualExpenseInput).toLocaleString()}
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded border border-slate-200 focus:border-indigo-500 transition-all focus:outline-none placeholder-red-400/70"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-0.5 mb-1">
                          <span className="text-slate-500 font-medium">ลบ ค่าทำ/ตรวจบัญชี CPA</span>
                          <div className="relative flex items-center w-[145px]">
                            <span className="absolute left-1.5 text-red-600 font-medium">-</span>
                            <input
                              type="text"
                              value={auditFee === 0 ? "" : auditFee.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                const valNum = parseInt(val) || 0;
                                setAuditFee(valNum);
                              }}
                              placeholder="20,000"
                              className="w-full pl-4 pr-4 py-1 text-right font-mono text-red-600 font-bold bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded border border-slate-200 focus:border-indigo-500 transition-all focus:outline-none"
                            />
                            <span className="absolute right-1.5 text-slate-400 font-bold text-[11px]">฿</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-600 text-xs sm:text-sm">กำไรสุทธิทางภาษี:</span>
                            <span className="font-mono font-bold text-sm sm:text-base text-indigo-700">
                              {corporateResult.netProfit.toLocaleString()} ฿
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-100 mt-2">
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-500 text-xs font-medium">ภาษีนิติบุคคล (ภ.ง.ด.50):</span>
                            <div className="relative flex items-center w-[145px]">
                              <input
                                type="text"
                                readOnly
                                value={corporateResult.corpTax.toLocaleString()}
                                className="w-full pr-4 py-1 text-right font-mono text-slate-700 font-semibold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default text-xs"
                              />
                              <span className="absolute right-1.5 text-slate-400 font-bold text-[10px]">฿</span>
                            </div>
                          </div>
                          {corporateResult.dividendTax > 0 && (
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-slate-500 text-xs font-medium">ภาษีเงินปันผล (10%):</span>
                              <div className="relative flex items-center w-[145px]">
                                <input
                                  type="text"
                                  readOnly
                                  value={corporateResult.dividendTax.toLocaleString()}
                                  className="w-full pr-4 py-1 text-right font-mono text-slate-700 font-semibold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default text-xs"
                                />
                                <span className="absolute right-1.5 text-slate-400 font-bold text-[10px]">฿</span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-500 text-xs font-medium">รวมค่าทำบัญชีและสอบงบ:</span>
                            <div className="relative flex items-center w-[145px]">
                              <input
                                type="text"
                                readOnly
                                value={auditFee.toLocaleString()}
                                className="w-full pr-4 py-1 text-right font-mono text-slate-750 font-semibold bg-slate-50/50 rounded border border-slate-100 transition-all focus:outline-none cursor-default text-xs"
                              />
                              <span className="absolute right-1.5 text-slate-400 font-bold text-[10px]">฿</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Analysis Summary Card */}
                    <div className="mt-auto pt-4">
                      {renderCardAnalysis("corporate")}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono block">อัตราภาษีนิติบุคคล</span>
                        <strong className="text-slate-900 text-sm md:text-base font-mono">{corporateResult.marginalRate}%</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">ภาระรวมโครงสร้างนิติบุคคล</span>
                        <span className="text-base md:text-lg font-bold font-mono text-indigo-600 block">
                          {corporateResult.totalCost.toLocaleString()} บ.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>



              {/* AI SEGMENT: ADVANCED TAX STRATEGY & DEDUCTIONS PLANNER (GEMINI PROXY) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-blue-600 w-1.5 h-full"></div>
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-bounce" />
                      ระบบวิเคราะห์และแนะนำลดหย่อนอัจฉริยะ (AI Agent)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      ส่งข้อมูลตัวเลขคำนวณด้านบนเข้าสู่โมเดลสมองกลวิเคราะห์เฉพาะเจาะจงสำหรับสถานการณ์ของคุณ
                    </p>

                    {/* NEW INPUT AREA FOR CUSTOM QUESTION */}
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          ประเด็นหรือคำถามเพิ่มเติมที่ต้องการเน้น (ระบุหรือไม่ระบุก็ได้):
                        </label>
                        <textarea
                          value={customAdvicePrompt}
                          onChange={(e) => setCustomAdvicePrompt(e.target.value)}
                          placeholder="เช่น: อยากเน้นการลดหย่อนประกันและกองทุน, รายได้ 1.5 ล้านจดบริษัทคุ้มไหม, แนะนำการตั้งเงินเดือนกรรมการ ฯลฯ"
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 font-medium transition duration-150 resize-none"
                          rows={2}
                          disabled={isLoadingAdvice}
                        />
                      </div>

                      {/* Quick query recommendation tags */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold self-center">ตัวเลือกด่วน:</span>
                        {[
                          "ซื้อประกันและกองทุนลดหย่อนอะไรดีบ้าง",
                          "จดทะเบียนบริษัทคุ้มค่ากว่าบุคคลธรรมดาไหม",
                          "คำแนะนำการบริหารเงินเดือนกรรมการสำหรับนิติบุคคล",
                          "ฐานรายได้เกิน 1.8 ล้านบาท ต้องจัดการ VAT อย่างไร"
                        ].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setCustomAdvicePrompt(tag)}
                            disabled={isLoadingAdvice}
                            type="button"
                            className={`text-[10px] px-2 py-1 rounded-lg border transition font-medium cursor-pointer ${
                              customAdvicePrompt === tag
                                ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                                : "bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-600 border-slate-200"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                        {customAdvicePrompt && (
                          <button
                            onClick={() => setCustomAdvicePrompt("")}
                            type="button"
                            className="text-[10px] text-red-500 hover:text-red-700 font-bold self-center ml-auto underline cursor-pointer"
                          >
                            ล้างคำค้นหา
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-3 shrink-0 self-end md:self-start">
                    <button
                      onClick={handleGetAiAdvice}
                      disabled={isLoadingAdvice}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold px-4 py-3 rounded-xl transition cursor-pointer shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {isLoadingAdvice ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-slate-100 border-t-slate-500 animate-spin rounded-full"></span>
                          กำลังวิเคราะห์...
                        </span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-blue-300 animate-pulse" />
                          ขอคำแนะนำวางแผนภาษีจาก AI
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isLoadingAdvice && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8 space-y-3"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-600 animate-spin rounded-full"></div>
                        <Sparkles className="w-5 h-5 text-indigo-600 absolute top-2.5 left-2.5 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-800">Gemini กำลังจำลองสถาปัตยกรรมภาษีในแบบของคุณ...</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          โมเดลกำลังประเมินขอบข่ายกฎหมายรายจ่ายบุคคลมาตรา 40, ขอบข่ายบัญชีนิติบุคคล, คำนวณภาษีปันผลและภาษีเงินได้กรรมการ (Director Compensation) เพื่อเปรียบเทียบในมุมที่ครอบคลุมมากที่สุด
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {errorAdvice && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex gap-2 items-center"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span>{errorAdvice}</span>
                    </motion.div>
                  )}

                  {advice && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 space-y-4"
                    >
                      <div className="flex items-center gap-2 pb-2.5 border-b border-blue-100/80">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-slate-900 text-sm">
                          ผลวิเคราะห์และวางแผนระดับสูงแบบเรียลไทม์ โดย AI ของคุณ
                        </h4>
                      </div>

                      {/* Render compiled Markdown advice beautifully */}
                      <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed space-y-4 prose-headings:font-bold prose-headings:text-slate-900 prose-p:my-2 prose-strong:text-blue-900 prose-ul:list-disc prose-ul:pl-5">
                        <ReactMarkdown>{advice}</ReactMarkdown>
                      </div>

                      <div className="bg-white/80 p-3.5 rounded-xl border border-blue-200 text-[11px] text-slate-500 flex gap-2 items-center italic">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>คำแนะนำนี้เป็นเพียงแบบจำลองเบื้องต้นเพื่ออำนวยความสะดวกในการคิดทางเลือก ควรปรึกษาสำนักงานบัญชีหรือที่ปรึกษากฎหมายภาษีก่อนจดจดจัดตั้งจริง</span>
                      </div>
                    </motion.div>
                  )}

                  {!advice && !isLoadingAdvice && !errorAdvice && (
                    <div className="bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl p-5 text-center text-xs space-y-1">
                      <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">ไม่มีผลวิเคราะห์ที่โหลดอยู่</p>
                      <p className="text-[11px]">คลิกปุ่มสีดำเพื่อส่งข้อมูลการคำนวณเบื้องต้นให้ AI และรับคำแนะนำระดับสูงสำหรับคุณ</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

            </section>

          </div>
        ) : activeTab === "personal_tax" ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Top header block */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 animate-fade-in">
              <span className="p-1 px-2.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs shrink-0">
                 ภ.ง.ด. 90/91
              </span>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                คำนวณและแจกแจงภาษีบุคคลธรรมดา
              </h2>
            </div>

            {/* Step Progress Indicator */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center">
                {["ประเภทอาชีพ", "รายได้-รายจ่าย", "ค่าลดหย่อน", "สรุปผล"].map((label, idx) => {
                  const stepNum = idx + 1;
                  const isDone = personalTaxStep > stepNum;
                  const isActive = personalTaxStep === stepNum;
                  return (
                    <React.Fragment key={label}>
                      <button
                        type="button"
                        onClick={() => { if (isDone || isActive) setPersonalTaxStep(stepNum); }}
                        className={`flex flex-col items-center gap-1.5 shrink-0 ${isDone || isActive ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          isActive || isDone ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {isDone ? "✓" : stepNum}
                        </div>
                        <span className={`text-[11px] font-bold whitespace-nowrap ${isActive ? "text-blue-700" : "text-slate-500"}`}>{label}</span>
                      </button>
                      {stepNum < 4 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-5 rounded ${personalTaxStep > stepNum ? "bg-blue-600" : "bg-slate-200"}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Content layout: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: STEP CONTENT (5 cols) */}
              <div className="lg:col-span-5 space-y-5">

                {/* Persona Quick-Picker: jumps straight to a sensible income type */}
                {personalTaxStep === 1 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full mb-2.5">
                    ขั้นที่ 1
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mb-0.5">ธุรกิจของคุณใกล้เคียงแบบไหนที่สุด?</h3>
                  <p className="text-xs text-slate-500 mb-3">ครอบคลุมเงินได้ทุกประเภทตามมาตรา 40(1)-40(8)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "40_1", emoji: "🏛️", name: "ข้าราชการ/พนักงาน", desc: "เงินเดือน โบนัส · 40(1)" },
                      { id: "40_2", emoji: "💻", name: "ฟรีแลนซ์/รับจ้าง", desc: "นายหน้า ไรเดอร์ · 40(2)" },
                      { id: "40_3", emoji: "🎨", name: "ค่าลิขสิทธิ์", desc: "งานเขียน เพลง · 40(3)" },
                      { id: "40_4", emoji: "💰", name: "เงินลงทุน/ปันผล", desc: "ดอกเบี้ย ปันผล · 40(4)" },
                      { id: "40_5", emoji: "🏠", name: "ให้เช่าทรัพย์สิน", desc: "บ้าน ที่ดิน รถ · 40(5)" },
                      { id: "40_6_med", emoji: "🩺", name: "แพทย์/พยาบาล", desc: "วิชาชีพเวชกรรม · 40(6)" },
                      { id: "40_6_other", emoji: "⚖️", name: "วิชาชีพอิสระอื่น", desc: "ทนาย บัญชี วิศวกร · 40(6)" },
                      { id: "40_7", emoji: "🏗️", name: "รับเหมาก่อสร้าง", desc: "งานก่อสร้าง · 40(7)" },
                      { id: "40_8", emoji: "🛍️", name: "ค้าขาย/เกษตรกร", desc: "ขายของ ร้านอาหาร ทำไร่ · 40(8)" },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => { setIncomeType(p.id); setUseMultipleIncomes(false); setSelectedPersona(p.name); }}
                        className={`text-left p-2.5 rounded-xl border-2 transition cursor-pointer ${
                          selectedPersona === p.name
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{p.emoji}</span>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">{p.name}</span>
                        <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-tight">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* 1. Core Income section */}
                {personalTaxStep === 2 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
                    ขั้นที่ 2
                  </span>
                  <div className="flex items-center gap-2 pb-3 border-b border-blue-100/50">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Coins className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">กรอกรายได้และค่าใช้จ่าย</h3>
                  </div>
                  <p className="text-xs text-slate-500 -mt-3">พิมพ์ตัวเลขรายได้รวมทั้งปีของคุณ ถ้าไม่แน่ใจให้กะประมาณก่อนได้</p>

                  {/* Revenue Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">รายรับทั้งหมดต่อปี (บาท)</label>
                      <span className="text-xs font-mono font-bold text-slate-900">{revenue.toLocaleString()} บาท</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={revenue === 0 ? "" : revenue.toLocaleString("en-US")}
                        disabled={useMultipleIncomes}
                        onChange={(e) => setRevenue(Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                        placeholder="0"
                        className={`w-full pl-4 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm font-semibold transition-all ${
                          useMultipleIncomes
                            ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 font-bold text-xs">฿</span>
                    </div>
                    {!useMultipleIncomes && (
                      <input
                        type="range"
                        min="100000"
                        max="15000000"
                        step="50000"
                        value={revenue}
                        onChange={(e) => setRevenue(parseInt(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 rounded-lg bg-slate-200"
                      />
                    )}
                  </div>

                  {/* Income Category Selector */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        ประเภทมาตรา 40 (เงินได้พึงประเมิน)
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseMultipleIncomes(!useMultipleIncomes)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                          useMultipleIncomes
                            ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                            : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {useMultipleIncomes ? "✓ หลายประเภท" : "➕ รวมหลายประเภท"}
                      </button>
                    </div>

                    {!useMultipleIncomes ? (
                      <div className="relative">
                        <select
                          value={incomeType}
                          onChange={(e) => setIncomeType(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                          {INCOME_TYPES.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {incomes.map((item, idx) => {
                          const matchedType = INCOME_TYPES.find((t) => t.id === item.typeId) || INCOME_TYPES[4];
                          return (
                            <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs relative">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase font-extrabold text-slate-400 font-mono">แหล่งรายที่ {idx + 1}</span>
                                {incomes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setIncomes(incomes.filter((x) => x.id !== item.id))}
                                    className="text-[9px] text-rose-550 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 cursor-pointer"
                                  >
                                    ลบ
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-8 relative">
                                  <select
                                    value={item.typeId}
                                    onChange={(e) => {
                                      const updated = incomes.map((x) =>
                                        x.id === item.id ? { ...x, typeId: e.target.value } : x
                                      );
                                      setIncomes(updated);
                                    }}
                                    className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-semibold text-slate-900"
                                  >
                                    {INCOME_TYPES.map((type) => (
                                      <option key={type.id} value={type.id}>
                                        {type.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-4 relative">
                                  <input
                                    type="text"
                                    value={item.amount === 0 ? "" : item.amount.toLocaleString("en-US")}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                      const updated = incomes.map((x) =>
                                        x.id === item.id ? { ...x, amount: val } : x
                                      );
                                      setIncomes(updated);
                                    }}
                                    className="w-full p-1.5 pr-3 bg-white border border-slate-300 rounded-lg text-[10px] font-bold text-right font-mono text-slate-950"
                                    placeholder="บาท"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                            setIncomes([...incomes, { id, typeId: "40_8", amount: 200000 }]);
                          }}
                          className="w-full py-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[10px] font-bold text-slate-650 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-blue-600" /> เพิ่มประเภทเงินได้มาตรา 40 อื่น
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expense Type Selectors */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700">การหักค่าใช้จ่ายในวิชาชีพ</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setExpenseType("flat")}
                        className={`text-[11px] py-1.5 rounded-lg font-bold transition ${
                          expenseType === "flat"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        หักเหมาตามสิทธิ์ ({((INCOME_TYPES.find(t => t.id === incomeType) || INCOME_TYPES[4]).rate * 100)}%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseType("actual")}
                        className={`text-[11px] py-1.5 rounded-lg font-bold transition ${
                          expenseType === "actual"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        หักค่าใช้จ่ายจริง
                      </button>
                    </div>

                    {expenseType === "flat" ? (
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/70 text-xs text-blue-800 space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span>ค่าใช้จ่ายพึงหักสะสม:</span>
                          <span className="font-mono text-blue-950 font-bold">
                            {(() => {
                              const selectedType = INCOME_TYPES.find(t => t.id === incomeType) || INCOME_TYPES[4];
                              let calculatedVal = revenue * selectedType.rate;
                              if (selectedType.hasCap) {
                                calculatedVal = Math.min(calculatedVal, selectedType.maxCap);
                              }
                              return Math.round(calculatedVal);
                            })().toLocaleString()} บาท
                          </span>
                        </div>
                        <p className="text-[10px] text-blue-700/80 leading-snug">
                          * {(INCOME_TYPES.find(t => t.id === incomeType) || INCOME_TYPES[4]).desc}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">กรอกค่าใช้จ่ายจริง (บาท)</label>
                            <input
                              type="text"
                              value={actualExpenseInput === 0 ? "" : actualExpenseInput.toLocaleString("en-US")}
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                handleActualExpenseChange(val);
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-950 text-right focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">ระบุสัดส่วน (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={actualExpensePercent || ""}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                handlePercentSliderChange(val);
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-950 text-right focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* 2. Deductions Settings Card */}
                {personalTaxStep === 3 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
                    ขั้นที่ 3
                  </span>
                  <div className="flex items-center justify-between pb-3 border-b border-blue-100/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">ค่าลดหย่อนส่วนบุคคลและสะสม</h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 -mt-2">ไม่แน่ใจข้ามได้เลย ระบบใช้ค่าเริ่มต้นให้อัตโนมัติ</p>

                  {/* Mode selector: Simple vs Detailed (20 items) */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setUseDetailedDeductions(false)}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition-all duration-150 ${
                        !useDetailedDeductions
                          ? "bg-white text-indigo-800 shadow-sm border border-slate-200/20"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                      }`}
                    >
                      💡 แบบลดหย่อนทั่วไป (ด่วน)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseDetailedDeductions(true)}
                      className={`py-2 text-center text-xs font-bold rounded-lg transition-all duration-150 ${
                        useDetailedDeductions
                          ? "bg-white text-indigo-800 shadow-sm border border-slate-200/20"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                      }`}
                    >
                      📋 แบบละเอียดครบ 20 รายการ
                    </button>
                  </div>

                  {/* SIMPLE MODE INTERFACE */}
                  {!useDetailedDeductions ? (
                    <div className="space-y-4 text-xs animate-fade-in">
                      {/* Fixed Single Allowance */}
                      <div className="flex justify-between p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-[11px]">
                        <div>
                          <span className="font-bold text-indigo-900 block">ส่วนตัวผู้เสียภาษี (60,000 บาท)</span>
                          <span className="text-slate-500 text-[10px]">สิทธิ์ลดหย่อนพื้นฐานสำหรับผู้มีรายได้ทุกคน</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-800 self-center">60,000 บ.</span>
                      </div>

                      {/* Spouse toggle */}
                      <div className="flex items-center justify-between p-2.5 border border-slate-200/80 rounded-xl hover:bg-slate-50/50 transition duration-155">
                        <div>
                          <span className="font-bold text-slate-800 block">มีคู่สมรสไม่มีเงินได้</span>
                          <span className="text-[10px] text-slate-400">+ ลดหย่อนเพิ่มเติม 60,000 บาท</span>
                        </div>
                        <label className="inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={hasSpouse}
                            onChange={() => setHasSpouse(!hasSpouse)}
                            className="sr-only peer"
                          />
                          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            hasSpouse ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                          }`}>
                            {hasSpouse && <span className="text-white text-sm font-bold leading-none">✓</span>}
                          </div>
                        </label>
                      </div>

                      {/* Children count input box */}
                      <div className="space-y-1.5 p-3 px-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 block text-xs">จำนวนบุตรผู้เข้าเกณฑ์ลดหย่อน</span>
                          <span className="text-[9.5px] text-slate-400 block leading-tight">* ลดหย่อนคนละ 30,000 บาทต่อปี (สูงสุด 5 คน)</span>
                          <span className="font-semibold text-[10.5px] text-indigo-700 block mt-0.5">
                            สิทธิ์ลดหย่อนรวม: -{(childrenCount * 30000).toLocaleString()} ฿
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={childrenCount}
                            onChange={(e) => setChildrenCount(Math.min(5, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-16 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-500 font-bold">คน</span>
                        </div>
                      </div>

                      {/* Social Security Input */}
                      <div className="space-y-1.5 p-3 px-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 block text-xs">กองทุนประกันสังคม</span>
                          <span className="text-[9.5px] text-slate-400 block leading-tight">สูงสุดไม่เกิน 9,000 ฿ ต่อปี (ม.33)</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            value={socialSecurity === 0 ? "" : socialSecurity.toLocaleString("en-US")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              setSocialSecurity(Math.min(9000, val));
                            }}
                            className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                          />
                          <span className="text-xs text-slate-500 font-bold">บาท</span>
                        </div>
                      </div>

                      {/* Life/Health Insurance Input */}
                      <div className="space-y-1.5 p-3 px-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 block text-xs">เบี้ยประกันสุขภาพและชีวิตรวม</span>
                          <span className="text-[9.5px] text-slate-400 block leading-tight">ลดหย่อนตามจริงได้สูงสุดไม่เกิน 100,000 ฿ ต่อปี</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            value={insuranceCost === 0 ? "" : insuranceCost.toLocaleString("en-US")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              setInsuranceCost(Math.min(100000, val));
                            }}
                            className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                          />
                          <span className="text-xs text-slate-500 font-bold">บาท</span>
                        </div>
                      </div>

                      {/* Investment SSF/RMF/ThaiESG Input */}
                      <div className="space-y-1.5 p-3 px-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 block text-xs">การลงทุนลดหย่อนภาษี SSF/RMF/ThaiESG</span>
                          <span className="text-[9.5px] text-slate-400 block leading-tight">สูงสุดไม่เกิน 30% ของเงินได้รวม (รวมไม่เกิน 500,000 ฿)</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            value={investmentSavings === 0 ? "" : investmentSavings.toLocaleString("en-US")}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                              setInvestmentSavings(Math.min(500000, val));
                            }}
                            className="w-24 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                          />
                          <span className="text-xs text-slate-500 font-bold">บาท</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* DETAILED MODE (20 ITEMS DIRECTLY ACCORDING TO ROYAL DECREE / LAW) */
                    <div className="space-y-4 text-xs animate-fade-in">
                      {/* Sub-tabs for 20 Items */}
                      <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDetailedSubTab("family")}
                          className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all duration-155 ${
                            detailedSubTab === "family"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-950"
                          }`}
                        >
                          👨‍👩‍👦 ส่วนตัว & ครอบครัว
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailedSubTab("saving")}
                          className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all duration-155 ${
                            detailedSubTab === "saving"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-950"
                          }`}
                        >
                          🛡️ ประกัน & การออม
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailedSubTab("donation")}
                          className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all duration-155 ${
                            detailedSubTab === "donation"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-950"
                          }`}
                        >
                          🎁 บริจาค & อื่นๆ
                        </button>
                      </div>

                      {/* SUB TAB 1: FAMILY DEDUCTIONS */}
                      {detailedSubTab === "family" && (
                        <div className="space-y-3">
                          {/* 1. Personal Fixed */}
                          <div className="flex justify-between p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-[11px]">
                            <div>
                              <span className="font-bold text-indigo-950 block">1. ค่าลดหย่อนผู้มีเงินได้ (60,000 บาท)</span>
                              <span className="text-slate-500 text-[9.5px]">60,000 บาท ทุกคนได้รับโดยอัตโนมัติ</span>
                            </div>
                            <span className="font-mono font-bold text-indigo-800 self-center">60,000 บ.</span>
                          </div>

                          {/* 2. Spouse toggle */}
                          <div className="flex items-center justify-between p-3 border border-slate-200/80 rounded-xl hover:bg-slate-50/50 transition duration-155">
                            <div>
                              <span className="font-bold text-slate-800 block">2. ค่าลดหย่อนคู่สมรส (+60,000 บาท)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">กรณีคู่สมรสไม่มีรายได้ และยื่นรวมกัน (สูงสุด 1 คน)</span>
                            </div>
                            <label className="inline-flex items-center cursor-pointer select-none shrink-0">
                              <input
                                type="checkbox"
                                checked={hasSpouse}
                                onChange={() => setHasSpouse(!hasSpouse)}
                                className="sr-only peer"
                              />
                              <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                hasSpouse ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                              }`}>
                                {hasSpouse && <span className="text-white text-sm font-bold leading-none">✓</span>}
                              </div>
                            </label>
                          </div>

                          {/* 3. Child counts */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                            <div>
                              <span className="font-bold text-slate-850 block text-[11px]">3. ค่าลดหย่อนบุตร</span>
                              <span className="text-[9.5px] text-slate-400">บุตรคนแรก 30,000 บาท, คนที่ 2 ขึ้นไป (เกิดตั้งแต่ปี 2561) คนละ 60,000 บาท</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/50">
                              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500">บุตรคนแรก:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={childCountFirst}
                                  onChange={(e) => setChildCountFirst(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-10 text-center font-bold font-mono text-slate-900 border-b border-indigo-200 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400">คน</span>
                              </div>
                              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500">คนที่ 2+ (ปี 61+):</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={childCountSecondPlus}
                                  onChange={(e) => setChildCountSecondPlus(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-10 text-center font-bold font-mono text-slate-900 border-b border-indigo-200 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400">คน</span>
                              </div>
                            </div>
                            <div className="text-right text-[10px] font-bold text-indigo-700">
                              ยอดลดหย่อนรวม: -{((childCountFirst * 30000) + (childCountSecondPlus * 60000)).toLocaleString()} ฿
                            </div>
                          </div>

                          {/* 4. Pregnancy & Childbirth expense */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">4. ค่าชำระฝากครรภ์ & คลอดบุตร</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">หักตามจริงสูงสุดไม่เกินท้องละ 60,000 บาท (ค่าใช้จ่ายตรวจ ทำคลอด กินอยู่ รพ.)</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="text"
                                value={pregnancyExpense === 0 ? "" : pregnancyExpense.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setPregnancyExpense(Math.min(60000, val));
                                }}
                                className="w-28 p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 5. Parent count */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">5. ค่าลดหย่อนอุปการะเลี้ยงดูบิดามารดา</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">คนละ 30,000 บาท (อายุเกิน 60 ปี และมีรายได้ไม่เกิน 30,000 บาทต่อปี ได้ทั้งเราและคู่สมรส)</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="4"
                                value={parentCount}
                                onChange={(e) => setParentCount(Math.min(4, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-20 p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-center font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-slate-500 text-[10px]">ท่าน</span>
                            </div>
                          </div>

                          {/* 6. Disabled count */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">6. ค่าลดหย่อนผู้พิการหรือทุพพลภาพ</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">คนละ 60,000 บาท (ผู้เสียภาษีเป็นผู้ดูแลและมีบัตรประจำตัวคนพิการ)</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={disabledCount}
                                onChange={(e) => setDisabledCount(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-center font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-slate-500 text-[10px]">คน</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB TAB 2: SAVINGS, INSURANCE & INVESTMENT */}
                      {detailedSubTab === "saving" && (
                        <div className="space-y-3">
                          {/* 7. Life insurance premium */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">7. เบี้ยประกันชีวิตกลุ่มทั่วไป</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจ่ายจริงไม่เกิน 100,000 บาท (สัญญากรมธรรม์ตั้งแต่ 10 ปีขึ้นไป)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={lifeInsurancePremium === 0 ? "" : lifeInsurancePremium.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setLifeInsurancePremium(Math.min(100000, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 8. Parent's health insurance */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">8. เบี้ยประกันสุขภาพบิดามารดา</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามที่จ่ายจริงแต่ไม่เกิน 15,000 บาท (ได้ทั้งบิดามารดาเราและคู่สมรส)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={parentHealthInsurance === 0 ? "" : parentHealthInsurance.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setParentHealthInsurance(Math.min(15000, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 9. Self health insurance */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">9. ค่าเบี้ยประกันสุขภาพตนเอง</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจริงไม่เกิน 25,000 บาท (รวมสะสมกับข้อ 7 แล้วห้ามเกิน 100,000 บาท)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={selfHealthInsurance === 0 ? "" : selfHealthInsurance.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setSelfHealthInsurance(Math.min(25000, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 10. Home mortgage interest */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">10. ดอกเบี้ยเพื่อซื้อที่อยู่อาศัย</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจ่ายจริงแต่มูลค่าสูงสุดไม่เกิน 100,000 บาท</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={mortgageInterest === 0 ? "" : mortgageInterest.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setMortgageInterest(Math.min(100000, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 11. Provident Fund / GOB / Teacher welfare */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">11. กองทุนสำรองเลี้ยงชีพ / กบข. / สหกรณ์ออมทรัพย์ครู</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจริงไม่เกิน 15% ของเงินได้รวม และไม่เกิน 500,000 บาท</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={providentFundAmount === 0 ? "" : providentFundAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setProvidentFundAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 12. RMF */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">12. กองทุนรวมเพื่อการเลี้ยงชีพ (RMF)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ไม่เกิน 30% ของรายได้ และสะสมรวมกับกลุ่มเกษียณไม่เกิน 500,000 บาท</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={rmfAmount === 0 ? "" : rmfAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setRmfAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 13. NSF / กอช. */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">13. กองทุนการออมแห่งชาติ (กอช.)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามที่จ่ายจริงสุทธิสูงสุดไม่เกิน 13,200 บาทต่อปี</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={nsfAmount === 0 ? "" : nsfAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setNsfAmount(Math.min(13200, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 14. Pension Life Insurance */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">14. เบี้ยประกันชีวิตแบบบำนาญ</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจริงไม่เกิน 15% ของเงินได้ และสูงสุดไม่เกิน 200,000 บาทต่อปี</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={pensionInsuranceAmount === 0 ? "" : pensionInsuranceAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setPensionInsuranceAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 15. Social Security */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">15. กองทุนประกันสังคม</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ลดหย่อนตามที่ได้จ่ายจริงแต่สูงสุดไม่เกิน 5,100 บาท (อ้างอิงตามรูปคำสั่ง)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={socialSecurity === 0 ? "" : socialSecurity.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setSocialSecurity(Math.min(5100, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 16. SSF */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">16. กองทุนรวมเพื่อการออม (SSF)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามจริงไม่เกิน 30% ของผู้มีเงินได้ และสูงสุดไม่เกิน 200,000 บาท</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={ssfAmount === 0 ? "" : ssfAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setSsfAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* Combined Pension limit caution */}
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/60 text-[10px] text-slate-650 leading-relaxed">
                            💡 ข้อมูลกลุ่มการออมเพื่อการเกษียณสะสม (ข้อ 11+12+13+14+16) รวมกันสูงสุดตามพรบ. ห้ามลดหย่อนเกิน <strong>500,000 บาท</strong> เสมอ
                          </div>
                        </div>
                      )}

                      {/* SUB TAB 3: DONATIONS & MISC */}
                      {detailedSubTab === "donation" && (
                        <div className="space-y-3">
                          {/* 17. Double Donation */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">17. บริจาคสนับสนุนการศึกษา การกีฬา การพัฒนาสังคม</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ลดหย่อนเพิ่มสิทธิ์ 2 เท่าของจ่ายจริง (สูงสุดรวมไม่เกิน 10% ของเงินได้หลังลดหย่อนข้ออื่นๆ)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={doubleDonationAmount === 0 ? "" : doubleDonationAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setDoubleDonationAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 18. General Donation */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">18. เงินบริจาคทั่วไป (1 เท่า)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ลดหย่อนได้ตามจริงสูงสุดไม่เกิน 10% ของเงินได้พึงประเมินคงเหลือ</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={generalDonationAmount === 0 ? "" : generalDonationAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setGeneralDonationAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 19. EDC Card fee */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">19. ค่าธรรมเนียมบัตรเดบิต กรณีเครื่องรูด (EDC)</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">1 เท่าของยอดจ่ายจริง (มีเงินได้จากค่าเช่า, อิสระ 5-8 ที่มีเครื่องรับ EDC)</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={edcWelfareAmount === 0 ? "" : edcWelfareAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setEdcWelfareAmount(val);
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>

                          {/* 20. Political Donation */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-850 block">20. เงินบริจาคพรรคการเมือง</span>
                              <span className="text-[9.5px] text-slate-400 block leading-tight">ตามความจริงไม่เกิน 10,000 บาท</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="text"
                                value={politicalDonationAmount === 0 ? "" : politicalDonationAmount.toLocaleString("en-US")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                  setPoliticalDonationAmount(Math.min(10000, val));
                                }}
                                className="w-22 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-[10px]">บ.</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Step 4: Summary breakdown */}
                {personalTaxStep === 4 && (
                <>
                {/* 2. Detailed computation summary (Waterfall list) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="inline-block text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full mb-3">
                    ขั้นที่ 4
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-4 pb-2.5 border-b border-slate-100">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    สรุปการคำนวณภาษี
                  </h3>

                  <div className="space-y-3 font-medium text-xs text-slate-700">
                    <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50">
                      <span className="text-slate-500">1. รายรับทั้งหมดต่อปี (มาตรา 40)</span>
                      <span className="font-mono text-slate-900 font-bold">+{revenue.toLocaleString()} บาท</span>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-red-50/35">
                      <div>
                        <span className="text-red-800 font-semibold block">2. ลบ ค่าใช้จ่ายสะสมตามสิทธิ์</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {expenseType === "flat" ? "หักแบบเหมาตามประเภทเงินได้" : "หักค่าใช้จ่ายตามงบบันทึกจริง"}
                        </span>
                      </div>
                      <span className="font-mono text-red-600 font-bold">-{personalResult.totalExpenses.toLocaleString()} บาท</span>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-indigo-50/30">
                      <div>
                        <span className="text-indigo-900 font-semibold block">3. ลบ ค่าลดหย่อนส่วนบุคคลและลงทุนสะสม</span>
                        <span className="text-[10px] text-slate-400 font-normal">ส่วนตัว สมรส บุตร ประกันสังคม ประกันชีวิต SSF/RMF</span>
                      </div>
                      <span className="font-mono text-indigo-600 font-bold">-{personalResult.totalDeductions.toLocaleString()} บาท</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm font-bold">
                      <span className="text-slate-900">4. คงเหลือเงินได้สุทธิเพื่อคำนวณตามขั้น (เงินได้สุทธิ)</span>
                      <span className="font-mono text-blue-700 font-bold">{personalResult.netTaxableIncome.toLocaleString()} บาท</span>
                    </div>
                  </div>
                </div>

                {/* 3. Progressive Slabs (Slabs Table with active highlighters) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      เกณฑ์ตารางภาษีอัตราก้าวหน้ารายบุคคล
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-400 py-1 px-2 rounded-md font-bold uppercase">ปี 2026</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl scrollbar-thin">
                    <table className="w-full min-w-[420px] text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="p-2.5">ช่วงเงินได้สุทธิ (บาท)</th>
                          <th className="p-2.5 text-center">อัตรา</th>
                          <th className="p-2.5 text-right">ภาษีในขั้น</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {personalResult.breakdown.map((row) => {
                          const isActive = row.incomeInBracket > 0;
                          return (
                            <tr
                              key={row.bracket}
                              className={`transition-all duration-150 ${
                                isActive
                                  ? "bg-blue-500/5 text-slate-950 font-medium border-l-4 border-blue-500"
                                  : "text-slate-500 hover:bg-slate-50/50"
                              }`}
                            >
                              <td className="p-2.5 font-semibold text-slate-900">{row.bracket.split(" (")[0]}</td>
                              <td className="p-2.5 text-center font-bold font-mono">{(row.rate * 100)}%</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                                {row.taxInBracket > 0 ? (
                                  <span className="text-blue-700">+{row.taxInBracket.toLocaleString()} ฿</span>
                                ) : (
                                  <span className="text-slate-400">0 ฿</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700">รวมภาษีสะสมทั้งหมดทุกช่วงฐาน:</span>
                    <span className="font-mono font-black text-blue-800 text-sm">
                      {personalResult.totalTax.toLocaleString()} บาท
                    </span>
                  </div>
                </div>

                {/* 4. Strategic savings tips for this individual tax case */}
                <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-200/60 space-y-3.5">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    แนวทางการวางแผนประหยัดภาษีบุคคลธรรมดาของคุณ
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 list-none p-0 m-0">
                    {insuranceCost < 100000 && (
                      <li className="flex items-start gap-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-100">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>สะสมเบี้ยประกันภัยเพิ่มเติม:</strong> ปัจจุบันคุณลดหย่อนเบี้ยประกันไว้เพียง {insuranceCost.toLocaleString()} บาท ทางกฎหมายลดหย่อนได้สูงสุดถึง <strong>100,000 บาท</strong> ชวนศึกษาแผนประกันชีวิตสะสมทรัพย์หรือประกันสุขภาพเพื่อเติมเต็มพอร์ตลดหย่อนภาษี
                        </div>
                      </li>
                    )}
                    {investmentSavings < 200000 && (
                      <li className="flex items-start gap-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-100">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>เพิ่มการซื้อกองทุน SSF/RMF/ThaiESG:</strong> คุณมีโควต้าสะสมลดหย่อนผ่านกองทุนลดหย่อนภาษีที่ยังไม่ได้สิทธิ์เต็ม ปัจจุบันลงไว้ลบภาษีได้ {investmentSavings.toLocaleString()} บาท การศึกษาความเสี่ยงและทยอยจัดสรรสะสมสามารถหักลดหย่อนได้สูงสุดรวมไม่เกิน 30% ของเงินได้พึงประเมินทั้งหมด
                        </div>
                      </li>
                    )}
                    {personalResult.netTaxableIncome > 1000000 ? (
                      <li className="flex items-start gap-2 leading-relaxed bg-amber-900/15 p-3 rounded-xl border border-amber-200 text-amber-950">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>💡 ถึงจุดคุ้มทุนในการพิจารณานิติบุคคล!</strong> เนื่องจากเงินได้สุทธิของคุณตกอยู่ที่ {personalResult.netTaxableIncome.toLocaleString()} บาท ซึ่งโดนฐานพิกัดก้าวหน้าที่ {personalResult.netTaxableIncome > 2000000 ? "30% - 35%" : "25%"} สูงกว่าอัตราภาษีนิติบุคคลที่สูงสุด 20% อย่างมาก แนะนำให้ตรวจสอบที่แท็บ <strong>&ldquo;เปรียบเทียบสองระบบ&rdquo;</strong> เพื่อดูแผนวางจัดตั้งนิติบุคคลซึ่งอาจช่วยประหยัดเงินได้ปีละหลายหมื่นถึงหลายแสนบาท!
                        </div>
                      </li>
                    ) : (
                      <li className="flex items-start gap-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-100">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>สถานะปัจจุบัน:</strong> ขนาดเงินได้สุทธิของคุณอยู่ในระดับที่พิกัดภาษียังเกาะเกณฑ์ต่ำ การอยู่แบบบุคคลธรรมดาร่วมกับการซื้อลดหย่อนเพิ่มยังคงเป็นกลยุทธ์ที่คล่องตัวประหยัดที่สุด และช่วยเลี่ยงภาระค่าใช้จ่ายบริหารจัดทำงบผู้ตรวจสอบบัญชีทางนิติบุคคล
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
                </>
                )}

                {/* Step navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setPersonalTaxStep(Math.max(1, personalTaxStep - 1))}
                    disabled={personalTaxStep === 1}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition cursor-pointer"
                  >
                    ย้อนกลับ
                  </button>
                  {personalTaxStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setPersonalTaxStep(personalTaxStep + 1)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shadow-sm"
                    >
                      ถัดไป
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPersonalTaxStep(1)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shadow-sm"
                    >
                      เริ่มใหม่
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: persistent hero + recap (7 cols) */}
              <div className="lg:col-span-7 space-y-5">

                {/* 1. Final personal tax verdict widget */}
                <div className="bg-blue-600 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg animate-fade-in">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-white bg-white/15 px-2.5 py-1 rounded">
                        สรุปการเสียภาษีเงินได้บุคคลธรรมดา
                      </span>
                      <p className="text-[11px] text-blue-100 mt-1">เงินได้สุทธิประจำปีหลังหักค่าใช้จ่ายและลดหย่อน</p>
                      <h4 className="text-3xl font-black font-mono text-white tracking-tight">
                        {personalResult.netTaxableIncome.toLocaleString()} <span className="text-lg">บาท</span>
                      </h4>
                    </div>

                    <div className="bg-white/10 border border-white/20 p-4 rounded-2xl w-full md:w-56 text-center shrink-0">
                      <span className="text-[10.5px] text-blue-100 block font-semibold">ยอดภาษีที่ต้องชำระสะสม:</span>
                      <span className="text-3xl font-black font-mono text-white block mt-1">
                        {personalResult.totalTax.toLocaleString()} <span className="text-sm font-sans font-normal">บาท</span>
                      </span>
                      <div className="mt-1.5 inline-block text-[10px] bg-white/15 text-white px-2.5 py-0.5 rounded-full font-bold">
                        อัตราก้าวหน้าขั้นสุดท้าย {personalResult.marginalRate}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recap card: shows what's been filled in so far */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">ข้อมูลที่กรอกแล้ว</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">อาชีพ</span>
                      <span className="font-bold text-slate-900">{selectedPersona}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                      <span className="text-slate-500">รายได้ต่อปี</span>
                      <span className="font-bold font-mono text-slate-900">{revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                      <span className="text-slate-500">ค่าลดหย่อนรวม</span>
                      <span className="font-bold font-mono text-slate-900">{personalResult.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        ) : activeTab === "director_salary" ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Top Info Banner & Case Selector */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-md shrink-0 flex items-center justify-center">
                  <Calculator id="planner-header-logo" className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                    วิเคราะห์ภาษี 3 กรณี (Real-time)
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 font-medium leading-normal">
                    เปรียบเทียบผลลัพธ์ภาษีเงินได้บุคคลธรรมดาและภาษีนิติบุคคล (สำหรับวางแผนเงินเดือนกรรมการ)
                  </p>
                </div>
              </div>
            </div>

            {/* Main Interactive Planner Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: SLIDERS & PARAMETERS CONTROL */}
              <div className="xl:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                {/* Header pill like screenshot */}
                <div className="flex items-center justify-between bg-blue-600 text-white px-3.5 py-2.5 rounded-2xl shadow-xs">
                  <span className="text-xs font-black flex items-center gap-1.5">
                    1. กำหนดข้อมูลและกรอกตัวเลข
                  </span>
                  <Settings className="w-4 h-4 text-white/90" />
                </div>

                {/* Case Selector Inputs */}
                <div className="space-y-3.5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <UserSquare2 className="w-4 h-4 text-blue-600" />
                    <span>กรณีเปรียบเทียบ (กรอกตัวเลข)</span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Case 1 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-700">กรณีที่ 1 (Case 1)</span>
                        {plannerCase === 1 && (
                          <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={plannerCase1Salary === 0 ? "" : plannerCase1Salary.toLocaleString('en-US')}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                            setPlannerCase1Salary(val);
                            if (plannerCase === 1) {
                              setPlannerSalary(val);
                            }
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 text-right font-mono font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 border border-slate-200"
                        />
                        <span className="text-xs font-bold text-slate-500 shrink-0">บ./ด.</span>
                      </div>
                    </div>

                    {/* Case 2 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-700">กรณีที่ 2 (Case 2)</span>
                        {plannerCase === 2 && (
                          <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={plannerCase2Salary === 0 ? "" : plannerCase2Salary.toLocaleString('en-US')}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                            setPlannerCase2Salary(val);
                            if (plannerCase === 2) {
                              setPlannerSalary(val);
                            }
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 text-right font-mono font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 border border-slate-200"
                        />
                        <span className="text-xs font-bold text-slate-500 shrink-0">บ./ด.</span>
                      </div>
                    </div>

                    {/* Case 3 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-700">กรณีที่ 3 (Case 3)</span>
                        {plannerCase === 3 && (
                          <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={plannerCase3Salary === 0 ? "" : plannerCase3Salary.toLocaleString('en-US')}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                            setPlannerCase3Salary(val);
                            if (plannerCase === 3) {
                              setPlannerSalary(val);
                            }
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 text-right font-mono font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 border border-slate-200"
                        />
                        <span className="text-xs font-bold text-slate-500 shrink-0">บ./ด.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Income details */}
                <div className="space-y-3.5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>ข้อมูลรายได้/ค่าใช้จ่ายเพิ่มเติม (ต่อปี)</span>
                  </div>

                  {/* Interest Income */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold block">รายได้ดอกเบี้ยของกรรมการ</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={plannerInterestIncome === 0 ? "" : plannerInterestIncome.toLocaleString('en-US')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                          setPlannerInterestIncome(val);
                        }}
                        placeholder="0"
                        className="w-full px-3 py-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">บ.</span>
                    </div>
                  </div>

                  {/* Rental Income */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold block">รายได้ค่าเช่าของกรรมการ</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={plannerRentalIncome === 0 ? "" : plannerRentalIncome.toLocaleString('en-US')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                          setPlannerRentalIncome(val);
                        }}
                        placeholder="0"
                        className="w-full px-3 py-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">บ.</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-medium leading-tight">
                      * หักค่าใช้จ่ายเหมา 30% ตามเกณฑ์ (สุทธิเพื่อคำนวณภาษี {(plannerRentalIncome * 0.7).toLocaleString()} บาท)
                    </span>
                  </div>

                  {/* Corporate Revenue */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold block">รายได้นิติบุคคลรวม</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={plannerRevenue === 0 ? "" : plannerRevenue.toLocaleString('en-US')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                          setPlannerRevenue(val);
                          if (val > 30000000) {
                            setPlannerSme(false);
                          }
                        }}
                        placeholder="0"
                        className="w-full px-3 py-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">บ.</span>
                    </div>
                  </div>

                  {/* Corporate Expenses */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold block">รายจ่ายปกติอื่นของบริษัท</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={plannerExpenses === 0 ? "" : plannerExpenses.toLocaleString('en-US')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                          setPlannerExpenses(val);
                        }}
                        placeholder="0"
                        className="w-full px-3 py-1.5 text-right font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">บ.</span>
                    </div>
                  </div>
                </div>

                {/* Checkboxes Group */}
                <div className="space-y-3.5 pb-4 border-b border-slate-100 text-sm">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
                    <FileBarChart2 className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>ตัวเลือกการคำนวณ</span>
                  </div>

                  <div className="flex items-start justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 font-semibold text-slate-800 gap-2">
                    <div className="space-y-0.5">
                      <span className="font-black text-slate-800 text-xs md:text-[13px] block">สิทธิ์ลดหย่อนภาษี SME</span>
                      <span className="text-[11px] text-slate-500 font-bold block leading-tight">ค่าใช้สุทธิ 3 แสนแรกยกเว้นภาษี</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={plannerSme}
                      disabled={plannerRevenue > 30000000}
                      onChange={() => {
                        setPlannerSme(!plannerSme);
                      }}
                      className="cursor-pointer w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 shrink-0"
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 font-semibold text-slate-800 gap-2">
                    <div className="space-y-0.5">
                      <span className="font-black text-slate-800 text-xs md:text-[13px] block">ภาษีเงินปันผล 10%</span>
                      <span className="text-[11px] text-slate-500 font-bold block leading-tight">หัก ณ ที่จ่าย ภ.ง.ด. 2</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={plannerDividendTax}
                      onChange={() => {
                        setPlannerDividendTax(!plannerDividendTax);
                      }}
                      className="cursor-pointer w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 shrink-0"
                    />
                  </div>

                  <div className="flex items-start justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 font-semibold text-slate-800 gap-2">
                    <div className="space-y-0.5">
                      <span className="font-black text-slate-800 text-xs md:text-[13px] block">ดึงค่าลดหย่อนหลักจากฐานข้อมูล</span>
                      <span className="text-[11px] text-slate-500 font-bold block leading-tight">อัพเดตข้อมูล/ประกัน/อื่นๆ จากแถบแรก</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={plannerUseCustomDeductions}
                      onChange={() => setPlannerUseCustomDeductions(!plannerUseCustomDeductions)}
                      className="cursor-pointer w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 shrink-0"
                    />
                  </div>
                </div>

                {/* Notes/Remarks */}
                <div className="space-y-2 text-slate-500 text-xs md:text-[12px] leading-relaxed">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-700 text-xs md:text-[13px]">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span>หมายเหตุ</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 font-medium">
                    <li>ข้อมูลทั้งหมดสามารถปรับเปลี่ยนได้ตามต้องการ</li>
                    <li>ตัวเลขทั้งหมดเป็นตัวอย่างสำหรับบริการคำนวณ</li>
                  </ul>
                </div>
              </div>

              {/* CENTER COLUMN: COMPARISONS & DEEP-DIVE CALCULATIONS */}
              <div className="xl:col-span-9 space-y-6">
                
                {/* 2. เปรียบเทียบผลลัพธ์การจัดสรร 3 กรณี */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between bg-indigo-50 text-indigo-900 px-3.5 py-2.5 rounded-2xl shadow-xs">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      2. เปรียบเทียบผลลัพธ์การจัดสรร 3 กรณี (Real-time)
                    </span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>

                  <p className="text-xs text-slate-500 font-semibold leading-normal">
                    วิเคราะห์ผลลัพธ์อัตโนมัติจากข้อมูล รายได้รวม {(plannerRevenue).toLocaleString()} บาท และ รายจ่าย {(plannerExpenses).toLocaleString()} บาท (คลิกเลือกเพื่อเจาะลึกด้านล่าง)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* CASE 1 */}
                    <div 
                      onClick={() => {
                        setPlannerSalary(plannerCase1Salary);
                        setPlannerCase(1);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none space-y-3 relative overflow-hidden flex flex-col justify-between ${
                        plannerSalary === plannerCase1Salary 
                          ? "bg-indigo-950 text-white border-indigo-950 shadow-md ring-4 ring-indigo-950/15 scale-[1.01]" 
                          : "bg-slate-50/50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            plannerSalary === plannerCase1Salary ? "bg-white/10 text-blue-400" : "bg-indigo-50 text-indigo-700"
                          }`}>
                            Case 1
                          </span>
                          {Math.max(res1.netSaved, res2.netSaved, res3.netSaved) === res1.netSaved && (
                            <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                              Best
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold leading-normal">
                          เงินเดือน: <span className="font-mono text-sm">{(plannerCase1Salary).toLocaleString()}</span> บ./ด.
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs border-t border-slate-200/20 pt-2.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-medium ${plannerSalary === plannerCase1Salary ? "text-slate-300" : "text-slate-500"}`}>นิติบุคคลประหยัด:</span>
                          <span className="font-mono font-bold text-blue-500">+{res1.corpSaved.toLocaleString()} บ.</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-medium ${plannerSalary === plannerCase1Salary ? "text-slate-300" : "text-slate-500"}`}>บุคคลเสียเพิ่ม:</span>
                          <span className="font-mono font-bold text-red-500">+{res1.persTax.toLocaleString()} บ.</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200/20 pt-1.5 flex justify-between items-center">
                          <span className="font-extrabold text-[11px]">ประหยัดรวม:</span>
                          <span className={`font-mono font-black ${res1.netSaved > 0 ? "text-blue-400" : "text-red-400"}`}>
                            {res1.netSaved > 0 ? "+" : ""}{res1.netSaved.toLocaleString()} บ.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CASE 2 */}
                    <div 
                      onClick={() => {
                        setPlannerSalary(plannerCase2Salary);
                        setPlannerCase(2);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none space-y-3 relative overflow-hidden flex flex-col justify-between ${
                        plannerSalary === plannerCase2Salary 
                          ? "bg-indigo-950 text-white border-indigo-950 shadow-md ring-4 ring-indigo-950/15 scale-[1.01]" 
                          : "bg-slate-50/50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            plannerSalary === plannerCase2Salary ? "bg-white/10 text-blue-400" : "bg-indigo-50 text-indigo-700"
                          }`}>
                            Case 2
                          </span>
                          {Math.max(res1.netSaved, res2.netSaved, res3.netSaved) === res2.netSaved && (
                            <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                              Best
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold leading-normal">
                          เงินเดือน: <span className="font-mono text-sm">{(plannerCase2Salary).toLocaleString()}</span> บ./ด.
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs border-t border-slate-200/20 pt-2.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-medium ${plannerSalary === plannerCase2Salary ? "text-slate-300" : "text-slate-500"}`}>นิติบุคคลประหยัด:</span>
                          <span className="font-mono font-bold text-blue-500">+{res2.corpSaved.toLocaleString()} บ.</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-medium ${plannerSalary === plannerCase2Salary ? "text-slate-300" : "text-slate-500"}`}>บุคคลเสียเพิ่ม:</span>
                          <span className="font-mono font-bold text-red-500">+{res2.persTax.toLocaleString()} บ.</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200/20 pt-1.5 flex justify-between items-center">
                          <span className="font-extrabold text-[11px]">ประหยัดรวม:</span>
                          <span className={`font-mono font-black ${res2.netSaved > 0 ? "text-blue-400" : "text-red-400"}`}>
                            {res2.netSaved > 0 ? "+" : ""}{res2.netSaved.toLocaleString()} บ.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CASE 3 */}
                    <div 
                      onClick={() => {
                        setPlannerSalary(plannerCase3Salary);
                        setPlannerCase(3);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none space-y-3 relative overflow-hidden flex flex-col justify-between ${
                        plannerSalary === plannerCase3Salary 
                          ? "bg-indigo-950 text-white border-indigo-950 shadow-md ring-4 ring-indigo-950/15 scale-[1.01]" 
                          : "bg-slate-50/50 text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            plannerSalary === plannerCase3Salary ? "bg-white/10 text-blue-400" : "bg-indigo-50 text-indigo-700"
                          }`}>
                            Case 3
                          </span>
                          {Math.max(res1.netSaved, res2.netSaved, res3.netSaved) === res3.netSaved && (
                            <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                              Best
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold leading-normal">
                          เงินเดือน: <span className="font-mono text-sm">{(plannerCase3Salary).toLocaleString()}</span> บ./ด.
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs border-t border-slate-200/20 pt-2.5">
                        <div className="flex justify-between">
                          <span className={`text-[10px] font-medium ${plannerSalary === plannerCase3Salary ? "text-slate-300" : "text-slate-500"}`}>นิติบุคคลประหยัด:</span>
                                <span className="font-mono font-bold text-blue-500">+{res3.corpSaved.toLocaleString()} บ.</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={`${plannerSalary === plannerCase3Salary ? "text-slate-400" : "text-slate-500"} font-medium`}>ภาษีบุคคลเพิ่ม:</span>
                                <span className="font-mono font-bold text-red-500">+{res3.persTax.toLocaleString()} บ.</span>
                              </div>
                              <div className="border-t border-dashed border-slate-200/20 pt-1.5 flex justify-between items-center">
                                <span className="font-extrabold text-[12px]">ประหยัดรวมสุทธิ:</span>
                                <span className={`font-mono font-black text-sm ${res3.netSaved > 0 ? "text-blue-400" : "text-red-400"}`}>
                                  {res3.netSaved > 0 ? "+" : ""}{res3.netSaved.toLocaleString()} บ.
                                </span>
                              </div>
                            </div>

                            {/* Best tag */}
                            {Math.max(res1.netSaved, res2.netSaved, res3.netSaved) === res3.netSaved && (
                              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">
                                Best
                              </div>
                            )}
                          </div>
                        </div>

                        {resCustom && (
                          <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                              <span>💬</span>
                              <span>สัดส่วนที่คุณปรับเปลี่ยนเอง: เงินเดือน {(plannerSalary).toLocaleString()} บ./เดือน (ปีละ {resCustom.annualSal.toLocaleString()} บ.)</span>
                            </div>
                            <div className="font-mono font-black text-indigo-700 bg-white/60 px-2 py-0.5 rounded-lg border border-indigo-200/50">
                              ประหยัดรวมสุทธิ: {resCustom.netSaved > 0 ? "+" : ""}{resCustom.netSaved.toLocaleString()} บาท/ปี
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Case Display Card */}
                      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h3 className="text-lg md:text-xl font-extrabold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            เจาะลึกเฉพาะจุด: Case {plannerCase > 0 ? plannerCase : "กำหนดเอง"} (กระหมวดเงินเดือน {plannerSalary.toLocaleString()} บาท/เดือน)
                          </h3>
                          <p className="text-xs md:text-sm font-semibold text-slate-300 mt-1">
                            ตารางเปรียบเทียบเชิงลึกแสดงภาระรวมระหว่านิติบุคคล ปะทะ ภาษีบุคคลเพื่อเกณฑ์ประหยัดครอบครัวสูงสุด
                          </p>
                        </div>
                      </div>

                {/* Grid layout: 2 main columns on desktop to prevent cramping */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  
                  {/* LEFT CARD (Spans 2 columns): 🏢 Comparison of Corporate Tax (Before vs After) */}
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Unified Modern Header */}
                      <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                        <div>
                          <span className="text-base font-black text-slate-800 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600 animate-pulse" />
                            🏢 ภาษีเงินได้นิติบุคคล (เปรียบเทียบผลกระทบฝั่งบริษัท)
                          </span>
                          <p className="text-xs text-slate-400 mt-1 font-medium">
                            แสดงสัดส่วนรายได้ รายจ่าย กำไร และภาระภาษี ก่อน-หลัง จากการปรับกลยุทธ์เพิ่มเงินเดือนกรรมการ
                          </p>
                        </div>
                        <span className="text-xs text-indigo-700 font-mono font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl shrink-0">
                          ภ.ง.ด.50 (SME/20%)
                        </span>
                      </div>

                      {/* Internal Grid for Before vs After Side-by-Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* SUB-COLUMN 1: แบบเดิมก่อนปรับเงินเดือน (เดิม) */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-dashed border-slate-200">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                              <span className="text-sm font-bold text-slate-700">แบบเดิมก่อนปรับเงินเดือน (เดิม)</span>
                            </div>

                            <div className="space-y-3 text-xs md:text-[13px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">รายได้ตลอดปี</span>
                                <span className="font-mono text-slate-900 font-bold">{plannerRevenue.toLocaleString()} ฿</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">หัก รายจ่ายทางภาษีเดิม</span>
                                <span className="font-mono text-red-500 font-semibold">({plannerExpenses.toLocaleString()}) ฿</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-100 pt-2">
                                <span className="text-slate-800 font-bold">กำไรสุทธิทางภาษีเดิม</span>
                                <span className="font-mono text-slate-900 font-bold">{activeRes.profitBefore.toLocaleString()} ฿</span>
                              </div>

                              {/* HIGHLIGHTED ROW FOR BEFORE */}
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 my-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-600">หัก ภาษีเงินได้ (เดิม)</span>
                                  <span className="font-mono text-slate-800 font-black">
                                    ({activeRes.corpTaxBefore.toLocaleString()}) ฿
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500">กำไรหลังภาษีเดิม</span>
                                <span className="font-mono text-slate-900 font-bold">{activeRes.netProfitBefore.toLocaleString()} ฿</span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500">หัก ภาษี ณ ที่จ่าย (เดิม 10%)</span>
                                <span className="font-mono text-red-400">({activeRes.divTaxBefore.toLocaleString()}) ฿</span>
                              </div>

                              <div className="flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-900 bg-slate-50/50 p-2.5 rounded-lg">
                                <span>คงเหลือเงินได้รับจริง (เดิม)</span>
                                <span className="font-mono text-slate-900 font-black">{activeRes.netReceivedBefore.toLocaleString()} ฿</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex justify-between items-center text-sm font-extrabold text-slate-700">
                              <span>ภาระภาษีบริษัทรวมเดิม:</span>
                              <span className="font-mono font-black text-slate-900 text-base">
                                {(activeRes.corpTaxBefore + activeRes.divTaxBefore).toLocaleString()} ฿/ปี
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SUB-COLUMN 2: แบบใหม่หลังเพิ่มเงินเดือน */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-dashed border-slate-200">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                              <span className="text-sm font-bold text-blue-800">แบบใหม่หลังเพิ่มเงินเดือน</span>
                            </div>

                            <div className="space-y-3 text-xs md:text-[13px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">รายได้ตลอดปี</span>
                                <span className="font-mono text-slate-900 font-bold">{plannerRevenue.toLocaleString()} ฿</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">หัก รายจ่ายรวม (บวกเงินเดือน)</span>
                                <div className="text-right">
                                  <div className="font-mono text-red-500 font-bold">({(plannerExpenses + activeRes.corporationAdditionalExpenses).toLocaleString()}) ฿</div>
                                </div>
                              </div>
                              <div className="flex justify-between border-t border-slate-100 pt-2">
                                <span className="text-slate-800 font-bold">กำไรสุทธิทางภาษี</span>
                                <span className="font-mono text-blue-700 font-bold">{activeRes.profitAfter.toLocaleString()} ฿</span>
                              </div>

                              {/* HIGHLIGHTED GREEN ROW */}
                              <div className="bg-blue-50/40 rounded-xl p-3 border-2 border-blue-500/80 my-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-extrabold text-blue-950">หัก ภาษีเงินได้ {plannerSme ? "SME" : "20%"} (ใหม่)</span>
                                  <span className="font-mono text-blue-800 font-black">
                                    ({activeRes.corpTaxAfter.toLocaleString()}) ฿
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500">กำไรหลังภาษี</span>
                                <span className="font-mono text-slate-900 font-bold">{activeRes.netProfitAfter.toLocaleString()} ฿</span>
                              </div>

                              <div className="flex justify-between">
                                <span className="text-slate-500">หัก ภาษี ณ ที่จ่าย (10%)</span>
                                <span className="font-mono text-red-500">({activeRes.divTaxAfter.toLocaleString()}) ฿</span>
                              </div>

                              <div className="flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-900 bg-blue-50/40 p-2.5 rounded-lg">
                                <span className="text-blue-950">คงเหลือเงินได้รับจริง</span>
                                <span className="font-mono text-blue-900 font-black">{activeRes.netReceivedAfter.toLocaleString()} ฿</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex justify-between items-center text-sm font-extrabold text-blue-900">
                              <span>ภาระภาษีบริษัทรวมใหม่:</span>
                              <span className="font-mono font-black text-blue-700 text-base">
                                {(activeRes.corpTaxAfter + activeRes.divTaxAfter).toLocaleString()} ฿/ปี
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Integrated Savings Row at the bottom of the Card */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-500 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-2xl">💰</span>
                          <div>
                            <span className="text-xs md:text-sm font-black text-blue-950 block">สรุปการประหยัดภาษีฝั่งนิติบุคคล:</span>
                            <span className="text-[10px] md:text-xs text-blue-700/90 font-medium">ส่วนต่างภาระภาษีรวมที่ลดลงของฝั่งบริษัทหลังปันส่วนเป็นเงินเดือนกรรมการ</span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-base md:text-xl text-blue-700 bg-white px-4 py-1.5 rounded-xl border border-blue-200/50 shadow-sm shrink-0">
                          +{Math.round(
                            ((plannerRevenue - plannerExpenses > 0 ? (plannerSme ? (
                              (plannerRevenue - plannerExpenses > 3000000 ? ((plannerRevenue - plannerExpenses - 3000000) * 0.2 + 405000) : Math.max(0, plannerRevenue - plannerExpenses - 300000) * 0.15)
                            ) : (plannerRevenue - plannerExpenses) * 0.2) : 0) + 
                            Math.max(0, (plannerRevenue - plannerExpenses) - (plannerRevenue - plannerExpenses > 0 ? (plannerSme ? ( (plannerRevenue - plannerExpenses > 3000000 ? ((plannerRevenue - plannerExpenses - 3000000) * 0.2 + 405000) : Math.max(0, plannerRevenue - plannerExpenses - 300000) * 0.15) ) : (plannerRevenue - plannerExpenses) * 0.2) : 0)) * (plannerDividendTax ? 0.1 : 0)) -
                            ((plannerRevenue - (plannerExpenses + (plannerSalary * 12)) > 0 ? (plannerSme ? (
                              (plannerRevenue - (plannerExpenses + (plannerSalary * 12)) > 3000000 ? ((plannerRevenue - (plannerExpenses + (plannerSalary * 12)) - 3000000) * 0.2 + 405000) : Math.max(0, plannerRevenue - (plannerExpenses + (plannerSalary * 12)) - 300000) * 0.15)
                            ) : (plannerRevenue - (plannerExpenses + (plannerSalary * 12))) * 0.2) : 0) + 
                            Math.max(0, (plannerRevenue - (plannerExpenses + (plannerSalary * 12))) - (plannerRevenue - (plannerExpenses + (plannerSalary * 12)) > 0 ? (plannerSme ? ( (plannerRevenue - (plannerExpenses + (plannerSalary * 12)) > 3000000 ? ((plannerRevenue - (plannerExpenses + (plannerSalary * 12)) - 3000000) * 0.2 + 405000) : Math.max(0, plannerRevenue - (plannerExpenses + (plannerSalary * 12)) - 300000) * 0.15) ) : (plannerRevenue - (plannerExpenses + (plannerSalary * 12))) * 0.2) : 0)) * (plannerDividendTax ? 0.1 : 0))
                          ).toLocaleString()} ฿/ปี
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CARD (Spans 1 column): 👤 ภาษีเงินได้บุคคลธรรมดา */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-1">
                    <div>
                      <div className="pb-4 border-b border-slate-100 flex justify-between items-center mb-6">
                        <span className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                          <User className="w-5 h-5 text-indigo-600" /> 👤 ภาษีเงินได้บุคคลธรรมดา
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                          ภ.ง.ด.90/91
                        </span>
                      </div>

                      <div className="space-y-3.5 text-xs md:text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">เงินเดือนรวมปีละ</span>
                          <span className="font-mono text-slate-900 font-bold">{(plannerSalary * 12).toLocaleString()} ฿</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">หัก ค่าใช้จ่ายตามกฎหมาย (50% max 100k)</span>
                          <span className="font-mono text-red-500">({Math.min(plannerSalary * 12 * 0.5, 100000).toLocaleString()}) ฿</span>
                        </div>

                        {plannerInterestIncome > 0 && (
                          <div className="flex justify-between bg-slate-50 p-2 rounded-xl font-medium text-slate-800 text-xs">
                            <span className="text-slate-500">💰 รายได้ดอกเบี้ยของกรรมการ</span>
                            <span className="font-mono text-blue-600">+{plannerInterestIncome.toLocaleString()} ฿</span>
                          </div>
                        )}

                        {plannerRentalIncome > 0 && (
                          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex justify-between font-medium text-slate-800 text-xs">
                              <span className="text-slate-500">🔑 รายได้ค่าเช่าของกรรมการ</span>
                              <span className="font-mono text-blue-600">+{plannerRentalIncome.toLocaleString()} ฿</span>
                            </div>
                            <div className="flex justify-between text-red-500 text-[10px]">
                              <span className="text-slate-400">หัก ค่าใช้จ่ายค่าเช่า (เหมา 30%)</span>
                              <span className="font-mono">(-{(plannerRentalIncome * 0.3).toLocaleString()}) ฿</span>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">หัก ลดหย่อนส่วนตัว</span>
                          <span className="font-mono text-red-500">(60,000) ฿</span>
                        </div>
                        {plannerUseCustomDeductions && (
                          <div className="flex justify-between bg-slate-50 p-2 rounded-xl text-[11px]">
                            <span className="text-slate-500">หัก ลดหย่อนเพิ่มเติมสะสม</span>
                            <span className="font-mono text-red-500">(-{((hasSpouse ? 60000 : 0) + (childrenCount * 30000) + socialSecurity + insuranceCost + investmentSavings).toLocaleString()}) ฿</span>
                          </div>
                        )}

                        <div className="flex justify-between border-t border-slate-100 pt-3 font-bold">
                          <span className="text-slate-800">เงินได้สุทธิประเมิน</span>
                          <span className="font-mono text-indigo-700 font-extrabold text-[14px]">
                            {activeRes.taxable.toLocaleString()} ฿
                          </span>
                        </div>

                        {/* HIGHLIGHTED RED ROW FOR PERSONAL TAX */}
                        <div className="bg-red-50 rounded-xl p-3 border-2 border-red-500 my-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-red-950">หัก ภาษีเงินได้บุคคลธรรมดา</span>
                            <span className="font-mono text-red-600 font-black">
                              ({activeRes.persTax.toLocaleString()}) ฿
                            </span>
                          </div>
                        </div>


                      </div>
                    </div>

                    {/* RED BORDER PILL AT THE BOTTOM */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex justify-between items-center">
                        <span className="font-black text-red-950 text-xs md:text-sm">📈 ภาษีบุคคลฯ ที่ต้องจ่าย:</span>
                        <span className="font-mono font-black text-red-700 bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-sm text-sm shrink-0">
                          +{activeRes.persTax.toLocaleString()} ฿/ปี
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* OVERALL NET IMPACT VERDICT ROW */}
                <div className="bg-blue-600 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white bg-white/15 px-2.5 py-1 rounded">สรุปผลรวม: บริษัท + ส่วนตัว</span>
                      <h4 className="text-xl font-bold mt-2">
                        {activeRes.netSaved > 0 ? "🎉 คุ้มค่า! จ่ายเงินเดือนกรรมการดีกว่า" : "📊 กรณีนี้จ่ายเป็นเงินปันผลคุ้มกว่า"}
                      </h4>
                      <p className="text-xs text-blue-100 mt-1">
                        นำภาษีที่บริษัทประหยัดได้จากการตั้งเงินเดือนนี้ หักลบด้วยภาษีบุคคลธรรมดาที่กรรมการต้องจ่ายเพิ่มแล้ว ยังเหลือประหยัดสุทธิเท่านี้
                      </p>
                    </div>

                    <div className="bg-white/10 border border-white/20 p-4 rounded-2xl w-full md:w-52 text-center shrink-0">
                      <span className="text-[10px] text-blue-100 block font-semibold">ประหยัดภาษีสุทธิ (บริษัท - บุคคล):</span>
                      <span className="text-2xl font-black font-mono text-white block mt-1.5">
                        {activeRes.netSaved.toLocaleString()} บ./ปี
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI advice */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex gap-2 items-center text-xs text-slate-700">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>คำแนะนำของระบบ:</strong> สำหรับรายได้บริษัท {plannerRevenue.toLocaleString()} บ. การตั้งเงินเดือนร่วมกับรายได้ดอกเบี้ย {plannerInterestIncome.toLocaleString()} บ. และรายได้ค่าเช่า {plannerRentalIncome.toLocaleString()} บ. ส่งผลให้ลดพิกัดภาษีรวมได้อย่างคุ้มค่าที่สุด!
                  </span>
                </div>

              </div>
            </div>

          </motion.div>
        ) : activeTab === "admin_logs" ? (
          /* GOOGLE SHEETS INTEGRATION & SYSTEM LOGS CONTROL PANEL */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Control Panel Header */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-lg text-xs border border-rose-100">
                    🛡️ Admin Console
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    Google Sheets Real-time Synchronization
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight mt-1.5">
                  เครื่องมือซิงค์ประวัติการใช้งานนิติบุคคลลง Google Sheets 📊
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  ระบบบันทึก ชื่อ, Gmail และเวลาที่บุคคล/นิติบุคคล เข้าใช้เครื่องมือ วางรากฐานวิเคราะห์ระบบแบบอัตโนมัติ
                </p>
              </div>

              {/* Keep sync metrics or reload buttons */}
              <button
                onClick={async () => {
                  fetchLogsAndConfig();
                  setSheetsStatusMessage({ type: "success", text: "รีเฟรชข้อมูลประวัติและค่าการตั้งค่าสำเร็จแล้ว" });
                  setTimeout(() => setSheetsStatusMessage(null), 3000);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition cursor-pointer select-none shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีโหลดประวัติ</span>
              </button>
            </div>

            {/* Config Status Banners */}
            {sheetsStatusMessage && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
                sheetsStatusMessage.type === "success" 
                  ? "bg-blue-50 text-blue-800 border-blue-200" 
                  : "bg-red-50 text-red-800 border-red-200"
              }`}>
                {sheetsStatusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{sheetsStatusMessage.text}</span>
              </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Google Sheet Setup Instructions & Form */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-indigo-100/50">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold font-mono">Google Sheets</span>
                    <h3 className="font-bold text-slate-900 text-sm">สถานะการเชื่อมต่อ</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      ระบบนี้เขียนบันทึกการเข้าใช้งานลง Google Sheet โดยตรงจาก Apps Script backend เดียวกับที่เสิร์ฟ API ของเว็บนี้
                      ไม่ต้องตั้งค่า Webhook แยกอีกต่อไป
                    </p>

                    <button
                      onClick={() => {
                        if (sheetsWebhook) {
                          window.open(sheetsWebhook, "_blank", "noopener,noreferrer");
                        } else {
                          setSheetsStatusMessage({ type: "error", text: "ยังไม่พบลิงก์ Google Sheet กรุณากดรีโหลดประวัติ" });
                          setTimeout(() => setSheetsStatusMessage(null), 4000);
                        }
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer select-none shadow-xs text-center flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>เปิด Google Sheet บันทึกข้อมูล</span>
                    </button>
                  </div>
                </div>

                {/* Deployment Instructions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-rose-100/50 text-rose-700 font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                    <span>วิธีติดตั้ง Backend (ทำครั้งเดียว) 📝</span>
                  </div>

                  <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
                    <li>เปิด <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">script.google.com</a> แล้วสร้างโปรเจกต์ใหม่</li>
                    <li>คัดลอกโค้ดจากไฟล์ <code>apps-script/Code.gs</code> ในรีโพนี้ไปวางแทนที่โค้ดเริ่มต้น</li>
                    <li>ไปที่ <strong>Project Settings &gt; Script Properties</strong> แล้วเพิ่มค่า <code>GEMINI_API_KEY</code> (ไม่ใส่ก็ได้ ระบบจะใช้คำแนะนำสำรองแบบกฎเกณฑ์แทน)</li>
                    <li>กดปุ่ม <strong>Deploy &gt; New deployment</strong> เลือกประเภท <strong>Web app</strong></li>
                    <li>ตั้งค่า <strong>Execute as: Me</strong> และ <strong>Who has access: Anyone</strong> แล้วกด Deploy</li>
                    <li>คัดลอก Web App URL ที่ได้ ไปวางแทนที่ <code>GAS_API_URL</code> ในไฟล์ <code>app.tsx</code> จากนั้น commit/push ขึ้น GitHub</li>
                  </ol>
                </div>
              </div>

              {/* RIGHT COLUMN: Real-time user access logging records */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-blue-100/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                      <h3 className="font-bold text-slate-900 text-sm">ประวัติบันทึกการเข้าใช้โปรแกรมเรียลไทม์</h3>
                    </div>
                    <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                      ทั้งหมด {userLogs.length} รายการ
                    </span>
                  </div>

                  {/* Logs Table Area */}
                  {userLogs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs space-y-1">
                      <p className="font-semibold text-slate-600">ไม่มีข้อมูลบันทึกประวัติ</p>
                      <p className="text-[10px] text-slate-400">ระบบจะเริ่มทำการเก็บบันทึกประวัติหลังจากผู้ใช้งานคนอื่นๆ เริ่มเข้าสู่ระบบ</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto text-left text-xs text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                            <th className="p-2.5 pb-2">ผู้ใช้งาน / Gmail</th>
                            <th className="p-2.5 pb-2">วันเดือนปี</th>
                            <th className="p-2.5 pb-2">เวลา</th>
                            <th className="p-2.5 pb-2 text-right">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userLogs.map((log) => (
                            <tr key={log.id || Math.random()} className="border-b border-slate-100 hover:bg-slate-50/50 font-medium">
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-800 leading-tight">{log.name}</div>
                                <div className="font-mono text-slate-400 text-[10px] leading-tight select-all">{log.email}</div>
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 font-semibold">{log.date}</td>
                              <td className="p-2.5 font-mono text-slate-600 font-semibold">{log.time}</td>
                              <td className="p-2.5 text-right shrink-0">
                                <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                  จัดเก็บแล้ว
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Database Information card for clarity */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[10.5px] text-slate-500 leading-snug">
                    💡 <strong>สถาปัตยกรรมการจัดเก็บ:</strong> ทุกๆ กิจกรรมการล็อกอินจะถูกส่งตรงไปยัง Google Apps Script backend ซึ่งเขียนบันทึกลง Google Sheet ทันที ไม่มีการเก็บไฟล์ใดๆ บนเซิร์ฟเวอร์
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          /* THAI TAX STRUCTURES - GENERAL LEARNING SECTION */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-8"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                โครงสร้างภาษีในประเทศไทย: บุคคลธรรมดา VS นิติบุคคล
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                ก่อนจดทะเบียนบริษัทหรือห้างหุ้นส่วนจำกัด การเข้าใจแนวคิดทางภาษีเหล่านี้ช่วยให้ตัดสินใจได้ถูกต้อง
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  ภาษีเงินได้บุคคลธรรมดา (Individual Tax)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เป็นภาษีเงินได้ของกลุ่มบุคคลทั่วไป ทำมาหากินในชื่อตัวเอง เช่น ฟรีแลนซ์ พนักงานเงินเดือน พ่อค้าแม่ค้าออนไลน์ที่ไม่ได้จดทะเบียนนิติบุคคล
                </p>
                <ul className="text-xs text-slate-500 list-disc pl-5 space-y-2">
                  <li><strong>พิกัดภาษี:</strong> อัตราก้าวหน้าตั้งแต่ 0% ถึงสูงสุด 35%</li>
                  <li><strong>ค่าใช้จ่าย:</strong> หักตามที่กฎหมายกำหนดเฉลี่ยแบบเหมา 60% หรือหักตามจริงซึ่งยุ่งยากเพราะต้องแจงรายละเอียดส่วนตัว</li>
                  <li><strong>ความเสี่ยง:</strong> รับผิดชอบมูลค่าหนี้สินจากการทำธุรกิจแบบ &quot;ไม่จำกัดจำนวน&quot; ด้วยทรัพย์สินของตนเอง</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                  ภาษีเงินได้นิติบุคคล (Corporate Tax)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เป็นการจดทะเบียนจัดตั้งแยกตัวตนออกมาจากบุคคลธรรมดาในฐานะ &quot;บริษัทจำกัด&quot; หรือ &quot;ห้างหุ้นส่วนจำกัด&quot; โดยมีงบแยกชัดเจน
                </p>
                <ul className="text-xs text-slate-500 list-disc pl-5 space-y-2">
                  <li><strong>พิกัดภาษีสำหรับ SMEไทย:</strong> กำไร 3 แสนบาทแรกละเว้นภาษี (0%), กำไร 3 แสนแต่ไม่เกิน 3 ล้านเสีย 15%, เกิน 3 ล้านขึ้นไปเสีย 20%</li>
                  <li><strong>การควบคุม:</strong> บังคับต้องจัดทำบัญชีรายเดือน/รายปี และผ่านการตรวจสอบเอกสารโดยผู้สอบบัญชีรับอนุญาต (CPA)</li>
                  <li><strong>ความเสี่ยงสิ่งจดทะเบียน:</strong> จำกัดความรับผิดชอบเฉพาะเท่ามูลค่าหุ้นที่ตนจดทะเบียนและชำระไว้</li>
                </ul>
              </div>
            </div>

            {/* Strategic Advice Card */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-700" />
                จุดคุ้มทุน (Break-even Point) ที่ควรย้ายไปนิติบุคคลคือเมื่อไร?
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                โดยทั่วไปในประเทศไทย จุดที่บุคคลธรรมดาเสียภาษีแซงทางนิติบุคคลคือ เมื่อมีกำไรสะสม (รายรับลบค่าใช้จ่าย) เกินกว่า 1,000,000 บาทต่อปีขึ้นไป เนื่องจากฐานอัตราก้าวหน้าของบุคคลธรรมดาจะตกอยู่ที่ 20% - 25% ซึ่งสูงกว่าโครงสร้างนิติบุคคล SME ที่เริ่มต้นเพียง 15%
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                แต่อยากให้คำนึงถึง <strong>&quot;ค่าใช้จ่ายแอบแฝงของการตั้งนิติบุคคล&quot;</strong> ด้วย เช่น ค่าจดทะเบียนจัดตั้ง (ประมาณ 5,000-8,000 บาท), ค่าจ้างทำบัญชีรายเดือน (ปีละ 12,000-24,000 บาท/ปี) และค่าตรวจสอบบัญชีรายปี (8,000-20000 บาท/ปี) หากส่วนต่างประหยัดภาษีไม่เกินค่าใช้จ่ายแอบแฝงเหล่านี้ ควรอยู่แบบบุคคลธรรมดาก่อน
              </p>
            </div>
          </motion.div>
        )}
      </main>

      {/* Consultation Contact Banner */}
      <div className="bg-slate-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h4 className="font-bold text-base flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              ต้องการที่ปรึกษาด้านบัญชีและภาษีโดยเฉพาะ?
            </h4>
            <p className="text-sm text-slate-300 mt-0.5">บริษัท อัลเทอร์เนแท็กส์ จำกัด</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm font-semibold">
            <a href="tel:0972474415" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-xl">
              📞 097-247-4415
            </a>
            <span className="flex items-center gap-1.5 text-slate-300">
              🕘 Office Hours: Monday – Friday | 09:00 – 18:00
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 text-center text-xs text-slate-400">
          <p>Tax Twin Easy © 2026</p>
        </div>
      </footer>

      {renderPnd94Modal()}

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative max-w-md w-full"
            >
              <div className="bg-slate-900 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent)]"></div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-4 right-4 z-30 text-slate-400 hover:text-white transition cursor-pointer p-1.5 rounded-full hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-blue-600/20 text-blue-400 p-3 rounded-full mb-3 border border-blue-500/20">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">ระบบบัญชีจำลองส่วนบุคคล</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    ล็อกอินฟรี เพื่อบันทึกประวัติเปรียบเทียบแผนภาษีส่วนบุคคลแยกเดี่ยว ปลอดภัย 100%
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Authorization Mode Selection */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      authMode === "signin"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    🔑 บัญชีเข้าระบบเดิม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      authMode === "signup"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    ✨ ลงทะเบียนบัญชีใหม่
                  </button>
                </div>

                {/* Status Banners */}
                {authError && (
                  <div className="p-3.5 bg-red-50 text-red-800 text-xs border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}
                
                {authSuccess && (
                  <div className="p-3.5 bg-blue-50 text-blue-800 text-xs border border-blue-200 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {/* Email, Name and Password Forms */}
                <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
                  {authMode === "signup" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">ชื่อผู้ใช้งาน (Display Name)</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="เช่น คุณกฤษฎา วางแผนดี"
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none pl-9 pr-3 py-2.5 rounded-xl text-xs text-slate-800 transition"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">ที่อยู่อีเมล (Email Address)</label>
                    <div className="relative">
                      <span className="text-slate-400 absolute left-3.5 top-2.5 font-mono text-xs">@</span>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="เช่น name@company.co"
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none pl-9 pr-3 py-2.5 rounded-xl text-xs text-slate-800 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">รหัสผ่านบัญชีระบบ</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="รหัสผ่านเข้าถึงประวัติ"
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none pl-9 pr-3 py-2.5 rounded-xl text-xs text-slate-800 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
                  >
                    {authMode === "signin" ? (
                      <>
                        <UserCheck className="w-4.5 h-4.5" />
                        ยืนยันเข้าสู่ระบบความปลอดภัย
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4.5 h-4.5 text-yellow-300" />
                        สร้างบัญชีผู้ใช้งานใหม่
                      </>
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="w-full text-slate-500 hover:text-slate-800 text-xs font-medium text-center py-2 underline cursor-pointer"
                >
                  ปิดหน้าต่างนี้และใช้งานในฐานะบุคคลทั่วไปต่อไป
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
