<?php
/**
 * POST /wrenchrecord-api/usuarios/registrar.php
 *
 * Recibe un JSON: { nombre, apellido, correo, contrasena }
 * Responde siempre en JSON con la forma:
 *   { "exito": bool, "mensaje": string, "id_usuario"?: number }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

// Solo aceptamos POST para crear usuarios
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usa POST.'
    ]);
    exit;
}

// Leer el cuerpo de la petición (JSON enviado por Angular/HttpClient)
$cuerpo = json_decode(file_get_contents('php://input'), true);

$nombre     = trim($cuerpo['nombre'] ?? '');
$apellido   = trim($cuerpo['apellido'] ?? '');
$correo     = trim($cuerpo['correo'] ?? '');
$contrasena = (string) ($cuerpo['contrasena'] ?? '');

// ==================== VALIDACIONES ====================
$errores = [];

if ($nombre === '') {
    $errores[] = 'El nombre es obligatorio.';
}
if ($apellido === '') {
    $errores[] = 'El apellido es obligatorio.';
}
if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'Ingresa un correo electrónico válido.';
}
if (strlen($contrasena) < 6) {
    $errores[] = 'La contraseña debe tener al menos 6 caracteres.';
}

if (!empty($errores)) {
    http_response_code(400);
    echo json_encode([
        'exito'   => false,
        'mensaje' => implode(' ', $errores)
    ]);
    exit;
}

try {
    $pdo = obtenerConexion();

    // Evitar correos duplicados
    $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE correo = :correo LIMIT 1');
    $stmt->execute(['correo' => $correo]);

    if ($stmt->fetch()) {
        http_response_code(409); // Conflict
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Ya existe una cuenta registrada con ese correo.'
        ]);
        exit;
    }

    // Nunca se guarda la contraseña en texto plano
    $hash = password_hash($contrasena, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare(
        'INSERT INTO usuarios (nombre, apellido, correo, contrasena)
         VALUES (:nombre, :apellido, :correo, :contrasena)'
    );

    $stmt->execute([
        'nombre'     => $nombre,
        'apellido'   => $apellido,
        'correo'     => $correo,
        'contrasena' => $hash
    ]);

    http_response_code(201); // Created
    echo json_encode([
        'exito'      => true,
        'mensaje'    => 'Cuenta creada correctamente. ¡Ya puedes iniciar sesión!',
        'id_usuario' => (int) $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ocurrió un error en el servidor. Intenta más tarde.'
        // En desarrollo puedes descomentar la siguiente línea para depurar:
        // , 'detalle' => $e->getMessage()
    ]);
}
