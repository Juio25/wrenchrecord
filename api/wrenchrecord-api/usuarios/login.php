<?php
/**
 * POST /wrenchrecord-api/usuarios/login.php
 *
 * Recibe un JSON: { correo, contrasena }
 * Responde siempre en JSON con la forma:
 *   { "exito": bool, "mensaje": string, "usuario"?: {...} }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usa POST.'
    ]);
    exit;
}

$cuerpo = json_decode(file_get_contents('php://input'), true);

$correo     = trim($cuerpo['correo'] ?? '');
$contrasena = (string) ($cuerpo['contrasena'] ?? '');

if ($correo === '' || $contrasena === '') {
    http_response_code(400);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ingresa tu correo y contraseña.'
    ]);
    exit;
}

try {
    $pdo = obtenerConexion();

    $stmt = $pdo->prepare(
        'SELECT id_usuario, nombre, apellido, correo, contrasena, activo
         FROM usuarios
         WHERE correo = :correo
         LIMIT 1'
    );
    $stmt->execute(['correo' => $correo]);
    $usuario = $stmt->fetch();

    // Mensaje genérico a propósito: no revela si el correo existe o
    // si fue la contraseña la que falló (buena práctica de seguridad).
    if (!$usuario || !password_verify($contrasena, $usuario['contrasena'])) {
        http_response_code(401);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Correo o contraseña incorrectos.'
        ]);
        exit;
    }

    if ((int) $usuario['activo'] === 0) {
        http_response_code(403);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Esta cuenta está desactivada. Contacta a soporte.'
        ]);
        exit;
    }

    // Registrar la última conexión
    $stmt = $pdo->prepare('UPDATE usuarios SET ultima_conexion = NOW() WHERE id_usuario = :id');
    $stmt->execute(['id' => $usuario['id_usuario']]);

    http_response_code(200);
    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Bienvenido de nuevo, ' . $usuario['nombre'] . '.',
        'usuario' => [
            'id_usuario' => (int) $usuario['id_usuario'],
            'nombre'     => $usuario['nombre'],
            'apellido'   => $usuario['apellido'],
            'correo'     => $usuario['correo']
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ocurrió un error en el servidor. Intenta más tarde.'
        // , 'detalle' => $e->getMessage()
    ]);
}
