<?php
/**
 * GET /wrenchrecord-api/usuarios/consultar.php?nombre=&apellido=&correo=&idUsuario=
 *
 * Búsqueda de usuarios registrados. Cualquier combinación de filtros
 * es válida (nombre/apellido/correo hacen LIKE parcial, idUsuario es
 * una coincidencia exacta). Hay que mandar al menos uno.
 *
 * Responde siempre en JSON:
 *   { "exito": bool, "mensaje": string, "usuarios": [...] }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usa GET.'
    ]);
    exit;
}

$nombre    = trim($_GET['nombre'] ?? '');
$apellido  = trim($_GET['apellido'] ?? '');
$correo    = trim($_GET['correo'] ?? '');
$idUsuario = trim($_GET['idUsuario'] ?? '');

// No permitimos traer toda la tabla de un jalón: se necesita al
// menos un filtro para consultar.
if ($nombre === '' && $apellido === '' && $correo === '' && $idUsuario === '') {
    http_response_code(400);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ingresa al menos un filtro para realizar la consulta.'
    ]);
    exit;
}

if ($idUsuario !== '' && !ctype_digit($idUsuario)) {
    http_response_code(400);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'El ID de usuario debe ser un número.'
    ]);
    exit;
}

try {
    $pdo = obtenerConexion();

    $condiciones = [];
    $parametros  = [];

    if ($nombre !== '') {
        $condiciones[]        = 'nombre LIKE :nombre';
        $parametros['nombre'] = '%' . $nombre . '%';
    }
    if ($apellido !== '') {
        $condiciones[]          = 'apellido LIKE :apellido';
        $parametros['apellido'] = '%' . $apellido . '%';
    }
    if ($correo !== '') {
        $condiciones[]        = 'correo LIKE :correo';
        $parametros['correo'] = '%' . $correo . '%';
    }
    if ($idUsuario !== '') {
        $condiciones[]           = 'id_usuario = :idUsuario';
        $parametros['idUsuario'] = (int) $idUsuario;
    }

    $sql = 'SELECT id_usuario, nombre, apellido, correo, fecha_registro, activo
            FROM usuarios
            WHERE ' . implode(' AND ', $condiciones) . '
            ORDER BY nombre, apellido
            LIMIT 100';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($parametros);
    $usuarios = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode([
        'exito'    => true,
        'mensaje'  => count($usuarios) > 0
            ? 'Se encontraron ' . count($usuarios) . ' usuario(s).'
            : 'No se encontraron usuarios con esos filtros.',
        'usuarios' => $usuarios
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Ocurrió un error en el servidor. Intenta más tarde.'
        // , 'detalle' => $e->getMessage()
    ]);
}
