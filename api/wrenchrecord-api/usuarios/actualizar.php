<?php
/**
 * PUT /wrenchrecord-api/usuarios/actualizar.php
 *
 * Recibe un JSON: { id_usuario, nombre, apellido, correo }
 * (No actualiza contraseña aquí a propósito — eso debería ser un
 * endpoint aparte, con su propia verificación, más adelante).
 *
 * Responde siempre en JSON:
 *   { "exito": bool, "mensaje": string, "usuario"?: {...} }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usa PUT.'
    ]);
    exit;
}

$cuerpo = json_decode(file_get_contents('php://input'), true);

$idUsuario = (int) ($cuerpo['id_usuario'] ?? 0);
$nombre    = trim($cuerpo['nombre'] ?? '');
$apellido  = trim($cuerpo['apellido'] ?? '');
$correo    = trim($cuerpo['correo'] ?? '');

// ==================== VALIDACIONES ====================
$errores = [];

if ($idUsuario <= 0) {
    $errores[] = 'Falta el id_usuario a actualizar.';
}
if ($nombre === '') {
    $errores[] = 'El nombre es obligatorio.';
}
if ($apellido === '') {
    $errores[] = 'El apellido es obligatorio.';
}
if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    $errores[] = 'Ingresa un correo electrónico válido.';
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

    // Verificar que el usuario exista
    $stmt = $pdo->prepare('SELECT id_usuario FROM usuarios WHERE id_usuario = :id LIMIT 1');
    $stmt->execute(['id' => $idUsuario]);

    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'No existe un usuario con ese ID.'
        ]);
        exit;
    }

    // El nuevo correo no debe chocar con el de OTRO usuario
    $stmt = $pdo->prepare(
        'SELECT id_usuario FROM usuarios WHERE correo = :correo AND id_usuario != :id LIMIT 1'
    );
    $stmt->execute(['correo' => $correo, 'id' => $idUsuario]);

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'Ese correo ya lo usa otra cuenta.'
        ]);
        exit;
    }

    $stmt = $pdo->prepare(
        'UPDATE usuarios
         SET nombre = :nombre, apellido = :apellido, correo = :correo
         WHERE id_usuario = :id'
    );
    $stmt->execute([
        'nombre'   => $nombre,
        'apellido' => $apellido,
        'correo'   => $correo,
        'id'       => $idUsuario
    ]);

    http_response_code(200);
    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Usuario actualizado correctamente.',
        'usuario' => [
            'id_usuario' => $idUsuario,
            'nombre'     => $nombre,
            'apellido'   => $apellido,
            'correo'     => $correo
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
