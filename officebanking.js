const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const path = require('path');
const fetch = require('node-fetch'); // Render soporta fetch en Node >=18

async function notificarTelegram(monto, saldo) {
  const mensaje = `🔔 Prueba de sistema\nSaldo detectado: ${saldo}\nValor escrito en H2: ${monto}`;
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.CHAT_ID,
      text: mensaje
    })
  });
}

async function loginYActualizarPlanilla(rut, password) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Ir al portal
  await page.goto('https://empresas.officebanking.cl', { waitUntil: 'networkidle2' });

  // Limpiar RUT si existe el botón
  const clearRut = await page.$('#clearRutInput');
  if (clearRut) await clearRut.click();

  // Escribir RUT y contraseña
  await page.type('#username', rut);
  await page.type('#password', password);

  // Click en botón de login
  await page.click('#doLoginButton');
  await page.waitForNavigation();

  // Extraer saldo desde el <td class="ng-star-inserted">
  const saldoTexto = await page.$eval('td.ng-star-inserted', el => el.innerText.trim());
  const saldo = parseInt(saldoTexto.replace(/[^0-9-]/g, ''), 10);

  // Actualizar planilla en H2 con el saldo tal cual
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'planillaformatotransf.xlsx'));
  const sheet = workbook.getWorksheet(1);

  // Borrar valor previo y sobrescribir
  sheet.getCell('H2').value = null;
  sheet.getCell('H2').value = saldo;

  await workbook.xlsx.writeFile(path.join(__dirname, 'planillaformatotransf.xlsx'));

  // Notificar a Telegram
  await notificarTelegram(saldo, saldo);

  await browser.close();
  return { status: 'ok', saldo };
}

module.exports = { loginYActualizarPlanilla };
