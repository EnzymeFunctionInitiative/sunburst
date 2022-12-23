<?php
require(__DIR__."/get_sunburst_fasta.php.conf");
require(__DIR__."/get_sunburst_fasta.inc.php");


$html5_download = false;
if (isset($_POST["type"]) && $_POST["type"] == "html5") {
    $data = json_decode(file_get_contents("php://input"), true);
    $html5_download = true;
} else {
    $data = $_POST;
}

$id = filter_var($data["id"], FILTER_SANITIZE_NUMBER_INT, FILTER_NULL_ON_FAILURE);
$key = filter_var($data["key"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);
$node_name = filter_var($data["o"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);
$id_type = filter_var($data["it"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);
$ids = $data["ids"];

if (!validate_input($db, $id, $key, $node_name, $ids)) {
    echo "";
    exit(1);
}

$ids = json_decode($ids);
if (!$ids) {
    echo "";
    exit(1);
}


$blast_db = get_blast_db_path($db, $id);
$blast_module = __BLAST_MODULE__;



$output = "";

$num_ids = count($ids);
$batch_size = 1000;
for ($i = 0; $i < $num_ids; $i += $batch_size) {
    $max_idx = min($i + $batch_size, $num_ids);
    $id_list = "";
    for ($j = $i; $j < $max_idx; $j++) {
        // Make sure we are using a valid ID
        $the_id = $ids[$j];
        if (!preg_match("/^[A-Z0-9]{6,10}$/", $the_id))
            continue;
        if ($id_list)
            $id_list .= ",";
        $id_list .= $the_id;
    }
    $blast_exec  = $blast_module . " -d $blast_db -s $id_list\n";

    $exit_status = 1;
    $output_array = array();
    $out = exec($blast_exec, $output_array, $exit_status);
    for ($o = 0; $o < count($output_array); $o++) {
        $line = $output_array[$o];
        if ($line[0] && $line[0] == ">") {
            $line = preg_replace('/^>([^\|]+)\|([^ ]+).*$/', '>$2', $line);
        }
        $output .= $line . "\n";
    }
}



$node_name = preg_replace("/[^A-Za-z0-9\-_]/", "", $node_name);
$filename = "${id}_${id_type}_${node_name}.fasta";
if ($html5_download) {
    $response = array(
        "valid" => "true",
        "download" => array(
            "mimetype" => "application/octet-stream",
            "filename" => $filename,
            "data" => base64_encode($output)
        )
    );
    echo json_encode($response);
} else {
    // Comes from get_sunburst_fasta.inc.php
    send_output($filename, $output);
}















function validate_input($db, $id, $key, $node_name, $ids) {
    if (!$id || !$key)
        return false;

    // Comes from get_sunburst_fasta.inc.php
    $job_key = get_job_key($db, $id);

    if ($key != $job_key)
        return false;

    return true;
}

function get_blast_db_path($db, $id) {
    // Comes from get_sunburst_fasta.inc.php
    $results_dir = get_results_dir($db, $id);
    return "$results_dir/database";
}

