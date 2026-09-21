<?php
/**
 * Conexión a la base de datos - Wrenchrecord API
 *
 * Ajusta $host / $usuario / $contrasena si tu XAMPP no usa
 * la configuración por defecto (root sin contraseña).
 */

function obtenerConexion(): PDO
{
    $host        = 'localhost';
    $baseDatos   = 'wrenchrecord';
    $usuario     = 'root';
    $contrasena  = '';
    $charset     = 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$baseDatos};charset={$charset}";

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    return new PDO($dsn, $usuario, $contrasena, $opciones);
}
