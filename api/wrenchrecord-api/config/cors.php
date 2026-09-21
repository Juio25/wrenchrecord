<?php
/**
 * CORS - Wrenchrecord API
 *
 * Se incluye al inicio de cada endpoint. Permite que la app Ionic
 * (que corre en un origen distinto: localhost:8100, capacitor://,
 * http://10.0.2.2, etc.) pueda hacer peticiones a esta API que vive
 * en http://localhost/wrenchrecord-api dentro de XAMPP.
 */

// En desarrollo se permite cualquier origen. Si más adelante publicas
// la API, cambia '*' por el dominio real de tu app.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// El navegador (o WebView de Ionic) manda una petición OPTIONS antes
// del POST real ("preflight"). Hay que responderla con 200 y cortar
// la ejecución, sin llegar a tocar la base de datos.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
