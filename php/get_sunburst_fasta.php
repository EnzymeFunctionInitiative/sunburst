<?php
require_once(__DIR__."/config.php");
require_once(__DIR__."/get_sunburst_fasta.inc.php");

// Do not support superfamilies yet.
if (!defined("__EFI_INTEGRATION__")) {
    die("Unsupported integration");
}

$helper = new efi_helper($db);


$html5_download = false;
if (isset($_POST["type"]) && $_POST["type"] == "html5") {
    $params = json_decode(file_get_contents("php://input"), true);
    $html5_download = true;
} else {
    $params = $_POST;
}


$data = $helper->validate_input($params);
if ($data === false) {
    echo "";
    exit(0);
}


$id = $data["id"];
$node_name = $data["node_name"];
$ids = $data["ids"];
$id_type = $data["id_type"];


//TODO: not properly implemented yet for superfamilies


$blast_db = $helper->get_blast_db_path();
$blast_module = __BLAST_MODULE__;


$output = "";

$num_ids = count($ids);
for ($i = 0; $i < $num_ids; $i += __SEQ_BATCH_SIZE__) {
    $id_list = get_subset_ids($ids, $i, $num_ids);
    $blast_exec  = $blast_module . " -d $blast_db -s $id_list\n";

    $exit_status = 1;
    $output_array = array();
    $out = exec($blast_exec, $output_array, $exit_status);

    $output .= parse_blast_output($output_array);
}


$node_name = preg_replace("/[^A-Za-z0-9\-_]/", "", $node_name);
$filename = "${id}_${id_type}_${node_name}.fasta";
if ($html5_download) {
    $response = array("valid" => "true", "download" => array("mimetype" => "application/octet-stream", "filename" => $filename, "data" => base64_encode($output)));
    echo json_encode($response);
} else {
    $helper->send_output($filename, $output);
}






