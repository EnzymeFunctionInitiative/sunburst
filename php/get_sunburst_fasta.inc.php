<?php
require_once(__DIR__."/config.php");

if (defined("__EFI_INTEGRATION__")) {
} else {
    require_once(__LIB_DIR__ . "/settings.class.inc.php");
    require_once(__LIB_DIR__ . "/functions.class.inc.php");
}

    


function parse_blast_output($output_array) {
    $output = "";
    for ($o = 0; $o < count($output_array); $o++) {
        $line = $output_array[$o];
        if ($line[0] && $line[0] == ">") {
            $line = preg_replace('/^>([^\|]+)\|([^ ]+).*$/', '>$2', $line);
        }
        $output .= $line . "\n";
    }
    return $output;
}


function get_subset_ids($ids, $i, $num_ids) {
    $max_idx = min($i + __SEQ_BATCH_SIZE__, $num_ids);
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
    return $id_list;
}




abstract class helper {

    public abstract function validate_input($params);

    public abstract function get_blast_db_path();

    public abstract function send_output($filename, $output);

}



//TODO:
class superfamily_helper implements helper {

    private $db;

    public function __construct() {
    }

    public function get_db() {
        return $this->db;
    }

    public function validate_input($params) {
        $version = functions::validate_version();
        $qversion = (isset($_GET["qv"]) && is_numeric($_GET["qv"])) ? $_GET["qv"] : 0;

        $db = functions::get_database($version);

        $cluster_id = filter_input(INPUT_GET, "id", FILTER_SANITIZE_STRING);
        $ascore = filter_input(INPUT_GET, "as", FILTER_SANITIZE_NUMBER_INT); 
        if ($cluster_id && !functions::validate_cluster_id($db, $cluster_id))
            return false;

        $this->db = $db;

        return true; //array("db" => $db, "cluster_id" => $cluster_id, "ascore" => $ascore);
    }

    public function get_blast_db_path() {
        die("Invalid");
    }

    public function send_output($filename, $output) {
        die("Invalid");
    }

}


class efi_helper implements helper {

    private $id;
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function validate_input($params) {
        $id = filter_var($params["id"], FILTER_SANITIZE_NUMBER_INT, FILTER_NULL_ON_FAILURE);
        $key = filter_var($params["key"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);
        $node_name = filter_var($params["o"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);
        $id_type = filter_var($params["it"], FILTER_SANITIZE_STRING, FILTER_NULL_ON_FAILURE);

        if (!$id || !$key)
            return false;
    
        // Comes from config.php
        $job_key = $this->get_job_key($id);
    
        if ($key != $job_key)
            return false;
    
        $ids = $data["ids"];
        $ids = json_decode($ids);
        if (!$ids)
            return false;

        $this->id = $id;

        return array("id" => $id, "ids" => $ids, "node_name" => $node_name, "id_type" => $id_type);
    }

    public function get_blast_db_path() {
        // Comes from config.php
        $results_dir = $this->get_results_dir($this->id);
        return "$results_dir/database";
    }

    private function get_job_key($id) {
        $job = $this->get_job($id);
        return $job->get_key();
    }
    
    private function get_job($id) {
        return new \efi\est\stepa($this->db, $id);
    }

    private function get_results_dir($id) {
        $job = $this->get_job($id);
        $results_dir = \efi\est\functions::get_results_dir();
        return $results_dir . "/" . $job->get_output_dir();
    }
    
    public function send_output($filename, $output) {
        \efi\send_file::send_text($output, $filename, \efi\send_file::SEND_FILE_BINARY);
    }
}



