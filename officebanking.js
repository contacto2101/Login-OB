const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

function ajustarMonto(saldo) {
  if (saldo < 1000000) return null;
  return Math.floor(saldo / 500) * 500;
}

async function loginYActualizarPlanilla(rut, password) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://empresas.officebanking.cl', { waitUntil: 'networkidle2' });

  // Ajusta los selectores al HTML real
  await page.type('#rutInput', rut);
  await page.type('#passwordInput', password);
  await page.click('#loginButton');
  await page.waitForNavigation();

  // Extraer saldo (ajusta selector al real)
  const saldo = await page.$eval('#saldo', el => parseInt(el.innerText.replace(/\D/g,'')));

  const monto = ajustarMonto(saldo);
  if (!monto) {
    await browser.close();
    return { status: 'descartado', saldo };
  }

  // Actualizar planilla
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('planilla.xlsx');
  const sheet = workbook.getWorksheet(1);
  sheet.getCell('B2').value = monto;
  await workbook.xlsx.writeFile('planilla.xlsx');

  await browser.close();
  return { status: 'ok', saldo, monto };
}

module.exports = { loginYActualizarPlanilla };
