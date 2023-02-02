<?php
//TODO:
$init_dir = "/var/www/dev.radicalsam.org"; # until we deploy the sunburst composer package from git rather than local (local uses symlinks)
//$init_dir = __DIR__."/../../../../../init.php";
require_once("$init_dir/init.php");
require_once(__LIB_DIR__ . "/settings.class.inc.php");
require_once(__LIB_DIR__ . "/functions.class.inc.php");
require_once(__LIB_DIR__ . "/tax_data.class.inc.php");

$version = functions::validate_version();
$qversion = (isset($_GET["qv"]) && is_numeric($_GET["qv"])) ? $_GET["qv"] : 0;

$db = functions::get_database($version);

$cluster_id = filter_input(INPUT_GET, "id", FILTER_SANITIZE_STRING);
$ascore = filter_input(INPUT_GET, "as", FILTER_SANITIZE_NUMBER_INT);

if ($cluster_id && !functions::validate_cluster_id($db, $cluster_id)) {
    echo json_encode(array("valid" => false, "message" => "Invalid request #0 $cluster_id."));
    exit(0);
}


$data = array("valid" => true, "message" => "");

$tax = tax_data::get_tax_data($db, $cluster_id, $ascore, $qversion);
if ($tax  === false) {
    $data["valid"] = false;
    $data["message"] = "Retrieval error.";
} else {
    $data["data"]["data"] = $tax;
}

echo json_encode($data);


