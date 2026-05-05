const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const path = require('path');
const fetch = require('node-fetch'); // Render soporta fetch en Node >=18

// Ajustar monto en bloques de 500.000 hacia abajo
function ajustarMonto(saldo) {
  if (saldo < 1000000) return null;
  return Math.floor(saldo / 500000) * 500000;
}

async function notificarTelegram(monto, saldo) {
  let mensaje;
  if (monto) {
    mensaje = `✅ Planilla actualizada\nSaldo detectado: ${saldo}\nMonto escrito en H2: ${monto}`;
  } else {
    mensaje = `⚠️ Saldo detectado: ${saldo}\nNo se actualizó H2 porque es menor a 1.000.000`;
  }

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

  // Calcular monto ajustado
  const monto = ajustarMonto(saldo);

  if (monto) {
    // Actualizar planilla en H2
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'planillaformatotransf.xlsx'));
    const sheet = workbook.getWorksheet(1);

    // Borrar valor previo y sobrescribir
    sheet.getCell('H2').value = null;
    sheet.getCell('H2').value = monto;

    await workbook.xlsx.writeFile(path.join(__dirname, 'planillaformatotransf.xlsx'));
  }

  // Notificar a Telegram (siempre, aunque no se escriba en H2)
  await notificarTelegram(monto, saldo);

  await browser.close();
  return { status: monto ? 'ok' : 'descartado', saldo, monto };
}

module.exports = { loginYActualizarPlanilla };
