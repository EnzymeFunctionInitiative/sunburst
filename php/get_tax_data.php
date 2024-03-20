<?php
require_once(__DIR__."/config.php");


////////////////////////////////////////////////////////////////////////////////////////////////////
// For EFI web app integration
//

if (defined("__EFI_INTEGRATION__")) {

    if (!isset($_GET["id"]) || !is_numeric($_GET["id"])) {
        die();
    }

    $is_example = \efi\training\example_config::is_example();
    $job = new \efi\est\stepa($db, $_GET["id"], $is_example);
    $job_id = $job->get_id();
    $job_key = $_GET["key"];

    if ($job->get_key() != $_GET["key"]) {
        echo json_encode(array("valid" => "false", "message" => "Invalid parameters k.", "data" => array()));
        exit(1);
    }

    $gen_type = $job->get_type();

    $job = \efi\est\dataset_shared::create_generate_object($gen_type, $db, $is_example);
    $has_tax_data = $job->has_tax_data();

    if (!$has_tax_data) {
        echo json_encode(array("valid" => "false", "message" => "No taxonomy data.", "data" => array()));
        exit(0);
    }

    header('Content-Type: application/json; charset=utf-8');
    $data_array = $job->get_taxonomy_data();

    $data = array("valid" => "true", "data" => $data_array);




////////////////////////////////////////////////////////////////////////////////////////////////////
// For Superfamily web app integration
//

} else {

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

}


echo json_encode($data);


