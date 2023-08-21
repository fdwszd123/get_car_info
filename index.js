const puppeteer = require("puppeteer-core");
const exceljs = require("exceljs");
const fetch = require("node-fetch");
const spinner = require("./spinner");
const findChrome = require("carlo/lib/find_chrome");
const URL = "https://www.dongchedi.com";
const workbook = new exceljs.Workbook();
const worksheet = workbook.addWorksheet("懂车帝车辆信息");
// const headers = ["名称", "品牌", "官方指导价", "图片"];
worksheet.columns = [
  {
    header: "名称",
    key: "outter_name",
  },
  {
    header: "品牌",
    key: "brand_name",
  },
  {
    header: "官方指导价",
    key: "official_price",
  },
  {
    header: "图片",
    key: "cover_url",
  },
];
let currentRow = 0;
// worksheet.addRow(headers);
const handleRes = async (res) => {
  const url = res.url();
  if (url.includes("select_series")) {
    const { data } = await res.json();
    const { series } = data;
    series.forEach(async (car) => {
      spinner.succeed(
        `名称：${car.outter_name},品牌: ${car.brand_name},官方指导价：${car.official_price}`
      );
      const imageUrl = car.cover_url;
      const response = await fetch(imageUrl);
      const bufferData = await response.arrayBuffer();
      const buffer = Buffer.from(bufferData);
      const imgId = workbook.addImage({
        buffer,
        extension: "png",
      });
      const row = {
        outter_name: car.outter_name,
        brand_name: car.brand_name,
        official_price: car.official_price,
      };

      // car.cover_url,

      worksheet.addRow(row);
      worksheet.addImage(imgId, {
        tl: { col: 3, row: currentRow + 1 },
        br: {
          col: 3 + 1,
          row: currentRow + 2,
        },
      });
      currentRow++;
    });
  }
};
let startTime = Date.now();
let endTime;
(async () => {
  let executablePath;
  spinner.startLoading("正在获取chrome安装路径...");
  try {
    let findChromePath = await findChrome({});
    executablePath = findChromePath.executablePath;
    spinner.stopLoading(true, `获取chrome路径成功:${executablePath}`);
  } catch (e) {
    spinner.stopLoading(false, `获取chrome路径失败!`);
    console.error(e.message);
    process.exit(1);
  }
  spinner.startLoading("正在打开chrome...");

  let page, browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      //是否不显示浏览器界面-
      headless: false,
    });
    page = await browser.newPage();
    await page.goto(URL);
    await page.setViewport({ width: 1080, height: 1024 });
    spinner.stopLoading(true, `打开chrome成功`);
  } catch (e) {
    spinner.stopLoading(false, `打开chrome失败!`);
    console.error(e.message);
    process.exit(1);
  }

  spinner.startLoading("正在获取汽车分类...");
  let carTypes = null;
  try {
    carTypes = await page.evaluate(() => {
      const elements = document.getElementsByClassName(
        "type-list_whole__ErdRL"
      );
      const types = [];
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const href = element.getAttribute("href");
        const name = element.querySelector("span:nth-child(2)").textContent;
        types.push({
          href,
          name,
        });
      }
      return types;
    });
    spinner.stopLoading(true, `获取汽车分类成功!`);
  } catch (e) {
    spinner.stopLoading(false, `获取汽车分类失败!`);
    console.error(e.message);
    process.exit(1);
  }
  for (let i = 0; i < carTypes.length; i++) {
    const car = carTypes[i];
    spinner.startLoading(`开始获取类别为【${car.name}】的数据...`);
    const currentPage = await browser.newPage();
    currentPage.on("response", handleRes);
    await currentPage.goto(URL + car.href);
    await currentPage.setViewport({ width: 1080, height: 1024 });
    spinner.stopLoading(true, `【${car.name}】数据获取成功`);
    let flag = true;
    while (flag) {
      const prevPageHeight = await currentPage.evaluate(() => {
        return document.documentElement.scrollHeight;
      });
      await currentPage.evaluate((height) => {
        window.scrollBy(0, height);
        // 等待一小段时间，以确保滚动操作完成
        return new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }, prevPageHeight);

      const currentPageHeight = await currentPage.evaluate(() => {
        return document.documentElement.scrollHeight;
      });
      if (currentPageHeight === prevPageHeight) {
        flag = false;
      }
    }
    currentPage.close();
  }
  await browser.close();
  spinner.startLoading(`开始写入表格...`);
  const column = worksheet.getColumn(4);
  column.width = 330 / 7;
  for (let i = 1; i <= currentRow; i++) {
    const row = worksheet.getRow(i + 1);
    row.height = 220 / 1.33;
  }
  await workbook.xlsx.writeFile(`车辆信息${Date.now()}.xlsx`);
  spinner.stopLoading(true, "写入表格成功！");
  endTime = Date.now();
  let time = endTime - startTime;
  spinner.succeed(`结束执行：共 ${currentRow}条,耗时 ${time} ms`);
})();
