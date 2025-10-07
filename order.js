const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

let browser, page;
let queue = [];
let isProcessing = false;

// --- لاگین ---
async function login() {
    console.log("🔑 در حال لاگین...");
    await page.goto("https://darina.zaryar.com/#auth/login", { waitUntil: "networkidle2" });

    await page.click(".loginType-container .btn");
    await clickIfExists("#close_button", 5000);

    await page.type('input[name="UserName"]', "09396360199");
    await page.type('input[name="Password"]', "Zhik1234!");
    await page.click('button[type="submit"]');

    await clickIfExists(".modal-dialog button", 3000);
    await page.waitForSelector("#ItemPricesList", { visible: true, timeout: 20000 });
    console.log("✅ ورود موفق شد");
}

async function clickIfExists(selector, timeout = 3000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector);
        return true;
    } catch {
        return false;
    }
}

// --- چک کردن لاگ‌او‌ت ---
async function ensureLoggedIn() {
    const isLoggedIn = await page.$("#ItemPricesList") !== null;
    if (!isLoggedIn) {
        console.log("⚠️ لاگ اوت شدیم یا دسترسی به مظنه‌ها نداریم. لاگین مجدد...");
        await login();
    }
}

// --- ثبت سفارش ---
async function processOrder(order) {
    const { action, delivery, amount } = order;
    await ensureLoggedIn();

    const rowText = delivery === "tomorrow" ? "آبشده نقد فردا" : "آبشده نقد پس فردا";
    const clicked = await clickOnPrice(rowText, action);

    if (!clicked) {
        console.log(`❌ نتوانستم مظنه "${rowText}" برای ${action} پیدا کنم`);
        return;
    }

    const countInput = 'div[role="dialog"] input#count';
    await page.waitForSelector(countInput, { visible: true });
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }, countInput);
    await page.type(countInput, amount, { delay: 100 });

    const confirmBtn = 'div[role="dialog"] .btn.btn-block.btn-success';
    await page.waitForSelector(confirmBtn, { visible: true });
    await page.click(confirmBtn);

    // بستن Modal سریع قبل از رفتن سراغ سفارش بعدی
    await clickIfExists('div[role="dialog"] .btn.btn-secondary', 2000);

    console.log(`✅ سفارش ${action} ${rowText} (${amount} گرم) ثبت شد`);
}

async function clickOnPrice(rowText, type) {
    return await page.evaluate(({ rowText, type }) => {
        const rows = document.querySelectorAll("#ItemPricesList .row.g-0.border-bottom");
        for (const row of rows) {
            const nameEl = row.querySelector(".col-4.text-start span");
            if (nameEl && nameEl.textContent.includes(rowText)) {
                let targetEl;
                if (type === "buy") {
                    targetEl = row.querySelector(".highlight-buy-price span.text-success span");
                } else {
                    targetEl = row.querySelector(".highlight-sell-price span.text-danger span");
                }
                if (targetEl) {
                    targetEl.click();
                    return true;
                }
            }
        }
        return false;
    }, { rowText, type });
}

// --- صف ---
function enqueueOrder(order) {
    queue.push(order);
    processQueue();
}

async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while (queue.length > 0) {
        const order = queue.shift();
        await processOrder(order);
    }
    isProcessing = false;
}

// --- API ---
app.post("/order", (req, res) => {
    const { action, delivery, amount } = req.body;
    enqueueOrder({ action, delivery, amount });
    res.json({ queued: true });
});

// --- شروع ---
(async () => {
    browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    page = await browser.newPage();
    await login();

    app.listen(3000, () => console.log("🚀 Server started on port 3000"));
})();
