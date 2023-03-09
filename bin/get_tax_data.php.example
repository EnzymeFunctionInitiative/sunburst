<?php 
require_once(__DIR__."/../../init.php");

use \efi\est\stepa;
use \efi\est\dataset_shared;

if (!isset($_GET["id"]) || !is_numeric($_GET["id"])) {
    die();
}

$job = new stepa($db, $_GET["id"]);
$job_id = $job->get_id();
$job_key = $_GET["key"];

if ($job->get_key() != $_GET["key"]) {
    echo json_encode(array("valid" => "false", "message" => "Invalid parameters k.", "data" => array()));
}

$gen_type = $job->get_type();
//if ($gen_type != "TAXONOMY") {
//    echo json_encode(array("valid" => "false", "message" => "Invalid parameters t.", "data" => array()));
//}

//$job = new taxonomy_job($db, $_GET["id"]);

$job = dataset_shared::create_generate_object($gen_type, $db);
$has_tax_data = $job->has_tax_data();

if (!$has_tax_data) {
    echo json_encode(array("valid" => "false", "message" => "No taxonomy data.", "data" => array()));
    exit(0);
}

header('Content-Type: application/json; charset=utf-8');
$data_array = $job->get_taxonomy_data();

echo json_encode(array("valid" => "true", "data" => $data_array));


