const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({
        headless: false,           // مرورگر نمایش داده می‌شود
        defaultViewport: null,     // تمام‌صفحه
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // helper: اگر selector پیدا شد کلیک کن، در غیر این صورت بدون خطا رد شو
    async function clickIfExists(selector, timeout = 3000) {
        try {
            await page.waitForSelector(selector, { visible: true, timeout });
            await page.click(selector);
            console.log(`✅ کلیک شد: ${selector}`);
            return true;
        } catch (err) {
            if (err && err.name === "TimeoutError") {
                console.log(`ℹ️ المان "${selector}" پیدا نشد — رد می‌شوم.`);
                return false;
            }
            // خطاهای دیگر را گزارش کن (می‌تونی این را هم بخواهی نادیده بگیری)
            console.error(`❌ خطا هنگام تلاش برای کلیک روی "${selector}":`, err);
            return false;
        }
    }

    try {
        // --- لاگین ---
        await page.goto("https://darina.zaryar.com/#auth/login", { waitUntil: "networkidle2" });

        await page.waitForSelector(".loginType-container .btn");
        await page.click(".loginType-container .btn");

        // اگر close_button هست کلیک کن، اگر نبود ادامه بده
        await clickIfExists("#close_button", 5000);

        await page.type('input[name="UserName"]', "09396360199");
        await page.type('input[name="Password"]', "Zhik1234!");
        await page.click('button[type="submit"]');

        // این modal گاهی هست گاهی نیست — اگر نبود اسکریپت خطا نده
        await clickIfExists(".modal-dialog button", 3000);

        await page.waitForSelector("#ItemPricesList", { visible: true, timeout: 20000 });
        console.log("✅ ورود موفق شد");

        // ----- متدهای کمکی -----
        async function clickOnPrice(rowText, type) {
            await page.evaluate(
                ({ rowText, type }) => {
                    const rows = document.querySelectorAll(
                        "#ItemPricesList .row.g-0.border-bottom"
                    );
                    for (const row of rows) {
                        const nameEl = row.querySelector(".col-4.text-start span");
                        if (nameEl && nameEl.textContent.includes(rowText)) {
                            let targetEl;
                            if (type === "buy") {
                                targetEl = row.querySelector(
                                    ".highlight-buy-price span.text-success span"
                                );
                            } else if (type === "sell") {
                                targetEl = row.querySelector(
                                    ".highlight-sell-price span.text-danger span"
                                );
                            }
                            if (targetEl) {
                                targetEl.click();
                                return true;
                            }
                        }
                    }
                    return false;
                },
                { rowText, type }
            );
        }

        async function handleModal(page, amount = "1") {
            try {
                // منتظر input مقدار بشه (نشون میده مودال واقعا باز شده)
                const countInput = 'div[role="dialog"] input#count';
                await page.waitForSelector(countInput, { visible: true, timeout: 10000 });

                // مقدار رو پر کن (اول مطمئن شو خالیه)
                await page.evaluate((sel, value) => {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.value = ""; // پاک کردن مقدار قبلی
                        el.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                }, countInput, amount);

                await page.type(countInput, amount, { delay: 100 });

                // روی دکمه خرید کلیک کن
                const buyButton = 'div[role="dialog"] .btn.btn-block.btn-success';
                await page.waitForSelector(buyButton, { visible: true });
                await page.click(buyButton);

                console.log(`✅ مقدار ${amount} وارد شد و روی دکمه خرید کلیک شد`);
            } catch (err) {
                console.log("⏭️ مودال پیدا نشد یا در زمان تعیین‌شده باز نشد");
            }
        }

        // --- متدهای خاص ---
        async function clickBuyTomorrow() {
            await clickOnPrice("آبشده نقد فردا", "buy");
            console.log("✅ کلیک روی مظنه خرید شما (آبشده نقد فردا)");
        }

        async function clickSellTomorrow() {
            await clickOnPrice("آبشده نقد فردا", "sell");
            console.log("✅ کلیک روی مظنه فروش شما (آبشده نقد فردا)");
        }

        async function clickBuyDayAfterTomorrow() {
            await clickOnPrice("آبشده نقد پس فردا", "buy");
            console.log("✅ کلیک روی مظنه خرید شما (آبشده نقد پس فردا)");
        }

        async function clickSellDayAfterTomorrow() {
            await clickOnPrice("آبشده نقد پس فردا", "sell");
            console.log("✅ کلیک روی مظنه فروش شما (آبشده نقد پس فردا)");
        }



        // 📌 مثال: صدا زدن یکی از متدها
        await clickBuyTomorrow();
        // اینجا عدد 0.5 در کادر مقدار تایپ میشه و خرید انجام میشه
        await handleModal(page, "0.5");




        // اگر می‌خواهی مرورگر بلافاصله بسته نشود، این خط را کامنت کن:
        // await browser.close();
    } catch (err) {
        console.error("❌ خطای کلی:", err);
        try { await browser.close(); } catch {}
    }
})();
