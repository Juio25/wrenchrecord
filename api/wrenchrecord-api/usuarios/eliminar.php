<?php
/**
 * DELETE /wrenchrecord-api/usuarios/eliminar.php?id_usuario=5
 *
 * Soft-delete: no borra la fila, solo pone activo = 0 (mismo
 * criterio que se usa para "vehiculos" en el resto de la base
 * de datos, para no perder historial).
 *
 * Responde siempre en JSON:
 *   { "exito": bool, "mensaje": string }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usa DELETE.'
    ]);
    exit;
}

$idUsuario = isset($_GET['id_usuario']) ? (int) $_GET['id_usuario'] : 0;

if ($idUsuario <= 0) {
    http_response_code(400);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Falta el id_usuario a eliminar.'
    ]);
    exit;
}

try {
    $pdo = obtenerConexion();

    $stmt = $pdo->prepare('SELECT id_usuario, activo FROM usuarios WHERE id_usuario = :id LIMIT 1');
    $stmt->execute(['id' => $idUsuario]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        http_response_code(404);
        echo json_encode([
            'exito'   => false,
            'mensaje' => 'No existe un usuario con ese ID.'
        ]);
        exit;
    }

    if ((int) $usuario['activo'] === 0) {
        http_response_code(200);
        echo json_encode([
            'exito'   => true,
            'mensaje' => 'El usuario ya estaba desactivado.'
        ]);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE usuarios SET activo = 0 WHERE id_usuario = :id');
    $stmt->execute(['id' => $idUsuario]);

    http_response_code(200);
    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Usuario desactivado correctamente.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ocurrió un error en el servidor. Intenta más tarde.'
        // , 'detalle' => $e->getMessage()
    ]);
}
